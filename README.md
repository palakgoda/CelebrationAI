# CelebrationAI

**CelebrationAI** is an AI-powered celebration and event strategy planner built specifically for Indian families organizing weddings, milestone birthdays, and community gatherings (Pooja, Utsav, Diwali).

Built with a **FastAPI (Python)** backend, **Pydantic v2**, the official **google-genai** SDK, and a vanilla **HTML5 / CSS / ES Modules** frontend without external framework bloat.

---

## Key Features

1. **Rule-Based Cultural Planning Engine (`api/planner.py`)**
   - **Catering Scales Per Head:** Automatically adjusts catering share based on guest count (32% at 350 guests; 36% at 500+ guests) to protect multi-meal buffet standards.
   - **Muhurat-Aware Backward Timeline:** Backward-dated milestone pacing (180, 120, 60, 30, 14, 7, 2, 0 days before event). If the event date is under 60 days away, milestones automatically compress and flag urgent action items.
   - **Realism Threshold Warnings:** Computes budget per head against regional Indian benchmarks (e.g., weddings under ₹1,200/guest trigger actionable cost-saving advisories).
   - **Localized Vendor Checklists:** Distinct vendor categories across Weddings, Birthdays, and Community events with suggested budget percentages, local tips, and "book-by" dates.

2. **GenAI Cultural Enrichment (`api/ai.py`)**
   - Uses `gemini-2.5-flash` (with fallback models) to enrich plans with localized themes, authentic regional menus, interactive rituals, and money-saving tips.
   - Structured JSON validation with strict Pydantic v2 schemas.
   - **100% Offline Resilience:** If the Gemini API is unreachable or no API key is provided, the engine seamlessly serves rich rule-based cultural plans without crashing.

3. **Contextual Chat Advisor (`/api/chat`)**
   - Answers follow-up questions grounded in the current plan context (city, guest count, budget, functions).
   - Guardrails against off-topic queries (coding, politics, general world knowledge) and prompt injection attempts.

4. **Editorial & Accessible Design System**
   - Clean editorial styling: warm off-white canvas (`#FAF8F5`), near-black typography (`#1C1917`), and deep terracotta accent (`#C04A26`).
   - Full keyboard accessibility: ARIA radiogroups with arrow-key navigation, accessible tab patterns (`role="tablist"`), skip links, and inline validation tied to inputs via `aria-describedby`.
   - Live Indian currency notation (`₹18,00,000 (18 Lakh)`).
   - Print stylesheet for instant, clean PDF export via browser print dialog.

---

## Project Structure

```text
├── api/
│   ├── index.py          # FastAPI application entry point (Vercel-compatible)
│   ├── routes.py         # /api/health, /api/plan, /api/chat endpoints
│   ├── schemas.py        # Pydantic v2 request/response schemas & INR formatter
│   ├── planner.py        # Core rule-based calculation, realism, timeline & vendors
│   ├── ai.py             # Google Gemini SDK integration & offline fallbacks
│   └── security.py       # Rate limiting, security headers, LRU cache & input sanitization
├── public/
│   ├── index.html        # Semantic HTML5 frontend
│   ├── css/
│   │   └── styles.css    # Editorial stylesheet with responsive grid & print rules
│   └── js/
│       ├── main.js       # Form handling, currency preview & radiogroup logic
│       ├── api.js        # Typed fetch client with timeout handling
│       ├── render.js     # Safe DOM rendering, tables, checklists & timeline
│       └── state.js      # Client state & localStorage checklist persistence
├── tests/
│   ├── conftest.py       # Pytest fixtures and hermetic offline Gemini mock
│   ├── test_planner.py   # Unit tests for budget math, realism & timelines
│   ├── test_schemas.py   # Unit tests for Pydantic bounds & validation
│   ├── test_security.py  # Unit tests for rate limiting, cache & CSP headers
│   └── test_ai_and_api.py# Integration tests for API routes, mock AI & error paths
├── requirements.txt      # Python dependencies
├── vercel.json           # Vercel serverless deployment routing
├── .env.example          # Environment variable template
└── metadata.json         # AI Studio Applet metadata
```

---

## Quickstart

### 1. Python Environment Setup
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your `GEMINI_API_KEY`:
```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
```

### 3. Run Test Suite
Run the 50+ unit and integration tests (with hermetic offline Gemini mocking):
```bash
pytest -v
```

### 4. Run Locally
Start the FastAPI server:
```bash
python3 -m uvicorn api.index:app --host 0.0.0.0 --port 3000 --reload
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment (Vercel)

This project is pre-configured for zero-configuration Vercel deployment:
- `vercel.json` routes `/api/(.*)` to `api/index.py` via `@vercel/python`.
- All static assets in `public/` are served via `@vercel/static`.
