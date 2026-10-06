from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

app = FastAPI(
    title="AI-Powered Crop Yield Prediction API",
    description="API for crop yield prediction, weather intelligence, soil analysis, farming plan optimization, and complete crop lifecycle management.",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
allow_headers=["*"],
)

from mospi_data import router as mospi_router
app.include_router(mospi_router)

from ai_chat import router as ai_chat_router
app.include_router(ai_chat_router)

from ml_optimizer import router as ml_optimizer_router
app.include_router(ml_optimizer_router)

# ═══════════════════════════════════════════════════════════════════════════════
# ─── AUTHENTICATION ────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════
from database import engine, Base, get_db
import models
from auth import get_password_hash, verify_password, create_access_token
from sqlalchemy.orm import Session
from fastapi import Depends

models.Base.metadata.create_all(bind=engine)

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    phone: str
    state: Optional[str] = None
    district: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/api/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        hashed_password=hashed_password,
        state=user.state,
        district=user.district
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully"}

@app.post("/api/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": {"full_name": db_user.full_name, "email": db_user.email}}


# ═══════════════════════════════════════════════════════════════════════════════
# ─── MODELS ──────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class FarmData(BaseModel):
    crop: str
    area: float
    soil_ph: float
    nitrogen: float = 80
    phosphorus: float = 40
    potassium: float = 45
    temperature: float = 30.0
    rain_probability: int = 20
    rainfall_mm: float = 0.0

class FarmSetup(BaseModel):
    farm_name: str = "My Farm"
    location: str = "Tamil Nadu"
    area: float = 2.5
    area_unit: str = "acres"
    soil_type: str = "Loamy"
    soil_ph: float = 6.5
    nitrogen: float = 80
    phosphorus: float = 40
    potassium: float = 45
    soil_moisture: str = "Medium"
    irrigation_available: bool = True
    irrigation_method: str = "Drip"
    organic: bool = False
    budget_range: str = "Medium"
    target_market: str = "Local Mandi"
    crop_id: str
    variety: str = ""
    planting_date: str = ""
    planting_method: str = ""

class TaskUpdate(BaseModel):
    status: str  # completed, skipped, rescheduled
    notes: str = ""

class WeatherUpdate(BaseModel):
    temperature: Optional[float] = None
    rain_probability: Optional[int] = None
    rainfall_mm: Optional[float] = None
    humidity: Optional[int] = None
    is_simulation: bool = True

# ═══════════════════════════════════════════════════════════════════════════════
# ─── EXISTING CROP DATA (UNCHANGED) ──────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

CATEGORIZED_CROPS = {
    "Cereals / Food Grains": ["Rice", "Wheat", "Maize (Corn)", "Barley", "Sorghum", "Millet", "Oats", "Rye"],
    "Pulses / Legumes": ["Chickpea", "Pigeon Pea", "Green Gram", "Black Gram", "Lentil", "Peas", "Kidney Bean", "Soybean", "Groundnut"],
    "Oilseed Crops": ["Groundnut", "Sunflower", "Mustard", "Sesame", "Soybean", "Coconut", "Rapeseed", "Safflower"],
    "Commercial / Cash Crops": ["Cotton", "Sugarcane", "Tobacco", "Jute", "Rubber", "Coffee", "Tea", "Cocoa"],
    "Vegetables": ["Tomato", "Potato", "Onion", "Brinjal (Eggplant)", "Carrot", "Cabbage", "Cauliflower", "Spinach", "Okra", "Green Chilli", "Capsicum", "Cucumber"],
    "Fruits": ["Banana", "Mango", "Apple", "Orange", "Grapes", "Watermelon", "Papaya", "Pineapple", "Guava", "Pomegranate", "Coconut"],
    "Spices": ["Black Pepper", "Cardamom", "Turmeric", "Ginger", "Garlic", "Chilli", "Coriander", "Cumin", "Clove", "Cinnamon"]
}

def generate_crop_data():
    data = {}
    base_data = {
        "Rice": {"base_yield": 4.5, "optimal_ph": 6.0, "optimal_temp": 28, "optimal_n": 120, "icon": "🌾", "color": "#fbbf24"},
        "Wheat": {"base_yield": 3.8, "optimal_ph": 6.5, "optimal_temp": 20, "optimal_n": 100, "icon": "🌿", "color": "#a3e635"},
        "Maize (Corn)": {"base_yield": 5.2, "optimal_ph": 6.8, "optimal_temp": 25, "optimal_n": 140, "icon": "🌽", "color": "#f97316"},
        "Sugarcane": {"base_yield": 70.0, "optimal_ph": 6.5, "optimal_temp": 30, "optimal_n": 150, "icon": "🎍", "color": "#22d3ee"},
        "Cotton": {"base_yield": 2.1, "optimal_ph": 6.0, "optimal_temp": 28, "optimal_n": 90, "icon": "☁️", "color": "#c4b5fd"},
        "Tomato": {"base_yield": 30.0, "optimal_ph": 6.2, "optimal_temp": 25, "optimal_n": 110, "icon": "🍅", "color": "#ef4444"},
        "Potato": {"base_yield": 20.0, "optimal_ph": 5.5, "optimal_temp": 18, "optimal_n": 130, "icon": "🥔", "color": "#d97706"},
        "Banana": {"base_yield": 40.0, "optimal_ph": 6.5, "optimal_temp": 27, "optimal_n": 160, "icon": "🍌", "color": "#fde047"},
        "Apple": {"base_yield": 15.0, "optimal_ph": 6.5, "optimal_temp": 15, "optimal_n": 80, "icon": "🍎", "color": "#dc2626"},
    }
    for category, crops in CATEGORIZED_CROPS.items():
        for crop in crops:
            if crop in base_data:
                data[crop] = base_data[crop]
            else:
                if category == "Cereals / Food Grains":
                    data[crop] = {"base_yield": 3.0, "optimal_ph": 6.5, "optimal_temp": 25, "optimal_n": 100, "icon": "🌾", "color": "#facc15"}
                elif category == "Pulses / Legumes":
                    data[crop] = {"base_yield": 1.5, "optimal_ph": 6.5, "optimal_temp": 25, "optimal_n": 40, "icon": "🌱", "color": "#10b981"}
                elif category == "Vegetables":
                    data[crop] = {"base_yield": 15.0, "optimal_ph": 6.2, "optimal_temp": 22, "optimal_n": 110, "icon": "🥬", "color": "#22c55e"}
                elif category == "Fruits":
                    data[crop] = {"base_yield": 20.0, "optimal_ph": 6.0, "optimal_temp": 26, "optimal_n": 120, "icon": "🍏", "color": "#f43f5e"}
                elif category == "Spices":
                    data[crop] = {"base_yield": 2.0, "optimal_ph": 6.5, "optimal_temp": 28, "optimal_n": 80, "icon": "🌿", "color": "#d97706"}
                else:
                    data[crop] = {"base_yield": 5.0, "optimal_ph": 6.5, "optimal_temp": 25, "optimal_n": 100, "icon": "🍃", "color": "#6366f1"}
    return data

CROP_DATA = generate_crop_data()
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def compute_yield_factors(data: FarmData):
    cd = CROP_DATA.get(data.crop, CROP_DATA["Rice"])
    ph_factor    = max(0.5, 1.0 - abs(data.soil_ph - cd["optimal_ph"]) * 0.15)
    temp_factor  = max(0.6, 1.0 - abs(data.temperature - cd["optimal_temp"]) * 0.03)
    n_factor     = max(0.7, min(1.1, data.nitrogen / max(1, cd["optimal_n"])))
    return cd, ph_factor, temp_factor, n_factor

# ═══════════════════════════════════════════════════════════════════════════════
# ─── EXISTING ENDPOINTS (UNCHANGED) ──────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"status": "ok", "service": "Agri-Yield Pro API v3.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Agri-Yield Pro API v3.0"}

@app.get("/api/crops")
def get_categorized_crops():
    return {"categories": CATEGORIZED_CROPS}

@app.post("/api/predict/yield")
def predict_yield(data: FarmData):
    cd, ph_factor, temp_factor, n_factor = compute_yield_factors(data)
    expected_yield = round(cd["base_yield"] * ph_factor * temp_factor * n_factor + random.uniform(-0.1, 0.2), 2)
    soil_score = round((ph_factor * 0.4 + n_factor * 0.35 + min(1.0, data.phosphorus / 50) * 0.125 + min(1.0, data.potassium / 55) * 0.125) * 100)
    health = "Good"
    if ph_factor < 0.8 or temp_factor < 0.8: health = "Fair"
    if ph_factor < 0.6 or temp_factor < 0.6: health = "Poor"
    optimal_temp = cd["optimal_temp"]
    weather_risk = "Low"
    if data.rain_probability > 70 or abs(data.temperature - optimal_temp) > 8: weather_risk = "High"
    elif data.rain_probability > 40 or abs(data.temperature - optimal_temp) > 5: weather_risk = "Medium"
    pest_risk = "Low"
    if data.temperature > 28 and data.rain_probability > 60: pest_risk = "High"
    elif data.temperature > 25 and data.rain_probability > 40: pest_risk = "Medium"
    tasks = []
    if data.rain_probability > 70:
        tasks.append({"type": "warning", "title": "Postpone Irrigation", "description": f"High rain probability ({data.rain_probability}%). Pause scheduled irrigation to conserve water."})
    elif data.rain_probability < 20 and data.rainfall_mm < 2.0:
        tasks.append({"type": "info", "title": "Irrigation Required", "description": f"Low rain probability ({data.rain_probability}%). Schedule irrigation for {data.crop} to maintain optimal soil moisture."})
    if data.nitrogen < cd["optimal_n"] * 0.85:
        deficit = round(cd["optimal_n"] - data.nitrogen)
        tasks.append({"type": "info", "title": "Nitrogen Top-up Needed", "description": f"Nitrogen is {data.nitrogen} kg/ha (optimal: {cd['optimal_n']}). Apply ~{deficit} kg/ha of Urea or ammonium nitrate."})
    if data.phosphorus < 30:
        tasks.append({"type": "info", "title": "Low Phosphorus", "description": f"Phosphorus at {data.phosphorus} kg/ha. Apply DAP fertilizer to improve root development."})
    if pest_risk == "High":
        tasks.append({"type": "warning", "title": "Pest Alert: High Risk", "description": "Warm & humid conditions detected. High risk of fungal blight. Apply preventive fungicide within 48 hours."})
    elif pest_risk == "Medium":
        tasks.append({"type": "warning", "title": "Pest Monitoring", "description": "Moderate pest risk conditions. Inspect fields every 3 days. Consider applying neem oil as preventive."})
    if abs(data.soil_ph - cd["optimal_ph"]) > 0.8:
        direction = "lime" if data.soil_ph < cd["optimal_ph"] else "sulfur"
        tasks.append({"type": "warning", "title": "pH Correction Needed", "description": f"Soil pH ({data.soil_ph}) deviates from optimal ({cd['optimal_ph']}) for {data.crop}. Apply {direction} to correct pH."})
    if not tasks:
        tasks.append({"type": "success", "title": "All Conditions Optimal", "description": "Farm conditions are ideal. Maintain current practices and continue routine monitoring."})
    nutrients = {
        "Nitrogen": min(100, round(data.nitrogen / max(1, cd["optimal_n"]) * 100)),
        "Phosphorus": min(100, round(data.phosphorus / 50 * 100)),
        "Potassium": min(100, round(data.potassium / 55 * 100)),
        "pH Balance": round(ph_factor * 100),
        "Temperature": round(temp_factor * 100),
    }
    return {"expected_yield": expected_yield, "unit": "tonnes/ha", "total_yield": round(expected_yield * data.area, 2),
            "crop_health": health, "weather_risk": weather_risk, "pest_risk": pest_risk, "soil_score": soil_score,
            "ph_factor": round(ph_factor * 100), "temp_factor": round(temp_factor * 100),
            "nitrogen_factor": round(n_factor * 100), "nutrients": nutrients, "tasks": tasks}

@app.get("/api/history/{crop}")
def get_yield_history(crop: str):
    cd = CROP_DATA.get(crop, CROP_DATA["Rice"])
    base = cd["base_yield"]
    monthly = []
    for i, month in enumerate(MONTHS):
        seasonal = math.sin((i / 11.0) * math.pi) * 0.3 + 0.85
        actual = round(base * seasonal + random.uniform(-base*0.1, base*0.1), 2)
        predicted = round(base * seasonal + random.uniform(-base*0.05, base*0.05), 2)
        monthly.append({"month": month, "actual": max(0, actual), "predicted": max(0, predicted), "rainfall": round(random.uniform(20, 180), 1)})
    return {"crop": crop, "history": monthly}

@app.get("/api/market/{crop}")
def get_market_prices(crop: str):
    base = 18000
    if crop in CATEGORIZED_CROPS["Vegetables"]: base = 25000
    elif crop in CATEGORIZED_CROPS["Fruits"]: base = 40000
    elif crop in CATEGORIZED_CROPS["Spices"]: base = 150000
    elif crop in CATEGORIZED_CROPS["Commercial / Cash Crops"]: base = 60000
    last6 = MONTHS[-6:]
    prices = []
    price = base
    for month in last6:
        price += random.randint(int(-base*0.05), int(base*0.08))
        price = max(base * 0.8, min(base * 1.3, price))
        prices.append({"month": month, "price": round(price), "msp": round(base * 0.9)})
    return {"crop": crop, "currency": "INR/tonne", "prices": prices}

@app.get("/api/calendar/{crop}")
def get_crop_calendar(crop: str):
    if crop in CATEGORIZED_CROPS["Vegetables"]:
        phases = [{"phase": "Seedling / Nursery", "start": "Week 1", "end": "Week 3", "color": "#f97316"},
                  {"phase": "Transplanting", "start": "Week 4", "end": "Week 4", "color": "#22d3ee"},
                  {"phase": "Vegetative Growth", "start": "Week 5", "end": "Week 8", "color": "#34d399"},
                  {"phase": "Flowering & Fruiting", "start": "Week 9", "end": "Week 12", "color": "#fbbf24"},
                  {"phase": "Harvesting", "start": "Week 12", "end": "Week 16", "color": "#f472b6"}]
    elif crop in CATEGORIZED_CROPS["Fruits"]:
        phases = [{"phase": "Dormancy / Pruning", "start": "Jan", "end": "Feb", "color": "#f97316"},
                  {"phase": "Bud Break", "start": "Mar", "end": "Apr", "color": "#22d3ee"},
                  {"phase": "Flowering", "start": "May", "end": "Jun", "color": "#34d399"},
                  {"phase": "Fruit Development", "start": "Jul", "end": "Sep", "color": "#fbbf24"},
                  {"phase": "Harvesting", "start": "Oct", "end": "Nov", "color": "#f472b6"}]
    else:
        phases = [{"phase": "Land Preparation", "start": "Month 1", "end": "Month 1", "color": "#f97316"},
                  {"phase": "Sowing", "start": "Month 2", "end": "Month 2", "color": "#22d3ee"},
                  {"phase": "Vegetative Growth", "start": "Month 3", "end": "Month 4", "color": "#34d399"},
                  {"phase": "Reproductive Phase", "start": "Month 5", "end": "Month 5", "color": "#fbbf24"},
                  {"phase": "Harvesting", "start": "Month 6", "end": "Month 6", "color": "#f472b6"}]
    return {"crop": crop, "phases": phases}

@app.get("/api/compare")
def compare_crops():
    keys = ["Rice", "Wheat", "Maize (Corn)", "Tomato", "Banana", "Cotton", "Groundnut"]
    results = []
    for crop in keys:
        if crop in CROP_DATA:
            cd = CROP_DATA[crop]
            variation = random.uniform(0.85, 1.1)
            results.append({"crop": crop, "yield": round(cd["base_yield"] * variation, 2), "potential": round(cd["base_yield"] * 1.15, 2), "color": cd["color"]})
    return {"crops": results}

class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None

@app.post("/api/chat")
def chat_with_ai(data: ChatMessage):
    msg = data.message.lower()
    reply = "I'm the Agri-Yield Pro AI. I can analyze your farm conditions, recommend crops, and now interpret official MoSPI statistics."
    
    if "trend" in msg or "mospi" in msg or "official" in msg:
        reply = "According to official MoSPI data (2011-2024), agricultural output has grown steadily. At current prices, the All-India value of output has a positive 12-Year CAGR. Would you like to explore state-specific trends in the India Agriculture tab?"
    elif "recommend" in msg or "crop" in msg:
        reply = "Based on your soil parameters and local weather conditions, I recommend focusing on high-yield varieties of Rice or Wheat. Check your Dashboard's 'Farming Plan' tab for detailed tasks."
    elif "weather" in msg or "rain" in msg:
        reply = "Looking at the current weather simulation, there's a moderate chance of rain. I advise postponing heavy irrigation until tomorrow."
        
    return {"reply": reply, "is_official": "mospi" in msg.lower()}

@app.get("/api/lifecycle/{crop}")
def get_lifecycle_plan(crop: str):
    return {
        "crop": crop,
        "plan": [
            {"stage": "1. Pre-Planting & Soil Preparation", "duration": "Day -15 to Day 0", "icon": "Tractor",
             "details": ["Conduct comprehensive soil testing (pH, NPK, Micronutrients).", f"Clear previous crop residues and till the land deeply for {crop}.", "Apply basal dose of organic manure (FYM or Vermicompost).", "Adjust soil pH using lime/gypsum if required based on tests."]},
            {"stage": "2. Sowing & Germination", "duration": "Day 1 to Day 15", "icon": "Seedling",
             "details": [f"Procure high-yield, disease-resistant seeds suitable for {crop}.", "Treat seeds with bio-fungicides (e.g., Trichoderma) before sowing.", "Ensure optimal spacing and depth for planting to maximize sunlight.", "Apply light irrigation immediately after sowing to aid germination."]},
            {"stage": "3. Vegetative Growth & Nutrition", "duration": "Day 16 to Day 60", "icon": "Leaf",
             "details": ["Maintain soil moisture; avoid waterlogging.", "Apply first top-dressing of Nitrogen fertilizers (Urea).", "Conduct first phase of manual or mechanical weeding.", "Monitor closely for early-stage pests (aphids, caterpillars)."]},
            {"stage": "4. Flowering & Reproductive Phase", "duration": "Day 61 to Day 90", "icon": "Flower",
             "details": ["Critical irrigation stage: ensure crop does not suffer water stress.", "Apply Potassium booster sprays to enhance grain/fruit filling.", "Set up pheromone traps and spray organic pesticides if pest risk is high.", "Avoid applying heavy Nitrogen during this phase."]},
            {"stage": "5. Maturation & Harvesting", "duration": "Day 91 to Day 120+", "icon": "Scissors",
             "details": ["Stop irrigation 10-15 days before the expected harvest date.", f"Look for visual maturity signs typical for {crop} (color change, drying).", "Harvest during cool morning or evening hours to preserve quality.", "Grade the produce immediately at the farm level."]},
            {"stage": "6. Post-Harvest & Market Sale", "duration": "Post-Harvest", "icon": "Store",
             "details": ["Dry the produce to optimal moisture levels to prevent fungal growth.", "Pack in aerated, standardized bags or crates for transport.", f"Check local Mandi rates or digital agriculture platforms for best {crop} prices.", "Consider cold-storage holding if current market prices are unseasonably low."]}
        ]
    }

# ═══════════════════════════════════════════════════════════════════════════════
# ─── NEW: CROP PLANNING CATALOG ───────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

def _stage(name: str, icon: str, start_day: int, end_day: int, desc: str, key_tasks: list) -> dict:
    return {"name": name, "icon": icon, "start_day": start_day, "end_day": end_day, "description": desc, "key_tasks": key_tasks}

def _build_crop(id, name, category, crop_type, duration_min, duration_max,
                seasons, climate, water_req, soil_req, ph_min, ph_max,
                temp_min, temp_max, optimal_ph, optimal_temp, base_yield,
                opt_n, opt_p, opt_k, icon, color, stages,
                planting_method="Direct Sowing", spacing="", seed_rate=""):
    return {
        "id": id, "name": name, "category": category, "type": crop_type,
        "duration": {"min": duration_min, "max": duration_max},
        "suitable_seasons": seasons, "climate": climate, "water_requirement": water_req,
        "soil_requirement": soil_req, "ph_range": {"min": ph_min, "max": ph_max},
        "temp_range": {"min": temp_min, "max": temp_max},
        "optimal_ph": optimal_ph, "optimal_temp": optimal_temp,
        "base_yield": base_yield, "optimal_n": opt_n, "optimal_p": opt_p, "optimal_k": opt_k,
        "icon": icon, "color": color,
        "planting_method": planting_method, "spacing": spacing, "seed_rate": seed_rate,
        "stages": stages,
    }

CROP_CATALOG_CATEGORIES = {
    "cereals":    {"id": "cereals",    "name": "Cereals / Grains",        "icon": "🌾", "description": "Staple food grains that form the backbone of agriculture",          "color": "#fbbf24", "bg_color": "rgba(251,191,36,0.08)",   "crops": ["rice","wheat","maize","sorghum","pearl_millet","finger_millet","barley","oats"]},
    "vegetables": {"id": "vegetables", "name": "Vegetables",              "icon": "🥬", "description": "Short-duration and high-value seasonal vegetable crops",             "color": "#22c55e", "bg_color": "rgba(34,197,94,0.08)",    "crops": ["tomato","potato","onion","brinjal","cabbage","cauliflower","carrot","okra","spinach","cucumber","green_chilli","capsicum"]},
    "fruits":     {"id": "fruits",     "name": "Fruits",                  "icon": "🍎", "description": "Perennial and seasonal high-value fruit crops",                      "color": "#f43f5e", "bg_color": "rgba(244,63,94,0.08)",    "crops": ["mango","banana","apple","orange","grapes","guava","papaya","pineapple","pomegranate","watermelon"]},
    "pulses":     {"id": "pulses",     "name": "Pulses / Legumes",        "icon": "🌱", "description": "Nitrogen-fixing protein-rich legume crops for soil health",          "color": "#10b981", "bg_color": "rgba(16,185,129,0.08)",   "crops": ["chickpea","green_gram","black_gram","pigeon_pea","lentil","peas","kidney_bean"]},
    "oilseeds":   {"id": "oilseeds",   "name": "Oilseeds",                "icon": "🛢️", "description": "Oil-bearing crops for edible oil and industrial use",               "color": "#f97316", "bg_color": "rgba(249,115,22,0.08)",   "crops": ["groundnut","sunflower","mustard","sesame","soybean","rapeseed","safflower"]},
    "commercial": {"id": "commercial", "name": "Commercial / Cash Crops", "icon": "🧵", "description": "High-value commercial and export-oriented industrial crops",         "color": "#a78bfa", "bg_color": "rgba(167,139,250,0.08)",  "crops": ["cotton","sugarcane","jute","tobacco","rubber","tea","coffee","cocoa"]},
    "spices":     {"id": "spices",     "name": "Spices",                  "icon": "🌶️", "description": "High-value aromatic and flavoring crops with premium pricing",      "color": "#fb923c", "bg_color": "rgba(251,146,60,0.08)",   "crops": ["chilli","turmeric","ginger","garlic","coriander","cumin","black_pepper","cardamom"]},
}
for cat in CROP_CATALOG_CATEGORIES.values():
    cat["crop_count"] = len(cat["crops"])

PLANNING_CROPS: Dict[str, Any] = {}

# --- DETAILED CROPS ---

PLANNING_CROPS["rice"] = _build_crop(
    "rice","Rice","cereals","Annual cereal crop",90,150,
    ["Kharif (Jun–Nov)","Rabi (Nov–Apr)"],
    "Warm and humid with ample standing water","High",
    "Clay or loamy soil with good water retention",5.5,7.0,20,38,6.0,28,4.5,120,60,60,
    "🌾","#fbbf24",
    [_stage("Land Preparation","🚜",-15,-1,"Ploughing, leveling, and field flooding",["Deep ploughing 2–3 times","Field leveling and bund making","Soil testing (pH, NPK, micronutrients)","Apply FYM 10 t/ha","Pre-irrigation (Palaeva)"]),
     _stage("Seed Preparation","🌱",-7,0,"Nursery raising and seed treatment",["Select certified seeds","Treat with Bavistin 2g/kg seed","Prepare raised nursery beds","Sow seeds in nursery @ 40–50 kg/ha","Maintain shade and moisture"]),
     _stage("Transplanting","🌿",1,10,"Transplant 25-day seedlings to main field",["Drain nursery 1 day before uprooting","Transplant 2–3 seedlings/hill","Apply basal NPK (N:P:K = 40:60:40)","Fill water to 5 cm after transplanting"]),
     _stage("Vegetative Growth","🌳",11,55,"Active tillering and canopy development",["Irrigation every 5–7 days","N top-dressing at 21 DAT (40 kg/ha)","Manual weeding at 20 and 40 DAT","Monitor for stem borer and leaf folder"]),
     _stage("Panicle Initiation","🌸",56,75,"Reproductive stage begins — critical period",["Potassium application (40 kg K₂O/ha)","Maintain 5 cm water level","Monitor for blast disease (Pyricularia)","Foliar spray of micronutrients"]),
     _stage("Flowering","🌼",76,90,"Pollination and grain setting",["Maintain 5 cm water level","Avoid pesticide spray during flowering","Monitor grain filling","Apply Boron 0.5% if tip sterility seen"]),
     _stage("Maturity","🌾",91,115,"Grain filling and ripening",["Drain water 10 days before harvest","Check grain moisture (target 20–25%)","Arrange harvest labour/machinery","Prepare storage area"]),
     _stage("Harvest","✂️",116,125,"Mechanical or manual harvesting",["Harvest at 80–85% grain ripening","Threshing immediately","Cleaning and wind-rowing","Sun-dry to 14% moisture"]),
     _stage("Post-Harvest","📦",126,140,"Processing, storage, and market",["Proper drying in thin layers","Milling (if needed)","Grading and quality check","Bag in 50 kg sacks","Transport to market/storage"]),
    ],
    "Transplanting / Direct Seeding","20 × 15 cm","25–30 kg/acre (nursery)"
)

PLANNING_CROPS["wheat"] = _build_crop(
    "wheat","Wheat","cereals","Annual cereal crop",100,150,
    ["Rabi (Oct–Mar)"],
    "Cool and dry during growth, warm at maturity","Medium",
    "Well-drained loamy soil, fertile",6.0,7.5,10,30,6.5,20,3.8,100,50,40,
    "🌿","#a3e635",
    [_stage("Land Preparation","🚜",-14,-1,"Soil preparation after Kharif harvest",["Deep tillage (after Kharif)","Remove crop residues","Apply FYM 5 t/acre","Leveling field","Pre-sowing soil test"]),
     _stage("Sowing","🌱",1,7,"Seed treatment and line sowing",["Treat seed with Carbendazim 2g/kg","Line sowing at 22 cm row spacing","Apply basal DAP 50 kg/acre","Pre-sowing irrigation (Palaeva) if needed"]),
     _stage("Germination","🌿",8,21,"Emergence and seedling establishment",["Monitor germination percentage (>80%)","Gap filling within 10 days","First irrigation at Crown Root Initiation (CRI) stage"]),
     _stage("Vegetative Growth","🌳",22,65,"Tillering and stem elongation",["Irrigation at tillering stage (30–35 DAS)","N top-dressing: Urea 65 kg/acre","Weed management with 2,4-D spray","Monitor for aphids and yellow rust"]),
     _stage("Heading","🌸",66,85,"Ear emergence and flowering",["Critical irrigation at boot stage (55–60 DAS)","Potassium spray 1%","Monitor yellow rust carefully","Irrigation at milky stage"]),
     _stage("Grain Filling","🌾",86,110,"Starch accumulation in grains",["Final irrigation at grain filling","Protect from hot dry winds","Check for loose smut","Plan harvest logistics"]),
     _stage("Harvest","✂️",111,125,"Combine or manual harvesting",["Combine harvesting at golden yellow stage","Threshing","Grain cleaning and grading","Check moisture content (<12%)","Dry if needed"]),
     _stage("Post-Harvest","📦",126,140,"Storage and market preparation",["Proper drying","Fumigation in storage","Grading as per FSSAI norms","Market dispatch or sell at MSP"]),
    ],
    "Direct Sowing","Row to row: 22–25 cm","40–50 kg/acre"
)

PLANNING_CROPS["maize"] = _build_crop(
    "maize","Maize","cereals","Annual cereal crop",80,110,
    ["Kharif (Jun–Sep)","Rabi (Nov–Feb)"],
    "Warm with moderate rainfall, 600–800mm","Medium-High",
    "Deep, well-drained sandy loam to loamy soil",5.8,7.0,18,35,6.8,25,5.2,140,70,50,
    "🌽","#f97316",
    [_stage("Land Preparation","🚜",-10,-1,"Deep tillage and bed preparation",["Ploughing 2–3 times","FYM 5 t/acre","Ridge and furrow formation","Pre-plant soil test"]),
     _stage("Sowing","🌱",1,7,"Seed treatment and planting",["Treat seed with Thiram + Carbendazim","Sow at 5 cm depth in rows","Apply basal NPK (DAP + MOP)","Sow 2 seeds/hill, thin to 1 after germination"]),
     _stage("Germination","🌿",8,18,"Seedling emergence and thinning",["Monitor germination (>85%)","Thinning to 1 plant/hill at V3 stage","Gap filling within 12 days","Light irrigation if dry"]),
     _stage("Vegetative Growth","🌳",19,45,"Rapid vegetative growth (V4–V8)",["First earthing up at V4 stage","N split-dose (60 kg/ha)","Weed control (Atrazine or manual)","Fall Armyworm monitoring"]),
     _stage("Tasselling","🌸",46,65,"Pollination — critical water stage",["Critical irrigation at tasselling","No pesticide spray during silking","Boron 0.1% foliar spray","Monitor for maize borer"]),
     _stage("Grain Filling","🌾",66,85,"Cob and grain development",["Irrigation if dry","Final fertilizer dose","Moisture monitoring","Stem borer and earworm check"]),
     _stage("Harvest","✂️",86,100,"Harvesting at physiological maturity",["Harvest when husks are dry brown","Mechanical / manual harvesting","Threshing / shelling","Drying to <14% moisture"]),
     _stage("Post-Harvest","📦",101,110,"Storage and market",["Grading by size","Storage in dry conditions","Market dispatch or cold store"]),
    ],
    "Direct Sowing","60 × 25 cm","8–10 kg/acre"
)

PLANNING_CROPS["tomato"] = _build_crop(
    "tomato","Tomato","vegetables","Warm-season solanaceous vegetable",70,120,
    ["Kharif","Rabi","Summer"],
    "Warm and sunny with cool nights (15–30°C)","Medium",
    "Well-drained loamy or sandy loam, rich in organic matter",6.0,7.0,15,30,6.2,25,30.0,110,55,75,
    "🍅","#ef4444",
    [_stage("Nursery Preparation","🏡",-30,-5,"Raise healthy seedlings in nursery beds",["Prepare raised nursery beds (1m wide)","Soil sterilization with formaldehyde","Seed sowing 6g/10m²","Daily light watering","Apply Trichoderma + Pseudomonas"]),
     _stage("Land Preparation","🚜",-10,-1,"Main field preparation before transplanting",["Deep ploughing","FYM 20 t/ha incorporation","Form ridges at 60 cm spacing","Apply basal NPK (DAP + MOP)","Install drip irrigation laterals"]),
     _stage("Transplanting","🌿",1,5,"Transplant 25–30 day old seedlings",["Irrigate nursery bed 1 day before","Transplant in evening hours","Apply starter solution (19:19:19 @ 1%)","Install stakes/cages for support"]),
     _stage("Vegetative Growth","🌳",6,35,"Establishment and canopy development",["Drip irrigation every 2 days (3–4 L/plant/day)","N top-dress at 15 DAT","Weed control at 15 and 30 DAT","Prune suckers below first flower truss","TSWV / Leaf curl virus monitoring"]),
     _stage("Flowering","🌸",36,55,"Flower initiation and pollination",["Boron 0.2% foliar spray","Reduce N, increase K fertilization","Monitor fruit set (>60% acceptable)","Blossom-end rot prevention (Ca spray)","Thrips monitoring"]),
     _stage("Fruit Development","🍅",56,80,"Fruit filling and color development",["Consistent drip irrigation (maintain soil moisture)","K₂SO₄ spray every 10 days","Fruit borer trapping and control","Prevent fruit cracking (uniform irrigation)"]),
     _stage("Harvest","✂️",81,105,"Multiple harvesting at mature green/breaker stage",["First harvest at 70 DAT (approx.)","Harvest every 3–4 days","Grade as A / B / C","Pack in plastic crates","Sell fresh or cold storage"]),
     _stage("Post-Harvest","📦",106,120,"Sorting, packing, and market dispatch",["Washing and grading","Packaging in corrugated cartons","Cold chain at 10–12°C if needed","Market dispatch to local mandi"]),
    ],
    "Transplanting","60 × 45 cm","150–200 g/acre (nursery seed)"
)

PLANNING_CROPS["potato"] = _build_crop(
    "potato","Potato","vegetables","Cool-season tuber crop",70,100,
    ["Rabi (Oct–Jan)","Summer (Feb–Apr)"],
    "Cool temperatures (15–20°C) during tuber initiation","Medium-High",
    "Deep, loose, well-drained sandy loam",5.2,6.4,10,24,5.5,18,20.0,130,65,130,
    "🥔","#d97706",
    [_stage("Land Preparation","🚜",-14,-1,"Deep tillage and ridge formation",["4–5 deep ploughings","FYM 10 t/acre incorporation","Ridge formation at 60 cm spacing","Apply pre-plant NPK (P + K basal)","Pre-plant irrigation"]),
     _stage("Seed Preparation","🥔",-7,0,"Select and treat seed tubers",["Select certified seed tubers (30–50g each)","Cut seeds with 2+ eyes","Treat with Mancozeb 0.3% solution","Allow to cure 24–48 hours in shade"]),
     _stage("Planting","🌱",1,7,"Plant tubers in prepared ridges",["Plant at 5–8 cm depth","Apply basal fertilizer in furrow","Cover with loose soil","Light irrigation after planting"]),
     _stage("Emergence","🌿",8,21,"Sprout emergence and establishment",["Monitor for 95% emergence (15–20 days)","First earthing-up at 20–25 DAS","Gap filling if >5% missing"]),
     _stage("Vegetative Growth","🌳",22,50,"Canopy development and haulm growth",["Second earthing-up at 35 DAS","N split application (top-dress urea)","Late blight watch (Phytophthora)","Irrigation every 7–8 days"]),
     _stage("Tuber Initiation","🔵",51,65,"Underground tuber bulking begins",["Critical K₂SO₄ application","Maintain uniform soil moisture","Aphid and virus monitoring","De-haulming if virus detected"]),
     _stage("Tuber Bulking","🥔",66,80,"Rapid tuber growth phase",["Maintain uniform irrigation","No nitrogen at this stage","Late blight spray on schedule","Avoid waterlogging"]),
     _stage("Harvest","✂️",81,95,"Skin set and careful harvesting",["Haulm killing 10 days before harvest","Mechanical / manual harvest","Careful handling to avoid bruising","Sorting at field level"]),
     _stage("Post-Harvest","📦",96,115,"Curing, grading, storage, market",["Curing at 18–20°C for 10 days","Cold storage at 4°C","Grade A / B by size","Market dispatch"]),
    ],
    "Tuber Planting","60 × 20 cm","800–1000 kg/acre (seed tubers)"
)

PLANNING_CROPS["onion"] = _build_crop(
    "onion","Onion","vegetables","Bulb crop",90,130,
    ["Kharif","Rabi"],
    "Cool during growth, warm and dry at maturity","Medium",
    "Well-drained loamy soil rich in organic matter",6.0,7.5,13,30,6.5,22,12.0,80,40,50,
    "🧅","#a78bfa",
    [_stage("Nursery","🏡",-35,-6,"Raise seedlings for 35 days",["Prepare raised nursery beds","Seed treatment","Daily watering","Thinning for uniform seedlings"]),
     _stage("Land Preparation","🚜",-10,-1,"Bed preparation and basal fertilizer",["Deep ploughing","Raised beds / flat beds","FYM 10 t/ha","Basal P + K application"]),
     _stage("Transplanting","🌿",1,7,"Transplant 35-day-old seedlings",["Transplant in rows 15 × 10 cm","Basal DAP + K at transplanting","Light irrigation","Temporary shade if very hot"]),
     _stage("Vegetative Growth","🌳",8,60,"Leaf and early bulb development",["N split doses at 15 and 35 DAT","Weekly irrigation","Thrips monitoring and control","Weeding at 20 and 40 DAT"]),
     _stage("Bulb Initiation","🧅",61,90,"Bulb swelling and development",["Stop N fertilizer","Maintain K₂SO₄ foliar spray","Reduce irrigation frequency","Monitor purple blotch disease"]),
     _stage("Maturity","🌾",91,110,"Neck fall — foliage turns yellow",["Stop irrigation 10–12 days before harvest","Wait for 50% neck fall","Careful manual harvesting"]),
     _stage("Post-Harvest","📦",111,135,"Curing, grading, and market dispatch",["Field curing 3–5 days","Top trimming (3 cm neck)","Grading by size (A/B/C)","Storage in net/mesh bags","Market dispatch"]),
    ],
    "Transplanting","15 × 10 cm","3–4 kg seed/acre"
)

PLANNING_CROPS["cotton"] = _build_crop(
    "cotton","Cotton","commercial","Commercial fiber crop",150,200,
    ["Kharif (May–Nov)"],
    "Warm, sunny climate with moderate rainfall (500–700mm)","Medium",
    "Deep black cotton soil or alluvial soil",5.8,7.0,20,40,6.0,28,2.1,90,45,45,
    "☁️","#a78bfa",
    [_stage("Land Preparation","🚜",-15,-1,"Deep tillage and field preparation",["Deep ploughing (30–40 cm)","FYM 5 t/acre","Ridges and furrows","Soil test and pH correction"]),
     _stage("Sowing","🌱",1,10,"Seed treatment and sowing",["Treat with Imidacloprid 70WS 5g/kg","Sow Bt cotton at 3–4 cm depth","Basal DAP application","2 seeds/hill, thin to 1 later"]),
     _stage("Germination","🌿",11,20,"Seedling emergence",["Monitor germination >80%","Thinning to one plant/hill at 10 DAS","Gap filling within 15 days"]),
     _stage("Vegetative Growth","🌳",21,60,"Branching and square formation",["First irrigation at 25 DAS","N split application","Weeding at 20 and 40 DAS","Sucking pest (aphid, thrips) monitoring"]),
     _stage("Flowering","🌸",61,100,"Flowering and boll setting",["Critical irrigation at flowering","Foliar spray micronutrients (Fe, Zn, B)","Boll weevil and pink boll worm monitoring","Pheromone traps installation"]),
     _stage("Boll Development","🌑",101,140,"Boll filling and maturation",["Irrigation if rainfall inadequate","Ethephon 39SL for early boll opening if needed","Monitor for Helicoverpa"]),
     _stage("Harvest","✂️",141,185,"Manual picking of open bolls",["Pick every 15–20 days","Grade Shankar-6 / MCU / Hybrid grade","Separate seed cotton carefully","Sun-dry after picking"]),
     _stage("Post-Harvest","📦",186,200,"Ginning and market preparation",["Ginning at cotton gin","Lint grading and classification","Market dispatch to CCI/mandi"]),
    ],
    "Direct Sowing","90 × 45 cm (Bt hybrid)","1.5 kg/acre (Bt)"
)

PLANNING_CROPS["sugarcane"] = _build_crop(
    "sugarcane","Sugarcane","commercial","Perennial commercial crop",300,365,
    ["Year-round (plant Oct–Feb)"],
    "Hot and humid tropical climate, 1200–1500mm rainfall","Very High",
    "Deep, well-drained loamy soil with good water retention",6.0,7.5,20,40,6.5,30,70.0,150,75,75,
    "🎍","#22d3ee",
    [_stage("Land Preparation","🚜",-20,-1,"Deep tillage and furrow formation",["Subsoiling at 60 cm depth","Ploughing 3–4 times","Furrow formation at 90 cm spacing","FYM 15 t/acre incorporation"]),
     _stage("Sett Planting","🌱",1,15,"Selection and planting of cane setts",["Select healthy 3-budded setts from 8–10 month cane","Treat with Carbendazim 0.1%","Place in furrows end-to-end","Cover with 5 cm soil","Furrow irrigation immediately"]),
     _stage("Germination","🌿",16,40,"Bud sprouting and establishment",["Monitor sprouting % (target >80%)","Irrigation every 7 days","Gap filling up to 30 DAS","Apply Trichoderma viride"]),
     _stage("Tillering","🌳",41,90,"Shoot multiplication and early growth",["First earthing-up at 45 DAS","N first split (75 kg/ha)","Weed control at 30 and 60 DAS","Irrigation every 10 days"]),
     _stage("Grand Growth","🌳",91,210,"Rapid cane elongation — major growth phase",["N second and third split","Propping and staking at 5 months","Top borer monitoring (pheromone traps)","Fortnightly irrigation"]),
     _stage("Maturation","🌾",211,300,"Sucrose accumulation in cane",["Reduce nitrogen and irrigation","Trash mulching","Sucrose Brix test (target 18+%)","Apply ripening agents if needed"]),
     _stage("Harvest","✂️",301,365,"Manual or mechanical harvesting",["Harvest at 12-month age","Cut close to ground level","Trash management","Submit to sugar mill quickly"]),
    ],
    "Sett Planting","Row to row: 90 cm","2500–3000 kg/acre (setts)"
)

PLANNING_CROPS["turmeric"] = _build_crop(
    "turmeric","Turmeric","spices","Rhizomatous spice crop",210,270,
    ["Kharif (Apr–Nov)"],
    "Warm and humid, 1200–1500mm rainfall","Medium-High",
    "Well-drained loamy or clay loam, rich in organic matter",5.5,7.0,20,35,6.0,28,4.5,80,40,80,
    "🟡","#fbbf24",
    [_stage("Rhizome Selection","🌱",-10,-1,"Select and treat mother rhizomes",["Select healthy finger rhizomes (40–50g)","Treat with Mancozeb 0.3% + Trichoderma","Sun-dry treated rhizomes for 24h","Sort and discard diseased rhizomes"]),
     _stage("Land Preparation","🚜",-15,-1,"Bed preparation with FYM",["Plough 2–3 times to fine tilth","FYM 10 t/acre incorporation","Raised beds or ridges at 45 cm spacing","Apply basal K₂O"]),
     _stage("Planting","🌱",1,10,"Rhizome planting in beds",["Plant at 5 cm depth, 30 cm spacing","Mulch with coconut/banana leaves","Apply K₂O as basal dose","Pre-planting irrigation"]),
     _stage("Sprouting","🌿",11,30,"Bud emergence from rhizomes",["Monitor 80% sprouting (15–20 DAS)","Gap filling at 25 DAS","Provide shade if temperature >35°C"]),
     _stage("Vegetative Growth","🌳",31,120,"Leaf and shoot development phase",["N split-dose at 40 and 90 DAS","Weeding at 40 and 90 DAS","Irrigation every 7–10 days","Leaf blotch and leaf spot monitoring"]),
     _stage("Rhizome Development","🟡",121,210,"Underground rhizome bulking",["K₂SO₄ foliar spray 1%","Maintain soil moisture","Leaf folder and shoot borer monitoring","Mulch re-application if needed"]),
     _stage("Harvest","✂️",211,250,"Foliage yellowing — maturity indicator",["Stop irrigation 15 days before harvest","Manual digging with care","Separate mother and finger rhizomes","Boil rhizomes 45 min for curing"]),
     _stage("Post-Harvest","📦",251,270,"Processing, polishing, drying, market",["Sun-dry boiled rhizomes for 10–15 days","Polishing in drum polisher","Grading (fingers vs. bulbs)","Market dispatch"]),
    ],
    "Rhizome Planting","45 × 30 cm","800–1000 kg/acre (rhizomes)"
)

PLANNING_CROPS["groundnut"] = _build_crop(
    "groundnut","Groundnut","oilseeds","Leguminous oilseed crop",100,130,
    ["Kharif (Jun–Oct)","Rabi (Nov–Mar)"],
    "Warm with moderate rainfall 500–700mm","Medium",
    "Light sandy loam soil with good drainage",6.0,7.0,22,35,6.5,30,1.8,20,40,40,
    "🥜","#d97706",
    [_stage("Land Preparation","🚜",-10,-1,"Light tillage for loose, aerated soil",["Light ploughing 2 times","Gypsum application 200 kg/acre","Weed removal and field clearing","Basal P and K application"]),
     _stage("Sowing","🌱",1,7,"Shell and treat seed before sowing",["Shell seeds 24h before sowing","Rhizobium + PSB seed inoculation","Sow at 5 cm depth, 30 × 10 cm","Basal P and K in furrow"]),
     _stage("Germination","🌿",8,20,"Seedling emergence",["Monitor germination (>80%)","Gap filling within 15 days","No irrigation if soil moisture adequate"]),
     _stage("Vegetative Growth","🌳",21,45,"Branching and pre-flowering",["Weeding at 25 DAS (manual)","Gypsum spray at pegging stage","Monitor for leaf spot"]),
     _stage("Flowering","🌸",46,70,"Flowers and pegs enter soil",["Earthing-up at pegging stage","Critical irrigation at pegging","Monitor leaf spot and rust"]),
     _stage("Pod Development","🥜",71,100,"Underground pod and seed filling",["Second gypsum dose 200 kg/acre","Stop nitrogen applications","Monitor for pod borer","Avoid waterlogging"]),
     _stage("Harvest","✂️",101,120,"Pod maturity and uprooting",["Maturity test (pod inner wall dark brown)","Manual uprooting with fork","Field drying 3–4 days","Threshing / stripping"]),
     _stage("Post-Harvest","📦",121,135,"Grading, storage, market",["Drying to <9% moisture","Grading (Bold / Medium / Small)","Storage in gunny bags","Market dispatch"]),
    ],
    "Direct Sowing","30 × 10 cm","60–70 kg/acre (shelled)"
)

PLANNING_CROPS["banana"] = _build_crop(
    "banana","Banana","fruits","Perennial tropical fruit crop",300,365,
    ["Year-round"],
    "Warm, humid tropical climate 25–35°C","High",
    "Deep, well-drained loamy soil rich in organic matter",5.5,7.0,20,35,6.5,27,40.0,160,50,200,
    "🍌","#fde047",
    [_stage("Land Preparation","🚜",-20,-1,"Pit preparation and soil conditioning",["Pit digging 60 × 60 × 60 cm","Fill with FYM + soil + neem cake","De-sucker nearby banana plants","Install drip irrigation"]),
     _stage("Planting","🌱",1,15,"Sucker or TC plant establishment",["Select healthy TC plants / sword suckers","Plant in prepared pits","Erect shade net for 15 days","Daily drip irrigation (starter)"]),
     _stage("Vegetative Growth","🌳",16,120,"Leaf development and canopy establishment",["Weekly drip irrigation 40 L/plant","Monthly N + K fertigation","Desuckering monthly (keep 1 sucker)","Leaf spot monitoring"]),
     _stage("Pre-flowering","🌸",121,180,"Bunch initiation and emergence",["Increase irrigation","High K fertigation","Prop plant at 3rd month","Panama wilt watch"]),
     _stage("Bunch Development","🍌",181,270,"Hands and fingers development",["Bundle cover with polythene bag","Remove male bud at 8 weeks after emergence","K₂SO₄ spray 1%","Weevil and nematode monitoring"]),
     _stage("Harvest","✂️",271,340,"Harvest at 75–80% maturity",["Harvest when finger fullness achieved","Cut with harvesting sickle","Handle bunch without bruising","Grade as export A / local B"]),
     _stage("Post-Harvest","📦",341,365,"Grading, packing, ripening, market",["Washing and dehanding","Grade by finger size / weight","Ripening room at 20°C + ethylene","Cold chain for export"]),
    ],
    "Sucker / TC Plant","1.8 × 1.8 m","1000–1350 plants/acre"
)

PLANNING_CROPS["chickpea"] = _build_crop(
    "chickpea","Chickpea","pulses","Cool-season legume crop",90,130,
    ["Rabi (Oct–Feb)"],
    "Cool and dry (15–25°C)","Low",
    "Well-drained light loamy or clay loam soil",6.0,8.0,10,30,6.5,24,1.2,20,40,20,
    "🫘","#d4a373",
    [_stage("Land Preparation","🚜",-10,-1,"Soil preparation after Kharif",["Light ploughing (2 times)","Remove crop residues","Basal P application","Field leveling"]),
     _stage("Sowing","🌱",1,7,"Rhizobium inoculation and sowing",["Rhizobium + PSB seed inoculation","Sow at 8–10 cm depth","Seed treatment with Thiram","Row spacing 30 cm"]),
     _stage("Germination","🌿",8,20,"Seedling emergence",["Monitor germination percentage","No irrigation if soil moisture adequate","Gap filling if needed"]),
     _stage("Vegetative Growth","🌳",21,55,"Branching and canopy development",["One protective irrigation at branching","Weed control at 25–30 DAS","Pod borer monitoring"]),
     _stage("Flowering","🌸",56,75,"Flower initiation and pod setting",["No heavy irrigation at flowering","Boron 0.2% spray","Helicoverpa monitoring — use pheromone traps"]),
     _stage("Pod Filling","🫘",76,100,"Pod and seed development",["Light irrigation if very dry","Sucking pest monitoring"]),
     _stage("Harvest","✂️",101,120,"Plant turns yellow — ready to harvest",["Manual or combine harvest","Threshing","Drying to <10% moisture","Grading and bagging"]),
    ],
    "Direct Sowing","30 × 10 cm","35–40 kg/acre"
)

PLANNING_CROPS["chilli"] = _build_crop(
    "chilli","Chilli","spices","Warm-season solanaceous spice crop",150,210,
    ["Kharif","Rabi"],
    "Warm and dry climate 20–30°C","Medium",
    "Well-drained sandy loam to loamy soil",6.0,7.5,15,35,6.5,28,1.2,80,40,50,
    "🌶️","#dc2626",
    [_stage("Nursery","🏡",-30,-6,"Nursery raising — 30 days",["Prepare raised beds 1m wide","Sterilize with formaldehyde","Seed sowing 200g/acre","Watering twice daily","Trichoderma drenching"]),
     _stage("Land Preparation","🚜",-10,-1,"Main field preparation",["Deep ploughing","FYM 5 t/acre","Ridges and furrows at 60 cm","Basal NPK"]),
     _stage("Transplanting","🌿",1,7,"Transplant 30-day seedlings",["Transplant in evening","Starter drench (19:19:19 1%)","Install drip laterals","Temporary shade"]),
     _stage("Vegetative Growth","🌳",8,60,"Bushy growth phase",["N split at 20 and 40 DAT","Thrips and mite monitoring","Drip every 3 days","Prune primary branches"]),
     _stage("Flowering","🌸",61,90,"Flower initiation and fruit set",["Boron 0.1% + Zinc 0.5% spray","Thrips control is critical","Monitor for leaf curl virus"]),
     _stage("Fruit Development","🌶️",91,150,"Green to red chilli development",["K₂SO₄ spray 1%","Fruit borer pheromone traps","Harvest green or red as per market"]),
     _stage("Harvest","✂️",151,200,"Multiple harvests over 2–3 months",["Harvest every 5–7 days","Dry chilli: sun-dry 10–15 days","Grade by size and color"]),
     _stage("Post-Harvest","📦",201,215,"Drying, grading, market dispatch",["Uniform sun drying","Grading A/B","Packing in PP woven bags","Market dispatch"]),
    ],
    "Transplanting","60 × 45 cm","200–250 g/acre seed"
)

PLANNING_CROPS["mango"] = _build_crop(
    "mango","Mango","fruits","Perennial tropical orchard crop",365,540,
    ["Year-round (flowers: Jan–Mar, harvest: Apr–Jun)"],
    "Tropical to subtropical, dry at flowering","Low-Medium",
    "Deep, well-drained alluvial or laterite soil",5.5,7.5,15,45,6.0,27,8.0,100,40,80,
    "🥭","#f97316",
    [_stage("Pit Preparation","🚜",-30,-1,"Pit preparation for graft sapling",["Pit digging 1×1×1 m","Fill with FYM + red soil + neem cake","Install windbreak barrier","Soil pH correction if needed"]),
     _stage("Planting","🌱",1,30,"Graft sapling establishment",["Plant grafted sapling from certified nursery","Erect bamboo stake","Shade net for 30 days","Daily irrigation (5 L/tree)"]),
     _stage("Establishment (Yr 1–3)","🌳",31,1095,"Canopy and root system development",["Monthly irrigation schedule","Annual NPK per tree","Training and pruning for structure","Mango hopper and mealybug control"]),
     _stage("Bearing (Yr 4+)","🌸",1096,1460,"Regular flowering and fruiting",["K + Boron for flowering","Fruit thinning","Anthracnose and die-back watch","Irrigation at fruit development"]),
     _stage("Harvest","✂️",1461,1500,"Physiological maturity harvest",["Pluck with 2–3 cm stalk attached","Float test for maturity","Grade A/B/C by weight","Pack in tissue-lined cartons"]),
     _stage("Post-Harvest","📦",1501,1520,"Ripening and market",["Ripening room at 20°C + ethylene","Cold storage at 12°C","Export grading if applicable"]),
    ],
    "Grafted Sapling","8 × 8 m to 10 × 10 m","60–70 plants/acre"
)

PLANNING_CROPS["sunflower"] = _build_crop(
    "sunflower","Sunflower","oilseeds","Annual oilseed crop",80,110,
    ["Kharif","Rabi"],
    "Sunny weather with cool nights","Medium",
    "Well-drained loamy soil",6.0,7.5,18,35,6.5,25,1.4,80,40,40,
    "🌻","#fbbf24",
    [_stage("Land Preparation","🚜",-10,-1,"Field preparation",["Ploughing 2 times","FYM 3 t/acre","Basal NPK (DAP + MOP)","Field leveling"]),
     _stage("Sowing","🌱",1,7,"Seed treatment and sowing",["Treat with Thiram + Carbendazim","Sow at 4 cm depth","2 seeds/hill","Row spacing 60 cm"]),
     _stage("Germination","🌿",8,18,"Seedling emergence and thinning",["Thinning to 1 plant/hill at V2 stage","Monitor germination","Gap filling"]),
     _stage("Vegetative Growth","🌳",19,45,"Rapid growth phase",["N split at 20 DAS","Weeding at 20 DAS","Irrigation every 10–12 days"]),
     _stage("Bud & Flowering","🌸",46,65,"Flower head development",["Critical irrigation at bud initiation","Boron 0.3% foliar spray","Hand pollination if bee activity low"]),
     _stage("Seed Filling","🌻",66,85,"Oil and seed development",["Irrigation if dry","Bird protection (scare birds)"]),
     _stage("Harvest","✂️",86,100,"Harvest when back of head turns yellow-brown",["Cut heads when 80% mature","Threshing","Drying to <9%","Oil extraction or market"]),
    ],
    "Direct Sowing","60 × 30 cm","2.5–3 kg/acre"
)

PLANNING_CROPS["ginger"] = _build_crop(
    "ginger","Ginger","spices","Rhizomatous spice crop",210,240,
    ["Kharif (Apr–Nov)"],
    "Warm and humid with partial shade","Medium-High",
    "Well-drained loamy or sandy loam rich in organic matter",5.5,6.5,20,35,6.0,27,3.0,80,40,80,
    "🫚","#d97706",
    [_stage("Seed Rhizome Preparation","🌱",-10,-1,"Select and treat seed rhizomes",["Select healthy rhizomes 20–25g each","Treat with Mancozeb 3g/L","Dry treated rhizomes in shade","Test for soft rot"]),
     _stage("Land Preparation","🚜",-15,-1,"Bed preparation with FYM and mulch",["Deep ploughing 30 cm","FYM 10 t/acre","Raised beds 1m wide","Mulch with dry leaves"]),
     _stage("Planting","🌱",1,10,"Rhizome planting",["Plant at 4–5 cm depth","Row spacing 25 cm, plant spacing 20 cm","Apply neem cake in furrow","Pre-planting irrigation"]),
     _stage("Sprouting","🌿",11,30,"Emergence of shoots",["Monitor 80% sprouting","Gap filling","Watering every alternate day","Provide partial shade"]),
     _stage("Vegetative Growth","🌳",31,120,"Leaf and stem development",["N split doses at 40 and 90 DAS","Weeding at 40 and 90 DAS","Irrigation every 7 days","Soft rot monitoring"]),
     _stage("Rhizome Development","🫚",121,200,"Underground rhizome bulking",["K₂SO₄ foliar spray","Mulch re-application","Soft rot and stem borer monitoring"]),
     _stage("Harvest","✂️",201,240,"Foliage yellowing — harvest signal",["Stop irrigation 15 days before harvest","Manual digging","Clean rhizomes","Sort seed and commercial rhizomes"]),
    ],
    "Rhizome Planting","25 × 20 cm","800–1000 kg/acre (rhizomes)"
)

# --- AUTO-GENERATE REMAINING CROPS ---

def _make_default_crop(crop_id, name, category, icon, color, d_min, d_max, seasons, base_yield, opt_n, opt_p, opt_k):
    CAT_DEFAULTS = {
        "cereals":    {"type": "Annual cereal crop",        "climate": "Warm with moderate rainfall",    "water": "Medium",       "soil": "Well-drained loamy soil",     "ph_min": 6.0, "ph_max": 7.0, "t_min": 18, "t_max": 35, "opt_ph": 6.5, "opt_t": 25},
        "vegetables": {"type": "Vegetable crop",            "climate": "Moderate warm temperature",      "water": "Medium",       "soil": "Well-drained loamy soil",     "ph_min": 6.0, "ph_max": 7.0, "t_min": 15, "t_max": 30, "opt_ph": 6.5, "opt_t": 22},
        "fruits":     {"type": "Fruit crop",                "climate": "Tropical to subtropical",        "water": "Medium",       "soil": "Deep, well-drained soil",     "ph_min": 5.5, "ph_max": 7.0, "t_min": 15, "t_max": 35, "opt_ph": 6.0, "opt_t": 25},
        "pulses":     {"type": "Legume crop",               "climate": "Warm to cool and dry",           "water": "Low-Medium",   "soil": "Well-drained loamy soil",     "ph_min": 6.0, "ph_max": 7.5, "t_min": 15, "t_max": 32, "opt_ph": 6.5, "opt_t": 25},
        "oilseeds":   {"type": "Oilseed crop",              "climate": "Warm with moderate rain",        "water": "Medium",       "soil": "Well-drained sandy loam",     "ph_min": 6.0, "ph_max": 7.0, "t_min": 18, "t_max": 35, "opt_ph": 6.5, "opt_t": 27},
        "commercial": {"type": "Commercial crop",           "climate": "Tropical warm climate",          "water": "Medium-High",  "soil": "Deep loamy soil",             "ph_min": 5.5, "ph_max": 7.5, "t_min": 20, "t_max": 40, "opt_ph": 6.5, "opt_t": 28},
        "spices":     {"type": "Spice crop",                "climate": "Warm and humid",                 "water": "Medium",       "soil": "Well-drained loamy soil",     "ph_min": 5.5, "ph_max": 7.0, "t_min": 15, "t_max": 35, "opt_ph": 6.0, "opt_t": 27},
    }
    c = CAT_DEFAULTS.get(category, CAT_DEFAULTS["cereals"])
    mid = (d_min + d_max) // 2
    veg_end = max(d_min // 2, 30)
    rep_end = max(veg_end + 20, int(d_min * 0.75))
    return _build_crop(
        crop_id, name, category, c["type"], d_min, d_max, seasons, c["climate"],
        c["water"], c["soil"], c["ph_min"], c["ph_max"], c["t_min"], c["t_max"],
        c["opt_ph"], c["opt_t"], base_yield, opt_n, opt_p, opt_k, icon, color,
        [_stage("Land Preparation","🚜",-14,-1,"Field preparation",["Deep ploughing","FYM application 5 t/acre","Soil testing","Field leveling"]),
         _stage("Sowing / Planting","🌱",1,10,"Sowing or planting",["Seed treatment with fungicide","Sowing at recommended depth","Basal fertilizer application","Pre-sowing irrigation"]),
         _stage("Germination","🌿",11,25,"Crop establishment",["Monitor emergence","Gap filling","Light irrigation","Weed control"]),
         _stage("Vegetative Growth","🌳",26,veg_end,"Active vegetative phase",["Nitrogen split doses","Weeding at 20 and 40 DAS","Pest monitoring","Irrigation as needed"]),
         _stage("Reproductive Phase","🌸",veg_end+1,rep_end,"Flowering and fruit/grain formation",["Critical irrigation","K fertilizer application","Disease monitoring","Thinning if needed"]),
         _stage("Maturity","🌾",rep_end+1,d_min,"Crop matures and ready for harvest",["Reduce irrigation","Harvest preparation","Labour arrangement","Prepare storage"]),
         _stage("Harvest","✂️",d_min+1,d_max,"Harvesting",["Harvest at right maturity","Grade produce","Transport to market"]),
         _stage("Post-Harvest","📦",d_max+1,d_max+20,"Post-harvest handling",["Drying to safe moisture","Grading and sorting","Storage in clean facility","Market dispatch"]),
        ]
    )

_remaining = [
    ("sorghum","Sorghum","cereals","🌾","#f97316",90,120,["Kharif"],2.5,80,40,40),
    ("pearl_millet","Pearl Millet","cereals","🌾","#fbbf24",60,90,["Kharif"],2.0,80,40,30),
    ("finger_millet","Finger Millet","cereals","🌾","#d97706",90,130,["Kharif"],1.8,80,40,30),
    ("barley","Barley","cereals","🌿","#a3e635",90,120,["Rabi"],3.0,90,45,40),
    ("oats","Oats","cereals","🌿","#86efac",100,130,["Rabi"],2.5,80,40,30),
    ("brinjal","Brinjal","vegetables","🍆","#7c3aed",80,120,["Kharif","Rabi"],15.0,100,50,70),
    ("cabbage","Cabbage","vegetables","🥦","#22c55e",70,100,["Rabi","Summer"],25.0,90,45,50),
    ("cauliflower","Cauliflower","vegetables","🥦","#e5e7eb",70,100,["Rabi","Winter"],20.0,90,45,50),
    ("carrot","Carrot","vegetables","🥕","#f97316",80,100,["Rabi","Winter"],12.0,80,40,50),
    ("okra","Okra","vegetables","🌿","#22c55e",50,70,["Kharif","Summer"],6.0,80,40,50),
    ("spinach","Spinach","vegetables","🌿","#15803d",35,55,["Rabi","Winter"],8.0,80,30,30),
    ("cucumber","Cucumber","vegetables","🥒","#4ade80",50,75,["Summer","Kharif"],20.0,80,40,50),
    ("green_chilli","Green Chilli","vegetables","🌶️","#16a34a",70,90,["Kharif","Rabi"],4.0,70,35,40),
    ("capsicum","Capsicum","vegetables","🫑","#ef4444",90,120,["Rabi","Summer"],15.0,100,50,70),
    ("apple","Apple","fruits","🍎","#dc2626",730,1095,["Year-round (harvest: Aug–Oct)"],15.0,80,30,80),
    ("orange","Orange","fruits","🍊","#f97316",365,730,["Year-round"],15.0,100,40,80),
    ("grapes","Grapes","fruits","🍇","#7c3aed",365,548,["Year-round"],12.0,90,40,80),
    ("guava","Guava","fruits","🍏","#22c55e",180,365,["Year-round"],20.0,80,40,60),
    ("papaya","Papaya","fruits","🍈","#f97316",270,365,["Year-round"],40.0,100,50,100),
    ("pineapple","Pineapple","fruits","🍍","#fbbf24",540,730,["Year-round"],25.0,80,40,80),
    ("pomegranate","Pomegranate","fruits","🍎","#dc2626",365,730,["Year-round"],8.0,60,30,60),
    ("watermelon","Watermelon","fruits","🍉","#ef4444",70,95,["Summer","Kharif"],25.0,60,30,50),
    ("green_gram","Green Gram","pulses","🌱","#22c55e",55,70,["Kharif","Summer"],0.8,20,40,30),
    ("black_gram","Black Gram","pulses","🫘","#1f2937",65,90,["Kharif","Rabi"],0.8,20,40,30),
    ("pigeon_pea","Pigeon Pea","pulses","🫘","#d97706",150,300,["Kharif"],1.0,20,40,20),
    ("lentil","Lentil","pulses","🫘","#d97706",90,120,["Rabi"],1.0,20,40,20),
    ("peas","Peas","pulses","🫛","#22c55e",60,90,["Rabi","Winter"],3.0,30,40,30),
    ("kidney_bean","Kidney Bean","pulses","🫘","#dc2626",80,100,["Kharif","Rabi"],1.5,30,50,40),
    ("mustard","Mustard","oilseeds","🌻","#fbbf24",90,120,["Rabi"],1.0,80,40,40),
    ("sesame","Sesame","oilseeds","🌿","#d97706",70,90,["Kharif"],0.5,40,20,20),
    ("soybean","Soybean","oilseeds","🫘","#a3e635",90,120,["Kharif"],1.5,20,60,40),
    ("rapeseed","Rapeseed","oilseeds","🌻","#fbbf24",90,120,["Rabi"],1.0,80,40,40),
    ("safflower","Safflower","oilseeds","🌸","#f97316",100,140,["Rabi"],1.0,60,40,30),
    ("jute","Jute","commercial","🌿","#22c55e",100,120,["Kharif"],2.5,80,40,50),
    ("tobacco","Tobacco","commercial","🌿","#d97706",100,130,["Rabi","Kharif"],1.5,60,40,100),
    ("rubber","Rubber","commercial","🌿","#1f2937",2190,2555,["Year-round"],1.8,80,40,80),
    ("tea","Tea","commercial","🍵","#22c55e",1095,1460,["Year-round"],1.5,120,50,80),
    ("coffee","Coffee","commercial","☕","#92400e",1095,1460,["Year-round"],1.0,80,40,80),
    ("cocoa","Cocoa","commercial","🍫","#92400e",1095,1460,["Year-round"],0.5,60,30,80),
    ("garlic","Garlic","spices","🧄","#e5e7eb",120,170,["Rabi"],4.0,80,40,80),
    ("coriander","Coriander","spices","🌿","#22c55e",45,90,["Rabi","Summer"],0.5,40,20,20),
    ("cumin","Cumin","spices","🌿","#d97706",90,120,["Rabi"],0.5,40,20,20),
    ("black_pepper","Black Pepper","spices","⚫","#1f2937",365,540,["Year-round"],0.5,60,30,80),
    ("cardamom","Cardamom","spices","🌿","#22c55e",365,548,["Year-round"],0.2,40,20,40),
]

for r in _remaining:
    cid = r[0]
    if cid not in PLANNING_CROPS:
        PLANNING_CROPS[cid] = _make_default_crop(cid, r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11])

# ═══════════════════════════════════════════════════════════════════════════════
# ─── IN-MEMORY PLAN STORE ─────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

ACTIVE_PLANS: Dict[str, Any] = {}

# ═══════════════════════════════════════════════════════════════════════════════
# ─── CROP PLANNING ENGINE ─────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class CropPlanningEngine:
    def generate_plan(self, crop: dict, farm: dict, planting_date_str: str, weather: dict = None) -> dict:
        plan_id = str(uuid.uuid4())[:8].upper()
        try:
            planting_date = datetime.strptime(planting_date_str, "%Y-%m-%d").date()
        except Exception:
            planting_date = date.today()

        area = farm.get("area", 2.5)
        area_unit = farm.get("area_unit", "acres")
        area_ha = area * 0.405 if area_unit == "acres" else area

        rain_prob = (weather or {}).get("rain_probability", 20)
        temperature = (weather or {}).get("temperature", crop.get("optimal_temp", 25))

        tasks = []
        for s_idx, stage in enumerate(crop.get("stages", [])):
            stage_start_day = max(0, stage["start_day"])
            stage_dur = max(1, stage["end_day"] - stage["start_day"])
            n_tasks = len(stage.get("key_tasks", []))
            for t_idx, key_task in enumerate(stage.get("key_tasks", [])):
                interval = stage_dur // max(n_tasks, 1)
                task_day = stage_start_day + (t_idx * interval)
                task_date = planting_date + timedelta(days=task_day)

                tl = key_task.lower()
                if any(x in tl for x in ["irrigat","water","flood"]):
                    task_type = "irrigation"
                elif any(x in tl for x in ["fertiliz","urea","nitrogen","phosphorus","npk","dap","manure","fym","potassium","k₂"]):
                    task_type = "fertilizer"
                elif any(x in tl for x in ["harvest","pick","thresh","cut","pluck","uprooting","shell","gin"]):
                    task_type = "harvest"
                elif any(x in tl for x in ["plough","till","plowing","level","pit","subsoil","ridge","furrow","bund"]):
                    task_type = "soil"
                elif any(x in tl for x in ["seed","sow","plant","nursery","rhizome","transplant","sucker","sapling","sett"]):
                    task_type = "sowing"
                elif any(x in tl for x in ["dry","grade","pack","storage","market","weigh","mill","bag","dispatch","gin"]):
                    task_type = "postharvest"
                elif any(x in tl for x in ["pest","borer","aphid","fungic","insect","spray","monitor","mite","virus","worm","rust","rot","blight"]):
                    task_type = "monitoring"
                else:
                    task_type = "monitoring"

                weather_postponed = False
                actual_date = task_date
                if task_type == "irrigation" and rain_prob > 70:
                    actual_date = task_date + timedelta(days=3)
                    weather_postponed = True

                priority = "high" if (s_idx <= 2 or task_type == "harvest") else ("medium" if task_type in ["fertilizer","monitoring"] else "low")

                tasks.append({
                    "task_id": f"T{plan_id}{s_idx:02d}{t_idx:02d}",
                    "stage": stage["name"],
                    "stage_icon": stage.get("icon", "🌿"),
                    "stage_start_day": stage["start_day"],
                    "stage_end_day": stage["end_day"],
                    "planned_day": task_day,
                    "actual_date": actual_date.strftime("%Y-%m-%d"),
                    "task_name": key_task,
                    "task_type": task_type,
                    "priority": priority,
                    "duration_hours": 3 if task_type in ["soil","harvest"] else 1,
                    "reason": stage["description"],
                    "why_explanation": self._why(key_task, stage["name"], crop["name"], rain_prob, temperature),
                    "resources": self._resources(task_type, crop, area),
                    "status": "pending",
                    "completed_at": None,
                    "weather_dependent": task_type == "irrigation",
                    "modified_by_weather": weather_postponed,
                    "notes": "",
                })

        harvest_date = planting_date + timedelta(days=crop["duration"]["min"])
        ph_factor = max(0.5, 1.0 - abs(farm.get("soil_ph", 6.5) - crop.get("optimal_ph", 6.5)) * 0.15)
        n_factor  = max(0.7, min(1.1, farm.get("nitrogen", 80) / max(1, crop.get("optimal_n", 100))))
        est_yield = round(crop["base_yield"] * ph_factor * n_factor * area_ha, 2)

        stage_names = [s["name"] for s in crop.get("stages", [])]

        market_price_base = 20000
        cat = crop.get("category", "cereals")
        if cat == "fruits": market_price_base = 40000
        elif cat == "vegetables": market_price_base = 25000
        elif cat == "spices": market_price_base = 150000
        elif cat == "commercial": market_price_base = 60000

        plan = {
            "plan_id": plan_id,
            "crop_id": crop["id"],
            "crop_name": crop["name"],
            "crop_icon": crop["icon"],
            "crop_color": crop.get("color", "#34d399"),
            "farm": farm,
            "planting_date": planting_date.strftime("%Y-%m-%d"),
            "expected_harvest_date": harvest_date.strftime("%Y-%m-%d"),
            "total_days": crop["duration"]["min"],
            "current_day": 1,
            "current_stage_idx": 0,
            "current_stage": stage_names[0] if stage_names else "Land Preparation",
            "plan_status": "active",
            "crop_health": "Good",
            "pest_risk": "Low",
            "weather_risk": "Low",
            "estimated_yield_t": est_yield,
            "area_ha": area_ha,
            "tasks": tasks,
            "irrigation_schedule": self._irrigation_schedule(crop, planting_date, rain_prob),
            "fertilizer_schedule": self._fertilizer_schedule(crop, farm, planting_date, area_ha),
            "market_info": {
                "estimated_price_inr_per_tonne": market_price_base,
                "estimated_revenue_inr": round(est_yield * market_price_base),
                "nearby_markets": ["Local Mandi", "APMC Market", "FPO Collection Centre"],
                "transport_distance_km": 25,
                "storage_option": "Government Warehouse",
                "data_source": "DEMO DATA",
            },
            "weather": weather or {"temperature": temperature, "rain_probability": rain_prob, "humidity": 65, "wind_speed": 10},
            "weather_data_source": "SIMULATED DATA",
            "notifications": [],
            "versions": [{
                "version": 1,
                "created_at": datetime.now().isoformat(),
                "reason": "Initial plan created by AI planning engine",
                "changes": ["Complete crop lifecycle plan generated", f"Total {len(tasks)} tasks across {len(stage_names)} stages"],
                "weather_snapshot": {"rain_probability": rain_prob, "temperature": temperature},
            }],
            "plan_version": 1,
            "lifecycle_stages": stage_names,
            "created_at": datetime.now().isoformat(),
        }
        return plan

    def _why(self, task: str, stage: str, crop_name: str, rain_prob: int, temp: float) -> str:
        tl = task.lower()
        if "irrigat" in tl or "water" in tl:
            if rain_prob > 70:
                return f"Rain probability is high ({rain_prob}%). Irrigation has been postponed by 3 days to avoid waterlogging and conserve water."
            return f"{crop_name} requires consistent soil moisture during {stage}. Irrigation at this stage promotes healthy root development and nutrient uptake."
        elif "nitrogen" in tl or "urea" in tl:
            return f"Nitrogen is the primary macronutrient for vegetative growth. Split application during {stage} ensures availability when {crop_name} demand peaks."
        elif "pest" in tl or "monitor" in tl or "borer" in tl:
            if temp > 28 and rain_prob > 50:
                return f"Warm ({temp}°C) and humid conditions increase pest pressure during {stage}. Early detection prevents significant crop losses."
            return f"Regular field monitoring during {stage} enables early pest/disease detection, reducing the need for costly emergency treatments."
        elif "harvest" in tl or "pick" in tl:
            return f"Harvesting at physiological maturity ensures maximum quality and minimizes post-harvest losses for {crop_name}."
        elif "plough" in tl or "till" in tl or "prepar" in tl:
            return f"Proper land preparation creates an ideal seedbed, improves drainage and aeration, and incorporates organic matter for {crop_name} root development."
        elif "fertiliz" in tl or "k₂" in tl or "dap" in tl:
            return f"Balanced fertilizer application during {stage} supplies essential nutrients for {crop_name}'s current growth requirements."
        return f"This activity is essential during {stage} for healthy {crop_name} development and optimal yield."

    def _resources(self, task_type: str, crop: dict, area: float) -> list:
        if task_type == "irrigation":
            return ["Drip irrigation system / Sprinkler", f"Water requirement: ~25–40 mm/irrigation", "Soil moisture meter"]
        elif task_type == "fertilizer":
            return ["Urea / DAP / MOP as per schedule", "Fertilizer broadcaster / drip fertigation", "Weighing scale", "Protective gloves"]
        elif task_type == "soil":
            return ["Tractor with plough", "FYM / vermicompost", "Soil testing kit", "Labour"]
        elif task_type == "sowing":
            return ["Certified seeds / planting material", "Seed treatment chemicals", "Seed drill / dibbler / planter"]
        elif task_type == "monitoring":
            return ["Field inspection kit", "Magnifying lens", "Spray pump (if needed)", "Record book"]
        elif task_type == "harvest":
            return ["Sickle / combine harvester", "Gunny bags / plastic crates", "Weighing scale", "Labour (10–15/acre)"]
        elif task_type == "postharvest":
            return ["Sorting table", "Grading equipment", "Moisture meter", "Packaging material", "Transport vehicle"]
        return ["Standard farm tools", "Labour"]

    def _irrigation_schedule(self, crop: dict, planting_date: date, rain_prob: int) -> list:
        schedule = []
        water_mm = {"High": 45, "Very High": 55, "Medium-High": 38, "Medium": 28, "Low-Medium": 20, "Low": 15}
        req_mm = water_mm.get(crop.get("water_requirement", "Medium"), 28)
        for i, stage in enumerate(crop.get("stages", [])):
            if stage["start_day"] < 0:
                continue
            mid = (max(0, stage["start_day"]) + stage["end_day"]) // 2
            irr_date = planting_date + timedelta(days=mid)
            if rain_prob > 70:
                status = "postponed"
                rec = f"Postponed — rain probability {rain_prob}%. Wait for natural rainfall."
            elif rain_prob > 40:
                status = "scheduled"
                rec = f"Monitor soil moisture — {rain_prob}% rain probability. May reduce quantity."
            else:
                status = "scheduled"
                rec = "Irrigate as scheduled to maintain optimal soil moisture."
            schedule.append({
                "irr_id": f"IRR{i:03d}",
                "stage": stage["name"],
                "date": irr_date.strftime("%Y-%m-%d"),
                "water_requirement_mm": req_mm,
                "soil_moisture_status": "Adequate" if rain_prob > 40 else "Low",
                "rain_probability": rain_prob,
                "recommendation": rec,
                "status": status,
                "why": f"Irrigation during {stage['name']} maintains water balance for healthy {crop['name']} growth.",
                "weather_source": "SIMULATED DATA",
            })
        return schedule

    def _fertilizer_schedule(self, crop: dict, farm: dict, planting_date: date, area_ha: float) -> list:
        schedule = []
        opt_n, opt_p, opt_k = crop.get("optimal_n",100), crop.get("optimal_p",50), crop.get("optimal_k",50)
        current_n = farm.get("nitrogen", 80)
        n_per_dose = max(10, opt_n // 3)

        schedule.append({
            "fert_id": "FERT000", "stage": "Pre-Planting / Basal",
            "day": 0, "date": planting_date.strftime("%Y-%m-%d"),
            "type": "Basal NPK Application",
            "recommendation": f"DAP {round(opt_p*2.2*area_ha)} kg + MOP {round(opt_k*1.67*area_ha)} kg",
            "quantity_kg_ha": f"P₂O₅: {opt_p} kg/ha, K₂O: {opt_k//2} kg/ha",
            "reason": "Basal phosphorus and potassium support strong root development from the first day.",
            "status": "scheduled",
        })

        for i, stage in enumerate(crop.get("stages", [])):
            if stage["start_day"] < 5: continue
            if i % 2 == 0 and len(schedule) <= 4:
                d = planting_date + timedelta(days=stage["start_day"])
                schedule.append({
                    "fert_id": f"FERT{len(schedule):03d}", "stage": stage["name"],
                    "day": stage["start_day"], "date": d.strftime("%Y-%m-%d"),
                    "type": "Nitrogen Top-dressing",
                    "recommendation": f"Urea {round(n_per_dose*2.17*area_ha)} kg",
                    "quantity_kg_ha": f"N: {n_per_dose} kg/ha",
                    "reason": f"Nitrogen split-dose during {stage['name']} boosts {crop['name']} growth when demand is highest.",
                    "status": "scheduled",
                })

        for stage in crop.get("stages", []):
            if any(x in stage["name"].lower() for x in ["flower","fruit","grain","boll","tuber","bulb","pod","rhizome"]):
                d = planting_date + timedelta(days=stage["start_day"])
                schedule.append({
                    "fert_id": f"FERT{len(schedule):03d}", "stage": stage["name"],
                    "day": stage["start_day"], "date": d.strftime("%Y-%m-%d"),
                    "type": "Potassium Booster",
                    "recommendation": f"K₂SO₄ {round(opt_k*0.5*area_ha)} kg + Boron 0.2% foliar spray",
                    "quantity_kg_ha": f"K₂O: {opt_k//2} kg/ha",
                    "reason": f"Potassium at {stage['name']} stage enhances quality, sugar content, and reduces blossom-end disorders.",
                    "status": "scheduled",
                })
                break
        return schedule

    def apply_weather_update(self, plan: dict, weather_update: dict) -> tuple:
        old_rain = plan["weather"].get("rain_probability", 20)
        new_rain = weather_update.get("rain_probability", old_rain)
        old_temp = plan["weather"].get("temperature", 25)
        new_temp = weather_update.get("temperature", old_temp)
        is_sim = weather_update.get("is_simulation", True)

        changes = []
        new_notifications = []

        rain_changed = abs(new_rain - old_rain) >= 25
        temp_changed = abs(new_temp - old_temp) >= 5

        if rain_changed:
            postponed_count = 0
            for task in plan["tasks"]:
                if task["task_type"] == "irrigation" and task["status"] == "pending":
                    if new_rain > 70:
                        old_date = task["actual_date"]
                        new_dt = datetime.strptime(old_date, "%Y-%m-%d") + timedelta(days=3)
                        task["actual_date"] = new_dt.strftime("%Y-%m-%d")
                        task["modified_by_weather"] = True
                        task["why_explanation"] = f"Rain probability jumped to {new_rain}% (was {old_rain}%). Irrigation postponed 3 days to prevent waterlogging."
                        postponed_count += 1

            for irr in plan["irrigation_schedule"]:
                if irr["status"] == "scheduled" and new_rain > 70:
                    irr["status"] = "postponed"
                    irr["recommendation"] = f"Postponed — rain probability {new_rain}%."
                    irr["rain_probability"] = new_rain

            if new_rain > 70 and postponed_count > 0:
                changes.append(f"✅ {postponed_count} irrigation task(s) postponed by 3 days")
                changes.append(f"🌧️ Irrigation schedule updated — waiting for rainfall")
                new_notifications.append({
                    "notif_id": str(uuid.uuid4())[:8],
                    "type": "weather_alert",
                    "icon": "🌧️",
                    "title": "Farm Plan Updated — Heavy Rain Expected",
                    "message": f"Rain probability increased from {old_rain}% → {new_rain}%. {postponed_count} irrigation task(s) automatically postponed. Monitor for waterlogging.",
                    "timestamp": datetime.now().isoformat(),
                    "is_simulation": is_sim,
                    "priority": "high",
                    "read": False,
                })
            elif new_rain < 20 and old_rain > 50:
                for irr in plan["irrigation_schedule"]:
                    if irr["status"] == "postponed":
                        irr["status"] = "scheduled"
                        irr["recommendation"] = "Rain probability dropped. Resume scheduled irrigation."
                        irr["rain_probability"] = new_rain
                changes.append(f"💧 Rain probability dropped to {new_rain}% — irrigation resumed")

        # Recalculate pest/weather risk
        pest_risk = "Low"
        if new_temp > 28 and new_rain > 60:
            pest_risk = "High"
            changes.append("⚠️ Pest risk elevated to HIGH — warm and wet conditions")
            new_notifications.append({
                "notif_id": str(uuid.uuid4())[:8],
                "type": "pest_alert",
                "icon": "⚠️",
                "title": "Elevated Pest Risk Detected",
                "message": f"High temperature ({new_temp}°C) + high humidity from expected rain creates elevated fungal and pest pressure. Inspect your {plan['crop_name']} crop.",
                "timestamp": datetime.now().isoformat(),
                "is_simulation": is_sim,
                "priority": "high",
                "read": False,
            })
        elif new_temp > 25 and new_rain > 40:
            pest_risk = "Medium"
            if pest_risk != plan.get("pest_risk", "Low"):
                changes.append("⚠️ Pest risk elevated to MEDIUM")

        weather_risk = "Low"
        if new_rain > 70 or abs(new_temp - 25) > 8:
            weather_risk = "High" if new_rain > 80 else "Medium"

        if temp_changed:
            changes.append(f"🌡️ Temperature change: {old_temp}°C → {new_temp}°C")

        # Drought logic
        if new_temp >= 35 and new_rain < 10:
            changes.append("☀️ Extreme heat and dry conditions detected")
            
            advanced_count = 0
            for task in plan["tasks"]:
                if task["task_type"] == "irrigation" and task["status"] == "pending":
                    old_date = task["actual_date"]
                    try:
                        # Advance irrigation by 2 days, but don't go before today
                        new_dt = datetime.strptime(old_date, "%Y-%m-%d") - timedelta(days=2)
                        today = date.today()
                        if new_dt.date() < today:
                            new_dt = datetime.combine(today, datetime.min.time())
                        task["actual_date"] = new_dt.strftime("%Y-%m-%d")
                        task["modified_by_weather"] = True
                        task["why_explanation"] = f"Temperature rose to {new_temp}°C with low rain probability. Irrigation advanced to prevent heat stress."
                        advanced_count += 1
                    except Exception:
                        pass
                        
            for irr in plan["irrigation_schedule"]:
                if irr["status"] == "scheduled":
                    irr["recommendation"] = f"Advanced due to heatwave ({new_temp}°C)."
                    irr["rain_probability"] = new_rain

            if advanced_count > 0:
                changes.append(f"✅ {advanced_count} irrigation task(s) advanced to prevent crop stress")
                changes.append(f"☀️ Irrigation schedule updated — extra watering needed")
                new_notifications.append({
                    "notif_id": str(uuid.uuid4())[:8],
                    "type": "weather_alert",
                    "icon": "☀️",
                    "title": "Farm Plan Updated — Drought / Heat Expected",
                    "message": f"Temperature reached {new_temp}°C with only {new_rain}% rain probability. {advanced_count} irrigation task(s) automatically advanced. Ensure adequate water supply.",
                    "timestamp": datetime.now().isoformat(),
                    "is_simulation": is_sim,
                    "priority": "high",
                    "read": False,
                })

        # Update plan
        plan["weather"].update(weather_update)
        plan["weather"]["rain_probability"] = new_rain
        plan["weather"]["temperature"] = new_temp
        plan["weather"]["data_source"] = "SIMULATED DATA" if is_sim else "Live Weather API"
        plan["pest_risk"] = pest_risk
        plan["weather_risk"] = weather_risk

        if changes:
            plan["plan_version"] += 1
            plan["versions"].append({
                "version": plan["plan_version"],
                "created_at": datetime.now().isoformat(),
                "reason": f"Weather update — Rain: {old_rain}% → {new_rain}%{', Temp: %.1f°C → %.1f°C' % (old_temp, new_temp) if temp_changed else ''}",
                "changes": changes,
                "weather_snapshot": {"rain_probability": new_rain, "temperature": new_temp},
                "is_simulation": is_sim,
            })
            plan["notifications"] = new_notifications + plan.get("notifications", [])

        return plan, changes, new_notifications

planning_engine = CropPlanningEngine()

# ═══════════════════════════════════════════════════════════════════════════════
# ─── NEW: CROP PLANNING API ENDPOINTS ─────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/crop-categories")
def get_crop_categories():
    """Return all crop categories with metadata."""
    return {"categories": list(CROP_CATALOG_CATEGORIES.values())}

@app.get("/api/planning/crops")
def get_planning_crops(category: str = None):
    """Return crops for crop planning module, optionally filtered by category."""
    if category and category in CROP_CATALOG_CATEGORIES:
        crop_ids = CROP_CATALOG_CATEGORIES[category]["crops"]
        crops = [PLANNING_CROPS[cid] for cid in crop_ids if cid in PLANNING_CROPS]
    else:
        crops = list(PLANNING_CROPS.values())
    # Return lightweight version for list views
    lite = []
    for c in crops:
        lite.append({
            "id": c["id"], "name": c["name"], "category": c["category"],
            "type": c["type"], "icon": c["icon"], "color": c["color"],
            "duration": c["duration"], "suitable_seasons": c["suitable_seasons"],
            "climate": c["climate"], "water_requirement": c["water_requirement"],
            "ph_range": c["ph_range"], "temp_range": c["temp_range"],
            "planting_method": c.get("planting_method",""), "spacing": c.get("spacing",""),
            "base_yield": c["base_yield"],
        })
    return {"crops": lite}

@app.get("/api/planning/crops/{crop_id}")
def get_crop_detail(crop_id: str):
    """Return full crop profile including stages."""
    if crop_id not in PLANNING_CROPS:
        raise HTTPException(status_code=404, detail=f"Crop '{crop_id}' not found")
    return {"crop": PLANNING_CROPS[crop_id]}

@app.get("/api/planning/crops/{crop_id}/stages")
def get_crop_stages(crop_id: str):
    """Return growth stages for a crop."""
    if crop_id not in PLANNING_CROPS:
        raise HTTPException(status_code=404, detail="Crop not found")
    stages = PLANNING_CROPS[crop_id].get("stages", [])
    return {"crop_id": crop_id, "stages": stages}

@app.post("/api/crop-plans")
def create_crop_plan(farm_setup: FarmSetup):
    """Create a complete AI-generated crop lifecycle plan."""
    crop_id = farm_setup.crop_id
    if crop_id not in PLANNING_CROPS:
        raise HTTPException(status_code=404, detail=f"Crop '{crop_id}' not found")

    crop = PLANNING_CROPS[crop_id]
    planting_date = farm_setup.planting_date or date.today().strftime("%Y-%m-%d")
    farm_dict = farm_setup.model_dump()

    plan = planning_engine.generate_plan(crop, farm_dict, planting_date)
    ACTIVE_PLANS[plan["plan_id"]] = plan
    return {"plan_id": plan["plan_id"], "plan": plan}

@app.get("/api/crop-plans")
def list_crop_plans():
    """List all created crop plans."""
    return {"plans": list(ACTIVE_PLANS.values())}

@app.get("/api/crop-plans/{plan_id}")
def get_crop_plan(plan_id: str):
    """Fetch a crop plan by ID."""
    if plan_id not in ACTIVE_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"plan": ACTIVE_PLANS[plan_id]}

@app.get("/api/crop-plans/{plan_id}/tasks")
def get_plan_tasks(plan_id: str, status: str = None):
    """Get tasks for a crop plan, optionally filtered by status."""
    if plan_id not in ACTIVE_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    tasks = ACTIVE_PLANS[plan_id]["tasks"]
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    return {"plan_id": plan_id, "tasks": tasks}

@app.patch("/api/crop-plans/{plan_id}/tasks/{task_id}")
def update_task(plan_id: str, task_id: str, update: TaskUpdate):
    """Mark a task as completed, skipped, or rescheduled."""
    if plan_id not in ACTIVE_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = ACTIVE_PLANS[plan_id]
    for task in plan["tasks"]:
        if task["task_id"] == task_id:
            task["status"] = update.status
            task["notes"] = update.notes
            if update.status == "completed":
                task["completed_at"] = datetime.now().isoformat()
            return {"success": True, "task": task}
    raise HTTPException(status_code=404, detail="Task not found")

@app.post("/api/crop-plans/{plan_id}/weather-update")
def apply_weather_update(plan_id: str, weather: WeatherUpdate):
    """Apply a weather change to a crop plan and recalculate recommendations."""
    if plan_id not in ACTIVE_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = ACTIVE_PLANS[plan_id]
    weather_dict = {k: v for k, v in weather.model_dump().items() if v is not None}
    updated_plan, changes, notifications = planning_engine.apply_weather_update(plan, weather_dict)
    ACTIVE_PLANS[plan_id] = updated_plan
    return {
        "plan_id": plan_id,
        "plan_version": updated_plan["plan_version"],
        "changes": changes,
        "new_notifications": notifications,
        "plan": updated_plan,
    }

@app.get("/api/crop-plans/{plan_id}/history")
def get_plan_history(plan_id: str):
    """Get all versions of a crop plan."""
    if plan_id not in ACTIVE_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"plan_id": plan_id, "versions": ACTIVE_PLANS[plan_id]["versions"]}

@app.get("/api/crop-plans/{plan_id}/notifications")
def get_plan_notifications(plan_id: str):
    """Get all notifications for a plan."""
    if plan_id not in ACTIVE_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"plan_id": plan_id, "notifications": ACTIVE_PLANS[plan_id].get("notifications", [])}

@app.patch("/api/crop-plans/{plan_id}/advance-demo")
def advance_demo(plan_id: str, days: int = 10):
    """Advance the demo plan's current day for demonstration purposes."""
    if plan_id not in ACTIVE_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = ACTIVE_PLANS[plan_id]
    plan["current_day"] = min(plan["current_day"] + days, plan["total_days"])
    # Auto-complete tasks that have passed
    today = date.today()
    for task in plan["tasks"]:
        if task["status"] == "pending":
            try:
                task_dt = datetime.strptime(task["actual_date"], "%Y-%m-%d").date()
                if task_dt <= today:
                    task["status"] = "completed"
                    task["completed_at"] = datetime.now().isoformat()
            except Exception:
                pass
    return {"plan": plan}

@app.post("/api/crop-plans/{plan_id}/mark-sold")
def mark_crop_sold(plan_id: str):
    """Mark crop as sold and generate final report."""
    if plan_id not in ACTIVE_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = ACTIVE_PLANS[plan_id]
    plan["plan_status"] = "sold"
    crop = PLANNING_CROPS.get(plan["crop_id"], {})
    total_tasks = len(plan["tasks"])
    completed = len([t for t in plan["tasks"] if t["status"] == "completed"])
    report = {
        "plan_id": plan_id,
        "crop": plan["crop_name"],
        "farm_name": plan["farm"].get("farm_name", "My Farm"),
        "farm_area": f"{plan['farm'].get('area', 2.5)} {plan['farm'].get('area_unit', 'acres')}",
        "planting_date": plan["planting_date"],
        "harvest_date": plan["expected_harvest_date"],
        "total_growing_days": plan["total_days"],
        "estimated_yield_t": plan["estimated_yield_t"],
        "estimated_revenue_inr": plan.get("market_info", {}).get("estimated_revenue_inr", 0),
        "total_tasks": total_tasks,
        "completed_tasks": completed,
        "plan_versions": plan["plan_version"],
        "weather_events": len([v for v in plan["versions"] if v.get("version",1) > 1]),
        "final_status": "Crop Sold ✓",
        "data_note": "Revenue figures are DEMO DATA based on typical market prices.",
    }
    return {"report": report}

class SavePlanRequest(BaseModel):
    name: str
    crop: str
    area: float
    soil_ph: float
    nitrogen: float
    phosphorus: float
    potassium: float
    expected_yield: float
    crop_health: str
    user_id: Optional[int] = None

@app.post("/api/saved-predictions")
def save_prediction(plan: SavePlanRequest, db: Session = Depends(get_db)):
    db_plan = models.FarmPlan(**plan.model_dump())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return {"message": "Plan saved successfully", "plan_id": db_plan.id}

@app.get("/api/saved-predictions")
def get_saved_predictions(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    if user_id:
        plans = db.query(models.FarmPlan).filter(models.FarmPlan.user_id == user_id).order_by(models.FarmPlan.created_at.desc()).all()
    else:
        plans = db.query(models.FarmPlan).order_by(models.FarmPlan.created_at.desc()).all()
    return {"plans": plans}

@app.delete("/api/saved-predictions/{plan_id}")
def delete_prediction(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(models.FarmPlan).filter(models.FarmPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Plan deleted"}
