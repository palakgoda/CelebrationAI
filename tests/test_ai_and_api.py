"""
Integration tests for API endpoints and GenAI layer (api/routes.py, api/ai.py).
Mocks Gemini SDK responses to test both valid output, malformed output, network errors,
and offline fallbacks.
"""

from datetime import date, timedelta
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from api.ai import is_query_off_topic


def get_future_date(days: int = 75) -> str:
    return (date.today() + timedelta(days=days)).strftime("%Y-%m-%d")


def test_health_endpoint_returns_ok(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert "model" in data


def test_plan_endpoint_with_mocked_gemini(client: TestClient):
    mock_gemini_json = """
    {
        "summary": "An unforgettable royal celebration in Jaipur with handcrafted decor and festive feasts.",
        "theme_concept": "Maharaja Heritage & Amber Radiance",
        "menu_highlights": [
            "Live Dal Baati Churma & Gatte ki Subzi Counter",
            "Chandni Chowk Palak Patta Chaat",
            "Mawa Kachori with hot saffron milk",
            "Kesar Jalebi with chilled Rabdi"
        ],
        "activities_and_rituals": [
            "Grand royal elephant & vintage car baraat entry",
            "Sangeet Antakshari family challenge with customized trophies",
            "Royal safa-tying session for all wedding baratis"
        ],
        "decor_palette": [
            "Jaipur Terracotta (#C04A26)",
            "Amber Saffron (#F5A623)",
            "Royal Emerald (#006D5B)",
            "Antique Gold (#D4AF37)"
        ],
        "money_saving_tips": [
            "Source wholesale marigold strings directly from Jaipur Phool Mandi.",
            "Repurpose sangeet stage backdrop for the mandap ritual next morning.",
            "Send animated video invites to 70% of outstation guests."
        ]
    }
    """

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = mock_gemini_json
    mock_client.models.generate_content.return_value = mock_resp

    with patch("api.ai.get_gemini_client", return_value=mock_client):
        payload = {
            "event_type": "wedding",
            "date": get_future_date(120),
            "guest_count": 300,
            "total_budget": 1500000,
            "city": "Jaipur",
            "style_notes": "Royal Marwari wedding",
            "wedding_functions": 3,
        }
        res = client.post("/api/plan", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["event_type"] == "wedding"
        assert data["city"] == "Jaipur"
        assert data["ideas"]["is_ai_generated"] is True
        assert "Maharaja Heritage" in data["ideas"]["theme_concept"]
        assert len(data["budget"]["items"]) > 5
        assert len(data["timeline"]) > 5
        assert len(data["vendors"]) > 5


def test_plan_endpoint_ai_failure_returns_fallback_plan(client: TestClient):
    # Simulate Gemini API raising an exception (e.g. network failure or quota)
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError("API Quota Exceeded")

    with patch("api.ai.get_gemini_client", return_value=mock_client):
        payload = {
            "event_type": "wedding",
            "date": get_future_date(90),
            "guest_count": 250,
            "total_budget": 1200000,
            "city": "Delhi",
            "style_notes": "Punjabi wedding",
            "wedding_functions": 3,
        }
        res = client.post("/api/plan", json=payload)
        # MUST return 200 with fallback plan, NEVER crash or return 500!
        assert res.status_code == 200
        data = res.json()
        assert data["is_fallback"] is True
        assert data["ai_enriched"] is False
        assert data["ideas"]["is_ai_generated"] is False
        assert len(data["ideas"]["menu_highlights"]) >= 3
        assert len(data["budget"]["items"]) >= 5


def test_plan_endpoint_malformed_gemini_json_returns_fallback(client: TestClient):
    # Simulate Gemini returning broken non-JSON text
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = "I am sorry, but here is a plan without JSON format: {bad_json"
    mock_client.models.generate_content.return_value = mock_resp

    with patch("api.ai.get_gemini_client", return_value=mock_client):
        payload = {
            "event_type": "birthday",
            "date": get_future_date(40),
            "guest_count": 50,
            "total_budget": 50000,
            "city": "Pune",
        }
        res = client.post("/api/plan", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_fallback"] is True
        assert data["ideas"]["is_ai_generated"] is False


def test_plan_endpoint_caches_identical_requests(client: TestClient):
    payload = {
        "event_type": "community",
        "date": get_future_date(60),
        "guest_count": 400,
        "total_budget": 200000,
        "city": "Varanasi",
    }
    # First request
    res1 = client.post("/api/plan", json=payload)
    assert res1.status_code == 200
    assert res1.json()["cached"] is False

    # Second identical request should return from cache
    res2 = client.post("/api/plan", json=payload)
    assert res2.status_code == 200
    assert res2.json()["cached"] is True


def test_plan_endpoint_rate_limiting(client: TestClient):
    payload = {
        "event_type": "birthday",
        "date": get_future_date(30),
        "guest_count": 40,
        "total_budget": 40000,
        "city": "Kolkata",
    }
    # Limit is 25 per minute. Make 25 requests, then 26th should be 429
    for i in range(25):
        # Vary budget slightly to avoid LRU cache
        payload["total_budget"] = 40000 + i
        res = client.post("/api/plan", json=payload)
        assert res.status_code == 200

    payload["total_budget"] = 99999
    res_blocked = client.post("/api/plan", json=payload)
    assert res_blocked.status_code == 429
    assert "Rate limit exceeded" in res_blocked.json()["error"]
    assert "Retry-After" in res_blocked.headers


def test_off_topic_detector():
    assert is_query_off_topic("Write python code for a binary search tree") is True
    assert is_query_off_topic("Who is the president of the United States?") is True
    assert is_query_off_topic("What is the bitcoin price prediction for 2027?") is True
    assert is_query_off_topic("How much does wedding catering cost in Jaipur?") is False
    assert is_query_off_topic("Can you suggest Haldi and Sangeet song playlists?") is False


def test_chat_endpoint_answers_on_topic_celebration_query(client: TestClient):
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = "For your Jaipur wedding, allocating 30-35% of funds to catering guarantees high quality live chaat and sweets."
    mock_client.models.generate_content.return_value = mock_resp

    with patch("api.ai.get_gemini_client", return_value=mock_client):
        payload = {
            "message": "What is the best way to handle catering for 300 guests in Jaipur?",
            "plan_context": {"city": "Jaipur", "event_type": "wedding", "guest_count": 300},
        }
        res = client.post("/api/chat", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_off_topic"] is False
        assert "catering" in data["reply"].lower() or "jaipur" in data["reply"].lower()


def test_chat_endpoint_refuses_off_topic_coding_query(client: TestClient):
    payload = {
        "message": "Write a python script to scrape twitter data",
        "plan_context": {"city": "Delhi"},
    }
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_off_topic"] is True
    assert "dedicated" in data["reply"].lower() or "celebration" in data["reply"].lower()


def test_chat_endpoint_offline_fallback_replies_thoughtfully(client: TestClient):
    # When no client is available, should generate rich rule-based reply
    with patch("api.ai.get_gemini_client", return_value=None):
        payload = {
            "message": "How do I save budget on wedding floral decor?",
            "plan_context": {"city": "Jaipur", "event_type": "wedding"},
        }
        res = client.post("/api/chat", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_off_topic"] is False
        assert "flower" in data["reply"].lower() or "decor" in data["reply"].lower() or "marigold" in data["reply"].lower()


def test_global_exception_handler_returns_safe_500_no_stacktrace(client: TestClient):
    with patch("api.routes.compute_budget", side_effect=Exception("Simulated unexpected crash")):
        payload = {
            "event_type": "wedding",
            "date": get_future_date(90),
            "guest_count": 100,
            "total_budget": 500000,
            "city": "Chennai",
        }
        res = client.post("/api/plan", json=payload)
        assert res.status_code == 500
        data = res.json()
        assert "Internal Server Error" in data["error"]
        # Must NOT expose Python traceback or file paths!
        assert "Traceback" not in str(data)
        assert "Simulated unexpected crash" not in str(data)


def test_no_auth_header_required_for_endpoints(client: TestClient):
    """Verify /api/health, /api/plan, and /api/chat require NO Authorization header and return 200."""
    # 1. Health check with NO auth headers
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "ok"

    # 2. Plan generation with NO auth headers
    plan_payload = {
        "event_type": "birthday",
        "date": get_future_date(20),
        "guest_count": 30,
        "total_budget": 25000,
        "city": "Mumbai",
    }
    plan_res = client.post("/api/plan", json=plan_payload)
    assert plan_res.status_code == 200
    assert "budget" in plan_res.json()

    # 3. Chat endpoint with NO auth headers
    chat_payload = {
        "message": "What live counters should we serve?",
        "plan_context": {"city": "Mumbai", "event_type": "birthday"},
    }
    chat_res = client.post("/api/chat", json=chat_payload)
    assert chat_res.status_code == 200
    assert "reply" in chat_res.json()
