"""API routes."""

from fastapi import APIRouter

from app.api.routes import admin, auth, evaluations, face_analysis, health, questions, sessions

api_router = APIRouter()

# Health check
api_router.include_router(health.router, tags=["health"])

# Authentication
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# User-facing APIs
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(questions.router, prefix="/scripts", tags=["scripts"])

# Admin APIs
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# Face Analysis API
api_router.include_router(face_analysis.router, prefix="/face", tags=["face-analysis"])
