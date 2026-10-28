"""
Unit tests for rule-based planning engine (api/planner.py)
Tests budget math, realism thresholds, timeline compression, and vendor checklists.
"""

from datetime import date, timedelta
from api.planner import (
    compute_budget,
    compute_realism,
    compute_timeline,
    compute_vendors,
    generate_fallback_ideas,
    get_budget_tier,
)
from api.schemas import EventType


def test_wedding_budget_sums_to_100_percent():
    budget = compute_budget(EventType.WEDDING, 1500000, 300, wedding_functions=3)
    total_pct = round(sum(item.percentage for item in budget.items), 1)
    assert total_pct == 100.0


def test_wedding_budget_amounts_sum_to_total():
    target = 1850000.0
    budget = compute_budget(EventType.WEDDING, target, 450, wedding_functions=4)
    total_amt = sum(item.amount for item in budget.items)
    assert total_amt == target


def test_birthday_budget_sums_to_100_percent():
    budget = compute_budget(EventType.BIRTHDAY, 75000, 60)
    total_pct = round(sum(item.percentage for item in budget.items), 1)
    assert total_pct == 100.0


def test_birthday_budget_amounts_sum_to_total():
    target = 120000.0
    budget = compute_budget(EventType.BIRTHDAY, target, 80)
    total_amt = sum(item.amount for item in budget.items)
    assert total_amt == target


def test_community_budget_sums_to_100_percent():
    budget = compute_budget(EventType.COMMUNITY, 350000, 800)
    total_pct = round(sum(item.percentage for item in budget.items), 1)
    assert total_pct == 100.0


def test_community_budget_amounts_sum_to_total():
    target = 500000.0
    budget = compute_budget(EventType.COMMUNITY, target, 1000)
    total_amt = sum(item.amount for item in budget.items)
    assert total_amt == target


def test_large_guest_count_scales_catering_share():
    small_budget = compute_budget(EventType.WEDDING, 1000000, 200)
    large_budget = compute_budget(EventType.WEDDING, 1000000, 600)

    catering_small = next(i for i in small_budget.items if "Catering" in i.category)
    catering_large = next(i for i in large_budget.items if "Catering" in i.category)
    assert catering_large.percentage > catering_small.percentage


def test_wedding_functions_adjusts_budget_split():
    three_funcs = compute_budget(EventType.WEDDING, 1500000, 300, wedding_functions=3)
    five_funcs = compute_budget(EventType.WEDDING, 1500000, 300, wedding_functions=5)

    decor_3 = next(i for i in three_funcs.items if "Decor" in i.category)
    decor_5 = next(i for i in five_funcs.items if "Decor" in i.category)
    assert decor_5.percentage >= decor_3.percentage


def test_budget_tiers_categorization():
    assert get_budget_tier(EventType.WEDDING, 1500) == "tight"
    assert get_budget_tier(EventType.WEDDING, 4000) == "comfortable"
    assert get_budget_tier(EventType.WEDDING, 9000) == "generous"

    assert get_budget_tier(EventType.BIRTHDAY, 600) == "tight"
    assert get_budget_tier(EventType.BIRTHDAY, 1500) == "comfortable"
    assert get_budget_tier(EventType.BIRTHDAY, 3500) == "generous"

    assert get_budget_tier(EventType.COMMUNITY, 300) == "tight"
    assert get_budget_tier(EventType.COMMUNITY, 1000) == "comfortable"
    assert get_budget_tier(EventType.COMMUNITY, 2500) == "generous"


def test_realism_warning_triggers_on_low_per_guest_wedding():
    warnings = compute_realism(
        event_type=EventType.WEDDING,
        total_budget=400000,
        guest_count=500,  # ₹800/guest
        wedding_functions=3,
    )
    assert len(warnings) >= 1
    assert any("Budget Strain Warning" in w.title for w in warnings)


def test_realism_warning_not_triggered_on_adequate_budget():
    warnings = compute_realism(
        event_type=EventType.WEDDING,
        total_budget=2500000,
        guest_count=400,  # ₹6,250/guest
        wedding_functions=3,
    )
    # No critical strain warning
    assert not any("Budget Strain Warning" in w.title for w in warnings)


def test_realism_warning_multi_functions_advisory():
    warnings = compute_realism(
        event_type=EventType.WEDDING,
        total_budget=800000,
        guest_count=400,  # ₹2,000/guest
        wedding_functions=5,  # 5 functions
    )
    assert any("Function Multiplicity Advisory" in w.title for w in warnings)


def test_realism_warning_birthday_under_500():
    warnings = compute_realism(
        event_type=EventType.BIRTHDAY,
        total_budget=20000,
        guest_count=50,  # ₹400/guest
    )
    assert any("Per-Guest Budget Warning" in w.title for w in warnings)


def test_realism_warning_community_under_300():
    warnings = compute_realism(
        event_type=EventType.COMMUNITY,
        total_budget=100000,
        guest_count=500,  # ₹200/guest
    )
    assert any("Community Event Cost Advisory" in w.title for w in warnings)


def test_timeline_generates_chronological_milestones():
    today = date(2026, 1, 1)
    event_date = (today + timedelta(days=200)).strftime("%Y-%m-%d")
    days_left, milestones = compute_timeline(event_date, today=today)

    assert days_left == 200
    assert len(milestones) >= 8
    # Furthest milestone first
    assert milestones[0].days_before >= milestones[-1].days_before
    # Day-of milestone exists
    assert any(m.days_before == 0 for m in milestones)


def test_timeline_compresses_for_near_event_dates():
    today = date(2026, 1, 1)
    event_date = (today + timedelta(days=25)).strftime("%Y-%m-%d")
    days_left, milestones = compute_timeline(event_date, today=today)

    assert days_left == 25
    # Tasks that were originally 180, 120, 90, 60, 30 days before are now urgent
    urgent_count = sum(1 for m in milestones if m.is_urgent)
    assert urgent_count >= 5


def test_vendor_lists_differ_per_event_type():
    wedding_vendors = compute_vendors(EventType.WEDDING, 1000000, "2026-12-15")
    birthday_vendors = compute_vendors(EventType.BIRTHDAY, 50000, "2026-12-15")
    community_vendors = compute_vendors(EventType.COMMUNITY, 200000, "2026-12-15")

    wedding_cats = [v.category for v in wedding_vendors]
    birthday_cats = [v.category for v in birthday_vendors]
    community_cats = [v.category for v in community_vendors]

    assert "Bridal Makeup & Mehendi" in wedding_cats
    assert "Bridal Makeup & Mehendi" not in birthday_cats
    assert "Theme Decorator" in birthday_cats
    assert "Community Hall & Shamiana" in community_cats


def test_vendor_budget_amounts_match_suggested_shares():
    total = 2000000.0
    vendors = compute_vendors(EventType.WEDDING, total, "2026-12-15")
    for v in vendors:
        expected = round(total * (v.suggested_share_pct / 100.0))
        assert v.suggested_budget == expected


def test_fallback_ideas_generate_authentic_cultural_content():
    ideas = generate_fallback_ideas(
        event_type=EventType.WEDDING,
        city="Jaipur",
        style_notes="Royal Marwari wedding",
        guest_count=350,
        total_budget=2500000,
        wedding_functions=4,
    )
    assert not ideas.is_ai_generated
    assert "Jaipur" in ideas.summary or "Jaipur" in ideas.theme_concept
    assert len(ideas.menu_highlights) >= 4
    assert len(ideas.decor_palette) >= 3
    assert len(ideas.money_saving_tips) >= 3
