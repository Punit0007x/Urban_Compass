"""
AI-Driven Spatial Layout Generator for Urban Planning.
Generates a 2D grid layout with building positions, road networks,
and zone assignments based on the AI urban plan.
"""
import math
import random
from typing import Dict, Any, List, Tuple, Set


class LayoutGenerator:
    def generate(
        self,
        polygon_coords: List[List[float]],
        urban_plan: Dict[str, Any],
        area_sqm: float,
    ) -> Dict[str, Any]:
        """
        Generate a spatial layout grid sized to the polygon.

        Args:
            polygon_coords: Ring of [lng, lat] pairs.
            urban_plan: AI urban plan with zones/buildings.
            area_sqm: Polygon area in m².

        Returns:
            Grid layout dict compatible with renderCustomGridCity.
        """
        lngs = [c[0] for c in polygon_coords]
        lats = [c[1] for c in polygon_coords]
        min_lng, max_lng = min(lngs), max(lngs)
        min_lat, max_lat = min(lats), max(lats)

        # Grid resolution based on area
        # Decreased grid resolution to ensure each cell is physically larger,
        # giving the 3D models proper spacing and preventing overlapping.
        if area_sqm < 50_000:
            grid_size = 16
        elif area_sqm < 200_000:
            grid_size = 24
        elif area_sqm < 1_000_000:
            grid_size = 32
        else:
            grid_size = 40

        mid_lat = (min_lat + max_lat) / 2
        width_m = (max_lng - min_lng) * 111320 * math.cos(mid_lat * math.pi / 180)
        height_m = (max_lat - min_lat) * 111320

        grid: List[List[str]] = [
            ["empty" for _ in range(grid_size)] for _ in range(grid_size)
        ]

        # Mark cells inside polygon
        inside: List[Tuple[int, int]] = []
        for y in range(grid_size):
            for x in range(grid_size):
                clng = min_lng + (x + 0.5) / grid_size * (max_lng - min_lng)
                clat = min_lat + (y + 0.5) / grid_size * (max_lat - min_lat)
                if self._pip(clat, clng, polygon_coords):
                    inside.append((x, y))

        if not inside:
            return {"cells": grid, "size": grid_size, "error": "empty"}

        # --- Zone percentages from urban plan ---
        zones = urban_plan.get("zones", {})
        res_pct = zones.get("residential_percent", 45) / 100
        com_pct = zones.get("commercial_percent", 20) / 100
        ind_pct = zones.get("industrial_percent", 15) / 100
        grn_pct = zones.get("green_space_percent", 10) / 100

        buildings = urban_plan.get("buildings", {})
        schools = buildings.get("schools_needed", 1)
        hospitals = buildings.get("hospitals_needed", 1)
        police = buildings.get("police_stations", 1)
        fire = buildings.get("fire_stations", 1)
        parks_count = buildings.get("parks_and_gardens", 3)

        # Step 1: Road network
        inside_set: Set[Tuple[int, int]] = set(inside)
        road_cells = self._place_roads(grid, grid_size, inside_set)

        # Step 2: Zone assignment
        remaining = [c for c in inside if c not in road_cells]
        self._assign_zones(grid, grid_size, remaining, res_pct, com_pct, ind_pct, grn_pct, parks_count)

        # Step 3: Infrastructure placement
        transit_count = urban_plan.get("infrastructure", {}).get("public_transit_lines", 0)
        utility_count = 1 if urban_plan.get("utilities", {}).get("power_generation_capacity_kw", 0) > 0 else 0
        
        self._place_infra(grid, remaining, schools, hospitals, police, fire, transit_count, utility_count)

        # Stats
        counts: Dict[str, int] = {}
        for row in grid:
            for cell in row:
                counts[cell] = counts.get(cell, 0) + 1

        return {
            "cells": grid,
            "size": grid_size,
            "cell_width_meters": round(width_m / grid_size, 1),
            "cell_height_meters": round(height_m / grid_size, 1),
            "total_cells_inside": len(inside),
            "layout_stats": counts,
            "pipelines": self._generate_pipelines(grid, grid_size, inside_set)
        }

    # ── Road network ───────────────────────────────────────────────
    def _place_roads(
        self, grid: List[List[str]], size: int, inside: Set[Tuple[int, int]], seed: int = 42
    ) -> Set[Tuple[int, int]]:
        roads: Set[Tuple[int, int]] = set()
        rng = random.Random(seed)
        
        # Vary spacing slightly
        spacing = max(3, size // (5 + rng.randint(-1, 1)))
        offset = rng.randint(0, spacing - 1)

        for y in range(size):
            for x in range(size):
                if (x, y) not in inside:
                    continue
                h = (y + offset) % spacing == 0
                v = (x + offset) % spacing == 0
                if h or v:
                    grid[y][x] = "road_primary" if (h and v) else (
                        "road_primary" if h else "road_secondary"
                    )
                    roads.add((x, y))
        return roads

    # ── Zone assignment ────────────────────────────────────────────
    def _assign_zones(
        self,
        grid: List[List[str]],
        size: int,
        cells: List[Tuple[int, int]],
        res: float, com: float, ind: float, grn: float,
        parks_count: int = 3
    ) -> None:
        if not cells:
            return
        cx = sum(c[0] for c in cells) / len(cells)
        cy = sum(c[1] for c in cells) / len(cells)
        
        # Add some random jitter to distribution
        rng = random.Random(sum(c[0] + c[1] for c in cells))
        by_dist = sorted(cells, key=lambda c: math.hypot(c[0] - cx, c[1] - cy) * rng.uniform(0.8, 1.2))
        total = len(by_dist)

        com_n = max(1, int(total * com))
        ind_n = max(1, int(total * ind))
        # Use AI's park count directly if it's specified, otherwise use percentage
        grn_n = parks_count if parks_count > 0 else max(1, int(total * grn))

        assigned: Set[Tuple[int, int]] = set()

        # Commercial near center
        for c in by_dist[:com_n]:
            if grid[c[1]][c[0]] not in ("road_primary", "road_secondary"):
                grid[c[1]][c[0]] = "commercial"
                assigned.add(c)

        # Industrial on periphery
        for c in reversed(by_dist):
            if len([a for a in assigned if grid[a[1]][a[0]] == "industrial"]) >= ind_n:
                break
            if c not in assigned and grid[c[1]][c[0]] not in ("road_primary", "road_secondary", "commercial"):
                grid[c[1]][c[0]] = "industrial"
                assigned.add(c)

        # Parks distributed across quadrants
        quads: List[List[Tuple[int, int]]] = [[] for _ in range(4)]
        for c in by_dist:
            if c in assigned or grid[c[1]][c[0]].startswith("road"):
                continue
            q = (1 if c[0] >= cx else 0) + (2 if c[1] >= cy else 0)
            quads[q].append(c)

        per_q = max(1, grn_n // 4)
        for q in quads:
            for c in q[:per_q]:
                grid[c[1]][c[0]] = "park"
                assigned.add(c)

        # Remaining → residential
        for c in by_dist:
            if c not in assigned and grid[c[1]][c[0]] not in ("road_primary", "road_secondary"):
                grid[c[1]][c[0]] = "residential"

    # ── Infrastructure ─────────────────────────────────────────────
    def _place_infra(
        self, grid: List[List[str]],
        cells: List[Tuple[int, int]],
        schools: int, hospitals: int,
        police: int, fire: int,
        transit: int = 0, utilities: int = 0
    ) -> None:
        # We prefer placing infrastructure on residential or commercial cells near roads
        res = [c for c in cells if grid[c[1]][c[0]] in ("residential", "commercial")]
        if not res:
            return
        
        # Sort by distance from center for better placement
        random.shuffle(res)

        def place(n: int, label: str):
            if n <= 0: return
            placed = 0
            # Ensure we don't exceed available cells
            limit = min(n, len(res))
            step = max(1, len(res) // (limit + 1))
            for i in range(limit):
                idx = (i * step) % len(res)
                if grid[res[idx][1]][res[idx][0]] in ("residential", "commercial"):
                    grid[res[idx][1]][res[idx][0]] = label
                    placed += 1

        place(schools, "school")
        place(hospitals, "hospital")
        place(police, "police")
        place(fire, "fire")
        place(transit, "transit")
        place(utilities, "utility")

    # ── Utility Networks ───────────────────────────────────────────
    def _generate_pipelines(self, grid: List[List[str]], size: int, inside: Set[Tuple[int, int]]) -> Dict[str, List[List[Tuple[int, int]]]]:
        """Generates pipeline networks following the road grid."""
        networks = {
            "water": [],
            "sewage": [],
            "gas": []
        }
        
        # We'll create segments based on roads
        # Horizontal pipelines
        for y in range(size):
            segments_water = []
            segments_sewage = []
            segments_gas = []
            for x in range(size):
                if (x, y) in inside and grid[y][x].startswith("road"):
                    segments_water.append((x, y))
                    segments_sewage.append((x, y))
                    segments_gas.append((x, y))
                else:
                    if len(segments_water) > 1:
                        networks["water"].append(segments_water[:])
                        networks["sewage"].append(segments_sewage[:])
                        networks["gas"].append(segments_gas[:])
                    segments_water = []
                    segments_sewage = []
                    segments_gas = []
            if len(segments_water) > 1:
                networks["water"].append(segments_water)
                networks["sewage"].append(segments_sewage)
                networks["gas"].append(segments_gas)

        # Vertical pipelines
        for x in range(size):
            segments_water = []
            segments_sewage = []
            segments_gas = []
            for y in range(size):
                if (x, y) in inside and grid[y][x].startswith("road"):
                    segments_water.append((x, y))
                    segments_sewage.append((x, y))
                    segments_gas.append((x, y))
                else:
                    if len(segments_water) > 1:
                        networks["water"].append(segments_water[:])
                        networks["sewage"].append(segments_sewage[:])
                        networks["gas"].append(segments_gas[:])
                    segments_water = []
                    segments_sewage = []
                    segments_gas = []
            if len(segments_water) > 1:
                networks["water"].append(segments_water)
                networks["sewage"].append(segments_sewage)
                networks["gas"].append(segments_gas)
                
        return networks

    # ── Point-in-polygon ───────────────────────────────────────────
    @staticmethod
    def _pip(lat: float, lng: float, coords: List[List[float]]) -> bool:
        n = len(coords)
        inside = False
        j = n - 1
        for i in range(n):
            xi, yi = coords[i][0], coords[i][1]
            xj, yj = coords[j][0], coords[j][1]
            if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
                inside = not inside
            j = i
        return inside


layout_generator = LayoutGenerator()
