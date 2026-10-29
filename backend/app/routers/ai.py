import logging
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.services.ai.llm_parser import LLMParser
from app.services.ai.query_spec import AIAnswer, AIQuestion
from app.services.ai.service import QueryParser, answer_question

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger(__name__)


@lru_cache
def get_llm_parser() -> QueryParser | None:
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    try:
        return LLMParser(settings.anthropic_api_key, settings.ai_model, settings.ai_timeout_seconds)
    except ImportError:
        logger.warning("ANTHROPIC_API_KEY is set but the anthropic package is not installed; using rule parser")
        return None


@router.post("/query", response_model=AIAnswer)
def query(
    payload: AIQuestion,
    db: Annotated[Session, Depends(get_db)],
    llm: Annotated[QueryParser | None, Depends(get_llm_parser)],
):
    return answer_question(db, payload.question.strip(), llm)
