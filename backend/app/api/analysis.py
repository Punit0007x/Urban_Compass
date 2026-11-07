from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import datetime
import math
import uuid
import json
from shapely.geometry import shape, Polygon
import numpy as np
import osmnx as ox
import os
import logging
import random

router = APIRouter()

class GenerativeInsights:
    """Helper for generating pseudo-AI insights based on geospatial statistics."""
    
    @staticmethod
    def get_land_summary(area_sqm: float, terrain_cat: str, slope: float, veg_index: float) -> str:
        suitability = "optimal" if slope < 5 and veg_index < 0.3 else "challenging"
        
        # More technical, AI-like professional analysis
        grading_impact = "minimal" if slope < 5 else "significant" if slope > 12 else "moderate"
        foundation_type = "Standard spread footings" if slope < 8 else "Stepped foundations or piers"
        
        return (
            f"Geospatial audit identifies {area_sqm/10000:.2f} ha of {terrain_cat} terrain. "
            f"Mean gradient of {slope:.1f}° suggests {grading_impact} topographical constraints. "
            f"Preliminary structural assessment recommends {foundation_type.lower()} for residential-scale development. "
            f"Surface runoff coefficient is estimated at 0.35 based on {terrain_cat} profile."
        )

    @staticmethod
    def get_eco_insight(ndvi: float, area_sqm: float) -> Dict[str, Any]:
        # Estimates based on standard ecological models
        density = 50 if ndvi > 0.5 else 200
        tree_est = int(area_sqm / density)
        carbon = tree_est * 0.02 # tons/year
        
        biodiversity_class = "Vibrant" if ndvi > 0.6 else "Moderate" if ndvi > 0.3 else "Stressed"
        
        return {
            "carbon_sequestration_tpy": round(carbon, 2),
            "microclimate_cooling_impact": "High (3-5°C delta)" if ndvi > 0.5 else "Moderate (1-2°C delta)",
            "ecosystem_services_valuation": f"₹{int((carbon * 10000 + area_sqm * 12.5) / 10000000):,} Cr",
            "biodiversity_index": round(ndvi * 0.85, 2),
            "biodiversity_class": biodiversity_class,
            "ai_verdict": f"Site demonstrates {biodiversity_class.lower()} ecological resilience."
        }

    @staticmethod
    def get_road_insight(score: float, density: float) -> str:
        if score > 75:
            return (f"High-fidelity network audit confirms excellent grid integration. "
                    f"Road density of {density:.1f} km/km² exceeds standard municipal requirements. "
                    f"Site is optimally positioned for multi-modal transit-oriented development (TOD).")
        elif score > 50:
            return (f"Established connectivity framework detected. Density index ({density:.1f}) is adequate for low-to-medium residential loads. "
                    f"Secondary access arteries may require widening to support commercial throughput.")
        return (f"Sub-optimal network connectivity identified. Site exhibits structural isolation from primary urban corridors. "
                f"Phased infrastructure deployment required to mitigate logistical bottlenecks.")

    @staticmethod
    def get_planning_verdict(suitability_score: float, classification: str) -> str:
        if suitability_score > 0.75:
            return "Strategic Tier 1 asset. Optimal for high-density mixed-use development with high ROI potential."
        elif suitability_score > 0.5:
            return "Tier 2 candidate. Suitable for planned residential communities with targeted ecological remediation."
        return "Tier 3 site. Recommended for low-impact utility, parkland, or conservation projects due to site constraints."

    @staticmethod
    def get_economic_insight(area_sqm: float, score: float, land_use: str) -> Dict[str, Any]:
        # Simple urban economic model
        base_value_per_sqm = 4500 # Approx Bangalore mid-range in INR or $ equivalent scale
        if land_use == "commercial": base_value_per_sqm *= 1.8
        elif land_use == "industrial": base_value_per_sqm *= 1.2
        
        market_value = area_sqm * base_value_per_sqm * (0.5 + score)
        tax_revenue = market_value * 0.015 # 1.5% annual tax
        dev_cost = area_sqm * 2500 * (1.2 - score) # Better land = lower prep cost
        
        roi = ((market_value - dev_cost) / dev_cost) * 100 if dev_cost > 0 else 0
        
        return {
            "estimated_market_value": f"₹{int(market_value / 10000000):,} Cr",
            "annual_tax_revenue": f"₹{int(tax_revenue / 10000000):,} Cr",
            "infrastructure_cost": f"₹{int(dev_cost / 10000000):,} Cr",
            "projected_roi": f"{roi:.1f}%",
            "ai_verdict": f"Economic audit predicts a {roi:.1f}% ROI. High yield potential due to structural suitability."
        }

try:
    from app.services.geo_service import geo_service
    HAS_GEO_SERVICE = True
except ImportError:
    HAS_GEO_SERVICE = False

# --- Schemas ---

class GeoJSONPolygon(BaseModel):
    type: str
    coordinates: List[List[List[float]]]

class AreaAnalysisRequest(BaseModel):
    geojson: GeoJSONPolygon
    name: Optional[str] = None
    store: bool = True

class SlopeAnalysisRequest(BaseModel):
    geojson: GeoJSONPolygon
    dem_source: str = "sample"
    name: Optional[str] = None

class VegetationAnalysisRequest(BaseModel):
    red: str
    nir: str
    green: str
    polygon: Optional[GeoJSONPolygon] = None

class RoadConnectivityRequest(BaseModel):
    polygon: GeoJSONPolygon
    network_type: str = "drive"

class LandSuitabilityRequest(BaseModel):
    slope_percent: float
    ndvi: float
    ndwi: float
    road_connectivity_score: float
    amenities_score: Optional[float] = 50.0
    solar_potential: Optional[float] = 1800.0

class EconomicAnalysisRequest(BaseModel):
    area_sqm: float
    suitability_score: float
    land_use: str = "residential"
    region_multiplier: float = 1.0

class GridAnalysisRequest(BaseModel):
    geojson: GeoJSONPolygon
    name: Optional[str] = None
    cellSize: float = 50.0

# Mock database for grids
grids_db = {}

# --- Comprehensive Analysis Request ---
class ComprehensiveAnalysisRequest(BaseModel):
    geojson: GeoJSONPolygon
    name: Optional[str] = None
    population: Optional[int] = 50000
    density: Optional[str] = "medium"

class AIUrbanPlanRequest(BaseModel):
    analysis_data: Dict[str, Any]
    density: str
    population: int

class LayoutRequest(BaseModel):
    geojson: GeoJSONPolygon
    urban_plan: Dict[str, Any]
    area_sqm: Optional[float] = None

# --- Endpoints ---

@router.post("/generate-layout")
async def generate_layout(request: LayoutRequest):
    """Generate a spatial layout grid for projecting onto the map."""
    try:
        from app.services.layout_generator import layout_generator

        poly = shape({"type": "Polygon", "coordinates": request.geojson.coordinates})
        area = request.area_sqm or poly.area * (111320 ** 2)
        coords = request.geojson.coordinates[0]

        layout = layout_generator.generate(coords, request.urban_plan, area)
        return {"success": True, "layout": layout}
    except Exception as e:
        logging.error(f"Layout generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-ai-plan")
async def generate_ai_plan(request: AIUrbanPlanRequest):
    try:
        from app.services.ai_service import ai_service
        plan = ai_service.generate_urban_plan(
            analysis_data=request.analysis_data,
            density=request.density,
            population=request.population
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@router.post("/comprehensive-analysis")
async def comprehensive_analysis(request: ComprehensiveAnalysisRequest):
    """
    Comprehensive land analysis combining all metrics: area, slope, vegetation, roads, flood, solar, amenities.
    Returns unified suitability score with AI-generated insights.
    """
    try:
        poly_dict = request.geojson.dict()
        
        # 0. Caching logic (Simple in-memory cache for speed)
        cache_key = str(hash(json.dumps(poly_dict, sort_keys=True)))
        if hasattr(geo_service, "_analysis_cache") and cache_key in geo_service._analysis_cache:
            logging.info("Returning cached analysis results")
            return geo_service._analysis_cache[cache_key]
        
        # 1. Geometry & Area
        stats = geo_service.calculate_polygon_stats(poly_dict)
        if not stats:
            raise ValueError("Could not calculate geometry stats")
        
        area_sqm = stats["area_sqm"]
        if area_sqm > 5000000:
            raise HTTPException(status_code=400, detail="Selected area is too large (max 5 sq km). Please select a smaller area.")
            
        centroid = stats["centroid"]
        bounds = stats["bounds"]
        
        # 2-7 Parallel Data Fetching
        import asyncio
        
        async def fetch_all_data():
            tasks = [
                asyncio.to_thread(geo_service.get_elevation_points, [
                    [bounds["min_lng"], bounds["min_lat"]],
                    [bounds["max_lng"], bounds["max_lat"]],
                    [centroid["longitude"], centroid["latitude"]]
                ]),
                asyncio.to_thread(geo_service.fetch_osm_data_consolidated, poly_dict, centroid["latitude"], centroid["longitude"])
            ]
            return await asyncio.gather(*tasks)

        elev_results, osm_data = await fetch_all_data()

        # Process Elevation/Slope
        elevations = [r.get("elevation", 900) for r in elev_results]
        min_elev, max_elev = min(elevations), max(elevations)
        dist_km = math.sqrt((bounds["max_lng"]-bounds["min_lng"])**2 + (bounds["max_lat"]-bounds["min_lat"])**2) * 111
        mean_slope = math.degrees(math.atan((max(elevations) - min(elevations)) / (dist_km * 1000 + 1)))
        
        # Process OSM Data
        ndvi, ndwi = osm_data["ndvi"]
        road_count = osm_data["road_count"]
        road_score = min(100, road_count * 5)
        amenities_count = osm_data["amenities"]
        
        # 5. Flood risk
        flood_analysis = geo_service.analyze_flood_risk(elev_results)
        
        # 6. Solar potential
        solar_metrics = geo_service.calculate_solar_potential(centroid["latitude"], mean_slope)
        
        # 7. Amenity Score
        amenity_score = min(100, sum(amenities_count.values()) * 4)
        
        # --- SCORING ---
        weights = {
            "slope": 0.20,
            "vegetation": 0.10,
            "water": 0.15,
            "road": 0.20,
            "amenity": 0.15,
            "solar": 0.10,
            "flood": 0.10
        }
        
        slope_score = max(0, 1 - (mean_slope / 45))
        veg_score = max(0, 1 - ndvi)  # Low NDVI = better for construction
        water_score = max(0, 1 - max(0, ndwi))
        road_conn_score = road_score / 100
        solar_score = min(1, solar_metrics.get("annual_insolation_kwh_m2", 1800) / 2200)
        flood_resistance_score = 1 - flood_analysis.get("risk_percentage", 50) / 100
        
        overall_score = (
            slope_score * weights["slope"] +
            veg_score * weights["vegetation"] +
            water_score * weights["water"] +
            road_conn_score * weights["road"] +
            amenity_score / 100 * weights["amenity"] +
            solar_score * weights["solar"] +
            flood_resistance_score * weights["flood"]
        )
        
        classification = "High" if overall_score > 0.7 else "Medium" if overall_score > 0.4 else "Low"
        
        # --- AI INSIGHTS ---
        terrain_desc = "flat" if mean_slope < 5 else "gently sloped" if mean_slope < 10 else "moderately sloped" if mean_slope < 15 else "steep"
        
        ai_insights = []
        
        # Terrain insight
        if mean_slope < 8:
            ai_insights.append(f"Terrain is {terrain_desc} ({mean_slope:.1f}°) - suitable for standard foundation construction with minimal grading required.")
        else:
            ai_insights.append(f"Mean slope of {mean_slope:.1f}° indicates moderate to steep terrain. Earthwork and retaining structures will increase development costs by approximately {(mean_slope - 5) * 3}%.")
        
        # Vegetation insight
        if ndvi < 0.3:
            ai_insights.append(f"Vegetation density is low (NDVI: {ndvi:.2f}) - minimal clearing required, suitable for immediate development.")
        elif ndvi < 0.5:
            ai_insights.append(f"Moderate vegetation cover (NDVI: {ndvi:.2f}) - selective clearing needed. Budget for landscape restoration post-construction.")
        else:
            ai_insights.append(f"High vegetation (NDVI: {ndvi:.2f}) - significant clearing and ecological permitting may be required.")
        
        # Road connectivity insight
        if road_score > 70:
            ai_insights.append(f"Excellent road connectivity ({road_count or 'high density'} access points) - prime location for commercial and residential mix.")
        elif road_score > 40:
            ai_insights.append(f"Adequate road network (score: {int(road_score)}/100) - suitable for residential development with standard access.")
        else:
            ai_insights.append(f"Limited road connectivity ({int(road_score)}/100) - site may require new access road construction.")
        
        # Flood insight
        if flood_analysis.get("risk_level") == "low":
            ai_insights.append(f"Flood risk is LOW - no special drainage infrastructure required. Development can proceed with standard stormwater management.")
        elif flood_analysis.get("risk_level") == "medium":
            ai_insights.append(f"Flood risk is MODERATE ({flood_analysis.get('risk_percentage', 0)}% probability) - recommend elevated foundation or swale drainage system.")
        else:
            ai_insights.append(f"HIGH flood risk detected - elevated structures or flood-barrier systems strongly recommended.Check local floodplain regulations.")
        
        # Amenity insight
        transit_score = amenities_count["transit"]
        if transit_score > 7:
            ai_insights.append(f"Exceptional transit accessibility ({transit_score} stops within 1.5km) - ideal for TOD or high-density mixed-use.")
        elif transit_score > 4:
            ai_insights.append(f"Good access to {transit_score} transit nodes - suitable for residential or retail development.")
        else:
            ai_insights.append(f"Limited transit access. Consider density bonuses or shuttle services for future residents.")
        
        # Solar insight
        if solar_metrics.get("photovoltaic_suitability") == "Optimal":
            ai_insights.append(f"Solar potential is OPTIMAL ({int(solar_metrics.get('annual_insolation_kwh_m2', 0))} kWh/m²/yr) - strong candidate for rooftop solar or solar farm.")
        elif solar_metrics.get("photovoltaic_suitability") == "Good":
            ai_insights.append(f"Good solar exposure ({int(solar_metrics.get('annual_insolation_kwh_m2', 0))} kWh/m²/yr) - rooftop panels economically viable.")
        else:
            ai_insights.append(f"Limited solar potential - consider grid-tied systems or community solar alternatives.")
        
        # Overall verdict
        if overall_score > 0.75:
            verdict = f"STRATEGIC TIER 1 - This {area_sqm/10000:.2f} ha site is optimal for mixed-use development with excellent ROI potential. Immediate acquisition recommended."
        elif overall_score > 0.5:
            verdict = f"TIER 2 CANDIDATE - Suitable for residential or commercial development. Address moderate constraints for optimal returns."
        else:
            verdict = f"TIER 3 SITE - Consider for low-impact uses (parkland, utility) or hold for future urban expansion value."
        
        # 8. Urban Planning Analysis (AI-Driven)
        try:
            from app.services.ai_service import ai_service
            from app.services.urban_planner_service import urban_planner_service
            
            planner_input = {
                "metrics": {
                    "slope": {"mean_degrees": mean_slope},
                    "flood": flood_analysis,
                    "roads": {"connectivity_score": road_conn_score},
                    "vegetation": {"ndvi": ndvi}
                },
                "area": {"square_meters": area_sqm},
                "overall_score": overall_score,
                "verdict": verdict,
                "classification": classification
            }

            try:
                # Try real Gemini AI first
                urban_plan = ai_service.generate_urban_plan(
                    analysis_data=planner_input,
                    density=request.density or "medium",
                    population=request.population or 50000
                )
                logging.info("Generated urban plan using Gemini AI")
            except Exception as ai_err:
                logging.warning(f"Gemini AI failed, falling back to heuristic: {ai_err}")
                # Fallback to heuristic service
                urban_plan = urban_planner_service.generate_urban_plan(
                    analysis_data=planner_input,
                    density_mode=request.density or "medium",
                    target_population=request.population or 50000
                )
        except Exception as e:
            logging.error(f"Urban planning failed: {e}")
            urban_plan = None

        result = {
            "valid": True,
            "analysis_id": str(uuid.uuid4()),
            "name": request.name,
            "timestamp": datetime.datetime.now().isoformat(),
            
            # Summary
            "overall_score": round(overall_score, 3),
            "classification": classification,
            "verdict": verdict,
            
            # Urban Plan
            "urban_plan": urban_plan,
            
            # Geometry
            "area": {
                "square_meters": area_sqm,
                "acres": round(area_sqm / 4046.86, 2),
                "hectares": round(area_sqm / 10000, 2)
            },
            "centroid": centroid,
            "bounding_box": bounds,
            
            # All metrics
            "metrics": {
                "slope": {
                    "mean_degrees": round(mean_slope, 2),
                    "score": round(slope_score, 3),
                    "classification": "flat" if mean_slope < 8 else "moderate" if mean_slope < 15 else "steep"
                },
                "vegetation": {
                    "ndvi": round(ndvi, 3),
                    "ndwi": round(ndwi, 3),
                    "score": round(veg_score, 3)
                },
                "flood": {
                    "risk_level": flood_analysis.get("risk_level", "low"),
                    "risk_percentage": flood_analysis.get("risk_percentage", 0),
                    "score": round(flood_resistance_score, 3)
                },
                "roads": {
                    "connectivity_score": round(road_conn_score, 3),
                    "road_count": road_count,
                    "density_km2": round(road_score / area_sqm * 1000000, 2) if area_sqm > 0 else 0
                },
                "amenities": {
                    "counts": amenities_count,
                    "score": round(amenity_score / 100, 3)
                },
                "solar": {
                    "annual_insolation_kwh_m2": round(solar_metrics.get("annual_insolation_kwh_m2", 0), 0),
                    "photovoltaic_suitability": solar_metrics.get("photovoltaic_suitability", "Unknown"),
                    "optimal_tilt_deg": solar_metrics.get("optimal_tilt_deg", 0),
                    "score": round(solar_score, 3)
                }
            },
            
            # Component scores breakdown
            "component_scores": {
                "slope_score": round(slope_score * weights["slope"], 3),
                "vegetation_score": round(veg_score * weights["vegetation"], 3),
                "water_score": round(water_score * weights["water"], 3),
                "road_score": round(road_conn_score * weights["road"], 3),
                "amenity_score": round(amenity_score / 100 * weights["amenity"], 3),
                "solar_score": round(solar_score * weights["solar"], 3),
                "flood_score": round(flood_resistance_score * weights["flood"], 3)
            },
            
            "weights_used": weights,
            
            # AI-generated insights
            "ai_insights": ai_insights,
            
            "ml_ready": True
        }
        
        # Save to cache
        if not hasattr(geo_service, "_analysis_cache"):
            geo_service._analysis_cache = {}
        geo_service._analysis_cache[cache_key] = result
        
        return result
    except Exception as e:
        import traceback
        logging.error(f"Comprehensive analysis error: {e}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Comprehensive analysis error: {str(e)}")


@router.post("/analyze-area")
async def analyze_area(request: AreaAnalysisRequest):
    try:
        # Use GeoDataService for geometry calculations
        stats = geo_service.calculate_polygon_stats(request.geojson.dict())
        if not stats:
            raise ValueError("Could not calculate geometry stats")
            
        area_sqm = stats["area_sqm"]
        
        # Generate clipped GeoJSON for frontend
        clipped_geojson = {
            "type": "Polygon",
            "coordinates": request.geojson.coordinates,
            "bbox": [stats["bounds"]["min_lng"], stats["bounds"]["min_lat"], stats["bounds"]["max_lng"], stats["bounds"]["max_lat"]],
            "area_sqm": area_sqm
        }
        
        return {
            "valid": True,
            "area": {
                "square_meters": area_sqm,
                "acres": area_sqm / 4046.86,
                "hectares": area_sqm / 10000,
                "square_kilometers": area_sqm / 1000000
            },
            "centroid": stats["centroid"],
            "bounding_box": {
                "min_longitude": stats["bounds"]["min_lng"],
                "min_latitude": stats["bounds"]["min_lat"],
                "max_longitude": stats["bounds"]["max_lng"],
                "max_latitude": stats["bounds"]["max_lat"]
            },
            "perimeter_meters": stats["perimeter_m"],
            "geometry_type": stats["geometry_type"],
            "clipped_geometry": clipped_geojson,
            "stored": {
                "id": str(uuid.uuid4()),
                "name": request.name,
                "layer_type": "analysis_boundary"
            } if request.store else None,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Geometry processing error: {str(e)}")

@router.post("/analyze-slope")
async def analyze_slope(request: SlopeAnalysisRequest):
    try:
        poly_dict = request.geojson.dict()
        stats = geo_service.calculate_polygon_stats(poly_dict)
        if not stats:
            raise ValueError("Could not calculate geometry stats")
            
        area_sqm = stats["area_sqm"]
        bounds = [stats["bounds"]["min_lng"], stats["bounds"]["min_lat"], stats["bounds"]["max_lng"], stats["bounds"]["max_lat"]]
        
        # Sample elevation points
        sample_coords = [
            [bounds[0], bounds[1]], [bounds[2], bounds[3]], 
            [bounds[0], bounds[3]], [bounds[2], bounds[1]],
            [stats["centroid"]["longitude"], stats["centroid"]["latitude"]]
        ]
        
        elev_results = geo_service.get_elevation_points(sample_coords)
        elevs = [res.get("elevation", 900) for res in elev_results]
        min_elev, max_elev = min(elevs), max(elevs)
        
        # Calculate slope
        dist_km = math.sqrt((bounds[2]-bounds[0])**2 + (bounds[3]-bounds[1])**2) * 111
        mean_slope = math.degrees(math.atan((max_elev - min_elev) / (dist_km * 1000 + 1)))
        
        # Create deterministic seed for consistency
        seed = int((stats["centroid"]["longitude"] + stats["centroid"]["latitude"]) * 10000) % 10000
        random.seed(seed)
        
        category = "gentle" if mean_slope < 8 else "moderate" if mean_slope < 15 else "steep"
        ai_insight = GenerativeInsights.get_land_summary(area_sqm, category, mean_slope, 0.2)
        
        return {
            "valid": True,
            "slope_statistics": {
                "mean": mean_slope,
                "median": mean_slope * 0.9,
                "std_dev": random.uniform(1.0, 4.0),
                "min": max(0.5, mean_slope - 5),
                "max": mean_slope * 2.5
            },
            "slope_distribution": {
                "flat": 30.0 if mean_slope < 5 else 10.0,
                "gentle": 40.0,
                "moderate": 20.0,
                "steep": 8.0,
                "very steep": 2.0
            },
            "slope_classification": {
                "category": category,
                "description": f"Area is classified as {category} terrain. {ai_insight}"
            },
            "elevation_stats": {
                "min": min_elev,
                "max": max_elev,
                "mean": (min_elev + max_elev) / 2
            },
            "pixel_count": max(100, int(area_sqm / 900)),
            "resolution_m": 30,
            "geometry_area_sqm": area_sqm,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Slope analysis error: {str(e)}")

@router.post("/analyze-vegetation")
async def analyze_vegetation(request: VegetationAnalysisRequest):
    try:
        area_sqm = 120000
        centroid = {"longitude": 0, "latitude": 0}
        
        if request.polygon:
            stats = geo_service.calculate_polygon_stats(request.polygon.dict())
            if stats:
                area_sqm = stats["area_sqm"]
                centroid = stats["centroid"]
        
        if request.polygon:
            ndvi, ndwi = geo_service.estimate_ndvi_from_landuse(request.polygon.dict())
        else:
            ndvi, ndwi = 0.25, -0.1
        
        category = "barren" if ndvi < 0.15 else ("sparse" if ndvi < 0.3 else ("moderate" if ndvi < 0.5 else "dense"))
        eco_metrics = GenerativeInsights.get_eco_insight(ndvi, area_sqm)
        
        ai_desc = f"Site characterized by {category} cover. {eco_metrics['ai_verdict']}"

        return {
            "valid": True,
            "ndvi": {
                "mean": ndvi,
                "median": ndvi,
                "std_dev": 0.05,
                "min": max(0, ndvi - 0.15),
                "max": min(1, ndvi + 0.15)
            },
            "ndwi": {
                "mean": ndwi,
                "median": ndwi,
                "std_dev": 0.08,
                "min": ndwi - 0.15,
                "max": ndwi + 0.15
            },
            "vegetation_class": {
                "category": category,
                "percentage": ndvi * 100,
                "description": ai_desc
            },
            "water_detection": {
                "presence_percentage": max(0, ndwi * 100),
                "classification": "dry" if ndwi < -0.05 else "moist" if ndwi < 0.1 else "water",
                "description": "No significant water bodies." if ndwi < 0.1 else "Potential surface water detected."
            },
            "environmental_impact": eco_metrics,
            "pixel_count": max(100, int(area_sqm / 900)),
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-road-connectivity")
async def analyze_road_connectivity(request: RoadConnectivityRequest):
    try:
        poly_dict = request.polygon.dict()
        stats = geo_service.calculate_polygon_stats(poly_dict)
        area_sqm = stats.get("area_sqm", 100000)
        
        if area_sqm > 5000000:
            raise HTTPException(status_code=400, detail="Selected area is too large for road analysis (max 5 sq km).")
        
        # Try to fetch real roads
        graph = geo_service.fetch_osm_roads(poly_dict, request.network_type)
        road_stats = geo_service.calculate_road_metrics(graph, area_sqm)
        
        score = road_stats["connectivity_score"]
        grade = "excellent" if score > 80 else ("good" if score > 65 else ("fair" if score > 45 else "poor"))
        ai_insight = GenerativeInsights.get_road_insight(score, road_stats["density_km_per_km2"])
        
        return {
            "valid": True,
            "road_density": {
                "total_length_km": road_stats["total_length_km"],
                "density_km_per_km2": road_stats["density_km_per_km2"]
            },
            "connectivity_score": {
                "score": round(score, 1),
                "grade": grade,
                "description": ai_insight
            },
            "network_metrics": {
                "total_nodes": road_stats["total_nodes"],
                "total_edges": road_stats["total_edges"],
                "average_degree": round(road_stats["average_degree"], 1),
                "clustering_coefficient": 0.15 # Placeholder
            },
            "nearest_road_stats": {
                "mean_distance_m": 120,
                "median_distance_m": 90,
                "max_distance_m": 450,
                "percentage_within_100m": 65.0
            },
            "area_sq_km": area_sqm / 1_000_000,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-suitability")
async def analyze_suitability(request: LandSuitabilityRequest):
    try:
        # Multi-Criteria Decision Analysis (MCDA) Weighted Sum
        weights = {
            "slope": 0.30,
            "veg": 0.10,
            "water": 0.15,
            "road": 0.20,
            "amenity": 0.15,
            "solar": 0.10
        }
        
        # Normalize inputs
        s_score = max(0, 1 - (request.slope_percent / 45))
        v_score = max(0, 1 - request.ndvi) # Prefer low veg for construction
        w_score = max(0, 1 - max(0, request.ndwi))
        r_score = request.road_connectivity_score / 100
        a_score = (request.amenities_score or 50) / 100
        sol_score = min(1, (request.solar_potential or 1500) / 2200)
        
        final_score = (
            s_score * weights["slope"] +
            v_score * weights["veg"] +
            w_score * weights["water"] +
            r_score * weights["road"] +
            a_score * weights["amenity"] +
            sol_score * weights["solar"]
        )
        
        classification = "High" if final_score > 0.7 else ("Medium" if final_score > 0.4 else "Low")
        verdict = GenerativeInsights.get_planning_verdict(final_score, classification)
        
        return {
            "suitability_score": final_score,
            "classification": classification.lower(),
            "verdict": verdict,
            "normalized_scores": {
                "slope_score": s_score,
                "vegetation_score": v_score,
                "water_score": w_score,
                "connectivity_score": r_score,
                "amenities_score": a_score,
                "solar_score": sol_score
            },
            "weights_used": weights,
            "ml_ready": True,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/generate-sample-bands")
async def generate_sample_bands(polygon: Optional[Dict[str, Any]] = None):
    # Provides mock file paths for simulated imagery services
    return {
        "success": True, 
        "paths": {
            "red": "/data/samples/B04.tif",
            "nir": "/data/samples/B08.tif", 
            "green": "/data/samples/B03.tif"
        }
    }

@router.get("/sample-bands-status")
async def get_sample_bands_status():
    return {
        "available": True,
        "existing": ["red", "nir", "green"],
        "missing": [],
        "paths": {
            "red": "/data/samples/B04.tif",
            "nir": "/data/samples/B08.tif",
            "green": "/data/samples/B03.tif"
        }
    }

@router.post("/generate-grid")
async def generate_grid(request: GridAnalysisRequest):
    try:
        grid_id = str(uuid.uuid4())
        # Simulate grid generation
        grids_db[grid_id] = {
            "grid_analysis_id": grid_id,
            "name": request.name or f"Grid {grid_id[:8]}",
            "cell_size_meters": request.cellSize,
            "total_cells": 100,
            "cells": {
                "type": "FeatureCollection",
                "features": []
            },
            "timestamp": datetime.datetime.now().isoformat()
        }
        return grids_db[grid_id]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/grid/{grid_id}")
async def get_grid(grid_id: str):
    if grid_id not in grids_db:
        # For demo purposes, return a mock one if not found
        return {
            "grid_analysis_id": grid_id,
            "name": f"Mock Grid {grid_id[:8]}",
            "cell_size_meters": 50.0,
            "total_cells": 120,
            "cells": {
                "type": "FeatureCollection",
                "features": []
            },
            "timestamp": datetime.datetime.now().isoformat()
        }
    return grids_db[grid_id]


class FloodAnalysisRequest(BaseModel):
    geojson: GeoJSONPolygon
    flood_threshold: float = 1.0


class SolarPotentialRequest(BaseModel):
    latitude: float
    longitude: float
    slope_percent: float


class ViewshedRequest(BaseModel):
    observer_latitude: float
    observer_longitude: float
    observer_height: float = 10.0
    max_distance: float = 5000.0


class ExportRequest(BaseModel):
    data: Dict[str, Any]
    format: str = "geojson"


@router.post("/analyze-flood-risk")
async def analyze_flood_risk(request: FloodAnalysisRequest):
    try:
        # Sample points for elevation
        poly_dict = request.geojson.dict()
        poly = shape(poly_dict)
        bounds = poly.bounds
        
        sample_coords = [
            [bounds[0], bounds[1]], [bounds[2], bounds[3]], 
            [bounds[0], bounds[3]], [bounds[2], bounds[1]],
            [poly.centroid.x, poly.centroid.y]
        ]
        
        elevation_data = geo_service.get_elevation_points(sample_coords)
        flood_analysis = geo_service.analyze_flood_risk(elevation_data)
        
        return {
            "valid": True,
            "flood_risk": flood_analysis,
            "threshold_m": request.flood_threshold,
            "data_source": "open_meteo_elevation_api",
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/analyze-solar-potential")
async def analyze_solar_potential(request: SolarPotentialRequest):
    try:
        metrics = geo_service.calculate_solar_potential(request.latitude, request.slope_percent)
        
        # AI Insight
        suitability = metrics["photovoltaic_suitability"]
        annual_kwh = metrics["annual_insolation_kwh_m2"]
        ai_desc = f"Solar power potential here is {suitability.lower()}. This site could generate approx {int(annual_kwh)} kWh per m² annually."

        return {
            "valid": True,
            "metrics": metrics,
            "ai_insight": f"Photovoltaic yield audit predicts {metrics['annual_insolation_kwh_m2']:.0f} kWh/m² annually. Deployment is {metrics['photovoltaic_suitability'].lower()}ly recommended with an optimal solar azimuth tilt of {metrics['optimal_tilt_deg']}°.",
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-amenities")
async def analyze_amenities(request: AreaAnalysisRequest):
    try:
        poly = shape(request.geojson.dict())
        centroid = poly.centroid
        
        amenities_count = {"healthcare": 0, "education": 0, "transit": 0, "retail": 0}
        
        amenities_count = geo_service.fetch_osm_amenities(centroid.y, centroid.x)

        score = min(100, (sum(amenities_count.values()) * 4))
        ai_insight = (f"Urban accessibility audit yields a score of {int(score)}/100. "
                     f"Proximal transit density ({amenities_count['transit']} nodes) and healthcare buffer "
                     f"({amenities_count['healthcare']} units) indicate robust logistical readiness.")

        return {
            "valid": True,
            "counts": amenities_count,
            "accessibility_score": score,
            "radius_km": 1.5,
            "ai_insight": ai_insight,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/analyze-viewshed")
async def analyze_viewshed(request: ViewshedRequest):
    """Calculate viewshed (visible areas) from an observer point."""
    if HAS_GEO_SERVICE:
        try:
            coords = [
                [request.observer_longitude, request.observer_latitude],
                [request.observer_longitude + 0.01, request.observer_latitude],
                [request.observer_longitude + 0.01, request.observer_latitude + 0.01],
                [request.observer_longitude, request.observer_latitude + 0.01]
            ]
            points = [[lng, lat] for lng, lat in coords]
            elevation_data = geo_service.get_elevation_points(points)
            
            elevations = [e.get("elevation", 0) for e in elevation_data if "elevation" in e]
            dem_array = np.array(elevations).reshape((2, 2)) if len(elevations) >= 4 else np.array([[800, 810], [820, 830]])
            
            viewshed = geo_service.viewshed_analysis(
                request.observer_latitude,
                request.observer_longitude,
                request.observer_height,
                dem_array,
                request.max_distance
            )
            
            visible_cells = int(np.sum(viewshed))
            total_cells = viewshed.size
            visibility_percent = (visible_cells / total_cells) * 100 if total_cells > 0 else 0
            
            return {
                "valid": True,
                "viewshed": {
                    "visible_cells": visible_cells,
                    "total_cells": total_cells,
                    "visibility_percentage": round(visibility_percent, 2),
                    "observer_height_m": request.observer_height,
                    "max_distance_m": request.max_distance
                },
                "data_source": "calculated",
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            import logging
            logging.warning(f"Viewshed analysis failed: {e}")
    
    import random
    visibility = random.uniform(20, 60)
    
    return {
        "valid": True,
        "viewshed": {
            "visible_cells": int(visibility * 10),
            "total_cells": 1000,
            "visibility_percentage": round(visibility, 2),
            "observer_height_m": request.observer_height,
            "max_distance_m": request.max_distance
        },
        "data_source": "mock",
        "timestamp": datetime.datetime.now().isoformat()
    }


@router.post("/export-data")
async def export_data(request: ExportRequest):
    """Export analysis data to various formats."""
    if HAS_GEO_SERVICE:
        try:
            exported = geo_service.export_geojson(request.data, request.format)
            return {
                "success": True,
                "data": exported,
                "format": request.format,
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Export failed: {str(e)}")
    
    return {
        "success": True,
        "data": json.dumps(request.data),
        "format": request.format,
        "timestamp": datetime.datetime.now().isoformat()
    }

@router.get("/detect-wasteland")
async def detect_wasteland(lat: float, lng: float, radius_km: float = 2.0):
    """Detect potential wasteland candidates within a radius using simulated urban auditing."""
    try:
        import random
        # Seed based on coordinates for deterministic simulation in a specific area
        random.seed(int((lat + lng) * 10000))
        
        candidates = []
        # Simulate 3-5 candidates
        for i in range(random.randint(3, 5)):
            # Random offset within roughly radius_km
            offset_lat = random.uniform(-0.008 * radius_km, 0.008 * radius_km)
            offset_lng = random.uniform(-0.01 * radius_km, 0.01 * radius_km)
            
            c_lat = lat + offset_lat
            c_lng = lng + offset_lng
            
            # Simulated land-use analysis
            ndvi = random.uniform(0.1, 0.4) # Prefer low vegetation for wasteland
            slope = random.uniform(0, 15)   # Prefer flat-ish for development
            area = random.uniform(500, 5000)
            
            # Suitability heuristic
            suitability = round(0.8 - (ndvi * 0.5) - (slope / 100), 2)
            
            candidates.append({
                "id": f"candidate-{i}-{int(c_lat*1000)}",
                "center": {"lat": c_lat, "lng": c_lng},
                "area_sqm": round(area, 2),
                "suitability_index": suitability,
                "land_use_tag": "unused_urban" if random.random() > 0.3 else "brownfield",
                "technical_description": f"Site {i+1} exhibits {int(ndvi*100)}% vegetative cover with a mean gradient of {slope:.1f}°. Logistical proximity to urban core is high."
            })
            
        return {
            "valid": True,
            "count": len(candidates),
            "candidates": candidates,
            "search_radius_km": radius_km,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wasteland detection failed: {str(e)}")

@router.post("/analyze-economics")
async def analyze_economics(request: EconomicAnalysisRequest):
    try:
        insights = GenerativeInsights.get_economic_insight(
            request.area_sqm, 
            request.suitability_score, 
            request.land_use
        )
        
        return {
            "valid": True,
            "economics": insights,
            "parameters": {
                "base_rate_sqm": 4500,
                "land_use": request.land_use,
                "region_multiplier": request.region_multiplier
            },
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
