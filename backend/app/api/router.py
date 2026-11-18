from fastapi import APIRouter
from app.api.teams import router as teams_router
from app.api.judges import router as judges_router
from app.api.rounds import router as rounds_router
from app.api.assignments import router as assignments_router
from app.api.evaluations import router as evaluations_router
from app.api.audit import router as audit_router
from app.api.results import router as results_router
from app.api.announcements import router as announcements_router
from app.api.pdf import router as pdf_router
from app.api.feedback import router as feedback_router

api_router = APIRouter()

@api_router.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "NexHack Judging Portal API",
        "version": "0.1.0"
    }

api_router.include_router(teams_router)
api_router.include_router(judges_router)
api_router.include_router(rounds_router)
api_router.include_router(assignments_router)
api_router.include_router(evaluations_router)
api_router.include_router(audit_router)
api_router.include_router(results_router)
api_router.include_router(announcements_router)
api_router.include_router(pdf_router)
api_router.include_router(feedback_router)





