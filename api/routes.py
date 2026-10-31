"""
CelebrationAI API Routes
Endpoints:
- GET  /api/health
- POST /api/plan
- POST /api/chat
Includes validation, caching, rate limiting, and friendly error handlers.
"""

from datetime import datetime, timezone
import os
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from api.ai import answer_chat_query, enrich_plan_with_ai, get_gemini_client, get_model_names
from api.planner import compute_budget, compute_realism, compute_timeline, compute_vendors
from api.schemas import (
    ChatRequest,
    ChatResponse,
    EventType,
    HealthResponse,
    PlanRequest,
    PlanResponse,
    format_inr,
)
from api.security import (
    chat_rate_limiter,
    get_client_ip,
    plan_cache,
    plan_rate_limiter,
)

router = APIRouter(prefix="/api", tags=["CelebrationAI"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify backend status and Gemini configuration."""
    primary_model, _ = get_model_names()
    client = get_gemini_client()
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
        gemini_configured=client is not None,
        model=primary_model,
    )


@router.post("/plan", response_model=PlanResponse)
async def create_plan(request: PlanRequest, req: Request):
    """
    Generate an event plan with rule-based budget, timeline, and vendor checklists,
    enriched with GenAI cultural recommendations and money-saving tips.
    """
    client_ip = get_client_ip(req)
    allowed, retry_after_or_remaining = plan_rate_limiter.is_allowed(client_ip)
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded",
                "detail": f"Too many planning requests. Please retry in {retry_after_or_remaining} seconds.",
            },
            headers={"Retry-After": str(retry_after_or_remaining)},
        )

    # Check cache for identical requests
    raw_dict = request.model_dump()
    cached_plan = plan_cache.get(raw_dict)
    if cached_plan:
        cached_copy = dict(cached_plan)
        cached_copy["cached"] = True
        return cached_copy

    # 1. Rule-based calculation (always succeeds)
    wedding_functions = request.wedding_functions or 3
    budget_summary = compute_budget(
        event_type=request.event_type,
        total_budget=request.total_budget,
        guest_count=request.guest_count,
        wedding_functions=wedding_functions,
    )
    realism_warnings = compute_realism(
        event_type=request.event_type,
        total_budget=request.total_budget,
        guest_count=request.guest_count,
        wedding_functions=wedding_functions,
    )
    days_left, timeline = compute_timeline(request.date)
    vendors = compute_vendors(
        event_type=request.event_type,
        total_budget=request.total_budget,
        event_date_str=request.date,
    )

    # 2. GenAI enrichment (falls back gracefully to rule-based ideas if unreachable)
    ideas = await enrich_plan_with_ai(
        event_type=request.event_type,
        city=request.city,
        guest_count=request.guest_count,
        total_budget=request.total_budget,
        wedding_functions=wedding_functions,
        style_notes=request.style_notes or "",
    )

    is_ai = bool(getattr(ideas, "is_ai_generated", False))

    plan_response = PlanResponse(
        event_type=request.event_type,
        date=request.date,
        guest_count=request.guest_count,
        total_budget=request.total_budget,
        total_budget_formatted=format_inr(request.total_budget),
        per_guest_budget=budget_summary.per_guest_budget,
        per_guest_formatted=budget_summary.per_guest_formatted,
        city=request.city,
        wedding_functions=wedding_functions if request.event_type == EventType.WEDDING else None,
        days_until_event=days_left,
        budget=budget_summary,
        realism_warnings=realism_warnings,
        timeline=timeline,
        vendors=vendors,
        ideas=ideas,
        ai_enriched=is_ai,
        is_fallback=not is_ai,
        cached=False,
    )

    # Cache response
    plan_cache.put(raw_dict, plan_response.model_dump())
    return plan_response


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, req: Request):
    """
    Follow-up chat assistant to ask questions about the generated plan.
    Restricted to Indian celebrations and event planning topics.
    """
    client_ip = get_client_ip(req)
    allowed, retry_after_or_remaining = chat_rate_limiter.is_allowed(client_ip)
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded",
                "detail": f"Too many chat messages. Please wait {retry_after_or_remaining} seconds.",
            },
            headers={"Retry-After": str(retry_after_or_remaining)},
        )

    history_dicts = [h.model_dump() for h in (request.history or [])]
    reply, suggested_actions, is_off_topic = await answer_chat_query(
        message=request.message,
        plan_context=request.plan_context,
        history=history_dicts,
    )

    return ChatResponse(
        reply=reply,
        suggested_actions=suggested_actions,
        is_off_topic=is_off_topic,
    )
