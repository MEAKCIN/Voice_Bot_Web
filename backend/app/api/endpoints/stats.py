from fastapi import APIRouter
from ...services.stats import StatsService

router = APIRouter()
stats_service = StatsService()

@router.get("/api/stats")
async def get_stats():
    return stats_service.get_stats()
