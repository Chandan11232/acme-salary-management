from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Country, Department
from app.schemas.reference import CountryOut, DepartmentOut

router = APIRouter(prefix="/api", tags=["reference"])
DB = Annotated[Session, Depends(get_db)]


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: DB):
    return db.scalars(select(Department).order_by(Department.name)).all()


@router.get("/countries", response_model=list[CountryOut])
def list_countries(db: DB):
    return db.scalars(select(Country).order_by(Country.country_name)).all()
