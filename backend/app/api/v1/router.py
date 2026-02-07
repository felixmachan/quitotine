from fastapi import APIRouter

from app.api.v1.endpoints import auth, profile, programs, events, progress, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profile.router, prefix="/me", tags=["me"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
