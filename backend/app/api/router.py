from fastapi import APIRouter
from app.api.teams import router as teams_router

api_router = APIRouter()

@api_router.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "NexHack Judging Portal API",
        "version": "0.1.0"
    }

api_router.include_router(teams_router)

