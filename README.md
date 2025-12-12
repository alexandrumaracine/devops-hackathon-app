# SkyCastNow Weather Platform

Full-stack weather dashboard built for the SkyCastNow partner demo. It pairs a React frontend with a FastAPI backend that proxies OpenWeatherMap data and stores recent searches in MySQL. GitHub Actions build and ship Docker images to ECS/ECR.

Briefing deck: [SkyCastNow-Brief.pdf](SkyCastNow-Brief.pdf)

## Architecture
- **Frontend** (`app/frontend`): React app served as static assets via `serve`. Talks to the backend at `REACT_APP_API_BASE_URL` (default same-origin). Uses OpenWeatherMap Geocoding API directly for autocomplete and Recharts for visualizations.
- **Backend** (`app/backend`): FastAPI service exposing `/api/*` plus `/health`. Proxies OpenWeatherMap current + 5-day forecast, normalizes data, and writes recent searches to MySQL as best-effort (API stays up even if DB is down).
- **Data layer**: MySQL table `search_history` (id, city, created_at). Frontend falls back to `localStorage` history if the DB is unreachable.
- **Containers**: Individual Dockerfiles per service; `docker-compose.yml` wires them together (`backend` on `localhost:3000`, `frontend` served on `localhost:8000` -> container port 3000).
- **Resilience**: Frontend performs periodic `/health` pings, shows reconnect UI, and retries with a simple backoff if the backend is unavailable.

## Features
- Auto-location weather on load (geolocation -> `/api/weather/coords`).
- City search with autocomplete suggestions (OpenWeatherMap Geocoding API).
- Current conditions + 5-forecast view with charts.
- Persistent recent history (MySQL when available; `localStorage` fallback).
- DB debug panel showing the latest stored rows when the DB is reachable.

## Local Development
### Prerequisites
- Node.js 20+, Python 3.11+, and access to a MySQL instance (or skip DB for a stateless demo).

### Backend (FastAPI)
```bash
cd app/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Env: set OpenWeather + MySQL connection details
export OPENWEATHER_API_KEY=...
export MYSQL_HOST=... MYSQL_DATABASE=weatherdb MYSQL_USER=weatheruser MYSQL_PASSWORD=weatherpass
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

### Frontend (React)
```bash
cd app/frontend
npm install
# Env (optional): autocomplete + API base override
export REACT_APP_OPENWEATHER_API_KEY=...
export REACT_APP_API_BASE_URL=http://localhost:3000/api
npm start
```
Open http://localhost:3000 if you proxy through the backend, or http://localhost:8000 when using Docker.

### Docker Compose
```bash
docker compose up --build
```
- Frontend: http://localhost:8000  
- Backend API: http://localhost:3000/api

## API Surface (backend)
- `GET /health` and `GET /api/health` — liveness probes.
- `GET /api/weather?city=City` — current weather + trimmed forecast.
- `GET /api/weather/coords?lat=..&lon=..` — same response using coordinates.
- `GET /api/history?limit=10` — recent searches from MySQL.

## Environment Variables
- **Backend**: `OPENWEATHER_API_KEY`, `MYSQL_HOST`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` (optional: `OPENWEATHERMAP_API_KEY` alias).
- **Frontend**: `REACT_APP_API_BASE_URL` (e.g., `http://localhost:3000/api`), `REACT_APP_OPENWEATHER_API_KEY` for autocomplete.

## GitHub Actions CI/CD
Workflow: `.github/workflows/docker-image.yml`
- Trigger: manual `workflow_dispatch` (push to `main` commented but ready). Each job also checks path changes (`frontend/` or `backend/`) for push events.
- AWS setup: `actions/checkout`, `configure-aws-credentials@v4`, and `amazon-ecr-login@v2`. Secrets supply AWS keys and app env values.
- **Deploy Frontend** job:
  - Rebuilds `app/frontend/.env` from GitHub Secrets (`FRONTEND_*`).
  - Builds Docker image, tags as `team2-weather-app-frontend:latest`, and pushes to ECR.
  - Downloads current ECS task definition, renders it with the new image, and deploys to the ECS service/cluster (`AWS_ECR_FRONTEND_SERVICE`, `AWS_ECR_CLUSTER`).
- **Deploy Backend** job:
  - Writes `app/backend/.env` from secrets (`BACKEND_*`).
  - Builds/pushes `team2-weather-app-backend:latest` to ECR.
  - Renders and deploys the backend ECS task definition using the same ECS cluster/service vars.
- Both jobs use `force-new-deployment: true` to roll ECS tasks after each push.

## Repo Structure
- `app/frontend/` — React UI and static build.
- `app/backend/` — FastAPI service and DB layer.
- `docker-compose.yml` — local orchestration for frontend + backend.
- `weather-test.js`, `LoadTest.md` — supportive test/load assets.
