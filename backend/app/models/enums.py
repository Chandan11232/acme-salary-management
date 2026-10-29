from enum import StrEnum


class EmploymentType(StrEnum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"


class PayFrequency(StrEnum):
    ANNUAL = "ANNUAL"
    MONTHLY = "MONTHLY"
    BIWEEKLY = "BIWEEKLY"


PERIODS_PER_YEAR: dict[PayFrequency, int] = {
    PayFrequency.ANNUAL: 1,
    PayFrequency.MONTHLY: 12,
    PayFrequency.BIWEEKLY: 26,
}
