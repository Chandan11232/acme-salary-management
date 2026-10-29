"""Known entity names (departments, countries) and the phrases that refer to them."""

import re
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Country, Department

# Extra phrases for well-known countries; any country also matches its own name.
_COUNTRY_ALIASES: dict[str, list[str]] = {
    "united states": ["usa", "u.s.", "u.s.a.", "america", "american", "united states of america"],
    "united kingdom": ["uk", "u.k.", "britain", "great britain", "england", "british"],
    "germany": ["german"],
    "india": ["indian"],
    "canada": ["canadian"],
    "japan": ["japanese"],
}
_DEPARTMENT_ALIASES: dict[str, list[str]] = {
    "engineering": ["engineering team", "eng"],
    "human resources": ["hr", "people team", "people ops"],
    "customer support": ["support", "customer service"],
    "operations": ["ops"],
    "product": ["product team", "product management"],
}


@dataclass(frozen=True)
class Entity:
    id: int
    name: str
    phrases: tuple[str, ...]


@dataclass
class Vocabulary:
    departments: list[Entity] = field(default_factory=list)
    countries: list[Entity] = field(default_factory=list)

    @classmethod
    def load(cls, db: Session) -> "Vocabulary":
        departments = [
            Entity(d.id, d.name, (d.name.lower(), d.code.lower(), *_DEPARTMENT_ALIASES.get(d.name.lower(), [])))
            for d in db.scalars(select(Department))
        ]
        countries = [
            Entity(c.id, c.country_name, (c.country_name.lower(), *_COUNTRY_ALIASES.get(c.country_name.lower(), [])))
            for c in db.scalars(select(Country))
        ]
        return cls(departments, countries)

    def resolve(self, kind: str, name: str) -> Entity | None:
        """Case-insensitive lookup by name or alias."""
        needle = name.strip().lower()
        return next((e for e in getattr(self, kind) if needle == e.name.lower() or needle in e.phrases), None)


def find_mentions(text: str, entities: list[Entity]) -> list[Entity]:
    """Entities whose name or alias appears in `text` as whole words, longest phrase first
    so "customer support" wins over "support"."""
    found: list[Entity] = []
    spans: list[tuple[int, int]] = []
    candidates = sorted(((p, e) for e in entities for p in e.phrases), key=lambda pe: -len(pe[0]))
    for phrase, entity in candidates:
        for match in re.finditer(rf"(?<![\w.]){re.escape(phrase)}(?![\w])", text):
            if any(s < match.end() and match.start() < e for s, e in spans):
                continue
            spans.append(match.span())
            if entity not in found:
                found.append(entity)
    return found
