from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import re
import json
from datetime import datetime

from database import get_db
import models

router = APIRouter()

# ─── Pydantic Models ─────────────────────────────────────────────────────────

class FarmContext(BaseModel):
    crop: Optional[str] = None
    variety: Optional[str] = None
    age_days: Optional[int] = None
    area: Optional[float] = None
    soil_ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    soil_moisture: Optional[str] = None
    temperature: Optional[float] = None
    rain_probability: Optional[int] = None
    is_simulation: Optional[bool] = False

class ChatRequest(BaseModel):
    message: str
    farm_id: Optional[str] = None
    user_id: Optional[int] = None
    language: str = "en"
    mode: str = "farmer" # "farmer" or "expert"
    context: Optional[FarmContext] = None

class ChatResponse(BaseModel):
    response: str
    intent: str
    sources: list[str]
    action: Optional[str] = None # E.g., "UPDATE_PLAN", "POSTPONE_IRRIGATION"

class ChatHistoryResponse(BaseModel):
    id: int
    message: str
    response: str
    intent: str
    sources: list[str]
    created_at: datetime
    sender: str = "user" # 'user' or 'ai' to make it easier for frontend if we want to interleave, but actually frontend stores interleaved. Let's just return the raw rows.

# ─── Intent Engine ───────────────────────────────────────────────────────────

def detect_intent(message: str) -> str:
    msg = message.lower()
    
    if re.search(r"weather|rain|temperature|mazha|mazhai|wind|heat|storm", msg):
        return "WEATHER_QUERY"
    if re.search(r"water|irrigate|irrigation|thanni|thannir|moisture|wet|dry", msg):
        return "IRRIGATION_ADVICE"
    if re.search(r"fertilizer|uram|npk|nitrogen|phosphorus|potassium|nutrient", msg):
        return "FERTILIZER_ADVICE"
    if re.search(r"pest|insect|poochi|disease|yellow|spot|fungus|curl|blight|wilt|rot", msg):
        return "PEST_DISEASE_HELP"
    if re.search(r"harvest|ready|aruvadai|mature|reap", msg):
        return "HARVEST_PLANNING"
    if re.search(r"market|sell|price|mandi|rate", msg):
        return "MARKET_QUERY"
    if re.search(r"yield|profit|cost|production|income", msg):
        return "YIELD_PREDICTION"
    if re.search(r"do today|plan|schedule|today|task|inniku enna", msg):
        return "TASK_QUERY"
    if re.search(r"which crop|what to plant|season|kharif|rabi|zaid", msg):
        return "CROP_SELECTION"
    if re.search(r"scheme|subsidy|loan|government|insurance", msg):
        return "GOVERNMENT_SCHEME"
    if re.search(r"soil|ph|type of soil|improve soil", msg):
        return "SOIL_QUERY"
    if re.search(r"health|grow|height|stress|performing", msg):
        return "CROP_HEALTH"
    if re.search(r"store|dry|spoilage|package|post-harvest", msg):
        return "POST_HARVEST"
    if re.search(r"happen if|what if|simulation", msg):
        return "SIMULATION"
    if re.search(r"previous plan|old plan|compare plan", msg):
        return "PREVIOUS_PLAN"
    
    return "GENERAL_AGRICULTURE"

# ─── Response Engine ─────────────────────────────────────────────────────────

def generate_response(intent: str, request: ChatRequest) -> dict:
    ctx = request.context or FarmContext()
    crop = ctx.crop or "your crop"
    mode = request.mode
    is_expert = mode == "expert"
    
    # Base fallback
    resp = {
        "response": f"🌾 ANSWER\nI'm your Agri-Yield AI Assistant. I can help with weather, irrigation, and {crop} planning.\n\n📌 HOW I CAN HELP\nTry asking me:\n- 'Will it rain tomorrow?'\n- 'When should I irrigate?'\n- 'My tomato leaves are yellow, what to do?'",
        "sources": ["🟣 AI PREDICTION"],
        "action": None
    }

    if intent == "WEATHER_QUERY":
        rain_prob = ctx.rain_probability if ctx.rain_probability is not None else 20
        temp = ctx.temperature if ctx.temperature is not None else 28
        
        if rain_prob > 50:
            ans = f"Yes, there is a high chance of rain ({rain_prob}%)."
            todo = "1. Postpone planned irrigation.\n2. Do not spray fertilizers or pesticides today."
        else:
            ans = f"No heavy rain expected. Probability is only {rain_prob}%."
            todo = "1. Continue with your normal farm tasks.\n2. Monitor soil moisture for irrigation needs."
            
        why_text = f"Local weather models indicate a temperature of {temp}°C and {rain_prob}% rain probability." if is_expert else "Based on the local weather forecast for your area."
        
        resp = {
            "response": f"🌾 ANSWER\n{ans}\n\n📌 WHY?\n{why_text}\n\n✅ WHAT TO DO\n{todo}\n\n⚠️ WATCH FOR\nUnexpected wind changes.\n\n🌦 WEATHER\nTemp: {temp}°C | Rain: {rain_prob}%\n\n📅 NEXT TASK\nCheck drainage tomorrow.",
            "sources": ["🟢 LIVE DATA" if not ctx.is_simulation else "🟠 SIMULATION"],
            "action": "VIEW_WEATHER"
        }
        
    elif intent == "IRRIGATION_ADVICE":
        rain_prob = ctx.rain_probability if ctx.rain_probability is not None else 0
        moisture = ctx.soil_moisture or "Medium"
        
        if moisture == "High" or rain_prob > 60:
            ans = f"You don't need to water your {crop} today."
            why = f"Your soil moisture is {moisture} and rain probability is {rain_prob}%."
            todo = "1. Skip irrigation today.\n2. Re-check moisture after the expected rain."
            action = "POSTPONE_IRRIGATION"
        else:
            ans = f"Yes, you should irrigate your {crop} today."
            why = f"Soil moisture is {moisture} and no significant rain is expected."
            todo = "1. Start irrigation preferably in the evening.\n2. Ensure uniform water distribution."
            action = "CREATE_FARM_TASK"
            
        expert_info = f"\nEvapotranspiration rate is high due to {ctx.temperature}°C." if is_expert and ctx.temperature else ""
            
        resp = {
            "response": f"🌾 ANSWER\n{ans}\n\n📌 WHY?\n{why}{expert_info}\n\n✅ WHAT TO DO\n{todo}\n\n📊 DATA USED\nCrop: {crop}\nSoil Moisture: {moisture}\n\n📅 NEXT TASK\nUpdate task status after checking the field.",
            "sources": ["🟡 USER DATA", "🟢 LIVE DATA" if not ctx.is_simulation else "🟠 SIMULATION"],
            "action": action
        }
        
    elif intent == "FERTILIZER_ADVICE":
        n = ctx.nitrogen if ctx.nitrogen is not None else 80
        age = ctx.age_days if ctx.age_days is not None else 30
        
        if n < 90:
            ans = f"It's time to apply Nitrogen to your {crop}."
            why = f"Your soil nitrogen is slightly low ({n} kg/ha) and the crop is {age} days old (vegetative stage)."
            todo = "1. Apply recommended dose of Urea.\n2. Ensure soil is moist before application."
        else:
            ans = f"Your {crop} has sufficient nutrients for now."
            why = f"Nitrogen level is optimal ({n} kg/ha)."
            todo = "1. Monitor for any yellowing.\n2. Hold off on additional fertilizers."
            
        expert_info = "\nAvoid applying during peak afternoon heat to prevent volatilization." if is_expert else ""

        resp = {
            "response": f"🌾 ANSWER\n{ans}\n\n📌 WHY?\n{why}{expert_info}\n\n✅ WHAT TO DO\n{todo}\n\n⚠️ WATCH FOR\nDo not apply if heavy rain is expected within 24 hours.\n\n📊 DATA USED\nCrop: {crop}\nCrop Age: {age} days\nNitrogen: {n} kg/ha",
            "sources": ["🟡 USER DATA", "🔵 OFFICIAL DATA"],
            "action": "VIEW_SOIL"
        }
        
    elif intent == "PEST_DISEASE_HELP":
        resp = {
            "response": f"🌾 ANSWER\nYellowing leaves or spots on {crop} can indicate a fungal infection or nutrient deficiency.\n\n📌 WHY?\nRecent weather conditions might have favored fungal growth or pests.\n\n✅ WHAT TO DO\n1. Inspect the underside of leaves for insects.\n2. Check if spots have concentric rings (Blight).\n3. If fungal, apply a preventive fungicide like Mancozeb.\n\n⚠️ WATCH FOR\nRapid spread to healthy plants.\n\n📅 NEXT TASK\nWalk through the field today and take a clear photo if unsure.",
            "sources": ["🟣 AI PREDICTION", "🔵 OFFICIAL DATA"],
            "action": "VIEW_CROP_HEALTH"
        }
        
    elif intent == "TASK_QUERY" or intent == "CROP_PLANNING":
        resp = {
            "response": f"🌾 ANSWER\nHere is your priority for today for the {crop} farm.\n\n📌 WHY?\nBased on your crop's current age and the local weather forecast.\n\n✅ WHAT TO DO\n1. Priority: Check soil moisture.\n2. Pest monitor: Inspect leaves for early pest signs.\n3. Weed control: Manual weeding if not done this week.\n\n🌦 WEATHER\nTemp: {ctx.temperature or 30}°C | Rain: {ctx.rain_probability or 20}%\n\n📅 NEXT TASK\nReview the full crop plan dashboard.",
            "sources": ["🟣 AI PREDICTION", "🟡 USER DATA"],
            "action": "VIEW_CROP_PLAN"
        }
        
    elif intent == "MARKET_QUERY":
        resp = {
            "response": f"🌾 ANSWER\nThe current local market price for {crop} is stable.\n\n📌 WHY?\nRecent supply has met the market demand, keeping prices steady.\n\n✅ WHAT TO DO\n1. Sort grades carefully before packing.\n2. Transport during cooler hours to preserve freshness.\n\n📊 DATA USED\nMarket: Local APMC\nCommodity: {crop}\n\nSOURCE:\n🔵 OFFICIAL DATA (Mocked)",
            "sources": ["🔵 OFFICIAL DATA"],
            "action": "OPEN_MARKET"
        }

    elif intent == "GOVERNMENT_SCHEME":
        resp = {
            "response": f"🌾 ANSWER\nThere are subsidies available for micro-irrigation and seeds for {crop}.\n\n📌 WHY?\nPMKSY (Pradhan Mantri Krishi Sinchayee Yojana) provides up to 55% subsidy for drip irrigation.\n\n✅ WHAT TO DO\n1. Gather your Aadhar, land documents, and bank details.\n2. Visit the nearest agriculture extension office or official portal.\n\n📊 DATA USED\nScheme: PMKSY\nEligibility: Small/Marginal Farmers\n\nSOURCE:\n🔵 OFFICIAL DATA",
            "sources": ["🔵 OFFICIAL DATA"],
            "action": None
        }

    elif intent == "YIELD_PREDICTION":
        resp = {
            "response": f"🌾 ANSWER\nYour predicted yield for {crop} looks promising if conditions remain stable.\n\n📌 WHY?\nYour soil pH ({ctx.soil_ph or 'Optimal'}) and current weather are favorable for {crop}.\n\n✅ WHAT TO DO\n1. Maintain current irrigation schedule.\n2. Monitor for pests aggressively in the coming weeks.\n\n⚠️ WATCH FOR\nSudden temperature spikes which may induce heat stress.\n\n📊 DATA USED\nCrop: {crop}\nArea: {ctx.area or 1} acres",
            "sources": ["🟣 AI PREDICTION", "🟡 USER DATA"],
            "action": "VIEW_YIELD_PREDICTION"
        }
        
    elif intent == "SIMULATION":
        resp = {
            "response": f"🌾 ANSWER\nIf these conditions occur, your {crop} plan will need changes.\n\n📌 WHY?\nIncreased rain and temperature create a high risk for fungal diseases and reduce the need for irrigation.\n\n✅ WHAT TO DO\n1. Irrigation tasks would be postponed.\n2. Drainage monitoring becomes the top priority.\n3. Preventive fungicide application might be scheduled.\n\n⚠️ WATCH FOR\nThis is a simulation, not real-world weather.\n\n📊 DATA USED\nMode: 🟠 SIMULATION",
            "sources": ["🟠 SIMULATION"],
            "action": "UPDATE_PLAN"
        }

    if request.language and request.language != "en":
        resp["response"] = localize_text(resp["response"], request.language)

    return resp


def localize_text(text: str, lang: str) -> str:
    headers = {
        "te": {
            "🌾 ANSWER": "🌾 సమాధానం",
            "📌 WHY?": "📌 ఎందుకు?",
            "✅ WHAT TO DO": "✅ ఏమి చేయాలి",
            "⚠️ WATCH FOR": "⚠️ గమనించవలసినవి",
            "🌦 WEATHER": "🌦 వాతావరణం",
            "📊 DATA USED": "📊 ఉపయోగించిన డేటా",
            "📅 NEXT TASK": "📅 తదుపరి పని"
        },
        "ml": {
            "🌾 ANSWER": "🌾 ഉത്തരം",
            "📌 WHY?": "📌 എന്തുകൊണ്ട്?",
            "✅ WHAT TO DO": "✅ എന്ത് ചെയ്യണം",
            "⚠️ WATCH FOR": "⚠️ ശ്രദ്ധിക്കേണ്ടവ",
            "🌦 WEATHER": "🌦 കാലാവസ്ഥ",
            "📊 DATA USED": "📊 ഉപയോഗിച്ച വിവരങ്ങൾ",
            "📅 NEXT TASK": "📅 അടുത്ത ജോലി"
        },
        "ta": {
            "🌾 ANSWER": "🌾 பதில்",
            "📌 WHY?": "📌 ஏன்?",
            "✅ WHAT TO DO": "✅ செய்ய வேண்டியவை",
            "⚠️ WATCH FOR": "⚠️ கவனிக்க வேண்டியவை",
            "🌦 WEATHER": "🌦 வானிலை",
            "📊 DATA USED": "📊 பயன்படுத்தப்பட்ட தரவு",
            "📅 NEXT TASK": "📅 அடுத்த பணி"
        },
        "hi": {
            "🌾 ANSWER": "🌾 उत्तर",
            "📌 WHY?": "📌 क्यों?",
            "✅ WHAT TO DO": "✅ क्या करें",
            "⚠️ WATCH FOR": "⚠️ ध्यान दें",
            "🌦 WEATHER": "🌦 मौसम",
            "📊 DATA USED": "📊 प्रयुक्त डेटा",
            "📅 NEXT TASK": "📅 अगला कार्य"
        },
        "kn": {
            "🌾 ANSWER": "🌾 ಉತ್ತರ",
            "📌 WHY?": "📌 ಏಕೆ?",
            "✅ WHAT TO DO": "✅ ಏನು ಮಾಡಬೇಕು",
            "⚠️ WATCH FOR": "⚠️ ಗಮನಿಸಬೇಕಾದ ಅಂಶಗಳು",
            "🌦 WEATHER": "🌦 ಹವಾಮಾನ",
            "📊 DATA USED": "📊 ಬಳಸಲಾದ ಡೇಟಾ",
            "📅 NEXT TASK": "📅 ಮುಂದಿನ ಕಾರ್ಯ"
        },
        "mr": {
            "🌾 ANSWER": "🌾 उत्तर",
            "📌 WHY?": "📌 का?",
            "✅ WHAT TO DO": "✅ काय करावे",
            "⚠️ WATCH FOR": "⚠️ काळजी घ्या",
            "🌦 WEATHER": "🌦 हवामान",
            "📊 DATA USED": "📊 वापरलेला डेटा",
            "📅 NEXT TASK": "📅 पुढील काम"
        },
        "bn": {
            "🌾 ANSWER": "🌾 উত্তর",
            "📌 WHY?": "📌 কেন?",
            "✅ WHAT TO DO": "✅ করণীয়",
            "⚠️ WATCH FOR": "⚠️ লক্ষণীয়",
            "🌦 WEATHER": "🌦 আবহাওয়া",
            "📊 DATA USED": "📊 ব্যবহৃত ডেটা",
            "📅 NEXT TASK": "📅 পরবর্তী কাজ"
        },
        "gu": {
            "🌾 ANSWER": "🌾 ઉત્તર",
            "📌 WHY?": "📌 શા માટે?",
            "✅ WHAT TO DO": "✅ શું કરવું",
            "⚠️ WATCH FOR": "⚠️ સાવચેતી",
            "🌦 WEATHER": "🌦 હવામાન",
            "📊 DATA USED": "📊 વપરાયેલ ડેટા",
            "📅 NEXT TASK": "📅 આગામી કાર્ય"
        },
        "pa": {
            "🌾 ANSWER": "🌾 ਜਵਾਬ",
            "📌 WHY?": "📌 ਕਿਉਂ?",
            "✅ WHAT TO DO": "✅ ਕੀ ਕਰਨਾ ਹੈ",
            "⚠️ WATCH FOR": "⚠️ ਧਿਆਨ ਦੇਣ ਯੋਗ",
            "🌦 WEATHER": "🌦 ਮੌਸਮ",
            "📊 DATA USED": "📊 ਵਰਤਿਆ ਗਿਆ ਡਾਟਾ",
            "📅 NEXT TASK": "📅 ਅਗਲਾ ਕੰਮ"
        }
    }
    
    if lang in headers:
        for en_hdr, loc_hdr in headers[lang].items():
            text = text.replace(en_hdr, loc_hdr)
            
    return text



# ─── API Endpoints ───────────────────────────────────────────────────────────

@router.post("/api/ai/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    intent = detect_intent(request.message)
    res_data = generate_response(intent, request)
    
    # Save to database if user_id is provided
    if request.user_id:
        chat_log = models.ChatLog(
            user_id=request.user_id,
            farm_id=request.farm_id,
            message=request.message,
            intent=intent,
            response=res_data["response"],
            sources=json.dumps(res_data["sources"]),
            language=request.language
        )
        db.add(chat_log)
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print("Failed to save chat log:", e)

    return ChatResponse(
        response=res_data["response"],
        intent=intent,
        sources=res_data["sources"],
        action=res_data["action"]
    )

@router.get("/api/ai/chat/history", response_model=List[ChatHistoryResponse])
def get_chat_history(user_id: int, farm_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.ChatLog).filter(models.ChatLog.user_id == user_id)
    if farm_id:
        query = query.filter(models.ChatLog.farm_id == farm_id)
        
    logs = query.order_by(models.ChatLog.created_at.desc()).limit(50).all()
    
    history = []
    for log in reversed(logs): # return chronological order
        try:
            sources = json.loads(log.sources) if log.sources else []
        except:
            sources = []
            
        history.append(ChatHistoryResponse(
            id=log.id,
            message=log.message,
            response=log.response,
            intent=log.intent,
            sources=sources,
            created_at=log.created_at
        ))
        
    return history
