"""
Unit tests for Pydantic v2 schemas and validation (api/schemas.py).
Tests input boundaries, date logic, Indian currency formatting, and sanitization.
"""

from datetime import date, timedelta
import pytest
from pydantic import ValidationError
from api.schemas import (
    EventType,
    PlanRequest,
    ChatRequest,
    format_inr,
)


def get_future_date(days: int = 60) -> str:
    return (date.today() + timedelta(days=days)).strftime("%Y-%m-%d")


def test_valid_wedding_plan_request():
    req = PlanRequest(
        event_type=EventType.WEDDING,
        date=get_future_date(90),
        guest_count=350,
        total_budget=1500000,
        city="Udaipur",
        style_notes="Royal lakeside theme",
        wedding_functions=4,
    )
    assert req.guest_count == 350
    assert req.total_budget == 1500000
    assert req.city == "Udaipur"


def test_valid_birthday_plan_request():
    req = PlanRequest(
        event_type=EventType.BIRTHDAY,
        date=get_future_date(30),
        guest_count=50,
        total_budget=45000,
        city="Bengaluru",
        style_notes="Jungle safari for 5-year-old",
    )
    assert req.event_type == EventType.BIRTHDAY
    assert req.wedding_functions is None  # wedding-only field reset for birthday


def test_wedding_only_function_field_validation():
    # Wedding retains wedding_functions
    w_req = PlanRequest(
        event_type=EventType.WEDDING,
        date=get_future_date(60),
        guest_count=200,
        total_budget=800000,
        city="Jaipur",
        wedding_functions=4,
    )
    assert w_req.wedding_functions == 4

    # Wedding defaults to 3 if None
    w_default = PlanRequest(
        event_type=EventType.WEDDING,
        date=get_future_date(60),
        guest_count=200,
        total_budget=800000,
        city="Jaipur",
        wedding_functions=None,
    )
    assert w_default.wedding_functions == 3

    # Community celebration resets wedding_functions to None
    c_req = PlanRequest(
        event_type=EventType.COMMUNITY,
        date=get_future_date(45),
        guest_count=300,
        total_budget=150000,
        city="Pune",
        wedding_functions=5,  # Passed by accident
    )
    assert c_req.wedding_functions is None


def test_validation_rejects_guest_count_below_1():
    with pytest.raises(ValidationError):
        PlanRequest(
            event_type=EventType.WEDDING,
            date=get_future_date(90),
            guest_count=0,
            total_budget=500000,
            city="Delhi",
        )


def test_validation_rejects_guest_count_above_5000():
    with pytest.raises(ValidationError):
        PlanRequest(
            event_type=EventType.WEDDING,
            date=get_future_date(90),
            guest_count=5001,
            total_budget=500000,
            city="Delhi",
        )


def test_validation_rejects_budget_below_5000():
    with pytest.raises(ValidationError):
        PlanRequest(
            event_type=EventType.BIRTHDAY,
            date=get_future_date(30),
            guest_count=20,
            total_budget=4999,
            city="Pune",
        )


def test_validation_rejects_budget_above_50_crore():
    with pytest.raises(ValidationError):
        PlanRequest(
            event_type=EventType.WEDDING,
            date=get_future_date(90),
            guest_count=500,
            total_budget=500000001,
            city="Mumbai",
        )


def test_validation_rejects_invalid_event_type():
    with pytest.raises(ValidationError):
        PlanRequest(
            event_type="concert",  # invalid
            date=get_future_date(90),
            guest_count=100,
            total_budget=100000,
            city="Goa",
        )


def test_validation_rejects_malformed_date():
    with pytest.raises(ValidationError):
        PlanRequest(
            event_type=EventType.WEDDING,
            date="2026/12/31",  # wrong separator
            guest_count=100,
            total_budget=100000,
            city="Delhi",
        )


def test_validation_rejects_past_date():
    yesterday = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
    with pytest.raises(ValidationError):
        PlanRequest(
            event_type=EventType.WEDDING,
            date=yesterday,
            guest_count=100,
            total_budget=100000,
            city="Delhi",
        )


def test_validation_sanitizes_city_name():
    req = PlanRequest(
        event_type=EventType.WEDDING,
        date=get_future_date(60),
        guest_count=100,
        total_budget=200000,
        city="   New   Delhi  ",
    )
    assert req.city == "New Delhi"


def test_validation_sanitizes_style_notes_strips_html():
    req = PlanRequest(
        event_type=EventType.WEDDING,
        date=get_future_date(60),
        guest_count=100,
        total_budget=200000,
        city="Mumbai",
        style_notes="<script>alert(1)</script> Traditional Marigold decor",
    )
    assert "<script>" not in req.style_notes
    assert "</script>" not in req.style_notes
    assert "Traditional Marigold decor" in req.style_notes


def test_chat_request_validation():
    req = ChatRequest(
        message="  How should I plan the Sangeet playlist?  ",
        plan_context={"city": "Jaipur"},
    )
    assert req.message == "How should I plan the Sangeet playlist?"


def test_chat_request_rejects_empty_message():
    with pytest.raises(ValidationError):
        ChatRequest(message="   ", plan_context={})


def test_inr_formatter_indian_numbering_system():
    # 1 Lakh = 1,00,000
    assert format_inr(100000) == "₹1,00,000"
    # 4.5 Lakh = 4,50,000
    assert format_inr(450000) == "₹4,50,000"
    # 1.2 Crore = 1,20,00,000
    assert format_inr(12000000) == "₹1,20,00,000"
    # Small numbers
    assert format_inr(750) == "₹750"
    assert format_inr(12500) == "₹12,500"
