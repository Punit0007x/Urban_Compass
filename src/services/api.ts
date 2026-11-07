const API_BASE_URL = ''; // Uses Vite proxy in development

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface AreaMeasurement {
  square_meters: number;
  acres: number;
  hectares: number;
  square_kilometers: number;
}

export interface Centroid {
  longitude: number;
  latitude: number;
}

export interface BoundingBox {
  min_longitude: number;
  min_latitude: number;
  max_longitude: number;
  max_latitude: number;
}

export interface StoredArea {
  id: string;
  name: string | null;
  layer_type: string;
}

export interface AreaAnalysisResponse {
  valid: boolean;
  area: AreaMeasurement;
  centroid: Centroid;
  bounding_box: BoundingBox;
  perimeter_meters: number;
  geometry_type: string;
  stored: StoredArea | null;
  timestamp: string;
}

export interface SlopeStatistics {
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
}

export interface SlopeDistribution {
  flat_percent: number;
  gentle_percent: number;
  moderate_percent: number;
  steep_percent: number;
  very_steep_percent: number;
}

export interface SlopeClassification {
  category: 'flat' | 'gentle' | 'moderate' | 'steep' | 'very_steep';
  description: string;
}

export interface ElevationStats {
  min: number;
  max: number;
  mean: number;
}

export interface SlopeAnalysisResponse {
  valid: boolean;
  slope_statistics: SlopeStatistics;
  slope_distribution: SlopeDistribution;
  slope_classification: SlopeClassification;
  elevation_stats: ElevationStats;
  pixel_count: number;
  resolution_m: number;
  geometry_area_sqm: number;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
}

export interface NDVIStats {
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
}

export interface NDWIStats {
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
}

export interface VegetationClass {
  category: 'barren' | 'sparse' | 'moderate' | 'dense' | 'very_dense';
  percentage: number;
  description: string;
}

export interface WaterDetection {
  presence_percentage: number;
  classification: 'dry' | 'low_moisture' | 'moderate_moisture' | 'wet' | 'water_body';
  description: string;
}

export interface EnvironmentalImpact {
  carbon_sequestration: number;
  cooling_impact: string;
  valuation: string;
  biodiversity_index: number;
}

export interface VegetationResponse {
  valid: boolean;
  ndvi: NDVIStats;
  ndwi: NDWIStats;
  vegetation_class: VegetationClass;
  water_detection: WaterDetection;
  pixel_count: number;
  environmental_impact: EnvironmentalImpact;
  timestamp: string;
}

export interface SampleBandsStatus {
  available: boolean;
  existing: string[];
  missing: string[];
  paths: {
    red: string | null;
    nir: string | null;
    green: string | null;
  };
}

export interface RoadDensity {
  total_length_km: number;
  density_km_per_km2: number;
}

export interface ConnectivityScore {
  score: number;
  grade: 'poor' | 'fair' | 'good' | 'excellent';
  description: string;
}

export interface NetworkMetrics {
  total_nodes: number;
  total_edges: number;
  average_degree: number;
  clustering_coefficient: number;
}

export interface NearestRoadStats {
  mean_distance_m: number;
  median_distance_m: number;
  max_distance_m: number;
  percentage_within_100m: number;
}

export interface RoadAnalysisResponse {
  valid: boolean;
  road_density: RoadDensity;
  connectivity_score: ConnectivityScore;
  network_metrics: NetworkMetrics;
  nearest_road_stats: NearestRoadStats;
  area_sq_km: number;
  timestamp: string;
}

export interface LandSuitabilityRequest {
  slope_percent: number;
  ndvi: number;
  ndwi: number;
  road_connectivity_score: number;
  amenities_score?: number;
  solar_potential?: number;
}

export interface NormalizedScores {
  slope_score: number;
  water_score: number;
  connectivity_score: number;
  vegetation_score: number;
  amenities_score?: number;
  solar_score?: number;
}

export interface SuitabilityWeights {
  slope: number;
  veg: number;
  water: number;
  road: number;
  amenity: number;
  solar: number;
}

export interface LandSuitabilityResponse {
  suitability_score: number;
  classification: 'low' | 'medium' | 'high';
  verdict?: string;
  normalized_scores: NormalizedScores;
  weights_used: SuitabilityWeights;
  ml_ready: boolean;
}

export interface ComprehensiveMetrics {
  slope: {
    mean_degrees: number;
    score: number;
    classification: string;
  };
  vegetation: {
    ndvi: number;
    ndwi: number;
    score: number;
  };
  flood: {
    risk_level: string;
    risk_percentage: number;
    score: number;
  };
  roads: {
    connectivity_score: number;
    road_count: number;
    density_km2: number;
  };
  amenities: {
    counts: Record<string, number>;
    score: number;
  };
  solar: {
    annual_insolation_kwh_m2: number;
    photovoltaic_suitability: string;
    optimal_tilt_deg: number;
    score: number;
  };
}

export interface ComprehensiveAnalysisResponse {
  valid: boolean;
  analysis_id: string;
  name: string | null;
  timestamp: string;
  overall_score: number;
  classification: string;
  verdict: string;
  area: AreaMeasurement;
  centroid: Centroid;
  bounding_box: BoundingBox;
  metrics: ComprehensiveMetrics;
  component_scores: Record<string, number>;
  weights_used: Record<string, number>;
  ai_insights: string[];
  ml_ready: boolean;
  urban_plan?: any; // Detailed AI-driven urban planning data
}

export interface GridCellProperties {
  cell_index: number;
  row_index: number;
  col_index: number;
  slope: number | null;
  ndvi: number | null;
  ndwi: number | null;
  distance_to_road: number | null;
  suitability_score: number | null;
  area_sq_meters: number | null;
}

export interface GridFeature {
  type: 'Feature';
  id: string;
  geometry: GeoJSONPolygon;
  properties: GridCellProperties;
}

export interface GridFeatureCollection {
  type: 'FeatureCollection';
  features: GridFeature[];
}

export interface GridAnalysisResponse {
  grid_analysis_id: string;
  name: string | null;
  cell_size_meters: number;
  total_cells: number;
  cells: GridFeatureCollection;
}

export interface FloodRiskResponse {
  valid: boolean;
  flood_risk: {
    risk_level: string;
    low_elevation_percentage: number;
    min_elevation_m: number;
    max_elevation_m: number;
    flood_threshold_m: number;
  };
  threshold_m: number;
  data_source: string;
  timestamp: string;
}

export interface SolarPotentialResponse {
  valid: boolean;
  metrics: {
    annual_insolation_kwh_m2: number;
    daily_peak_w_m2: number;
    optimal_tilt_deg: number;
    photovoltaic_suitability: string;
  };
  ai_insight: string;
  timestamp: string;
}

export interface AmenitiesResponse {
  valid: boolean;
  counts: {
    healthcare: number;
    education: number;
    transit: number;
    retail: number;
  };
  accessibility_score: number;
  radius_km: number;
  ai_insight: string;
  timestamp: string;
}

export interface ViewshedResponse {
  valid: boolean;
  viewshed: {
    visible_cells: number;
    total_cells: number;
    visibility_percentage: number;
    observer_height_m: number;
    max_distance_m: number;
  };
  data_source: string;
  timestamp: string;
}

export interface EconomicResponse {
  valid: boolean;
  economics: {
    estimated_market_value: string;
    annual_tax_revenue: string;
    infrastructure_cost: string;
    projected_roi: string;
    ai_verdict: string;
  };
  parameters: {
    base_rate_sqm: number;
    land_use: string;
    region_multiplier: number;
  };
  timestamp: string;
}

export interface WastelandCandidate {
  id: string;
  center: { lat: number; lng: number };
  area_sqm: number;
  suitability_index: number;
  land_use_tag: string;
  technical_description: string;
}

export interface WastelandDetectionResponse {
  valid: boolean;
  count: number;
  candidates: WastelandCandidate[];
  search_radius_km: number;
  timestamp: string;
}

export interface ExportResponse {
  success: boolean;
  data: string;
  format: string;
  timestamp: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    console.log('[ApiClient] Initialized with base URL:', baseUrl);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[ApiClient] Request: ${options.method || 'GET'} ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ApiClient] Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`[ApiClient] Response from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiClient] Request failed for ${url}:`, error);
      throw error;
    }
  }

  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  async comprehensiveAnalysis(
    geojson: GeoJSONPolygon,
    name?: string,
    population: number = 50000,
    density: string = 'medium'
  ): Promise<ComprehensiveAnalysisResponse> {
    return this.request<ComprehensiveAnalysisResponse>('/api/v1/comprehensive-analysis', {
      method: 'POST',
      body: JSON.stringify({
        geojson,
        name,
        population,
        density,
      }),
    });
  }

  async generateLayout(
    geojson: GeoJSONPolygon,
    urbanPlan: Record<string, any>,
    areaSqm?: number
  ): Promise<{ success: boolean; layout: { cells: string[][]; size: number; cell_width_meters: number; cell_height_meters: number; layout_stats: Record<string, number> } }> {
    return this.request('/api/v1/generate-layout', {
      method: 'POST',
      body: JSON.stringify({
        geojson,
        urban_plan: urbanPlan,
        area_sqm: areaSqm,
      }),
    });
  }

  async analyzeArea(
    geojson: GeoJSONPolygon,
    name?: string,
    store: boolean = true
  ): Promise<AreaAnalysisResponse> {
    return this.request<AreaAnalysisResponse>('/api/v1/analyze-area', {
      method: 'POST',
      body: JSON.stringify({
        geojson,
        name,
        store,
      }),
    });
  }

  async analyzeSlope(
    geojson: GeoJSONPolygon,
    demSource: 'srtm' | 'sample' = 'sample',
    name?: string
  ): Promise<SlopeAnalysisResponse> {
    return this.request<SlopeAnalysisResponse>('/api/v1/analyze-slope', {
      method: 'POST',
      body: JSON.stringify({
        geojson,
        dem_source: demSource,
        name,
      }),
    });
  }

  async analyzeVegetation(
    redPath: string,
    nirPath: string,
    greenPath: string,
    polygon?: GeoJSONPolygon
  ): Promise<VegetationResponse> {
    return this.request<VegetationResponse>('/api/v1/analyze-vegetation', {
      method: 'POST',
      body: JSON.stringify({
        red: redPath,
        nir: nirPath,
        green: greenPath,
        polygon: polygon || null,
      }),
    });
  }

  async generateSampleBands(polygon?: GeoJSONPolygon): Promise<{ success: boolean; paths: { red: string; nir: string; green: string } }> {
    return this.request<{ success: boolean; paths: { red: string; nir: string; green: string } }>('/api/v1/generate-sample-bands', {
      method: 'POST',
      body: JSON.stringify(polygon || {}),
    });
  }

  async getSampleBandsStatus(): Promise<SampleBandsStatus> {
    return this.request<SampleBandsStatus>('/api/v1/sample-bands-status');
  }

  async analyzeRoadConnectivity(
    polygon: GeoJSONPolygon,
    networkType: 'all' | 'drive' | 'walk' | 'bike' = 'drive'
  ): Promise<RoadAnalysisResponse> {
    return this.request<RoadAnalysisResponse>('/api/v1/analyze-road-connectivity', {
      method: 'POST',
      body: JSON.stringify({
        polygon,
        network_type: networkType,
      }),
    });
  }

  async analyzeSuitability(
    request: LandSuitabilityRequest
  ): Promise<LandSuitabilityResponse> {
    return this.request<LandSuitabilityResponse>('/api/v1/analyze-suitability', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateGrid(
    geojson: GeoJSONPolygon,
    name?: string,
    cellSize: number = 50
  ): Promise<GridAnalysisResponse> {
    return this.request<GridAnalysisResponse>('/api/v1/generate-grid', {
      method: 'POST',
      body: JSON.stringify({
        geojson,
        name,
        cell_size: cellSize,
      }),
    });
  }

  async getGrid(gridId: string): Promise<GridAnalysisResponse> {
    return this.request<GridAnalysisResponse>(`/api/v1/grid/${gridId}`);
  }

  async analyzeFloodRisk(
    geojson: GeoJSONPolygon,
    floodThreshold: number = 1.0
  ): Promise<FloodRiskResponse> {
    return this.request<FloodRiskResponse>('/api/v1/analyze-flood-risk', {
      method: 'POST',
      body: JSON.stringify({
        geojson,
        flood_threshold: floodThreshold,
      }),
    });
  }

  async analyzeSolarPotential(
    latitude: number,
    longitude: number,
    slopePercent: number
  ): Promise<SolarPotentialResponse> {
    return this.request<SolarPotentialResponse>('/api/v1/analyze-solar-potential', {
      method: 'POST',
      body: JSON.stringify({
        latitude,
        longitude,
        slope_percent: slopePercent,
      }),
    });
  }

  async analyzeAmenities(geojson: GeoJSONPolygon): Promise<AmenitiesResponse> {
    return this.request<AmenitiesResponse>('/api/v1/analyze-amenities', {
      method: 'POST',
      body: JSON.stringify({ geojson }),
    });
  }

  async analyzeViewshed(
    observerLatitude: number,
    observerLongitude: number,
    observerHeight: number = 10.0,
    maxDistance: number = 5000.0
  ): Promise<ViewshedResponse> {
    return this.request<ViewshedResponse>('/api/v1/analyze-viewshed', {
      method: 'POST',
      body: JSON.stringify({
        observer_latitude: observerLatitude,
        observer_longitude: observerLongitude,
        observer_height: observerHeight,
        max_distance: maxDistance,
      }),
    });
  }

  async exportData(
    data: Record<string, unknown>,
    format: string = 'geojson'
  ): Promise<ExportResponse> {
    return this.request<ExportResponse>('/api/v1/export-data', {
      method: 'POST',
      body: JSON.stringify({
        data,
        format,
      }),
    });
  }

  async analyzeEconomics(
    areaSqm: number,
    suitabilityScore: number,
    landUse: string = 'residential'
  ): Promise<EconomicResponse> {
    return this.request<EconomicResponse>('/api/v1/analyze-economics', {
      method: 'POST',
      body: JSON.stringify({
        area_sqm: areaSqm,
        suitability_score: suitabilityScore,
        land_use: landUse,
      }),
    });
  }

  async detectWasteland(
    lat: number,
    lng: number,
    radiusKm: number = 2.0
  ): Promise<WastelandDetectionResponse> {
    return this.request<WastelandDetectionResponse>(`/api/v1/detect-wasteland?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
  }

  async generateAIPlan(
    analysisData: Record<string, any>,
    density: string,
    population: number
  ): Promise<any> {
    return this.request<any>('/api/v1/generate-ai-plan', {
      method: 'POST',
      body: JSON.stringify({
        analysis_data: analysisData,
        density,
        population,
      }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
