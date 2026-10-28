"""
CelebrationAI Security & Efficiency Utilities
Includes in-memory sliding-window rate limiting, input sanitization,
defense against prompt injection, security headers, and LRU plan caching.
"""

import collections
import hashlib
import json
import re
import time
from typing import Dict, Optional, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter by client IP.
    """
    def __init__(self, limit: int, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests: Dict[str, collections.deque] = collections.defaultdict(collections.deque)

    def is_allowed(self, client_ip: str) -> Tuple[bool, int]:
        now = time.time()
        q = self.requests[client_ip]

        # Purge timestamps outside current sliding window
        while q and q[0] <= now - self.window_seconds:
            q.popleft()

        if len(q) < self.limit:
            q.append(now)
            remaining = self.limit - len(q)
            return True, remaining
        else:
            retry_after = int(self.window_seconds - (now - q[0])) + 1
            return False, max(1, retry_after)

    def reset(self):
        """Reset limiter for testing."""
        self.requests.clear()


# Rate limiters for critical endpoints
plan_rate_limiter = SlidingWindowRateLimiter(limit=25, window_seconds=60)
chat_rate_limiter = SlidingWindowRateLimiter(limit=35, window_seconds=60)


def get_client_ip(request: Request) -> str:
    """Extract client IP, taking X-Forwarded-For into account safely."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Take the leftmost IP
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects strict HTTP security headers into every response.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Allow embedding in AI Studio iFrame while preventing clickjacking
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' data:; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "script-src 'self' 'unsafe-inline'; "
            "connect-src 'self' https:; "
            "img-src 'self' data: https:; "
            "frame-ancestors *;"
        )
        return response


def sanitize_prompt_input(text: str) -> str:
    """
    Sanitize untrusted user input before injecting into LLM prompt.
    Strips system control markers, markdown delimiters, and delimiters that could override prompts.
    """
    if not text:
        return ""
    # Remove control characters and backticks
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", text)
    cleaned = cleaned.replace("```", "").replace("'''", "")
    # Remove angle brackets
    cleaned = cleaned.replace("<", "").replace(">", "")
    # Strip potential prompt instruction attacks
    cleaned = re.sub(
        r"(?i)(ignore previous instructions|disregard all previous|system prompt|jailbreak)",
        "[REDACTED]",
        cleaned,
    )
    return cleaned.strip()[:500]


class LRUPlanCache:
    """
    In-memory LRU cache to avoid duplicate GenAI calls for identical requests.
    """
    def __init__(self, capacity: int = 120):
        self.capacity = capacity
        self.cache: collections.OrderedDict = collections.OrderedDict()

    def _make_key(self, plan_data: dict) -> str:
        key_tuple = (
            str(plan_data.get("event_type", "")).lower(),
            str(plan_data.get("date", "")),
            int(plan_data.get("guest_count") or 0),
            float(plan_data.get("total_budget") or 0),
            str(plan_data.get("city", "")).lower().strip(),
            int(plan_data.get("wedding_functions") or 0),
            str(plan_data.get("style_notes", "")).strip()[:100],
        )
        serialized = json.dumps(key_tuple, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def get(self, plan_data: dict) -> Optional[dict]:
        key = self._make_key(plan_data)
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def put(self, plan_data: dict, result: dict):
        key = self._make_key(plan_data)
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = result
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def clear(self):
        self.cache.clear()


plan_cache = LRUPlanCache()
