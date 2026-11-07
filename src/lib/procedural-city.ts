/**
 * Procedural City Generation Library for CesiumJS
 * Rules for spatial logic:
 * 1. Flat regions (low slope) are preferred.
 * 2. Roads form a hierarchical grid.
 * 3. Buildings align to road edges with offsets.
 * 4. Land use is zoned by block.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CityConfig {
  center: { lat: number; lng: number };
  width: number; // meters
  height: number; // meters
  gridSize: number; // meters (secondary roads)
  primaryGridStep: number; // grid cells per primary road
}

export interface ProceduralCityData {
  roads: {
    primary: unknown[][]; // Cartesian3[][]
    secondary: unknown[][];
  };
  buildings: {
    position: unknown; // Cartesian3
    dimensions: unknown; // Cartesian3 (width, depth, height)
    orientation: number; // radians
    type: 'residential' | 'public' | 'commercial' | 'industrial';
    modelUri?: string;
  }[];
  parks: {
    positions: unknown[]; // Cartesian3[]
    trees: unknown[];
  }[];
  water: {
    positions: unknown[]; // Cartesian3[]
  }[];
  zones: {
    type: string;
    positions: unknown[];
    color: string;
  }[];
  lights: unknown[]; // Cartesian3[]
  districts: {
    name: string;
    center: unknown; // Cartesian3
    type: 'residential' | 'public' | 'commercial';
  };
}

export async function findSuitableRegion(
  viewer: unknown,
  startPoint: { lat: number; lng: number },
  searchRadius: number = 0.01 
): Promise<{ lat: number; lng: number; averageHeight: number }> {
  try {
    const Cesium = (window as any).Cesium;
    if (!Cesium) throw new Error("Cesium not loaded");
    const points: unknown[] = [];
    const samples = 4;
  
  for (let i = -samples; i <= samples; i++) {
    for (let j = -samples; j <= samples; j++) {
      points.push(
        Cesium.Cartographic.fromDegrees(
          startPoint.lng + (i * searchRadius) / samples,
          startPoint.lat + (j * searchRadius) / samples
        )
      );
    }
  }

  const heights = await Cesium.sampleTerrainMostDetailed((viewer as any).terrainProvider, points);
  let totalHeight = 0;
  heights.forEach((h: { height: number }) => totalHeight += h.height);
  
  return { 
    lat: startPoint.lat, 
    lng: startPoint.lng, 
    averageHeight: totalHeight / points.length 
  };
} catch (e) {
  console.error(e);
  return { lat: startPoint.lat, lng: startPoint.lng, averageHeight: 0 };
}
}

/**
 * Generates a grid of roads clamped to ground
 */
export function generateRoadNetwork(config: CityConfig): { 
  primary: unknown[][], 
  secondary: unknown[][] 
} {
  const Cesium = (window as any).Cesium;
  const primaryRoads: unknown[][] = [];
  const secondaryRoads: unknown[][] = [];
  
  const halfW = config.width / 2;
  const halfH = config.height / 2;
  const center = Cesium.Cartesian3.fromDegrees(config.center.lng, config.center.lat);
  
  const cityRadius = Math.min(halfW, halfH);
  
  // Calculate scale factor based on area
  const areaScale = Math.sqrt(config.width * config.height) / 800;
  const gridSize = Math.max(20, Math.min(80, config.gridSize * areaScale));
  const stepSize = Math.max(10, Math.min(40, 25 * areaScale));
  
  for (let x = -halfW; x <= halfW; x += gridSize) {
    const p = [];
    for (let y = -halfH; y <= halfH; y += stepSize) {
      const pos = offsetPosition(center, x, y);
      if (Cesium.Cartesian3.distance(center, pos) < cityRadius) p.push(pos);
      else if (p.length > 0) break;
    }
    if (p.length > 2) {
      if (Math.round(x/gridSize)%config.primaryGridStep===0) primaryRoads.push(p);
      else secondaryRoads.push(p);
    }
  }
  for (let y = -halfH; y <= halfH; y += gridSize) {
    const p = [];
    for (let x = -halfW; x <= halfW; x += stepSize) {
      const pos = offsetPosition(center, x, y);
      if (Cesium.Cartesian3.distance(center, pos) < cityRadius) p.push(pos);
      else if (p.length > 0) break;
    }
    if (p.length > 2) {
      if (Math.round(y/gridSize)%config.primaryGridStep===0) primaryRoads.push(p);
      else secondaryRoads.push(p);
    }
  }

  return { primary: primaryRoads, secondary: secondaryRoads };
}

export function generateBuildings(config: CityConfig): ProceduralCityData['buildings'] {
  const Cesium = (window as any).Cesium;
  const buildings: ProceduralCityData['buildings'] = [];
  const halfW = config.width / 2;
  const halfH = config.height / 2;
  const center = Cesium.Cartesian3.fromDegrees(config.center.lng, config.center.lat);
  const cityRadius = Math.min(halfW, halfH);
  
  // Calculate scale factor based on area
  const areaScale = Math.sqrt(config.width * config.height) / 800;
  const baseSize = Math.max(10, Math.min(40, 30 * areaScale));
  const spacing = baseSize * 3.5;
  
  // Building model mappings
  const buildingModels = {
    residential: ['/3d-models/House1.glb', '/3d-models/house2.glb', '/3d-models/house3.glb', '/3d-models/house4.glb', '/3d-models/apartment.glb', '/3d-models/apartment2.glb'],
    commercial: ['/3d-models/Office.glb'],
    industrial: ['/3d-models/factory.glb'],
    public: ['/3d-models/School.glb', '/3d-models/hospital.glb', '/3d-models/park.glb']
  };
  
  for (let x = -halfW + spacing / 2; x < halfW; x += spacing) {
    for (let y = -halfH + spacing / 2; y < halfH; y += spacing) {
      if (Math.random() > 0.45) continue;
      
      const jitterX = (Math.random() - 0.5) * spacing * 0.4;
      const jitterY = (Math.random() - 0.5) * spacing * 0.4;
      const cellCenter = offsetPosition(center, x + jitterX, y + jitterY);
      
      if (Cesium.Cartesian3.distance(center, cellCenter) > cityRadius * 0.95) continue;

      const rand = Math.random();
      let type: 'residential' | 'commercial' | 'industrial' | 'public' = 'residential';
      if (rand > 0.6 && rand <= 0.75) type = 'commercial';
      if (rand > 0.75 && rand <= 0.85) type = 'industrial';
      if (rand > 0.85) type = 'public';
      
      const buildingHeights = {
        residential: baseSize * (0.5 + Math.random() * 0.5),
        commercial: baseSize * (1.0 + Math.random() * 1.2),
        industrial: baseSize * (0.7 + Math.random() * 0.5),
        public: baseSize * (0.8 + Math.random() * 0.8)
      };
      
      // Select random model for this building type
      const availableModels = buildingModels[type];
      const selectedModel = availableModels[Math.floor(Math.random() * availableModels.length)];
      
      buildings.push({
        position: cellCenter,
        dimensions: new Cesium.Cartesian3(
          baseSize * (0.8 + Math.random() * 0.4),
          baseSize * (0.8 + Math.random() * 0.4),
          buildingHeights[type]
        ),
        orientation: Math.random() * Math.PI * 2,
        type,
        modelUri: selectedModel
      });
    }
  }
  
  return buildings;
}

export function generateStreetLights(roads: { primary: unknown[][], secondary: unknown[][] }): unknown[] {
  const Cesium = (window as any).Cesium;
  const lightPositions: unknown[] = [];
  
  // Calculate average road length to determine spacing
  let totalRoadLength = 0;
  let roadCount = 0;
  const allRoads = [...roads.primary, ...roads.secondary];
  allRoads.forEach(road => {
    for (let i = 0; i < road.length - 1; i++) {
      totalRoadLength += Cesium.Cartesian3.distance(road[i], road[i+1]);
      roadCount++;
    }
  });
  
  const avgRoadLength = roadCount > 0 ? totalRoadLength / roadCount : 50;
  const spacing = Math.max(20, Math.min(80, avgRoadLength * 0.15));
  const offsetDistance = Math.max(4, Math.min(12, spacing * 0.15)); 

  allRoads.forEach(road => {
    for (let i = 0; i < road.length - 1; i++) {
        const start = road[i];
        const end = road[i+1];
        const distance = Cesium.Cartesian3.distance(start, end);
        const count = Math.floor(distance / spacing);

        const direction = Cesium.Cartesian3.normalize(
          Cesium.Cartesian3.subtract(end, start, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );

        const perpendicular = new Cesium.Cartesian3(-direction.y, direction.x, 0);

        for (let j = 1; j < count; j++) {
            const lerp = j / count;
            const basePos = Cesium.Cartesian3.lerp(start, end, lerp, new Cesium.Cartesian3());
            
            lightPositions.push(Cesium.Cartesian3.add(
              basePos, 
              Cesium.Cartesian3.multiplyByScalar(perpendicular, offsetDistance, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            ));
            lightPositions.push(Cesium.Cartesian3.add(
              basePos, 
              Cesium.Cartesian3.multiplyByScalar(perpendicular, -offsetDistance, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            ));
        }
    }
  });

  return lightPositions;
}

export function generateEnvironment(config: CityConfig): { 
  parks: ProceduralCityData['parks'], 
  water: ProceduralCityData['water'],
  zones: { type: string; positions: unknown[]; color: string }[]
} {
  const Cesium = (window as any).Cesium;
  const parks: ProceduralCityData['parks'] = [];
  const water: ProceduralCityData['water'] = [];
  const zones: { type: string; positions: unknown[]; color: string }[] = [];
  
  const halfW = config.width / 2;
  const halfH = config.height / 2;
  const center = Cesium.Cartesian3.fromDegrees(config.center.lng, config.center.lat);
  const cityRadius = Math.min(halfW, halfH);
  
  const areaScale = Math.sqrt(config.width * config.height) / 800;
  const baseSize = Math.max(15, Math.min(60, 40 * areaScale));

  const riverPoints = [];
  const riverSegments = Math.max(15, Math.min(30, Math.floor(25 * areaScale)));
  for (let i = 0; i <= riverSegments; i++) {
    const y = -halfH + (i / riverSegments) * config.height;
    const x = Math.sin(y * 0.004) * baseSize * 3 + halfW * 0.5 + Math.cos(i * 0.3) * baseSize;
    riverPoints.push(offsetPosition(center, x, y));
  }
  
  const riverPolygon = [];
  const riverWidth = Math.max(15, Math.min(50, baseSize));
  riverPoints.forEach(p => riverPolygon.push(offsetPosition(p, -riverWidth, 0)));
  [...riverPoints].reverse().forEach(p => riverPolygon.push(offsetPosition(p, riverWidth, 0)));
  
  water.push({ positions: riverPolygon });

  const zoneTypes = [
    { type: 'residential', color: '#22c55e', areaSize: baseSize * 2.5 },
    { type: 'commercial', color: '#3b82f6', areaSize: baseSize * 2 },
    { type: 'industrial', color: '#f59e0b', areaSize: baseSize * 2 },
    { type: 'parks', color: '#4ade80', areaSize: baseSize * 1.8 }
  ];

  for (let i = 0; i < zoneTypes.length; i++) {
    const zt = zoneTypes[i];
    const numZones = i === 0 ? 4 : i === 3 ? 6 : 2;
    for (let j = 0; j < numZones; j++) {
      const rx = (Math.random() - 0.5) * config.width * 0.85;
      const ry = (Math.random() - 0.5) * config.height * 0.85;
      const pw = zt.areaSize;
      const ph = zt.areaSize * (0.8 + Math.random() * 0.4);
      
      const zonePos = [
        offsetPosition(center, rx - pw/2, ry - ph/2),
        offsetPosition(center, rx + pw/2, ry - ph/2),
        offsetPosition(center, rx + pw/2, ry + ph/2),
        offsetPosition(center, rx - pw/2, ry + ph/2),
      ];
      
      if (Cesium.Cartesian3.distance(center, offsetPosition(center, rx, ry)) < cityRadius * 0.9) {
        zones.push({ type: zt.type, positions: zonePos, color: zt.color });
      }
    }
  }

  const numParks = Math.max(4, Math.min(12, Math.floor(8 * areaScale)));
  for (let i = 0; i < numParks; i++) {
    const rx = (Math.random() - 0.5) * config.width * 0.85;
    const ry = (Math.random() - 0.5) * config.height * 0.85;
    const pw = baseSize * (0.8 + Math.random() * 1.5);
    
    const parkPos = [
      offsetPosition(center, rx - pw/2, ry - pw/2),
      offsetPosition(center, rx + pw/2, ry - pw/2),
      offsetPosition(center, rx + pw/2, ry + pw/2),
      offsetPosition(center, rx - pw/2, ry + pw/2),
    ];

    if (Cesium.Cartesian3.distance(center, offsetPosition(center, rx, ry)) < cityRadius * 0.9) {
      parks.push({ positions: parkPos, trees: [] });
    }
  }

  return { parks, water, zones };
}

export function offsetPosition(pos: unknown, xMeter: number, yMeter: number): unknown {
  const Cesium = (window as any).Cesium;
  if (!pos) return null;
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
  const offset = new Cesium.Cartesian3(xMeter, yMeter, 0);
  return Cesium.Matrix4.multiplyByPoint(enu, offset, new Cesium.Cartesian3());
}
