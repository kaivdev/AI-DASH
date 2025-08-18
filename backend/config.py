import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://dashboard_user:password@localhost:5432/dashboard_db"
    )
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "dashboard_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "dashboard_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    # Плановые рабочие часы в месяц для авторасчёта себестоимости часа из зарплаты
    PLANNED_MONTHLY_HOURS: int = int(os.getenv("PLANNED_MONTHLY_HOURS", "160"))
    # Telegram bot
    TELEGRAM_BOT_TOKEN: str | None = os.getenv("TELEGRAM_BOT_TOKEN")
    TELEGRAM_WEBHOOK_SECRET: str = os.getenv("TELEGRAM_WEBHOOK_SECRET", "changeme-secret")
    TELEGRAM_WEBHOOK_URL: str | None = os.getenv("TELEGRAM_WEBHOOK_URL")
    
    # Альтернативная конструкция URL если отдельные параметры
    @property
    def db_url(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings() 