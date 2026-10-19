# 🌾 Agri-Yield Pro

**AI crop advice for Indian farmers — with live weather, today's mandi prices and a simple, farmer-friendly interface.**
Focused on South India (Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, Telangana, Puducherry), works across India.

🔗 **Live:** https://agri-yield-pro-india.vercel.app

---

## What it does

| Page | What the farmer gets |
|---|---|
| **Dashboard** | Pick a crop and move sliders for land, soil pH and fertilizer → expected harvest (quintal/acre), total crop and its value at today's price, crop health, pest risk and a tick-off to-do list. Live weather, 7-day forecast, soil moisture, last 12 months of rain vs the year before, and today's mandi prices for the crop. |
| **AI Yield Optimizer** | Interactive form with each crop's ideal range shown on the sliders, a live result that updates as you change values, what-if analysis, model comparison and cost/profit estimate. South Indian crops (Banana, Turmeric, Ragi, Black Gram, Chilli…) and soils (Red, Laterite, Coastal Sandy). |
| **Crop Planning** | Full crop-lifecycle plan with daily tasks, irrigation and fertilizer schedules, re-planning with today's real weather (or "what if heavy rain / drought?"), and real mandi prices for selling. |
| **India Agriculture** | Today's mandi prices state by state (South India or All India) with search, sort and CSV export, plus long-term World Bank statistics for Indian farming. |
| **Krishi Mitra chat** | Farm assistant in English, Tamil, Telugu, Kannada, Malayalam, Hindi and more; answers with live weather and prices, read-aloud and voice input. |
| **Alerts 🔔** | Storm, heavy rain, heat, wind, fungus risk, dry spell, soil moisture, mandi price and crop-plan alerts — each type can be switched on/off; optional phone/desktop notifications. |
| **Accounts** | Email + password, mobile OTP login, forgot/change password, Google sign-in, profile editing. |

Every number comes from a real source — nothing is simulated:

| Data | Source |
|---|---|
| Weather, forecast, soil moisture | [Open-Meteo](https://open-meteo.com) (fetched in the browser) |
| Past rainfall | Open-Meteo archive (ERA5) |
| Mandi prices | [Agmarknet via data.gov.in](https://data.gov.in) |
| India farm statistics | [World Bank Open Data](https://data.worldbank.org) |
| Place search / names | Open-Meteo geocoding, OpenStreetMap Nominatim |

> Yield predictions are model estimates based on agronomic ideal ranges; they use today's real weather but are guidance, not guarantees.

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, lucide-react — `frontend/`
- **Backend:** FastAPI (Python 3.12), SQLAlchemy, python-jose (JWT), bcrypt — `backend/`
- **Database:** PostgreSQL in production (Render), SQLite file locally
- **Hosting:** Vercel (frontend + Mumbai relay function) · Render (API + Postgres, Singapore)

```
Browser ──► Vercel (agri-yield-pro-india.vercel.app)
   │           ├─ static React app
   │           ├─ /api/agmarknet  → Mumbai (bom1) relay → data.gov.in   (India-only API)
   │           └─ /api/*          → Render backend (Singapore) ─► Render Postgres
   └─────────► api.open-meteo.com  (weather, straight from the browser)
```

---

## Project structure

```
backend/
  main.py           FastAPI app: yield prediction, crop planning, saved fields
  live_data.py      /api/live/*  weather, rain history, mandi prices, places, World Bank
  ml_optimizer.py   /api/ml/*    AI Yield Optimizer (decision tree + ensemble, pure Python)
  ai_chat.py        /api/ai/*    Krishi Mitra chat
  auth_routes.py    /api/auth/*  OTP, password change/reset, Google, profile
  database.py       DATABASE_URL handling (Postgres or SQLite)
  sms_check.py      send one test SMS
  db_check.py       test a database connection string
frontend/
  src/components/   Dashboard, YieldOptimizer, CropPlanning, IndiaAgriculture,
                    AIChatBox, NotificationCenter, LocationPicker, auth/…
  src/lib/          live data, weather, farm location and auth helpers
  api/agmarknet.js  Vercel function (Mumbai) that relays mandi price requests
  vercel.json       routes /api/* to Render
render.yaml         Render Blueprint (API + Postgres)
DEPLOY.md           deployment guide
```

---

## Run it locally

**Requirements:** Python 3.12, Node.js 20+.

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # then fill in what you need (see below)
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs · uses `backend/farm_ai.db` (SQLite) when `DATABASE_URL` is empty.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. In development the frontend talks to `http://localhost:8000`.

Without an SMS key the app runs OTP in **test mode** — the code is shown on screen and in the server log.

---

## Configuration (`backend/.env`)

| Variable | Needed for | Notes |
|---|---|---|
| `SECRET_KEY` | login tokens | long random string; Render generates one |
| `APP_ENV` | safety | `production` hides test OTP codes |
| `DATABASE_URL` | accounts & saved data | Postgres URL; empty = local SQLite |
| `DATABASE_PASSWORD` | optional | fills a `[YOUR-PASSWORD]` placeholder in the URL |
| `SMS_PROVIDER`, `FAST2SMS_API_KEY`, `FAST2SMS_ROUTE` | mobile OTP | `fast2sms` (also supports `msg91`, `twilio`) |
| `GOOGLE_CLIENT_ID` | Google sign-in | OAuth *Web application* client ID |
| `DATA_GOV_IN_API_KEY` | faster mandi prices | free key from data.gov.in; a public sample key is used otherwise |
| `MANDI_PROXY_URL` | hosting outside India | set to the Vercel relay (`…/api/agmarknet`) |

Helpful checks (from `backend/`):
```bash
venv\Scripts\python.exe sms_check.py 98XXXXXXXX     # sends one test OTP SMS
venv\Scripts\python.exe db_check.py                 # tests DATABASE_URL from .env
```

---

## Deploy

Pushing to `main` redeploys automatically:
- **Vercel** builds `frontend/` (and the Mumbai relay function).
- **Render** reads `render.yaml`: the API service plus a free Postgres database, wired together automatically.

Step-by-step setup is in **[DEPLOY.md](DEPLOY.md)**.

---

## Known limits

- **Free Render Postgres expires after 30 days** unless upgraded — upgrade `agri-yield-pro-db` in Render before then.
- The free Render API **sleeps after 15 idle minutes**; the first request afterwards takes 30–60 s.
- Mandi prices depend on what markets report that day — early mornings or some crops/states may have few or no reports (the app then widens to South India / All India).
- The data.gov.in sample key is rate-limited; first loads can take 5–15 s (cached for 30 min afterwards). A personal key is much faster.
- Crop plans are kept in server memory and reset when the API restarts.
- Mobile OTP needs an SMS provider key; Google sign-in needs a client ID.
- `frontend copy/` is an old duplicate of the frontend and is not used.

---

## License

No license specified yet — all rights reserved by the author.
