"""
CelebrationAI FastAPI Application Entry Point
Exported for Vercel serverless deployment and local uvicorn execution.
"""

import os
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from api.routes import router
from api.security import SecurityHeadersMiddleware

app = FastAPI(
    title="CelebrationAI API",
    description="GenAI-powered celebration and event planner for Indian families organizing weddings, birthdays, and community gatherings.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

# 1. Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# 3. Safe Global Exception Handler (No stack traces in responses)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log securely on server side
    print(f"[ERROR] Uncaught exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected server error occurred while processing your request. Please try again.",
        },
    )

# 4. Include API routers
app.include_router(router)

# 5. Serve static files from public/ if running directly via uvicorn
public_dir = Path(__file__).resolve().parent.parent / "public"
if public_dir.exists():
    app.mount("/", StaticFiles(directory=str(public_dir), html=True), name="public")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FASTAPI_PORT", os.getenv("PORT", 8000)))
    uvicorn.run("api.index:app", host="0.0.0.0", port=port, reload=True)
