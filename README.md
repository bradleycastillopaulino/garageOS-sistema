# GarageOS (web)

- `backend/` — API FastAPI + SQLite (`garageos.db` se crea solo). Puerto 8000, docs en `/docs`.
- `frontend/` — Next.js (React). Puerto 3000, proxy `/api/*` → backend.
- `src/`, `android/` — app Ionic/Angular original (legado).

## Documentación

- [Avances del proyecto (PDF)](docs/Avances-GarageOS.pdf) — https://github.com/bradleycastillopaulino/garageOS-sistema/blob/main/docs/Avances-GarageOS.pdf

## Arrancar
```powershell
# Backend
cd backend; python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Frontend
cd frontend; npm install; npm run build; npm run start
```
