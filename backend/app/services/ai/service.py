import logging
from typing import Protocol

from sqlalchemy.orm import Session

from app.services.ai import rule_parser
from app.services.ai.executor import execute
from app.services.ai.query_spec import AIAnswer, Intent, QuerySpec
from app.services.ai.vocabulary import Vocabulary

logger = logging.getLogger(__name__)


class QueryParser(Protocol):
    def parse(self, question: str, vocab: Vocabulary) -> QuerySpec: ...


def answer_question(db: Session, question: str, llm: QueryParser | None = None) -> AIAnswer:
    """Parse with the LLM when configured, falling back to the rule parser on any failure
    or when the LLM finds the question unsupported but the rules can still answer it."""
    vocab = Vocabulary.load(db)
    if llm is not None:
        try:
            spec = llm.parse(question, vocab)
            if spec.intent != Intent.UNSUPPORTED:
                return execute(db, spec, vocab, question, parser="llm")
        except Exception:  # noqa: BLE001 - any LLM failure must degrade gracefully
            logger.warning("LLM query parsing failed; falling back to rule parser", exc_info=True)
    return execute(db, rule_parser.parse(question, vocab), vocab, question, parser="rules")
