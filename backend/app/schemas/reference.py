from app.schemas.common import ORMModel


class DepartmentOut(ORMModel):
    id: int
    name: str
    code: str


class CountryOut(ORMModel):
    id: int
    country_name: str
    currency_code: str
    exchange_rate_to_usd: float
