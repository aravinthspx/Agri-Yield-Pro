"""Live, real-world data for the app.

Every number served here comes from a public source at request time (cached
briefly so we stay polite to the providers):

- Weather, 7-day forecast, soil moisture  → Open-Meteo forecast API
- Past rainfall / temperature             → Open-Meteo archive (ERA5) API
- Place search                            → Open-Meteo geocoding API
- Reverse geocoding (state / district)    → OpenStreetMap Nominatim
- Today's mandi prices                    → data.gov.in / Agmarknet
- India agriculture indicators            → World Bank Open Data API
"""
import json
import os
import statistics
import threading
import time
import urllib.parse
import urllib.error
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/live", tags=["Live data"])

USER_AGENT = "AgriYieldPro/1.0 (crop advisory app)"

# data.gov.in publishes this sample key for public use (10 records per call).
# Register at https://data.gov.in for a personal key with higher limits.
DATA_GOV_IN_KEY = os.environ.get("DATA_GOV_IN_API_KEY", "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b")
MANDI_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"

# ─── HTTP + cache helpers ────────────────────────────────────────────────────

_cache: Dict[str, tuple] = {}
_cache_lock = threading.Lock()


def _get_json(url: str, timeout: float = 25, retries: int = 3) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            # Back off on rate limits / temporary upstream errors.
            if exc.code not in (429, 500, 502, 503, 504) or attempt == retries:
                raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            if attempt == retries:
                raise
        time.sleep(1.5 * (attempt + 1))


def _cached(key: str, ttl: int, fn: Callable[[], Any]) -> Any:
    now = time.time()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    value = fn()
    with _cache_lock:
        _cache[key] = (now, value)
    return value


def _upstream(fn: Callable[[], Any], source: str) -> Any:
    try:
        return fn()
    except HTTPException:
        raise
    except Exception as exc:  # network errors, bad JSON, timeouts
        raise HTTPException(status_code=502, detail=f"{source} is not reachable right now ({type(exc).__name__}). Please try again.")


def _coord(v: float) -> str:
    return f"{v:.2f}"


# ─── Weather ─────────────────────────────────────────────────────────────────

WEATHER_CODES = {
    0: ("Clear sky", "☀️"), 1: ("Mainly clear", "🌤️"), 2: ("Partly cloudy", "⛅"), 3: ("Cloudy", "☁️"),
    45: ("Fog", "🌫️"), 48: ("Fog", "🌫️"), 51: ("Light drizzle", "🌦️"), 53: ("Drizzle", "🌦️"), 55: ("Heavy drizzle", "🌧️"),
    61: ("Light rain", "🌦️"), 63: ("Rain", "🌧️"), 65: ("Heavy rain", "🌧️"), 66: ("Freezing rain", "🌧️"), 67: ("Freezing rain", "🌧️"),
    71: ("Light snow", "🌨️"), 73: ("Snow", "🌨️"), 75: ("Heavy snow", "❄️"), 77: ("Snow grains", "🌨️"),
    80: ("Rain showers", "🌦️"), 81: ("Rain showers", "🌧️"), 82: ("Violent showers", "⛈️"),
    85: ("Snow showers", "🌨️"), 86: ("Snow showers", "🌨️"), 95: ("Thunderstorm", "⛈️"), 96: ("Thunderstorm, hail", "⛈️"), 99: ("Thunderstorm, hail", "⛈️"),
}


def _describe(code: Optional[int]) -> Dict[str, str]:
    label, icon = WEATHER_CODES.get(int(code or 0), ("Unknown", "🌡️"))
    return {"label": label, "icon": icon}


def _day_advice(rain_prob: float, rain_mm: float, wind_max: float, tmax: float, et0: float) -> List[str]:
    tips = []
    if rain_prob >= 60 or rain_mm >= 10:
        tips.append("Skip irrigation and fertilizer — rain expected")
    elif et0 - rain_mm >= 4:
        tips.append("Crop will lose a lot of water — irrigate")
    if wind_max < 15 and rain_prob < 40:
        tips.append("Good day for spraying")
    elif wind_max >= 25:
        tips.append("Too windy to spray")
    elif rain_mm >= 3:
        tips.append("Some rain expected — you can delay irrigation")
    if tmax >= 38:
        tips.append("Heat stress — water early morning or evening")
    return tips or ["Normal field work"]


@router.get("/weather")
def live_weather(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    """Current conditions, soil moisture and a 7-day forecast with farm advice."""
    def fetch():
        params = {
            "latitude": lat, "longitude": lon, "timezone": "auto", "forecast_days": 7,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day",
            "hourly": "precipitation_probability,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_temperature_6cm",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,uv_index_max,sunrise,sunset",
        }
        d = _get_json("https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(params))
        cur, hourly, daily = d["current"], d["hourly"], d["daily"]
        # Hourly values for the current hour (soil + rain probability are hourly-only fields).
        hour_key = cur["time"][:13] + ":00"
        hi = hourly["time"].index(hour_key) if hour_key in hourly["time"] else 0
        pick = lambda k: hourly[k][hi] if hourly.get(k) and hourly[k][hi] is not None else None

        days = []
        for i, day in enumerate(daily["time"]):
            rp = daily["precipitation_probability_max"][i] or 0
            rmm = daily["precipitation_sum"][i] or 0
            wmax = daily["wind_speed_10m_max"][i] or 0
            tmax = daily["temperature_2m_max"][i]
            et0 = daily["et0_fao_evapotranspiration"][i] or 0
            days.append({
                "date": day, **_describe(daily["weather_code"][i]),
                "temp_max": tmax, "temp_min": daily["temperature_2m_min"][i],
                "rain_mm": rmm, "rain_probability": rp, "wind_max": wmax, "et0_mm": et0,
                "uv_max": daily["uv_index_max"][i], "sunrise": daily["sunrise"][i], "sunset": daily["sunset"][i],
                "advice": _day_advice(rp, rmm, wmax, tmax, et0),
            })
        soil_top = pick("soil_moisture_0_to_1cm")
        soil_root = pick("soil_moisture_3_to_9cm")
        return {
            "source": "Open-Meteo", "fetched_at": datetime.now().isoformat(timespec="seconds"),
            "timezone": d.get("timezone"), "elevation": d.get("elevation"),
            "current": {
                "time": cur["time"], **_describe(cur.get("weather_code")),
                "temperature": cur["temperature_2m"], "feels_like": cur.get("apparent_temperature"),
                "humidity": cur["relative_humidity_2m"], "precipitation": cur["precipitation"],
                "rain_probability": pick("precipitation_probability") if pick("precipitation_probability") is not None else days[0]["rain_probability"],
                "wind_speed": cur["wind_speed_10m"], "wind_gusts": cur.get("wind_gusts_10m"), "is_day": bool(cur.get("is_day", 1)),
            },
            "soil": {
                "moisture_surface": soil_top, "moisture_root": soil_root,  # m³/m³
                "temperature": pick("soil_temperature_6cm"),
                "status": None if soil_root is None else ("Dry" if soil_root < 0.15 else "Wet" if soil_root > 0.35 else "Moist"),
            },
            "daily": days,
        }
    return _upstream(lambda: _cached(f"wx:{_coord(lat)}:{_coord(lon)}", 600, fetch), "Open-Meteo weather")


@router.get("/rain-history")
def rain_history(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    """Monthly rainfall and mean temperature for the last 12 months vs the 12 before."""
    def fetch():
        end = date.today() - timedelta(days=6)  # archive (ERA5) lags ~5 days
        start = (end.replace(day=1) - timedelta(days=700)).replace(day=1)
        params = {"latitude": lat, "longitude": lon, "timezone": "auto", "start_date": start.isoformat(),
                  "end_date": end.isoformat(), "daily": "precipitation_sum,temperature_2m_mean"}
        d = _get_json("https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(params), timeout=40)["daily"]
        rain, temps = defaultdict(float), defaultdict(list)
        for t, p, tm in zip(d["time"], d["precipitation_sum"], d["temperature_2m_mean"]):
            ym = t[:7]
            rain[ym] += p or 0
            if tm is not None:
                temps[ym].append(tm)
        months = sorted(rain)[-12:]
        out = []
        for ym in months:
            y, m = map(int, ym.split("-"))
            prev = f"{y - 1}-{m:02d}"
            out.append({
                "month": datetime(y, m, 1).strftime("%b %y"),
                "rain_mm": round(rain[ym], 1),
                "rain_prev_year_mm": round(rain[prev], 1) if prev in rain else None,
                "temp_mean": round(statistics.mean(temps[ym]), 1) if temps[ym] else None,
            })
        total = sum(m["rain_mm"] for m in out)
        prev_total = sum(m["rain_prev_year_mm"] or 0 for m in out)
        return {"source": "Open-Meteo archive (ERA5)", "through": end.isoformat(), "months": out,
                "total_mm": round(total), "prev_total_mm": round(prev_total)}
    return _upstream(lambda: _cached(f"rain:{_coord(lat)}:{_coord(lon)}", 6 * 3600, fetch), "Open-Meteo archive")


# ─── Places ──────────────────────────────────────────────────────────────────

@router.get("/geocode")
def geocode(q: str = Query(..., min_length=2, max_length=80)):
    """Search Indian villages / towns / districts by name."""
    def fetch():
        params = {"name": q, "count": 8, "language": "en", "countryCode": "IN", "format": "json"}
        d = _get_json("https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(params))
        return {"results": [
            {"name": r["name"], "state": r.get("admin1"), "district": r.get("admin2"),
             "lat": r["latitude"], "lon": r["longitude"]}
            for r in d.get("results", [])
        ]}
    return _upstream(lambda: _cached(f"geo:{q.lower()}", 86400, fetch), "Place search")


@router.get("/reverse")
def reverse_geocode(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    """Name the place, district and state for a GPS position."""
    def fetch():
        params = {"lat": lat, "lon": lon, "format": "json", "zoom": 10, "accept-language": "en"}
        d = _get_json("https://nominatim.openstreetmap.org/reverse?" + urllib.parse.urlencode(params))
        a = d.get("address", {})
        name = a.get("village") or a.get("town") or a.get("city") or a.get("suburb") or a.get("county") or a.get("state_district")
        return {"name": name, "district": a.get("state_district") or a.get("county"), "state": a.get("state"), "country": a.get("country_code")}
    return _upstream(lambda: _cached(f"rev:{_coord(lat)}:{_coord(lon)}", 86400, fetch), "OpenStreetMap")


# ─── Mandi prices (Agmarknet via data.gov.in) ────────────────────────────────

# App crop name → Agmarknet commodity keyword (the API does keyword matching).
MANDI_COMMODITY = {
    "rice": "Rice", "paddy": "Paddy", "wheat": "Wheat", "maize": "Maize", "maize (corn)": "Maize", "cotton": "Cotton",
    "sugarcane": "Sugarcane", "groundnut": "Groundnut", "tomato": "Tomato", "potato": "Potato", "onion": "Onion",
    "chickpea": "Bengal Gram", "turmeric": "Turmeric", "banana": "Banana", "chilli": "Dry Chillies", "green chilli": "Green Chilli",
    "mango": "Mango", "sunflower": "Sunflower", "ginger": "Ginger", "sorghum": "Jowar", "pearl millet": "Bajra",
    "finger millet": "Ragi", "barley": "Barley", "brinjal": "Brinjal", "cabbage": "Cabbage", "cauliflower": "Cauliflower",
    "carrot": "Carrot", "okra": "Bhindi", "spinach": "Spinach", "cucumber": "Cucumbar", "capsicum": "Capsicum",
    "apple": "Apple", "orange": "Orange", "grapes": "Grapes", "guava": "Guava", "papaya": "Papaya", "pineapple": "Pineapple",
    "pomegranate": "Pomegranate", "watermelon": "Water Melon", "green gram": "Green Gram", "black gram": "Black Gram",
    "soybean": "Soyabean", "mustard": "Mustard", "lentil": "Lentil", "coconut": "Coconut", "garlic": "Garlic",
}


def _commodity_for(crop: str) -> str:
    return MANDI_COMMODITY.get(crop.strip().lower(), crop.strip())


def _mandi_page(commodity: str, state: Optional[str], offset: int, limit: int) -> dict:
    params = {"api-key": DATA_GOV_IN_KEY, "format": "json", "limit": limit, "offset": offset, "filters[commodity]": commodity}
    if state:
        params["filters[state]"] = state
    return _get_json(f"https://api.data.gov.in/resource/{MANDI_RESOURCE}?" + urllib.parse.urlencode(params), timeout=30)


def _fetch_mandi(commodity: str, state: Optional[str], max_records: int) -> dict:
    first = _mandi_page(commodity, state, 0, 100)
    records = list(first.get("records", []))
    total = int(first.get("total", 0) or 0)
    page = max(1, len(records))  # the sample key is capped at 10 per call
    offsets = list(range(len(records), min(total, max_records), page))
    if offsets:
        with ThreadPoolExecutor(max_workers=3) as pool:
            for d in pool.map(lambda o: _mandi_page(commodity, state, o, page), offsets):
                records.extend(d.get("records", []))
    return {"total": total, "records": records, "updated": first.get("updated_date")}


def _num(v) -> Optional[float]:
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


def _parse_date(s: str) -> str:
    try:
        return datetime.strptime(s, "%d/%m/%Y").date().isoformat()
    except (TypeError, ValueError):
        return s


def _summarize(records: List[dict]) -> dict:
    rows = []
    for r in records:
        modal = _num(r.get("modal_price"))
        if modal is None:
            continue
        rows.append({
            "state": r.get("state"), "district": r.get("district"), "market": r.get("market"),
            "commodity": r.get("commodity"), "variety": r.get("variety"), "grade": r.get("grade"),
            "date": _parse_date(r.get("arrival_date")),
            "min_price": _num(r.get("min_price")), "max_price": _num(r.get("max_price")), "modal_price": modal,
        })
    modals = [r["modal_price"] for r in rows]
    by_state = defaultdict(list)
    for r in rows:
        by_state[r["state"]].append(r["modal_price"])
    states = sorted(
        ({"state": s, "markets": len(v), "avg_modal": round(statistics.mean(v)), "min_modal": min(v), "max_modal": max(v)}
         for s, v in by_state.items()),
        key=lambda x: -x["avg_modal"],
    )
    return {
        "unit": "₹ per quintal",
        "count": len(rows),
        "latest_date": max((r["date"] for r in rows), default=None),
        "summary": None if not modals else {
            "avg_modal": round(statistics.mean(modals)), "median_modal": round(statistics.median(modals)),
            "lowest": min(r["min_price"] or r["modal_price"] for r in rows),
            "highest": max(r["max_price"] or r["modal_price"] for r in rows),
        },
        "by_state": states,
        "records": sorted(rows, key=lambda r: (r["date"] or "", r["modal_price"]), reverse=True),
    }


@router.get("/mandi")
def mandi_prices(
    crop: str = Query(..., min_length=2, max_length=60),
    state: Optional[str] = Query(None, max_length=60),
    max_records: int = Query(80, ge=10, le=400),
):
    """Latest wholesale prices reported by mandis (APMC markets) across India."""
    commodity = _commodity_for(crop)

    def fetch():
        raw = _fetch_mandi(commodity, state, max_records)
        return {"source": "Agmarknet · data.gov.in", "commodity": commodity, "state": state,
                "total_reported": raw["total"], "dataset_updated": raw["updated"], **_summarize(raw["records"])}
    return _upstream(lambda: _cached(f"mandi:{commodity}:{state}:{max_records}", 1800, fetch), "Agmarknet (data.gov.in)")


@router.get("/mandi/compare")
def mandi_compare(crops: str = Query("Rice,Wheat,Maize,Cotton,Groundnut,Tomato,Onion,Potato", max_length=300)):
    """Average modal price today for several crops — for side-by-side comparison."""
    names = [c.strip() for c in crops.split(",") if c.strip()][:10]

    def one(name: str):
        try:
            d = mandi_prices(crop=name, state=None, max_records=30)
            s = d["summary"]
            return {"crop": name, "commodity": d["commodity"], "avg_modal": s and s["avg_modal"],
                    "markets": d["count"], "latest_date": d["latest_date"]}
        except HTTPException:
            return {"crop": name, "commodity": _commodity_for(name), "avg_modal": None, "markets": 0, "latest_date": None}

    with ThreadPoolExecutor(max_workers=2) as pool:
        rows = list(pool.map(one, names))
    return {"source": "Agmarknet · data.gov.in", "unit": "₹ per quintal", "crops": rows}


# ─── India indicators (World Bank) ───────────────────────────────────────────

WB_INDICATORS = {
    "AG.YLD.CREL.KG": ("Cereal yield", "kg per hectare"),
    "AG.PRD.CROP.XD": ("Crop production index", "index (2014-16 = 100)"),
    "AG.PRD.FOOD.XD": ("Food production index", "index (2014-16 = 100)"),
    "NV.AGR.TOTL.ZS": ("Agriculture share of GDP", "% of GDP"),
    "NV.AGR.TOTL.KD": ("Agriculture value added", "constant 2015 US$"),
    "SL.AGR.EMPL.ZS": ("People working in agriculture", "% of all jobs"),
    "AG.CON.FERT.ZS": ("Fertilizer use", "kg per hectare of arable land"),
    "AG.LND.AGRI.ZS": ("Agricultural land", "% of land area"),
    "AG.LND.CREL.HA": ("Land under cereals", "hectares"),
}


def _wb_series(code: str) -> dict:
    url = f"https://api.worldbank.org/v2/country/IND/indicator/{code}?format=json&per_page=80&date=1990:{date.today().year}"
    meta, rows = _get_json(url, timeout=45)
    points = sorted(({"year": int(r["date"]), "value": r["value"]} for r in rows or [] if r["value"] is not None), key=lambda p: p["year"])
    name, unit = WB_INDICATORS[code]
    return {"code": code, "name": name, "unit": unit, "last_updated": meta.get("lastupdated"), "points": points}


@router.get("/india-indicators")
def india_indicators():
    """Official long-term agriculture indicators for India (World Bank Open Data)."""
    def fetch():
        with ThreadPoolExecutor(max_workers=5) as pool:
            results = list(pool.map(lambda c: _safe(lambda: _wb_series(c)), WB_INDICATORS))
        series = [s for s in results if s and s["points"]]
        if not series:
            raise HTTPException(status_code=502, detail="World Bank data is not reachable right now. Please try again.")
        return {"source": "World Bank Open Data", "country": "India", "indicators": series}
    return _upstream(lambda: _cached("wb:india", 12 * 3600, fetch), "World Bank")


def _safe(fn):
    try:
        return fn()
    except Exception:
        return None
