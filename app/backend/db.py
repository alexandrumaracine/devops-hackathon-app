import os
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError


MYSQL_HOST = os.getenv("MYSQL_HOST", "db")
MYSQL_DB = os.getenv("MYSQL_DATABASE", "weatherdb")
MYSQL_USER = os.getenv("MYSQL_USER", "weatheruser")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "weatherpass")
MYSQL_SSL_DISABLED = os.getenv("MYSQL_SSL_DISABLED", "false").lower() == "true"

DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"

connect_args = {}

if MYSQL_SSL_DISABLED:
    print("⚠️  MySQL SSL disabled (MYSQL_SSL_DISABLED=true)")
    connect_args = {"ssl": {"disabled": True}}
else:
    print("🔐 MySQL SSL enabled")
    connect_args = {
        "ssl": {
            "ca": "/etc/ssl/certs/ca-certificates.crt"
        }
    }

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    city = Column(String(100), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def save_search(city: str):
    db = SessionLocal()
    try:
        db.execute(
            text("""
                INSERT INTO search_history (city, created_at)
                VALUES (:city, NOW())
                ON DUPLICATE KEY UPDATE created_at = NOW();
            """),
            {"city": city}
        )
        db.commit()
    except SQLAlchemyError as e:
        # Log and ignore DB problems – weather endpoint must still work
        print("save_search DB error, skipping:", e)
        db.rollback()
    finally:
        db.close()


def get_recent_searches(limit: int = 10):
    db = SessionLocal()
    try:
        return (
            db.query(SearchHistory)
              .order_by(SearchHistory.id.desc())
              .limit(limit)
              .all()
        )
    finally:
        db.close()

# Ensure DB tables exist at startup
init_db()