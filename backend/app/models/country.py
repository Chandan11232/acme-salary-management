from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True)
    country_name: Mapped[str] = mapped_column(String(100), unique=True)
    currency_code: Mapped[str] = mapped_column(String(3))
    # USD value of one unit of the local currency (e.g. EUR -> 1.08).
    exchange_rate_to_usd: Mapped[float] = mapped_column(Float)
