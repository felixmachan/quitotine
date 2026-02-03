# Quitotine (Backend)

Quitotine is a nicotine quitting progress tracker. This repo contains only the backend API, database, and dev setup.

## Stack
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy 2.0 + Alembic
- JWT auth (access + refresh), bcrypt hashing
- Pydantic v2
- Docker + docker-compose
- Pytest

## Quick Start

1) Start services
```bash
docker-compose up --build
```

2) Apply migrations
```bash
docker-compose exec api alembic upgrade head
```

3) Run tests
```bash
docker-compose exec api pytest
```

API runs at `http://localhost:8000` with OpenAPI at `/docs`.

## Environment
The API reads environment variables. Defaults are set for local dev in `docker-compose.yml`.

Key variables:
- `DATABASE_URL`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `CORS_ORIGINS` (comma-separated)

## Migrations
Create a new migration:
```bash
docker-compose exec api alembic revision --autogenerate -m "your message"
```

## Notes
- All endpoints are under `/api/v1`.
- CORS is configured for local React dev origins by default.
- Rate limiting is a placeholder middleware hook in `app/main.py`.
