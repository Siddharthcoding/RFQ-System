import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

load_dotenv()


def init_postgres():
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/rfq_system")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    dbname = os.getenv("DB_NAME", "rfq_system")

    print(f"Connecting to PostgreSQL server at {host}:{port} as user '{user}'...")
    try:
        # Connect to maintenance db 'postgres' to check/create target database
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port,
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        # Check if database exists
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{dbname}';")
        exists = cur.fetchone()
        if not exists:
            cur.execute(f"CREATE DATABASE {dbname};")
            print(f"Database '{dbname}' successfully created!")
        else:
            print(f"Database '{dbname}' already exists.")

        cur.close()
        conn.close()

        # Now import models and create tables
        from app.database import engine, Base
        import app.models  # register tables
        print("Creating application tables...")
        Base.metadata.create_all(bind=engine)
        print("Tables initialized successfully!")

    except Exception as e:
        print(f"PostgreSQL initialization message: {e}")
        print("If PostgreSQL is not running yet, please ensure your PostgreSQL service is started or run: docker compose up -d")


if __name__ == "__main__":
    init_postgres()
