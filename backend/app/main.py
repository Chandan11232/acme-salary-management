from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import ai, analytics, employees, reference, salaries
from app.services.errors import DomainError


def create_app() -> FastAPI:
    app = FastAPI(title="ACME Salary Management API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(DomainError)
    async def handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    @app.get("/api/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    for module in (employees, salaries, reference, analytics, ai):
        app.include_router(module.router)
    return app


app = create_app()
