import os
import json
import logging
import google.generativeai as genai
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Initialize Gemini
api_key = os.getenv("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.model_name = 'gemini-1.5-flash'
        self.model = None
        if api_key:
            self.model = genai.GenerativeModel(self.model_name)

    def generate_urban_plan(self, analysis_data: Dict[str, Any], density: str, population: int) -> Dict[str, Any]:
        """Generate a complete urban plan using Gemini AI."""
        if not self.model:
            raise Exception("GEMINI_API_KEY is not set. Cannot use AI urban planner.")

        # Prepare the prompt
        prompt = f"""
You are an expert urban planner and data scientist. Create a comprehensive urban plan based on the following geographic analysis data.

TARGET POPULATION: {population}
DESIRED DENSITY: {density}
OVERALL SUITABILITY SCORE: {analysis_data.get('overall_score', 0)}
AREA DATA:
{json.dumps(analysis_data.get('area', {}), indent=2)}
METRICS DATA:
{json.dumps(analysis_data.get('metrics', {}), indent=2)}

Return a strict JSON object exactly matching this schema. Do not include any markdown, just raw JSON:
{{
  "city_name": "String, a creative name for the city",
  "overall_strategy": "String, a 1-2 sentence strategy",
  "overall_score": {analysis_data.get('overall_score', 0)},
  "population_capacity": "Number, estimated max sustainable population based on area and constraints",
  "population_estimate": {population},
  "population_density_per_sqkm": "Number, density",
  "infrastructure": {{
    "total_road_length_km": "Number",
    "road_network_type": "String",
    "parking_spaces_needed": "Number",
    "public_transit_lines": "Number"
  }},
  "zones": {{
    "residential_percent": "Number",
    "commercial_percent": "Number",
    "industrial_percent": "Number",
    "green_space_percent": "Number",
    "civic_percent": "Number"
  }},
  "buildings": {{
    "residential_units": "Number",
    "commercial_spaces": "Number",
    "industrial_units": "Number",
    "schools_needed": "Number",
    "hospitals_needed": "Number",
    "police_stations": "Number",
    "fire_stations": "Number",
    "parks_and_gardens": "Number"
  }},
  "utilities": {{
    "water_daily_consumption_liters": "Number",
    "water_treatment_capacity_liters": "Number",
    "electricity_daily_consumption_kwh": "Number",
    "power_generation_capacity_kw": "Number",
    "sewage_daily_volume_liters": "Number",
    "sewage_treatment_capacity_liters": "Number",
    "waste_daily_generation_tons": "Number"
  }},
  "environmental": {{
    "solar_potential_kwh_daily": "Number",
    "green_coverage_target_percent": "Number",
    "flood_mitigation_priority": "String (low/medium/high)",
    "vegetation_preservation_strategy": "String"
  }},
  "economics": {{
    "estimated_construction_cost_million": "Number",
    "annual_tax_revenue_million": "Number",
    "employment_capacity": "Number",
    "expected_roi_percent": "Number",
    "total_infrastructure_cost_usd": "Number",
    "annual_tax_revenue_usd": "Number"
  }},
  "ai_insights": ["Array of Strings"],
  "recommendations": ["Array of Strings"],
  "constraints": ["Array of Strings"],
  "development_phases": ["Array of Strings"]
}}
"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error generating urban plan: {e}")
            raise

ai_service = AIService()
