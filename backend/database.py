from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Требуем Postgres (или явный URL). Никакого fallback на SQLite.
DATABASE_URL = settings.DATABASE_URL or settings.db_url
if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError("DATABASE_URL must be a valid PostgreSQL URL (postgresql+psycopg2://...)")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 