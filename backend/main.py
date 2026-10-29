"""Convenience entry point so `uvicorn main:app` works from backend/ (same as `app.main:app`)."""

from app.main import app

__all__ = ["app"]
