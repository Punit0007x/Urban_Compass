import { create } from 'zustand';
import type { GeoJSONPolygon } from '@/services/api';
import type { PanelType } from '@/components/MainNavigation';

interface LayerVisibility {
  buildings: boolean;
  googleLabels: boolean;
}

interface AppState {
  layers: LayerVisibility;
  setLayers: (layers: LayerVisibility) => void;
  toggleLayer: (key: keyof LayerVisibility) => void;

  translucency: number;
  setTranslucency: (val: number) => void;

  terrainExaggeration: number;
  setTerrainExaggeration: (val: number) => void;

  isNightMode: boolean;
  setIsNightMode: (val: boolean) => void;

  activePanel: PanelType | null;
  setActivePanel: (panel: PanelType | null) => void;

  currentPolygon: GeoJSONPolygon | null;
  setCurrentPolygon: (polygon: GeoJSONPolygon | null) => void;

  centerLat: number;
  centerLng: number;
  setCenter: (lat: number, lng: number) => void;

  autoZoom: boolean;
  setAutoZoom: (val: boolean) => void;

  activeBuilderTool: string | null;
  setActiveBuilderTool: (tool: string | null) => void;

  isAreaLocked: boolean;
  setIsAreaLocked: (val: boolean) => void;

  isViewerReady: boolean;
  setIsViewerReady: (val: boolean) => void;

  // Analysis Persistence
  analysisData: any | null;
  setAnalysisData: (data: any | null) => void;
  aiUrbanPlan: any | null;
  setAiUrbanPlan: (plan: any | null) => void;
  
  // Per-step analysis results persistence
  analysisResults: {
    area?: any;
    slope?: any;
    vegetation?: any;
    road?: any;
    amenities?: any;
    solar?: any;
    suitability?: any;
    economics?: any;
  };
  setStepResult: (step: string, result: any) => void;
  clearAnalysis: () => void;

  // Interactive City Builder State
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  
  interactionMode: 'view' | 'place' | 'move' | 'delete';
  setInteractionMode: (mode: 'view' | 'place' | 'move' | 'delete') => void;
  
  selectedBuildingModel: string | null; // e.g. 'House1.glb'
  setSelectedBuildingModel: (model: string | null) => void;
  
  placedBuildings: any[]; // { id, model, lng, lat, rotation, scale }
  setPlacedBuildings: (buildings: any[]) => void;
  addPlacedBuilding: (building: any) => void;
  updatePlacedBuilding: (id: string, updates: any) => void;
  removePlacedBuilding: (id: string) => void;
  clearPlacedBuildings: () => void;
  
  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  layers: {
    buildings: true,
    googleLabels: true,
  },
  setLayers: (layers) => set({ layers }),
  toggleLayer: (key) => set((state) => ({ layers: { ...state.layers, [key]: !state.layers[key] } })),

  translucency: 0.5,
  setTranslucency: (translucency) => set({ translucency }),

  terrainExaggeration: 1.0,
  setTerrainExaggeration: (terrainExaggeration) => set({ terrainExaggeration }),

  isNightMode: false,
  setIsNightMode: (isNightMode) => set({ isNightMode }),

  activePanel: null,
  setActivePanel: (activePanel) => set({ activePanel }),

  currentPolygon: null,
  setCurrentPolygon: (currentPolygon) => set((state) => ({ 
    currentPolygon, 
    analysisResults: {}, 
    analysisData: null, 
    aiUrbanPlan: null 
  })),

  centerLat: 13.0035,
  centerLng: 77.5713,
  setCenter: (centerLat, centerLng) => set({ centerLat, centerLng }),

  autoZoom: false,
  setAutoZoom: (autoZoom) => set({ autoZoom }),

  activeBuilderTool: null,
  setActiveBuilderTool: (activeBuilderTool) => set({ activeBuilderTool }),

  isAreaLocked: false,
  setIsAreaLocked: (isAreaLocked) => set({ isAreaLocked }),

  isViewerReady: false,
  setIsViewerReady: (isViewerReady) => set({ isViewerReady }),

  analysisData: null,
  setAnalysisData: (analysisData) => set({ analysisData }),
  aiUrbanPlan: null,
  setAiUrbanPlan: (aiUrbanPlan) => set({ aiUrbanPlan }),
  setStepResult: (step, result) => set((state) => ({ analysisResults: { ...state.analysisResults, [step]: result } })),
  clearAnalysis: () => set({ analysisResults: {}, analysisData: null, aiUrbanPlan: null }),

  // Interactive City Builder State
  isEditMode: false,
  setIsEditMode: (isEditMode) => set({ isEditMode }),
  
  interactionMode: 'view',
  setInteractionMode: (interactionMode) => set({ interactionMode }),
  
  selectedBuildingModel: null,
  setSelectedBuildingModel: (selectedBuildingModel) => set({ selectedBuildingModel }),
  
  placedBuildings: [],
  setPlacedBuildings: (placedBuildings) => set({ placedBuildings }),
  addPlacedBuilding: (building) => set((state) => ({ placedBuildings: [...state.placedBuildings, building] })),
  updatePlacedBuilding: (id, updates) => set((state) => ({
    placedBuildings: state.placedBuildings.map(b => b.id === id ? { ...b, ...updates } : b)
  })),
  removePlacedBuilding: (id) => set((state) => ({
    placedBuildings: state.placedBuildings.filter(b => b.id !== id)
  })),
  clearPlacedBuildings: () => set({ placedBuildings: [] }),
  
  selectedBuildingId: null,
  setSelectedBuildingId: (selectedBuildingId) => set({ selectedBuildingId }),
}));
