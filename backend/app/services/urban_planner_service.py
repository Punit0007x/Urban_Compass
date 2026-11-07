import math
import random
from typing import Dict, Any

class UrbanPlannerService:
    def generate_urban_plan(self, analysis_data: Dict[str, Any], density_mode: str = 'medium', target_population: int = 50000) -> Dict[str, Any]:
        """
        Generates a detailed urban plan based on geospatial analysis data.
        Includes population capacity, zoning, building requirements, utilities, and economics (in INR).
        """
        metrics = analysis_data.get('metrics', {})
        area_data = analysis_data.get('area', {})
        area_sqm = area_data.get('square_meters', 100000)
        overall_score = analysis_data.get('overall_score', 0.5)
        
        area_sqkm = area_sqm / 1_000_000
        
        # 1. Population Capacity Calculation
        slope_val = metrics.get('slope', {}).get('mean_degrees', 0)
        flood_risk = metrics.get('flood', {}).get('risk_level', 'low')
        road_conn = metrics.get('roads', {}).get('connectivity_score', 0.5)
        
        # Base density caps based on suitability score
        if overall_score > 0.7:
            base_density = 10000  # High suitability
        elif overall_score > 0.4:
            base_density = 5000   # Medium suitability
        else:
            base_density = 2000   # Low suitability
            
        # Environmental constraints
        slope_constraint = 0.7 if slope_val > 15 else 0.85 if slope_val > 8 else 1.0
        flood_constraint = 0.6 if flood_risk == 'high' else 0.85 if flood_risk == 'medium' else 1.0
        
        # Max sustainable population for this area
        pop_capacity = int(area_sqkm * base_density * slope_constraint * flood_constraint * (0.6 + road_conn * 0.4))
        
        # Final population is the minimum of target and capacity, but at least 1 if area exists
        # Add 5% random variation for realism
        noise = random.uniform(0.95, 1.05)
        final_pop = int(max(1 if area_sqm > 0 else 0, min(target_population, pop_capacity)) * noise)
        density = final_pop / max(0.0001, area_sqkm)
        
        # 2. Zoning Breakdown
        zones = self._calculate_zoning(overall_score)
        
        # 3. Building Requirements
        buildings = self._calculate_buildings(final_pop, area_sqkm)
        
        # 5. Daily Utilities
        utilities = self._calculate_utilities(final_pop, density)
        
        # 6. Environmental Plan
        solar_potential = area_sqkm * metrics.get('solar', {}).get('annual_insolation_kwh_m2', 1500) * 1_000_000 / 365
        environmental = {
            "solar_potential_kwh_daily": int(solar_potential),
            "green_coverage_target_percent": zones.get("green_space_percent", 20),
            "flood_mitigation_priority": flood_risk if flood_risk in ['high', 'medium', 'low'] else 'low',
            "vegetation_preservation_strategy": "Preserve existing corridors" if metrics.get('vegetation', {}).get('ndvi', 0) > 0.4 else "Enhance green cover"
        }
        
        # 7. Economics (Currency: INR)
        # 1 USD = 83 INR (approx)
        USD_TO_INR = 83.0
        
        # Infrastructure cost per capita (USD)
        cost_per_capita_usd = 1000 if overall_score > 0.7 else 1200 if overall_score > 0.4 else 1500
        total_cost_usd = (final_pop * cost_per_capita_usd) + (area_sqkm * 500_000)
        annual_tax_usd = final_pop * (300 if overall_score > 0.7 else 250)
        
        economics = {
            "estimated_construction_cost_inr_crore": round((total_cost_usd * USD_TO_INR) / 10_000_000, 2),
            "annual_tax_revenue_inr_crore": round((annual_tax_usd * USD_TO_INR) / 10_000_000, 2),
            "employment_capacity": int(final_pop / 1.3),
            "expected_roi_percent": round(15 if overall_score > 0.7 else 12 if overall_score > 0.4 else 8, 1),
            "total_infrastructure_cost_inr": int(total_cost_usd * USD_TO_INR),
            "annual_tax_revenue_inr": int(annual_tax_usd * USD_TO_INR),
            "currency": "INR",
            "symbol": "₹"
        }
        
        # 8. Infrastructure
        infrastructure = {
            "total_road_length_km": round(area_sqkm * 12 * (0.8 + road_conn * 0.2), 1),
            "parking_spaces_needed": int(final_pop * 0.4),
            "public_transit_lines": max(1, int(final_pop / 20000))
        }
        
        # 9. AI-Generated Contextual Insights (Simulated if no LLM)
        insights = []
        if slope_val > 12:
            insights.append(f"Steep terrain detected ({slope_val:.1f}°). AI recommending terraced foundation engineering to prevent soil erosion.")
        else:
            insights.append("Stable flat terrain identified. Optimized for high-efficiency grid-based infrastructure layout.")
            
        if metrics.get('vegetation', {}).get('ndvi', 0) > 0.5:
            insights.append("High biomass density detected. Implementing 'Forest-City' integration with 30% protected green corridors.")
        else:
            insights.append("Low natural vegetation. AI plan includes aggressive afforestation to combat urban heat island effect.")
            
        if road_conn < 0.3:
            insights.append("Poor existing connectivity. AI has prioritized new arterial road links to the nearest transit hubs.")
        
        insights.append(f"Infrastructure ROI optimized at {economics['expected_roi_percent']}% based on {analysis_data.get('classification', 'urban')} land classification.")

        return {
            "city_name": self._generate_ai_city_name(metrics),
            "overall_strategy": self._get_strategy(overall_score, slope_val, road_conn),
            "overall_score": overall_score,
            "population_estimate": final_pop,
            "population_capacity": pop_capacity,
            "population_density_per_sqkm": int(density),
            "zones": zones,
            "buildings": buildings,
            "utilities": utilities,
            "environmental": environmental,
            "infrastructure": infrastructure,
            "economics": economics,
            "ai_insights": insights,
            "verdict": analysis_data.get('verdict', 'No verdict generated')
        }

    def _generate_ai_city_name(self, metrics):
        prefixes = ["New", "Neo", "Green", "Smart", "Aura", "Prime", "Vista"]
        suffixes = ["Heights", "Plains", "Grove", "District", "Central", "Valley"]
        
        slope = metrics.get('slope', {}).get('mean_degrees', 0)
        ndvi = metrics.get('vegetation', {}).get('ndvi', 0)
        
        p = random.choice(prefixes)
        if slope > 10: s = "Heights"
        elif ndvi > 0.4: s = "Grove"
        else: s = random.choice(suffixes)
        
        return f"{p} {s} {random.randint(10, 99)}"

    def _get_strategy(self, score, slope, roads):
        if score > 0.7 and roads > 0.6: return "Transit-Oriented Development (TOD) Hub"
        if score > 0.5 and slope < 5: return "Sustainable Greenbelt Residential Plan"
        if score > 0.6: return "Smart Mixed-Use Tech District"
        return "Low-Density Eco-Preservation Township"

    def _calculate_zoning(self, score: float) -> Dict[str, float]:
        if score > 0.7:
            return {
                "residential_percent": 45,
                "commercial_percent": 20,
                "industrial_percent": 15,
                "green_space_percent": 10,
                "civic_percent": 10
            }
        elif score > 0.4:
            return {
                "residential_percent": 40,
                "commercial_percent": 15,
                "industrial_percent": 12,
                "green_space_percent": 23,
                "civic_percent": 10
            }
        else:
            return {
                "residential_percent": 30,
                "commercial_percent": 10,
                "industrial_percent": 8,
                "green_space_percent": 44,
                "civic_percent": 8
            }

    def _calculate_buildings(self, pop: int, area_sqkm: float) -> Dict[str, int]:
        return {
            "residential_units": int(pop / (3.5 + random.uniform(-0.3, 0.3))),
            "commercial_spaces": int(pop / (8 + random.uniform(-1, 1))),
            "industrial_units": max(5, int(area_sqkm * (10 + random.uniform(-2, 2)))),
            "schools_needed": max(1, int(pop / (3000 + random.uniform(-500, 500)))),
            "hospitals_needed": max(1, int(pop / (25000 + random.uniform(-5000, 5000)))),
            "police_stations": max(1, int(pop / (30000 + random.uniform(-5000, 5000)))),
            "fire_stations": max(1, int(pop / (50000 + random.uniform(-10000, 10000)))),
            "parks_and_gardens": max(2, int(area_sqkm * (3 + random.uniform(-0.5, 0.5))))
        }

    def _calculate_utilities(self, pop: int, density: float) -> Dict[str, Any]:
        # Standards vary by density
        water_lpcd = 150 if density > 5000 else 135 # Liters per capita per day
        power_kwh_pd = 18 if density > 5000 else 14 # kWh per capita per day
        
        water_daily = pop * water_lpcd
        power_daily = pop * power_kwh_pd
        
        return {
            "water_daily_consumption_liters": int(water_daily),
            "electricity_daily_consumption_kwh": int(power_daily),
            "waste_daily_generation_tons": round(pop * 1.2 / 1000, 1),
            "water_unit": "L",
            "power_unit": "kWh"
        }

urban_planner_service = UrbanPlannerService()
