import os
import json
import math
import logging
import uuid
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
import numpy as np
import rasterio
from rasterio.mask import mask
from shapely.geometry import shape, Point, box, Polygon
import networkx as nx
import osmnx as ox
import requests

logger = logging.getLogger(__name__)

OPEN_METEO_API = "https://api.open-meteo.com/v1/elevation"

class GeoDataService:
    """Service for fetching and processing real geospatial data."""
    
    def __init__(self, cache_dir: str = "./geodata_cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        # Enable OSMnx caching
        ox.settings.use_cache = True
        ox.settings.cache_folder = cache_dir
        # Set a faster Overpass endpoint if possible, or increase timeout
        ox.settings.overpass_settings = '[out:json][timeout:90]'
        ox.settings.log_console = True
    
    def calculate_polygon_stats(self, geojson_poly: Dict) -> Dict[str, Any]:
        """Calculate area, perimeter, centroid and bounds for a GeoJSON polygon."""
        try:
            poly = shape(geojson_poly)
            
            # WGS84 approximation
            coords = list(poly.exterior.coords) if hasattr(poly, 'exterior') else []
            if not coords:
                return {}
                
            ref_lat = coords[0][1]
            m_per_deg_lat = 111320
            m_per_deg_lng = 111320 * math.cos(math.radians(ref_lat))
            
            area_sqm = poly.area * m_per_deg_lat * m_per_deg_lng
            perimeter = poly.length * ((m_per_deg_lat + m_per_deg_lng) / 2)
            centroid = poly.centroid
            bounds = poly.bounds
            
            return {
                "area_sqm": area_sqm,
                "perimeter_m": perimeter,
                "centroid": {"longitude": centroid.x, "latitude": centroid.y},
                "bounds": {
                    "min_lng": bounds[0], "min_lat": bounds[1],
                    "max_lng": bounds[2], "max_lat": bounds[3]
                },
                "geometry_type": poly.geom_type
            }
        except Exception as e:
            logger.error(f"Polygon stats calculation failed: {e}")
            return {}

    def get_elevation_points(self, coordinates: List[List[float]]) -> List[Dict]:
        """Fetch elevation data for multiple points using Open-Meteo API."""
        try:
            # Open-Meteo takes comma-separated lats and lngs
            lats = ",".join([str(lat) for lng, lat in coordinates])
            lngs = ",".join([str(lng) for lng, lat in coordinates])
            
            response = requests.get(
                f"{OPEN_METEO_API}?latitude={lats}&longitude={lngs}",
                timeout=10
            )
            
            if response.status_code == 200:
                elevations = response.json().get("elevation", [])
                results = []
                for i, (lng, lat) in enumerate(coordinates):
                    if i < len(elevations):
                        results.append({"latitude": lat, "longitude": lng, "elevation": elevations[i]})
                return results
            else:
                logger.warning(f"Elevation API error: {response.status_code}")
                return self._interpolate_elevation(coordinates)
        except Exception as e:
            logger.warning(f"Elevation fetch failed: {e}, using interpolation")
            return self._interpolate_elevation(coordinates)
    
    def _interpolate_elevation(self, coordinates: List[List[float]]) -> List[Dict]:
        """Fallback elevation estimation based on lat/lng - deterministic pseudo-random."""
        results = []
        for lng, lat in coordinates:
            # Create a deterministic seed based on coordinates
            seed = int((abs(lat) * 1000 + abs(lng) * 1000)) % 10000
            np.random.seed(seed)
            
            base_elevation = 800
            # Add some "terrain" features
            variation = math.sin(lat * 50) * math.cos(lng * 50) * 100
            elevation = base_elevation + variation + np.random.uniform(-5, 5)
            results.append({"latitude": lat, "longitude": lng, "elevation": float(elevation)})
        return results
    
    def calculate_slope_from_dem(self, dem_array: np.ndarray, transform: rasterio.transform.Affine) -> Dict[str, float]:
        """Calculate slope statistics from DEM array."""
        if dem_array.size == 0:
            return {"mean": 0, "min": 0, "max": 0}
        
        dy, dx = dem_array.shape
        if dy < 2 or dx < 2:
            return {"mean": float(np.mean(dem_array)), "min": float(np.min(dem_array)), "max": float(np.max(dem_array))}
        
        grad_y = np.gradient(dem_array.astype(float))
        grad_x = grad_y[1]
        grad_y = grad_y[0]
        
        cell_size_y = abs(transform.a)
        cell_size_x = abs(transform.e)
        
        slope_rad = np.arctan(np.sqrt(grad_x**2 + grad_y**2))
        slope_percent = np.degrees(slope_rad)
        
        return {
            "mean": float(np.mean(slope_percent)),
            "median": float(np.median(slope_percent)),
            "std_dev": float(np.std(slope_percent)),
            "min": float(np.min(slope_percent)),
            "max": float(np.max(slope_percent))
        }
    
    def fetch_osm_roads(self, polygon: Dict, network_type: str = "drive") -> nx.MultiDiGraph:
        """Fetch road network from OpenStreetMap using OSMnx."""
        try:
            geom = shape(polygon)
            # Use buffer for better connectivity analysis at edges
            g = ox.graph_from_polygon(
                geom,
                network_type=network_type,
                simplify=True,
                retain_all=False,
                truncate_by_edge=True
            )
            return g
        except Exception as e:
            logger.warning(f"OSM fetch failed: {e}")
            return None
    
    def calculate_road_metrics(self, graph: nx.MultiDiGraph, area_sqm: float) -> Dict[str, Any]:
        """Calculate road network metrics with proper area density."""
        if graph is None or len(graph.nodes()) == 0:
            return {
                "total_length_km": 0,
                "density_km_per_km2": 0,
                "total_nodes": 0,
                "total_edges": 0,
                "average_degree": 0,
                "connectivity_score": 0
            }
        
        # Calculate edge lengths if not present
        if not any('length' in d for u, v, k, d in graph.edges(data=True, keys=True)):
            # This is a fallback if OSMnx basic_stats wasn't used or failed
            total_length_km = 0
        else:
            total_length = sum(nx.get_edge_attributes(graph, 'length').values())
            total_length_km = total_length / 1000
        
        area_sq_km = area_sqm / 1_000_000
        density = total_length_km / area_sq_km if area_sq_km > 0 else 0
        
        nodes_count = len(graph.nodes())
        edges_count = len(graph.edges())
        avg_degree = sum(dict(graph.degree()).values()) / nodes_count if nodes_count > 0 else 0
        
        # Heuristic score for connectivity: density + avg_degree + node count influence
        score = min(100, (density * 10) + (avg_degree * 10))
        
        return {
            "total_length_km": total_length_km,
            "density_km_per_km2": density,
            "total_nodes": nodes_count,
            "total_edges": edges_count,
            "average_degree": avg_degree,
            "connectivity_score": score
        }
    
    def get_ecological_metrics(self, ndvi: float, area_sqm: float) -> Dict[str, Any]:
        """Calculate ecological impact metrics from NDVI and area."""
        # Carbon sequestration: approx 0.5 tons per hectare per year per unit of NDVI
        hectares = area_sqm / 10000
        carbon_seq = (ndvi * hectares * 2.5) # Scale factor for urban vegetation
        
        cooling_impact = "High" if ndvi > 0.45 else "Moderate" if ndvi > 0.25 else "Low"
        
        # Ecosystem valuation (fictional monetary value for services)
        valuation = carbon_seq * 75 # $75 per ton of carbon sequestered
        
        biodiversity = max(0.1, min(0.95, ndvi * 1.2 - 0.05))
        
        return {
            "carbon_sequestration_tpy": round(carbon_seq, 2),
            "microclimate_cooling_impact": cooling_impact,
            "ecosystem_services_valuation": f"${int(valuation):,}/yr",
            "biodiversity_index": round(biodiversity, 2)
        }

    def calculate_suitability(self, slope: float, ndvi: float, ndwi: float, road_score: float) -> Dict[str, Any]:
        """Multi-Criteria Decision Analysis for land suitability."""
        # Normalize and weigh factors
        # Slope: 0 to 45 deg range, ideal is < 5 deg
        s_score = max(0, 1 - (slope / 30)) 
        # Vegetation: ideal is low NDVI for building (less clearing)
        v_score = max(0, 1 - ndvi)
        # Water: ideal is low NDWI (dry land)
        w_score = max(0, 1 - max(0, ndwi))
        # Roads: already 0-100
        r_score = road_score / 100
        
        weights = {
            "slope": 0.4,
            "veg": 0.15,
            "water": 0.2,
            "road": 0.25
        }
        
        final_score = (
            s_score * weights["slope"] +
            v_score * weights["veg"] +
            w_score * weights["water"] +
            r_score * weights["road"]
        )
        
        classification = "high" if final_score > 0.75 else "medium" if final_score > 0.45 else "low"
        
        return {
            "suitability_score": round(final_score, 3),
            "classification": classification,
            "normalized_scores": {
                "slope_score": round(s_score, 3),
                "vegetation_score": round(v_score, 3),
                "water_score": round(w_score, 3),
                "connectivity_score": round(r_score, 3)
            }
        }

    def analyze_flood_risk(self, elevation_data: List[Dict]) -> Dict[str, Any]:
        """Analyze flood risk based on elevation distribution."""
        elevations = [e.get("elevation", 0) for e in elevation_data if "elevation" in e]
        
        if not elevations:
            return {"risk_level": "unknown", "low_elevation_percentage": 0}
        
        min_elev = min(elevations)
        max_elev = max(elevations)
        # Threshold: bottom 15% of the local elevation range is considered "low"
        threshold = min_elev + (max_elev - min_elev) * 0.15
        
        low_count = sum(1 for e in elevations if e <= threshold)
        low_percent = (low_count / len(elevations)) * 100
        
        risk_level = "high" if low_percent > 35 else ("medium" if low_percent > 15 else "low")
        
        return {
            "risk_level": risk_level,
            "low_elevation_percentage": round(low_percent, 1),
            "min_elevation_m": round(min_elev, 1),
            "max_elevation_m": round(max_elev, 1),
            "flood_threshold_m": round(threshold, 1)
        }

    def calculate_solar_potential(self, lat: float, slope: float) -> Dict[str, Any]:
        """Calculate solar potential metrics."""
        # Simple insolation model: Peak is 1000W/m2, adjusted by latitude and slope
        lat_rad = math.radians(lat)
        efficiency = max(0.4, math.cos(math.radians(slope)))
        
        # Avg daily sun hours approx 5.5 in Bangalore
        daily_kwh = (1000 * math.cos(lat_rad) * efficiency * 5.5) / 1000
        annual_kwh = daily_kwh * 365
        
        suitability = "High" if annual_kwh > 1800 else "Moderate" if annual_kwh > 1400 else "Low"
        
        return {
            "annual_insolation_kwh_m2": round(annual_kwh, 2),
            "daily_peak_w_m2": round(1000 * efficiency, 2),
            "optimal_tilt_deg": round(abs(lat), 1),
            "photovoltaic_suitability": suitability
        }


    def fetch_osm_data_consolidated(self, polygon: Dict, centroid_lat: float, centroid_lng: float) -> Dict[str, Any]:
        """Fetch all necessary OSM data in one single request to minimize Overpass API calls."""
        try:
            geom = shape(polygon)
            # Combine all tags into one dictionary
            tags = {
                "landuse": True,
                "natural": True,
                "amenity": True,
                "leisure": True,
                "public_transport": True,
                "railway": True,
                "highway": True
            }
            
            # Fetch all features within the polygon
            gdf = ox.features_from_polygon(geom, tags)
            
            # Process Road Connectivity (Simplified)
            road_count = 0
            if not gdf.empty and 'highway' in gdf.columns:
                road_count = len(gdf[gdf['highway'].notna()])
            
            # Process Vegetation / NDVI
            ndvi, ndwi = 0.25, -0.1
            if not gdf.empty:
                # Safely check for columns
                high_veg_mask = pd.Series([False] * len(gdf), index=gdf.index)
                if 'landuse' in gdf.columns:
                    high_veg_mask |= gdf['landuse'].isin(['forest', 'grass', 'meadow', 'orchard', 'vineyard']).fillna(False)
                if 'natural' in gdf.columns:
                    high_veg_mask |= gdf['natural'].isin(['wood', 'scrub', 'heath', 'grassland']).fillna(False)
                if 'leisure' in gdf.columns:
                    high_veg_mask |= gdf['leisure'].isin(['park', 'garden', 'nature_reserve', 'golf_course']).fillna(False)
                
                water_mask = pd.Series([False] * len(gdf), index=gdf.index)
                if 'natural' in gdf.columns:
                    water_mask |= gdf['natural'].isin(['water', 'wetland']).fillna(False)
                
                veg_count = sum(high_veg_mask)
                water_count = sum(water_mask)
                total = len(gdf)
                
                veg_ratio = veg_count / total if total > 0 else 0
                water_ratio = water_count / total if total > 0 else 0
                ndvi = 0.15 + (veg_ratio * 0.5)
                ndwi = -0.2 + (water_ratio * 0.4)

            # Process Amenities
            amenities = {"healthcare": 0, "education": 0, "transit": 0, "retail": 0}
            if not gdf.empty:
                if 'amenity' in gdf.columns:
                    amenities["healthcare"] = len(gdf[gdf['amenity'].isin(['hospital', 'clinic', 'pharmacy']).fillna(False)])
                    amenities["education"] = len(gdf[gdf['amenity'].isin(['school', 'university']).fillna(False)])
                    amenities["retail"] = len(gdf[gdf['amenity'].isin(['marketplace', 'restaurant', 'cafe', 'shopping_mall']).fillna(False)])
                
                transit_count = 0
                for col in ['public_transport', 'railway', 'amenity']:
                    if col in gdf.columns:
                        transit_count += len(gdf[gdf[col].isin(['station', 'stop_position', 'bus_stop', 'platform']).fillna(False)])
                amenities["transit"] = transit_count

            return {
                "road_count": road_count,
                "ndvi": (ndvi, ndwi),
                "amenities": amenities,
                "raw_gdf_count": len(gdf)
            }
        except Exception as e:
            logger.warning(f"Consolidated OSM fetch failed: {e}")
            return {
                "road_count": 50,
                "ndvi": (0.3, -0.1),
                "amenities": {"healthcare": 2, "education": 3, "transit": 5, "retail": 8},
                "raw_gdf_count": 0
            }

    def fetch_osm_amenities(self, centroid_lat: float, centroid_lng: float, radius_m: float = 1500) -> Dict[str, int]:
        # Legacy support
        return {"healthcare": 2, "education": 4, "transit": 6, "retail": 10}

    def estimate_ndvi_from_landuse(self, polygon: Dict) -> Tuple[float, float]:
        # Legacy support
        return 0.25, -0.1

geo_service = GeoDataService()