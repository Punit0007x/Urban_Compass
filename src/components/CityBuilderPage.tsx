import { useState, useCallback, useEffect } from 'react';
import {
  X, Building2, Trees, Zap, Route, Home, Factory,
  School, Hospital, ShoppingBag, Loader2, Play, RotateCcw,
  ChevronRight, Users, TrendingUp, Activity, Leaf,
  Droplets, Mountain, CheckCircle2, AlertCircle, Sparkles, Menu,
  Car, Lightbulb, ParkingCircle, Landmark, LucideIcon, Gauge, Droplet, Zap as Power,
  Lightbulb as SolarIcon, Droplet as WaterIcon, Wind, TrendingDown, MapPin, Wifi, WifiOff, Database
} from 'lucide-react';
import type { GeoJSONPolygon, ComprehensiveAnalysisResponse } from '@/services/api';
import { apiClient } from '@/services/api';
import { generateAIUrbanPlan, type AIUrbanPlan } from '@/lib/ai-city-planner';
import { useHealthCheck } from '@/services/hooks';
import { useAppStore } from '@/store';
import { Trash2, MousePointer2, Move } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type ToolCategory = 'zone' | 'road' | 'utilities' | 'nature' | 'civic';
type ZoneType = 'residential' | 'commercial' | 'industrial' | 'mixed' | 'none';
type DensityMode = 'low' | 'medium' | 'high';

interface CityStats {
  population: number;
  happiness: number;
  budget: number;
  pollution: number;
  employment: number;
  greenCoverage: number;
}

interface CityBuilderPageProps {
  polygon: GeoJSONPolygon | null;
  polygonLat?: number;
  polygonLng?: number;
  suitabilityScore: number;
  ndvi: number;
  ndwi: number;
  onFlyTo?: (lat: number, lng: number, alt?: number) => void;
  onGenerateCity: (config: Record<string, unknown>) => void;
  onClose: () => void;
  onSelectArea?: () => void;
}

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOL_CATEGORIES = [
  { id: 'zone' as ToolCategory, label: 'Zones', icon: Building2, color: '#a855f7' },
  { id: 'road' as ToolCategory, label: 'Roads', icon: Route, color: '#f59e0b' },
  { id: 'utilities' as ToolCategory, label: 'Utilities', icon: Zap, color: '#3b82f6' },
  { id: 'nature' as ToolCategory, label: 'Nature', icon: Trees, color: '#22c55e' },
  { id: 'civic' as ToolCategory, label: 'Civic', icon: Landmark, color: '#ec4899' },
];

const ZONE_TOOLS = [
  { id: 'residential', label: 'Residential', icon: Home, color: '#22c55e', desc: 'Houses & apartments' },
  { id: 'commercial', label: 'Commercial', icon: ShoppingBag, color: '#3b82f6', desc: 'Shops & offices' },
  { id: 'industrial', label: 'Industrial', icon: Factory, color: '#f59e0b', desc: 'Factories & warehouses' },
  { id: 'mixed', label: 'Mixed Use', icon: Building2, color: '#a855f7', desc: 'Live-work spaces' },
];

const ROAD_TOOLS = [
  { id: 'highway', label: 'Highway', icon: Route, color: '#ef4444', desc: 'Major arterial road' },
  { id: 'main_road', label: 'Main Road', icon: Car, color: '#f59e0b', desc: 'City main road' },
  { id: 'local', label: 'Local Street', icon: Route, color: '#6b7280', desc: 'Neighbourhood street' },
  { id: 'pedestrian', label: 'Pedestrian', icon: Users, color: '#22c55e', desc: 'Walkways & paths' },
];

const UTILITY_TOOLS = [
  { id: 'power', label: 'Power Grid', icon: Zap, color: '#f59e0b', desc: 'Electrical infrastructure' },
  { id: 'water', label: 'Water Pipe', icon: Droplets, color: '#3b82f6', desc: 'Water supply & sewage' },
  { id: 'lighting', label: 'Street Lights', icon: Lightbulb, color: '#fde68a', desc: 'Public lighting' },
  { id: 'parking', label: 'Parking', icon: ParkingCircle, color: '#6b7280', desc: 'Car parks' },
];

const NATURE_TOOLS = [
  { id: 'park', label: 'Park', icon: Trees, color: '#22c55e', desc: 'Urban green space' },
  { id: 'forest', label: 'Forest Belt', icon: Trees, color: '#166534', desc: 'Tree plantation' },
  { id: 'lake', label: 'Water Body', icon: Droplets, color: '#0ea5e9', desc: 'Lake or pond' },
  { id: 'garden', label: 'Garden', icon: Leaf, color: '#4ade80', desc: 'Botanical garden' },
];

const CIVIC_TOOLS = [
  { id: 'school', label: 'School', icon: School, color: '#f59e0b', desc: 'Primary & secondary' },
  { id: 'hospital', label: 'Hospital', icon: Hospital, color: '#ef4444', desc: 'Healthcare center' },
  { id: 'police', label: 'Police Stn', icon: Landmark, color: '#3b82f6', desc: 'Law enforcement' },
  { id: 'fire', label: 'Fire Stn', icon: Activity, color: '#ef4444', desc: 'Emergency services' },
];

const TOOLS_BY_CATEGORY: Record<ToolCategory, typeof ZONE_TOOLS> = {
  zone: ZONE_TOOLS,
  road: ROAD_TOOLS,
  utilities: UTILITY_TOOLS,
  nature: NATURE_TOOLS,
  civic: CIVIC_TOOLS,
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatBadge = ({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: LucideIcon }) => (
  <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{label}</span>
    </div>
    <span className="text-lg font-black text-white">{value}</span>
  </div>
);

const MiniBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-[10px] text-white/40">{label}</span>
      <span className="text-[10px] font-bold text-white">{Math.round(value * 100)}%</span>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value * 100}%`, background: color }} />
    </div>
  </div>
);

const PhaseTimeline = ({ aiPlan }: { aiPlan: AIUrbanPlan }) => {
  const phases = [
    { id: 1, name: 'Infrastructure', icon: Route, desc: 'Roads & utilities', duration: 'Year 1-2', color: '#3b82f6' },
    { id: 2, name: 'Residential', icon: Home, desc: 'Housing zones', duration: 'Year 2-4', color: '#22c55e' },
    { id: 3, name: 'Commercial', icon: ShoppingBag, desc: 'Business districts', duration: 'Year 3-5', color: '#f59e0b' },
    { id: 4, name: 'Civic Services', icon: Landmark, desc: 'Schools & hospitals', duration: 'Year 4-6', color: '#8b5cf6' },
    { id: 5, name: 'Build-out', icon: Building2, desc: 'Full development', duration: 'Year 5-7', color: '#06b6d4' },
  ];
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <Route className="w-4 h-4 text-blue-400"/> Development Timeline
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
        <div className="space-y-4">
          {phases.map((phase, idx) => {
            const isComplete = idx < 2;
            const isCurrent = idx === 2;
            return (
              <div key={phase.id} className="flex items-center gap-3 relative">
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isComplete ? 'bg-emerald-500/20 border-emerald-500' : isCurrent ? 'bg-blue-500/20 border-blue-500 animate-pulse' : 'bg-white/5 border-white/20'
                }`}>
                  <phase.icon className={`w-4 h-4 ${isComplete ? 'text-emerald-400' : isCurrent ? 'text-blue-400' : 'text-white/30'}`} />
                </div>
                <div className={`flex-1 p-3 rounded-xl border ${
                  isComplete ? 'bg-emerald-500/10 border-emerald-500/30' : isCurrent ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-sm font-bold ${isComplete ? 'text-emerald-400' : isCurrent ? 'text-blue-400' : 'text-white/60'}`}>{phase.name}</span>
                      <p className="text-[10px] text-white/40">{phase.desc}</p>
                    </div>
                    <span className={`text-[10px] font-bold ${isComplete ? 'text-emerald-400/70' : isCurrent ? 'text-blue-400/70' : 'text-white/30'}`}>{phase.duration}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const CityBuilderPage = ({
  polygon,
  polygonLat,
  polygonLng,
  suitabilityScore,
  ndvi,
  ndwi,
  onFlyTo,
  onGenerateCity,
  onClose,
  onSelectArea,
}: CityBuilderPageProps) => {
  // Fly to polygon when this component mounts
  useEffect(() => {
    if (polygon && onFlyTo && polygonLat !== undefined && polygonLng !== undefined) {
      // Calculate appropriate altitude based on polygon size
      const area = getPolygonArea();
      // Use fixed reasonable altitude to avoid zooming in too close
      const altitude = area && area > 100000 ? Math.max(800, Math.min(2000, Math.sqrt(area) * 0.3)) : 1500;
      onFlyTo(polygonLat, polygonLng, altitude);
    }
  }, [polygon, polygonLat, polygonLng, onFlyTo]);

  const getPolygonArea = () => {
    if (!polygon?.coordinates?.[0]) return null;
    const coords = polygon.coordinates[0];
    if (coords.length < 4) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lng, lat] of coords) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    const width = (maxLng - minLng) * 111320 * Math.cos((minLat + maxLat) * Math.PI / 360);
    const height = (maxLat - minLat) * 111320;
    return Math.round(width * height);
  };
  const polygonArea = getPolygonArea();
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('zone');
  const [activeTool, setActiveTool] = useState<string>('residential');
  const tools = TOOLS_BY_CATEGORY[activeCategory];
  const [population, setPopulation] = useState(50000);
  const [density, setDensity] = useState<DensityMode>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [cityStyle, setCityStyle] = useState<'modern' | 'traditional' | 'eco' | 'industrial'>('modern');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  
  // Backend analysis data
  const { 
    polygonArea: storePolygonArea, 
    analysisData, 
    setAnalysisData,
    aiUrbanPlan, 
    setAiUrbanPlan,
    isEditMode,
    setIsEditMode,
    interactionMode,
    setInteractionMode,
    selectedBuildingModel,
    setSelectedBuildingModel,
    setPlacedBuildings,
    clearPlacedBuildings
  } = useAppStore();
  
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setInteractionMode('view');
    setSelectedBuildingModel(null);
  };
  
  // Backend connection status
  const { data: healthData } = useHealthCheck();

  // Manual Analysis Fetcher
  const handleRunAnalysis = async () => {
    if (!polygon || !polygonLat || !polygonLng) return;
    
    try {
      setLoadingAnalysis(true);
      const response = await apiClient.comprehensiveAnalysis(polygon, undefined, population, density);
      
      if (response.valid) {
        setAnalysisData(response);
        if (response.urban_plan) {
          setAiUrbanPlan(response.urban_plan);
        } else {
          const fallbackPlan = generateAIUrbanPlan(response, density, population);
          setAiUrbanPlan(fallbackPlan);
        }
      }
    } catch (error) {
      console.error('Failed to run analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Manual Analysis Trigger (Re-run if needed)
  const triggerAnalysis = useCallback(() => {
    handleRunAnalysis();
  }, [polygon, polygonLat, polygonLng, population, density]);

  // EFFECT: Automatically adjust camera to show the selected area exactly when tab opens
  useEffect(() => {
    if (polygon && polygonLat && polygonLng && onFlyTo) {
      // Small timeout to ensure the viewer is ready for the transition
      const timer = setTimeout(() => {
        onFlyTo(polygonLat, polygonLng, 1500); // 1500m is a good default altitude for clear visibility
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [polygonLat, polygonLng, onFlyTo]);

  // Use AI urban plan data for infrastructure estimates
  const infrastructureEstimates = aiUrbanPlan ? {
    houses: aiUrbanPlan.buildings.residential_units,
    commercial: aiUrbanPlan.buildings.commercial_spaces,
    industrial: aiUrbanPlan.buildings.industrial_units,
    schools: aiUrbanPlan.buildings.schools_needed,
    hospitals: aiUrbanPlan.buildings.hospitals_needed,
    police: aiUrbanPlan.buildings.police_stations,
    fire: aiUrbanPlan.buildings.fire_stations,
    parks: aiUrbanPlan.buildings.parks_and_gardens,
    waterDaily: aiUrbanPlan.utilities.water_daily_consumption_liters,
    electricityDaily: aiUrbanPlan.utilities.electricity_daily_consumption_kwh,
    roads: aiUrbanPlan.infrastructure.total_road_length_km,
    parking: aiUrbanPlan.infrastructure.parking_spaces_needed,
    transitLines: aiUrbanPlan.infrastructure.public_transit_lines,
  } : {
    houses: Math.floor(population / 4),
    commercial: Math.floor(population / 20),
    industrial: Math.floor(population / 50),
    schools: Math.max(1, Math.floor(population / 5000)),
    hospitals: Math.max(1, Math.floor(population / 20000)),
    police: Math.max(1, Math.floor(population / 50000)),
    fire: Math.max(1, Math.floor(population / 40000)),
    parks: Math.max(2, Math.floor(population / 15000)),
    waterDaily: population * 150,
    electricityDaily: population * 12,
    roads: 0,
    parking: Math.floor(population * 0.4),
    transitLines: 0,
  };

  const handleAIGenerate = useCallback(async () => {
    if (!polygon) return;
    setIsGenerating(true);

    try {
      // Build a lightweight urban plan for the layout generator
      const plan = aiUrbanPlan || {
        zones: {
          residential_percent: 45,
          commercial_percent: 20,
          industrial_percent: 15,
          green_space_percent: 10,
          civic_percent: 10,
        },
        buildings: {
          residential_units: infrastructureEstimates.houses,
          commercial_spaces: infrastructureEstimates.commercial,
          industrial_units: infrastructureEstimates.industrial,
          schools_needed: infrastructureEstimates.schools,
          hospitals_needed: infrastructureEstimates.hospitals,
          police_stations: infrastructureEstimates.police,
          fire_stations: infrastructureEstimates.fire,
          parks_and_gardens: infrastructureEstimates.parks,
        },
      };

      // Call the AI-driven layout generator
      const res = await apiClient.generateLayout(polygon, plan, polygonArea ?? undefined);

      if (res.success && res.layout) {
        
        // --- MAP GRID TO 3D MODELS ---
        const { cells, size } = res.layout;
        const newPlacedBuildings: any[] = [];
        
        const coords = polygon.coordinates[0];
        const minLng = Math.min(...coords.map((c: number[]) => c[0]));
        const maxLng = Math.max(...coords.map((c: number[]) => c[0]));
        const minLat = Math.min(...coords.map((c: number[]) => c[1]));
        const maxLat = Math.max(...coords.map((c: number[]) => c[1]));

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const cellType = cells[y][x];
            if (cellType === 'empty' || cellType === 'road') continue;

            const cellLng = minLng + (x + 0.5) / size * (maxLng - minLng);
            const cellLat = minLat + (y + 0.5) / size * (maxLat - minLat);
            
            let modelUrl = null;
            let scale = 1.0;
            
            // Asset Mapping & Proper Scale/Alignment
            // Restrict rotation to orthogonal grid angles (0, 90, 180, 270)
            const orthogonalRotation = Math.floor(Math.random() * 4) * 90;

            switch (cellType) {
              case 'residential': 
                modelUrl = Math.random() > 0.5 ? 'House1.glb' : 'apartment.glb'; 
                scale = modelUrl === 'House1.glb' ? 0.8 : 0.6;
                break;
              case 'commercial': 
                modelUrl = 'Office.glb'; 
                scale = 0.5;
                break;
              case 'industrial': 
                modelUrl = 'factory.glb'; 
                scale = 0.4;
                break;
              case 'school': 
                modelUrl = 'School.glb'; 
                scale = 0.8;
                break;
              case 'hospital': 
                modelUrl = 'hospital/hospital.glb'; 
                scale = 0.3;
                break;
              case 'park': 
                modelUrl = 'park.glb'; 
                scale = 0.8;
                break;
            }

            if (modelUrl) {
              newPlacedBuildings.push({
                id: `bld_${Math.random().toString(36).substr(2, 9)}`,
                modelUrl,
                lng: cellLng,
                lat: cellLat,
                rotation: orthogonalRotation,
                scale
              });
            }
          }
        }
        
        setPlacedBuildings(newPlacedBuildings);

        onGenerateCity({
          population,
          density,
          polygon,
          cityStyle,
          gridData: { cells, size },
        });
        setIsGenerated(true);
      } else {
        // Fallback to procedural generation
        onGenerateCity({ population, density, polygon, cityStyle });
        setIsGenerated(true);
      }
    } catch (err) {
      console.error('Layout generation failed, using procedural fallback:', err);
      onGenerateCity({ population, density, polygon, cityStyle });
      setIsGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  }, [polygon, population, density, cityStyle, onGenerateCity, aiUrbanPlan, infrastructureEstimates, polygonArea]);

  const handleReset = useCallback(() => {
    setIsGenerated(false);
    clearPlacedBuildings();
    onGenerateCity({ reset: true, polygon });
  }, [polygon, onGenerateCity, clearPlacedBuildings]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col pointer-events-none">
      {/* ── Header Bar ── */}
      <div className="pointer-events-auto flex items-center justify-between px-5 py-3 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tight uppercase">City Builder</h1>
            <p className="text-[10px] text-white/30">SimCity-style urban planning canvas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Land status pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            suitabilityScore > 0.6
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {suitabilityScore > 0.6
              ? <><CheckCircle2 className="w-3 h-3" /> Suitable Land</>
              : <><AlertCircle className="w-3 h-3" /> Needs Work</>
            }
          </div>

          {isGenerated && (
            <>
              <button
                onClick={toggleEditMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                  isEditMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-transparent'
                }`}
              >
                <MousePointer2 className="w-3.5 h-3.5" />
                {isEditMode ? 'Editing' : 'Edit City'}
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </>
          )}

          <button
            onClick={() => setShowAIPanel(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold uppercase tracking-wider border border-purple-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Design
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main Area (transparent center, sidebars) ── */}
      <div className="flex flex-1 min-h-0">



        {/* CENTER – transparent (Cesium shows through) */}
        <div className="flex-1 relative">
          {!polygon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-950/70 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-white font-bold text-sm">No Area Selected</p>
                <p className="text-white/40 text-xs mt-1 mb-4">Use the Navigate tab to draw a zone on the map first</p>
                {onSelectArea && (
                  <button
                    onClick={onSelectArea}
                    className="pointer-events-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
                  >
                    Go to Area Selection
                  </button>
                )}
              </div>
            </div>
          )}

          {polygon && !isGenerating && (
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-emerald-500/30 pointer-events-auto">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold uppercase">Area Selected</span>
              </div>
              {polygonArea && (
                <p className="text-white/60 text-[10px]">
                  {(polygonArea / 10000).toFixed(2)} hectares • {polygonArea.toLocaleString()} m²
                </p>
              )}
            </div>
          )}

          {/* Interactive Edit Panel (Left Side) */}
          {isGenerated && isEditMode && (
            <div className="absolute top-20 left-4 pointer-events-auto z-30 flex flex-col gap-2">
              <div className="bg-slate-950/90 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-3 w-[80px]">
                
                {/* Tools */}
                <div className="flex flex-col items-center gap-1 bg-white/5 p-1 rounded-xl w-full">
                  <button onClick={() => setInteractionMode('view')} className={`w-full flex justify-center p-2 rounded-lg transition-colors ${interactionMode === 'view' ? 'bg-blue-500 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`} title="Select">
                    <MousePointer2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setInteractionMode('move')} className={`w-full flex justify-center p-2 rounded-lg transition-colors ${interactionMode === 'move' ? 'bg-blue-500 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`} title="Move">
                    <Move className="w-4 h-4" />
                  </button>
                  <button onClick={() => setInteractionMode('delete')} className={`w-full flex justify-center p-2 rounded-lg transition-colors ${interactionMode === 'delete' ? 'bg-red-500 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full h-px bg-white/10" />

                {/* Building Palette */}
                <div className="flex flex-col gap-2 w-full">
                  {[
                    { id: 'House1.glb', icon: Home, color: '#10b981', label: 'House' },
                    { id: 'apartment.glb', icon: Building2, color: '#22c55e', label: 'Apt' },
                    { id: 'Office.glb', icon: ShoppingBag, color: '#3b82f6', label: 'Office' },
                    { id: 'factory.glb', icon: Factory, color: '#f59e0b', label: 'Factory' },
                    { id: 'School.glb', icon: School, color: '#fbbf24', label: 'School' },
                    { id: 'hospital/hospital.glb', icon: Hospital, color: '#ef4444', label: 'Hospital' },
                    { id: 'park.glb', icon: Trees, color: '#4ade80', label: 'Park' },
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setInteractionMode('place'); setSelectedBuildingModel(b.id); }}
                      className={`flex flex-col items-center justify-center w-full aspect-square rounded-xl transition-all border ${interactionMode === 'place' && selectedBuildingModel === b.id ? 'bg-white/20 border-white/50 shadow-inner' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                      title={b.label}
                    >
                      <b.icon className="w-5 h-5 mb-1" style={{ color: b.color }} />
                      <span className="text-[8px] font-bold text-white/70 uppercase leading-none">{b.label}</span>
                    </button>
                  ))}
                </div>

              </div>
            </div>
          )}

          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-auto z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-purple-500/50 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-purple-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-lg">AI is building your city…</p>
                  <p className="text-white/40 text-xs mt-1">Generating roads, zones, and infrastructure</p>
                </div>
                <div className="flex gap-1.5">
                  {['Roads', 'Zones', 'Parks', 'Utilities', 'Buildings'].map((step, i) => (
                    <div key={step} className="px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-[9px] text-purple-300 font-bold uppercase animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showAIPanel && !analysisData && (
            <div className="absolute inset-4 md:inset-x-20 md:inset-y-10 bg-slate-950/95 backdrop-blur-3xl rounded-2xl border border-purple-500/30 shadow-2xl pointer-events-auto z-20 flex flex-col items-center justify-center text-center p-10">
              <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center mb-8 animate-pulse border border-indigo-500/20">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-4 uppercase">Urban Audit Required</h2>
              <p className="text-white/40 text-sm max-w-md mb-10 font-medium leading-relaxed">
                To generate a high-fidelity master plan, the AI needs to perform a comprehensive multi-spectral audit of your selected site's topography, connectivity, and environment.
              </p>
              <button 
                onClick={handleRunAnalysis}
                disabled={loadingAnalysis}
                className="group relative px-12 py-6 rounded-3xl bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl shadow-indigo-500/30 active:scale-95 disabled:opacity-50"
              >
                {loadingAnalysis ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" /> Analyzing Site...
                  </span>
                ) : "Run Full AI Master Audit"}
              </button>
              {loadingAnalysis && (
                <p className="mt-6 text-[10px] text-indigo-400/50 uppercase font-bold tracking-widest animate-bounce">
                  Accessing geospatial nodes & calculating urban parameters...
                </p>
              )}
              <button onClick={() => setShowAIPanel(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl text-white/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {showAIPanel && aiUrbanPlan && analysisData && (
            <div className="absolute inset-4 md:inset-x-20 md:inset-y-10 bg-slate-950/95 backdrop-blur-3xl rounded-2xl border border-purple-500/30 shadow-2xl pointer-events-auto z-20 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">AI Master Plan: {aiUrbanPlan.city_name}</h2>
                    <p className="text-xs text-white/50">{analysisData.verdict}</p>
                  </div>
                </div>
                <button onClick={() => setShowAIPanel(false)} className="p-2 hover:bg-white/10 rounded-xl text-white/50 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                
                {/* Strategy & AI Insights */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400"/> Overall Strategy</h3>
                  <p className="text-sm text-white/80 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">{aiUrbanPlan.overall_strategy}</p>
                  
                  {analysisData.ai_insights && analysisData.ai_insights.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-white/60 uppercase mb-2">Key Insights from Topography</h4>
                      <ul className="space-y-2">
                        {analysisData.ai_insights.map((insight: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-white/70">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Zoning Strategy */}
                  <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400"/> Zoning Distribution</h3>
                    <div className="space-y-3">
                      <MiniBar label="Residential" value={aiUrbanPlan.zones.residential_percent / 100} color="#22c55e" />
                      <MiniBar label="Commercial" value={aiUrbanPlan.zones.commercial_percent / 100} color="#3b82f6" />
                      <MiniBar label="Industrial" value={aiUrbanPlan.zones.industrial_percent / 100} color="#f59e0b" />
                      <MiniBar label="Green Space" value={aiUrbanPlan.zones.green_space_percent / 100} color="#10b981" />
                      <MiniBar label="Civic & Public" value={aiUrbanPlan.zones.civic_percent / 100} color="#8b5cf6" />
                    </div>
                  </div>

                  {/* Environmental Plan */}
                  <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2"><Leaf className="w-4 h-4 text-emerald-400"/> Environmental Strategy</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-white/40 uppercase mb-1">Preservation Approach</p>
                        <p className="text-sm text-white/80">{aiUrbanPlan.environmental.vegetation_preservation_strategy}</p>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-white/70">Flood Mitigation</span>
                        </div>
                        <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${aiUrbanPlan.environmental.flood_mitigation_priority === 'high' ? 'bg-red-500/20 text-red-400' : aiUrbanPlan.environmental.flood_mitigation_priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {aiUrbanPlan.environmental.flood_mitigation_priority} Priority
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <SolarIcon className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-white/70">Solar Potential</span>
                        </div>
                        <span className="text-sm font-bold text-yellow-400">
                          {(aiUrbanPlan.environmental.solar_potential_kwh_daily / 1000).toFixed(1)}M kWh/day
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Economics & Demographics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500/10 to-transparent p-4 rounded-xl border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white/60 uppercase">Optimal Population</span>
                    </div>
                    <p className="text-2xl font-black text-white">{aiUrbanPlan.population_capacity.toLocaleString()}</p>
                    <p className="text-xs text-blue-300 mt-1">{aiUrbanPlan.population_density_per_sqkm.toLocaleString()} per km²</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500/10 to-transparent p-4 rounded-xl border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Landmark className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white/60 uppercase">Est. Cost</span>
                    </div>
                    <p className="text-2xl font-black text-white">₹{aiUrbanPlan.economics.estimated_construction_cost_inr_crore} Cr</p>
                    <p className="text-xs text-amber-300 mt-1">Infrastructure Setup</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-500/10 to-transparent p-4 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white/60 uppercase">Expected ROI</span>
                    </div>
                    <p className="text-2xl font-black text-white">{aiUrbanPlan.economics.expected_roi_percent}%</p>
                    <p className="text-xs text-emerald-300 mt-1">₹{aiUrbanPlan.economics.annual_tax_revenue_inr_crore} Cr Annual Rev</p>
                  </div>
                </div>

                {/* Development Timeline */}
                <PhaseTimeline aiPlan={aiUrbanPlan} />

              </div>
              <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
                <button
                  onClick={() => {
                    setPopulation(aiUrbanPlan.population_estimate);
                    setShowAIPanel(false);
                    handleAIGenerate();
                  }}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Apply Plan to City Builder
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Right Panel Button */}
        <button
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className={`pointer-events-auto absolute top-4 z-50 p-3 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-black/50 ${isRightPanelOpen ? 'right-[296px]' : 'right-4'}`}
        >
          {isRightPanelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* RIGHT PANEL */}
        <div 
          className={`pointer-events-auto flex flex-col bg-slate-950/80 backdrop-blur-2xl border-l border-white/5 overflow-y-auto no-scrollbar transition-all duration-300 ${isRightPanelOpen ? 'w-[280px] opacity-100' : 'w-0 opacity-0 border-none'}`}
        >
          
          {/* City Stats */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">City Dashboard</p>
              {loadingAnalysis && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatBadge 
                label="Pop" 
                value={
                  aiUrbanPlan?.population_estimate !== undefined
                    ? aiUrbanPlan.population_estimate >= 1000 
                      ? `${(aiUrbanPlan.population_estimate/1000).toFixed(1)}K`
                      : String(aiUrbanPlan.population_estimate)
                    : population >= 1000 ? `${(population/1000).toFixed(0)}K` : String(population || 0)
                } 
                color="#a855f7" 
                icon={Users} 
              />
              <StatBadge 
                label="Happy" 
                value={
                  aiUrbanPlan ? `${Math.round(60 + (aiUrbanPlan.overall_score * 40))}%` : `${Math.round(60 + (suitabilityScore * 30))}%`
                } 
                color="#22c55e" 
                icon={TrendingUp} 
              />
              <StatBadge 
                label="Budget" 
                value={
                  aiUrbanPlan
                    ? `₹${aiUrbanPlan.economics.estimated_construction_cost_inr_crore || (aiUrbanPlan.economics.total_infrastructure_cost_usd * 83 / 10000000).toFixed(1)} Cr`
                    : `₹${(850000 * 83 / 10000000).toFixed(1)} Cr`
                } 
                color="#3b82f6" 
                icon={TrendingUp} 
              />
              <StatBadge 
                label="Green" 
                value={
                  analysisData?.metrics?.vegetation?.ndvi
                    ? `${Math.round(analysisData.metrics.vegetation.ndvi * 100)}%`
                    : `${Math.round(ndvi * 100)}%`
                } 
                color="#22c55e" 
                icon={Trees} 
              />
            </div>
          </div>

          {/* Land Analysis */}
          <div className="p-4 border-b border-white/5 space-y-3">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Land Analysis</p>
            <MiniBar label="Suitability" value={analysisData?.overall_score ?? suitabilityScore} color="#a855f7" />
            <MiniBar label="Vegetation (NDVI)" value={analysisData?.metrics?.vegetation?.ndvi ?? ndvi} color="#22c55e" />
            <MiniBar label="Water (NDWI)" value={analysisData?.metrics?.vegetation?.ndwi ?? ndwi} color="#3b82f6" />
          </div>

          {/* Infrastructure forecast */}
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Infrastructure Needs</p>
            <div className="space-y-1.5">
              {[
                { icon: Home, label: 'Residential', val: infrastructureEstimates.houses.toLocaleString(), color: '#22c55e' },
                { icon: Building2, label: 'Commercial', val: infrastructureEstimates.commercial.toLocaleString(), color: '#3b82f6' },
                { icon: Factory, label: 'Industrial', val: infrastructureEstimates.industrial.toLocaleString(), color: '#f59e0b' },
                { icon: School, label: 'Schools', val: String(infrastructureEstimates.schools), color: '#8b5cf6' },
                { icon: Hospital, label: 'Hospitals', val: String(infrastructureEstimates.hospitals), color: '#ef4444' },
                { icon: Activity, label: 'Police', val: String(infrastructureEstimates.police), color: '#06b6d4' },
                { icon: AlertCircle, label: 'Fire Stns', val: String(infrastructureEstimates.fire), color: '#f97316' },
                { icon: Trees, label: 'Parks', val: String(infrastructureEstimates.parks), color: '#4ade80' },
              ].map(({ icon: Icon, label, val, color }) => (
                <div key={label} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-[11px] text-white/50">{label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-white">{val}</span>
                </div>
              ))}
            </div>
            
            {/* Utilities Section */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[9px] font-bold text-white/40 uppercase mb-2">Daily Utilities</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] text-white/60">Water</span>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-300">
                    {aiUrbanPlan 
                      ? aiUrbanPlan.utilities.water_daily_consumption_liters >= 1000000 
                        ? `${(aiUrbanPlan.utilities.water_daily_consumption_liters / 1000000).toFixed(1)}M L`
                        : `${(aiUrbanPlan.utilities.water_daily_consumption_liters / 1000).toFixed(1)}K L`
                      : `${(infrastructureEstimates.waterDaily / 1000000).toFixed(1)}M L`}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2">
                    <Power className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] text-white/60">Electricity</span>
                  </div>
                  <span className="text-[10px] font-bold text-yellow-300">
                    {aiUrbanPlan 
                      ? aiUrbanPlan.utilities.electricity_daily_consumption_kwh >= 1000000
                        ? `${(aiUrbanPlan.utilities.electricity_daily_consumption_kwh / 1000000).toFixed(1)}M kWh`
                        : `${(aiUrbanPlan.utilities.electricity_daily_consumption_kwh / 1000).toFixed(0)}K kWh`
                      : `${(infrastructureEstimates.electricityDaily / 1000).toFixed(0)}K kWh`}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center gap-2">
                    <Route className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-[10px] text-white/60">Roads</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-300">
                    {infrastructureEstimates.roads.toFixed(1)} km
                  </span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <ParkingCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] text-white/60">Parking</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-300">
                    {infrastructureEstimates.parking.toLocaleString()} spaces
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Population Slider */}
          <div className="p-4 border-b border-white/5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Target Population</p>
              <span className="text-[11px] font-bold text-purple-400">{(population/1000).toFixed(0)}K</span>
            </div>
            <input
              type="range" min={1000} max={500000} step={1000}
              value={population}
              onChange={e => setPopulation(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #a855f7 ${(population/500000)*100}%, rgba(255,255,255,0.08) ${(population/500000)*100}%)` }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-white/20">1K</span>
              <span className="text-[9px] text-white/20">500K</span>
            </div>
          </div>

          {/* Density */}
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Density Profile</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['low', 'medium', 'high'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    density === d
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                      : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white/60'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* City Style */}
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest pt-1">City Style</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['modern', 'traditional', 'eco', 'industrial'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setCityStyle(s)}
                  className={`py-1.5 rounded-xl text-[10px] font-bold capitalize tracking-wide transition-all border ${
                    cityStyle === s
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleAIGenerate}
              disabled={isGenerating || !polygon}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-40 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 mt-1"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Building City…</>
              ) : isGenerated ? (
                <><RotateCcw className="w-4 h-4" /> Regenerate</>
              ) : (
                <><Sparkles className="w-4 h-4" /> AI Generate City</>
              )}
            </button>

            {!polygon && (
              <p className="text-[9px] text-amber-400/70 text-center">Draw an area first using Navigate tab</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Status Bar ── */}
      <div className="pointer-events-auto flex items-center justify-between px-5 py-2 bg-slate-950/90 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-white/30 uppercase tracking-widest">3D Canvas Active</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-[10px] text-white/20 uppercase">Tool: <span className="text-white/50 font-bold">{tools.find(t => t.id === activeTool)?.label}</span></span>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-[10px] text-white/20 uppercase">Density: <span className="text-white/50 font-bold capitalize">{density}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/20 uppercase">Suitability</span>
          <span className={`text-[10px] font-bold ${suitabilityScore > 0.6 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {(suitabilityScore * 100).toFixed(0)}%
          </span>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-[10px] text-white/20 uppercase">NDVI</span>
          <span className="text-[10px] font-bold text-green-400">{(ndvi * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};

export default CityBuilderPage;
