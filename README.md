# Quitotine

Quitotine is a nicotine quitting progress tracker. This repo contains a backend API plus a separate frontend landing/onboarding app.

## Stack
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy 2.0 + Alembic
- JWT auth (access + refresh), bcrypt hashing
- Pydantic v2
- Docker + docker-compose
- Pytest
- React + Vite + Tailwind (frontend)

## Quick Start (Backend)

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
- Rate limiting is a placeholder middleware hook in `backend/app/main.py`.

---

## Frontend (Landing + Onboarding)

This repo includes a standalone React + Vite + Tailwind landing page with scrollytelling onboarding.

Run it locally from the `frontend` folder:
```bash
cd frontend
npm install
npm run dev
```

### How the scroll scenes work
- Each scene is a full viewport section in `frontend/src/scenes/` using the `Section` component.
- `Section` uses Framer Motion `useScroll` + `useTransform` for opacity, rise, and blur on enter/exit.
- Active section tracking uses `IntersectionObserver` in `frontend/src/app/App.tsx` to drive the progress rail.

### Copy tweaks
Update copy in `frontend/src/content/copy.ts`.

### Reduce Motion
Motion transforms are disabled automatically when `prefers-reduced-motion` is set.

## Dev Scripts (Local Postgres)

Backend (FastAPI) with local Postgres:
```bash
./scripts/dev-backend.ps1
```
Optional parameters:
```bash
./scripts/dev-backend.ps1 -DbUser myuser -DbPass mypass -DbName mydb -DbHost localhost -DbPort 5432
```

Frontend:
```bash
./scripts/dev-frontend.ps1
```
