"""
Pytest configuration and shared fixtures for CelebrationAI test suite.
Mocks Gemini API so tests run 100% hermetically offline with zero network latency.
"""

from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from api.index import app
from api.security import plan_rate_limiter, chat_rate_limiter, plan_cache


@pytest.fixture(autouse=True)
def reset_limiters_and_cache():
    """Reset rate limiters and LRU cache before each test to guarantee isolation."""
    plan_rate_limiter.reset()
    chat_rate_limiter.reset()
    plan_cache.clear()
    yield
    plan_rate_limiter.reset()
    chat_rate_limiter.reset()
    plan_cache.clear()


@pytest.fixture(autouse=True)
def default_mock_gemini():
    """
    Hermetic offline testing: Ensure by default get_gemini_client returns a responsive mock
    unless overridden by a specific test.
    """
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = """
    {
        "summary": "Warm authentic celebration in India with vibrant festivities and delicious food.",
        "theme_concept": "Royal Marigold & Traditional Heritage",
        "menu_highlights": ["Live Chaat Counters", "Regional Special Thali", "Masala Chai Bar", "Kadhai Jalebi & Rabdi"],
        "activities_and_rituals": ["Traditional Welcome Aarti", "Antakshari Showdown", "Photo Booth"],
        "decor_palette": ["Marigold Yellow (#F5A623)", "Terracotta Red (#C04A26)", "Emerald (#006D5B)"],
        "money_saving_tips": ["Source seasonal marigold flowers", "Combine pre-wedding functions", "Digital invitations"]
    }
    """
    mock_client.models.generate_content.return_value = mock_resp

    with patch("api.ai.get_gemini_client", return_value=mock_client):
        yield mock_client


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app, raise_server_exceptions=False)
