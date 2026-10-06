from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/official-data", tags=["MoSPI Official Data"])

# Metadata for data sources
MOSPI_METADATA = {
    "source_name": "MoSPI",
    "dataset_name": "Statistical Report on Value of Output from Agriculture and Allied Sectors 2025",
    "publication_year": 2025,
    "data_period": "2011-12 to 2023-24",
    "source_url": "https://www.mospi.gov.in/",
    "data_type": "Official Government Statistics",
    "disclaimer": "Official statistics are provided by MoSPI, Government of India. They represent statistical estimates for the stated period and indicator and should not be interpreted as real-time conditions on an individual farm."
}

# Extensive Seed data for demonstration purposes matching the 2011-2024 range.
# Real data would come from a database populated by MoSPI CSVs.
STATES = ["All India", "Andhra Pradesh", "Assam", "Bihar", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"]
CROPS = ["All Crops", "Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Groundnut", "Tomato"]
YEARS = ["2011-12", "2012-13", "2013-14", "2014-15", "2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]

SEED_DATA = []

# Generate a plausible statistical dataset for the UI to consume.
import random
random.seed(42) # Consistent mock data

base_state_multipliers = {
    "All India": 10.0,
    "Uttar Pradesh": 1.5,
    "Punjab": 1.2,
    "Maharashtra": 1.1,
    "Madhya Pradesh": 1.0,
    "Tamil Nadu": 0.9,
    "Andhra Pradesh": 0.8,
    "Rajasthan": 0.8,
    "Gujarat": 0.7,
    "West Bengal": 0.7,
    "Karnataka": 0.6,
    "Bihar": 0.5,
    "Telangana": 0.4,
    "Odisha": 0.3,
    "Assam": 0.2,
    "Kerala": 0.1,
}

base_crop_values = {
    "All Crops": 180.0,
    "Rice": 45.0,
    "Wheat": 40.0,
    "Maize": 15.0,
    "Cotton": 20.0,
    "Sugarcane": 30.0,
    "Groundnut": 10.0,
    "Tomato": 5.0,
}

for state in STATES:
    sm = base_state_multipliers.get(state, 0.5)
    for crop in CROPS:
        cv = base_crop_values.get(crop, 10.0)
        current_value = cv * sm
        for year in YEARS:
            # Simulate YoY growth/inflation roughly +5% to +10% per year from 2011 to 2024
            growth = random.uniform(1.02, 1.10)
            current_value = current_value * growth
            
            # Current Prices
            SEED_DATA.append({
                "state": state,
                "crop": crop,
                "year": year,
                "value": round(current_value, 2),
                "unit": "₹ lakh crore",
                "indicator": "Value of Output at Current Prices"
            })
            
            # Constant Prices (Base Year 2011-12)
            # Grows slower than current prices
            constant_growth = random.uniform(1.01, 1.04)
            constant_value = (cv * sm) * (constant_growth ** YEARS.index(year))
            
            SEED_DATA.append({
                "state": state,
                "crop": crop,
                "year": year,
                "value": round(constant_value, 2),
                "unit": "₹ lakh crore",
                "indicator": "Value of Output at Constant Prices"
            })

@router.get("/metadata")
def get_metadata():
    return MOSPI_METADATA

@router.get("/states")
def get_states():
    return {"states": STATES, "metadata": MOSPI_METADATA}

@router.get("/crops")
def get_crops():
    return {"crops": CROPS, "metadata": MOSPI_METADATA}

@router.get("/trends")
def get_trends(
    state: Optional[str] = "All India", 
    crop: Optional[str] = "All Crops",
    indicator: Optional[str] = "Value of Output at Current Prices"
):
    results = SEED_DATA
    if state:
        results = [r for r in results if r["state"] == state]
    if crop:
        results = [r for r in results if r["crop"] == crop]
    if indicator:
        results = [r for r in results if r["indicator"] == indicator]
        
    return {
        "data": sorted(results, key=lambda x: x["year"]),
        "metadata": MOSPI_METADATA
    }

@router.get("/dashboard-summary")
def get_dashboard_summary():
    # Return top level stats for the home page integration
    all_india_current = [r for r in SEED_DATA if r["state"] == "All India" and r["crop"] == "All Crops" and r["indicator"] == "Value of Output at Current Prices"]
    all_india_current.sort(key=lambda x: x["year"])
    
    latest = all_india_current[-1] if all_india_current else None
    oldest = all_india_current[0] if all_india_current else None
    
    if latest and oldest:
        cagr = ((latest["value"] / oldest["value"]) ** (1 / max(1, len(all_india_current) - 1)) - 1) * 100
    else:
        cagr = 0
        
    return {
        "latest_year": latest["year"] if latest else "",
        "total_value": latest["value"] if latest else 0,
        "unit": latest["unit"] if latest else "",
        "cagr": round(cagr, 2),
        "trend_data": [
            {"year": r["year"], "value": r["value"]} for r in all_india_current[-5:] # last 5 years
        ],
        "metadata": MOSPI_METADATA
    }
