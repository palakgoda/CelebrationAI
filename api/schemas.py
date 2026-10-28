"""
CelebrationAI Pydantic Schemas (v2)
Strict input validation, output contracts, and Indian celebration data types.
"""

from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class EventType(str, Enum):
    WEDDING = "wedding"
    BIRTHDAY = "birthday"
    COMMUNITY = "community"


def format_inr(number: float) -> str:
    """Format a number into Indian currency notation (₹12,34,567)."""
    try:
        val = int(round(number))
        is_negative = val < 0
        s = str(abs(val))
        if len(s) <= 3:
            res = s
        else:
            last3 = s[-3:]
            remaining = s[:-3]
            chunks = []
            while remaining:
                chunks.append(remaining[-2:])
                remaining = remaining[:-2]
            chunks.reverse()
            res = ",".join(chunks) + "," + last3
        return f"{'-' if is_negative else ''}₹{res}"
    except Exception:
        return f"₹{number:,.0f}"


class PlanRequest(BaseModel):
    event_type: EventType = Field(..., description="Type of event: wedding, birthday, community")
    date: str = Field(..., description="Target event date in YYYY-MM-DD format")
    guest_count: int = Field(..., ge=1, le=5000, description="Estimated number of guests (1-5000)")
    total_budget: float = Field(..., ge=5000, le=500000000, description="Total budget in INR (₹5,000 to ₹50 Cr)")
    city: str = Field(..., min_length=2, max_length=100, description="City / Region in India (e.g., Jaipur, Mumbai, Delhi-NCR)")
    style_notes: Optional[str] = Field(default="", max_length=500, description="Optional preferences, themes, traditions, or dietary notes")
    wedding_functions: Optional[int] = Field(default=3, ge=1, le=10, description="Number of functions for weddings (e.g. 3 for Haldi, Sangeet, Wedding)")

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            parsed = datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Date must be in valid YYYY-MM-DD format")
        
        today = date.today()
        if parsed < today:
            raise ValueError("Event date cannot be in the past")
        return v

    @field_validator("city")
    @classmethod
    def sanitize_city(cls, v: str) -> str:
        cleaned = " ".join(v.split()).strip()
        if len(cleaned) < 2:
            raise ValueError("City name is too short")
        return cleaned

    @field_validator("style_notes")
    @classmethod
    def sanitize_style_notes(cls, v: Optional[str]) -> str:
        if not v:
            return ""
        # Strip potential HTML/control characters
        cleaned = v.replace("<", "").replace(">", "").strip()
        return cleaned[:500]

    @model_validator(mode="after")
    def validate_wedding_functions(self):
        """Wedding functions field is only valid when event_type is wedding; reset for others."""
        if self.event_type != EventType.WEDDING:
            self.wedding_functions = None
        else:
            if self.wedding_functions is None:
                self.wedding_functions = 3
        return self


class BudgetItem(BaseModel):
    category: str
    name: str
    percentage: float
    amount: float
    amount_formatted: str
    notes: str


class BudgetSummary(BaseModel):
    total_budget: float
    total_budget_formatted: str
    per_guest_budget: float
    per_guest_formatted: str
    budget_tier: str  # "tight" | "comfortable" | "generous"
    items: List[BudgetItem]


class Milestone(BaseModel):
    id: str
    title: str
    target_date: str
    days_before: int
    description: str
    is_urgent: bool
    category: str


class VendorItem(BaseModel):
    id: str
    category: str
    vendor_type: str
    suggested_share_pct: float
    suggested_budget: float
    suggested_budget_formatted: str
    book_by_date: str
    book_by_days_before: int
    checklist_tasks: List[str]
    local_tips: str


class PersonalizedIdeas(BaseModel):
    summary: str
    theme_concept: str
    menu_highlights: List[str]
    activities_and_rituals: List[str]
    decor_palette: List[str]
    money_saving_tips: List[str]
    is_ai_generated: bool = False


class WarningInfo(BaseModel):
    level: str = "warning"  # "warning" | "advisory" | "info"
    title: str
    message: str
    suggestion: str


class PlanResponse(BaseModel):
    event_type: EventType
    date: str
    guest_count: int
    total_budget: float
    total_budget_formatted: str
    per_guest_budget: float
    per_guest_formatted: str
    city: str
    wedding_functions: Optional[int] = None
    days_until_event: int
    budget: BudgetSummary
    realism_warnings: List[WarningInfo]
    timeline: List[Milestone]
    vendors: List[VendorItem]
    ideas: PersonalizedIdeas
    ai_enriched: bool = True
    is_fallback: bool = False
    cached: bool = False


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=1000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500, description="User follow-up question")
    plan_context: dict = Field(default_factory=dict, description="Context from current plan")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Recent conversation turns (max 6)")

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        cleaned = v.replace("<", "").replace(">", "").strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        return cleaned[:500]


class ChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str] = Field(default_factory=list)
    is_off_topic: bool = False


class HealthResponse(BaseModel):
    status: str = "ok"
    timestamp: str
    gemini_configured: bool
    model: str
