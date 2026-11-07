import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  apiClient, 
  GeoJSONPolygon, 
  SampleBandsStatus, 
  LandSuitabilityRequest, 
  GridAnalysisResponse, 
  AreaAnalysisResponse,
  SlopeAnalysisResponse,
  VegetationResponse,
  RoadAnalysisResponse,
  LandSuitabilityResponse,
  AmenitiesResponse,
  SolarPotentialResponse,
  EconomicResponse,
  WastelandDetectionResponse
} from './api';

export const apiKeys = {
  health: ['health'] as const,
  areaAnalysis: (geojson: GeoJSONPolygon) => ['areaAnalysis', geojson] as const,
  slopeAnalysis: (geojson: GeoJSONPolygon) => ['slopeAnalysis', geojson] as const,
  vegetationAnalysis: () => ['vegetationAnalysis'] as const,
  sampleBandsStatus: () => ['sampleBandsStatus'] as const,
};

export function useHealthCheck() {
  return useQuery({
    queryKey: apiKeys.health,
    queryFn: () => apiClient.checkHealth(),
    refetchInterval: 30000,
    retry: 3,
    staleTime: 25000,
  });
}

export function useAreaAnalysis(
  geojson: GeoJSONPolygon | null,
  options?: {
    enabled?: boolean;
    onSuccess?: (data: AreaAnalysisResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: ({
      geo,
      name,
      store = true,
    }: {
      geo: GeoJSONPolygon;
      name?: string;
      store?: boolean;
    }) => apiClient.analyzeArea(geo, name, store),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useSlopeAnalysis(
  options?: {
    onSuccess?: (data: SlopeAnalysisResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: ({
      geojson,
      demSource = 'sample',
      name,
    }: {
      geojson: GeoJSONPolygon;
      demSource?: 'srtm' | 'sample';
      name?: string;
    }) => apiClient.analyzeSlope(geojson, demSource, name),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useVegetationAnalysis(
  options?: {
    onSuccess?: (data: VegetationResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: ({
      redPath,
      nirPath,
      greenPath,
      polygon,
    }: {
      redPath: string;
      nirPath: string;
      greenPath: string;
      polygon?: GeoJSONPolygon;
    }) => apiClient.analyzeVegetation(redPath, nirPath, greenPath, polygon),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useGenerateSampleBands(
  options?: {
    onSuccess?: (data: { success: boolean; paths: { red: string; nir: string; green: string } }) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: (polygon?: GeoJSONPolygon) => apiClient.generateSampleBands(polygon),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useRoadConnectivityAnalysis(
  options?: {
    onSuccess?: (data: RoadAnalysisResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: ({
      polygon,
      networkType = 'drive',
    }: {
      polygon: GeoJSONPolygon;
      networkType?: 'all' | 'drive' | 'walk' | 'bike';
    }) => apiClient.analyzeRoadConnectivity(polygon, networkType),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useSampleBandsStatus() {
  return useQuery({
    queryKey: apiKeys.sampleBandsStatus(),
    queryFn: () => apiClient.getSampleBandsStatus(),
    refetchInterval: 60000,
    retry: 3,
  });
}

export function useClearAnalysis() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.removeQueries({ queryKey: ['areaAnalysis'] });
    queryClient.removeQueries({ queryKey: ['slopeAnalysis'] });
    queryClient.removeQueries({ queryKey: ['vegetationAnalysis'] });
  };
}

export function useSuitabilityAnalysis(
  options?: {
    onSuccess?: (data: LandSuitabilityResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: (request: LandSuitabilityRequest) => apiClient.analyzeSuitability(request),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useAmenitiesAnalysis(
  options?: {
    onSuccess?: (data: AmenitiesResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: (geojson: GeoJSONPolygon) => apiClient.analyzeAmenities(geojson),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useSolarAnalysis(
  options?: {
    onSuccess?: (data: SolarPotentialResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: ({
      latitude,
      longitude,
      slopePercent
    }: {
      latitude: number;
      longitude: number;
      slopePercent: number;
    }) => apiClient.analyzeSolarPotential(latitude, longitude, slopePercent),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useGenerateGrid(
  options?: {
    onSuccess?: (data: GridAnalysisResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: ({
      geojson,
      name,
      cellSize = 50,
    }: {
      geojson: GeoJSONPolygon;
      name?: string;
      cellSize?: number;
    }) => apiClient.generateGrid(geojson, name, cellSize),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useGetGrid(
  gridId: string | null,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['grid', gridId],
    queryFn: () => apiClient.getGrid(gridId!),
    enabled: !!gridId && (options?.enabled !== false),
  });
}

export function useEconomicAnalysis(
  options?: {
    onSuccess?: (data: EconomicResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: ({
      areaSqm,
      suitabilityScore,
      landUse = 'residential'
    }: {
      areaSqm: number;
      suitabilityScore: number;
      landUse?: string;
    }) => apiClient.analyzeEconomics(areaSqm, suitabilityScore, landUse),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useWastelandDetection(
  options?: {
    onSuccess?: (data: WastelandDetectionResponse) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: ({
      lat,
      lng,
      radiusKm = 2.0
    }: {
      lat: number;
      lng: number;
      radiusKm?: number;
    }) => apiClient.detectWasteland(lat, lng, radiusKm),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
