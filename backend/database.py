import os
import re

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Production: DATABASE_URL from a hosted Postgres (Neon / Render).
# Local development: falls back to the SQLite file next to this module.
def _clean_db_url(raw: str) -> str:
    """Accept what dashboards' copy buttons paste: `psql '...'`, quotes, `DATABASE_URL=...`."""
    found = re.search(r"postgres(?:ql)?(?:\+\w+)?://[^\s'\"]+", raw or "")
    if found:
        return found.group(0)
    value = (raw or "").strip().strip("'\"")
    # "user:password@host/db?..." pasted without the scheme
    if re.fullmatch(r"[^\s@/:]+:[^\s@]+@[^\s/]+/\S+", value):
        return "postgresql://" + value
    return value


SQLALCHEMY_DATABASE_URL = _clean_db_url(os.environ.get("DATABASE_URL", "")) or "sqlite:///./farm_ai.db"
if SQLALCHEMY_DATABASE_URL.startswith(("postgres://", "postgresql://")):
    # Use the psycopg 3 driver (hosts hand out plain postgres:// URLs).
    SQLALCHEMY_DATABASE_URL = "postgresql+psycopg://" + SQLALCHEMY_DATABASE_URL.split("://", 1)[1]

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # pre_ping/recycle: free Postgres tiers drop idle connections.
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
