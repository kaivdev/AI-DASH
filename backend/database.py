from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Database URL (default to provided; can be overridden by env)
DATABASE_URL = settings.DATABASE_URL or settings.db_url

# Create engine with a safe fallback to SQLite if psycopg2 is missing in dev
def _create_engine_with_fallback(url: str):
    try:
        if url.startswith("sqlite"):
            return create_engine(url, pool_pre_ping=True, connect_args={"check_same_thread": False})
        return create_engine(url, pool_pre_ping=True)
    except ModuleNotFoundError as e:
        # Typical when PostgreSQL driver is not installed locally
        if "psycopg2" in str(e):
            fallback = "sqlite:///./dev.db"
            print("[database] psycopg2 not installed, falling back to", fallback)
            return create_engine(fallback, pool_pre_ping=True, connect_args={"check_same_thread": False})
        raise
    except Exception as e:
        # Any other creation failure on PostgreSQL: try SQLite for local run
        if url.startswith("postgresql"):
            fallback = "sqlite:///./dev.db"
            print(f"[database] Engine init error for {url}: {e}. Falling back to {fallback}")
            return create_engine(fallback, pool_pre_ping=True, connect_args={"check_same_thread": False})
        raise

engine = _create_engine_with_fallback(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 