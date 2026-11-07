import { useState, useEffect, useCallback } from 'react';
import {
  X, Grid3X3, Mountain, Leaf, Route, CheckSquare, Loader2,
  CheckCircle2, AlertCircle, Play, BarChart3, Droplets, TrendingUp, Zap,
  ChevronRight, ChevronLeft, Map as MapIcon, Layers, Ruler, 
  Search, Crosshair, Building2, School, Bus, ShoppingBag, Sun, Activity,
  Info, Share2, Download, Leaf as EcoIcon, Coins
} from 'lucide-react';
import {
  useAreaAnalysis, useSlopeAnalysis, useHealthCheck,
  useVegetationAnalysis, useGenerateSampleBands, useSampleBandsStatus,
  useRoadConnectivityAnalysis, useSuitabilityAnalysis,
  useAmenitiesAnalysis, useSolarAnalysis, useEconomicAnalysis
} from '@/services/hooks';
import type { GeoJSONPolygon } from '@/services/api';
import { useAppStore } from '@/store';
import { 
  BarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, 
  PolarAngleAxis, Radar, AreaChart, Area
} from 'recharts';

interface Props {
  polygon: GeoJSONPolygon | null;
  centerLat: number;
  centerLng: number;
  onFlyTo: (lat: number, lng: number, alt?: number) => void;
  onAnalysisComplete?: (r: { suitability: number; ndvi: number; ndwi: number }) => void;
  onClose: () => void;
}

type Step = 'area' | 'slope' | 'vegetation' | 'road' | 'amenities' | 'solar' | 'suitability' | 'economics';

const Metric = ({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon?: any }) => (
  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
    <div className="flex items-center gap-2 mb-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-white/40" />}
      <p className="text-[11px] text-white/30 uppercase font-black tracking-widest">{label}</p>
    </div>
    <p className="text-xl font-black text-white">{value}</p>
    {sub && <p className="text-[10px] text-white/20 mt-1 font-medium">{sub}</p>}
  </div>
);

const Bar = ({ label, val, color }: { label: string; val: number; color: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-end">
      <span className="text-[11px] font-bold text-white/40 uppercase tracking-tight">{label}</span>
      <span className="text-sm font-black text-white">{(val * 100).toFixed(0)}%</span>
    </div>
    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${val * 100}%`, background: color, boxShadow: `0 0 10px ${color}40` }} />
    </div>
  </div>
);

export default function AnalysisBuilderPage({ polygon, centerLat, centerLng, onFlyTo, onAnalysisComplete, onClose }: Props) {
  const [activeStep, setActiveStep] = useState<Step>('area');
  const [isOpen, setIsOpen] = useState(true);
  const [bandPaths, setBandPaths] = useState<{ red: string; nir: string; green: string } | null>(null);

  const { analysisResults, setStepResult } = useAppStore();

  const { data: health } = useHealthCheck();
  const isConnected = health?.status === 'healthy';

  const { data: bandsStatus, refetch: refetchBands } = useSampleBandsStatus();
  
  const areaMut = useAreaAnalysis(polygon, { onSuccess: (d) => setStepResult('area', d) });
  const slopeMut = useSlopeAnalysis({ onSuccess: (d) => setStepResult('slope', d) });
  const vegMut = useVegetationAnalysis({ onSuccess: (d) => setStepResult('vegetation', d) });
  const roadMut = useRoadConnectivityAnalysis({ onSuccess: (d) => setStepResult('road', d) });
  const amenitiesMut = useAmenitiesAnalysis({ onSuccess: (d) => setStepResult('amenities', d) });
  const solarMut = useSolarAnalysis({ onSuccess: (d) => setStepResult('solar', d) });
  const suitMut = useSuitabilityAnalysis({
    onSuccess: (d) => {
      setStepResult('suitability', d);
      onAnalysisComplete?.({
        suitability: d.suitability_score ?? 0,
        ndvi: vegMut.data?.ndvi.mean ?? analysisResults.vegetation?.ndvi.mean ?? 0.4,
        ndwi: vegMut.data?.ndwi.mean ?? analysisResults.vegetation?.ndwi.mean ?? 0.3,
      });
    }
  });
  const econMut = useEconomicAnalysis({ onSuccess: (d) => setStepResult('economics', d) });

  const genBands = useGenerateSampleBands({
    onSuccess: (d) => {
      setBandPaths(d.paths);
      refetchBands();
    },
  });

  useEffect(() => {
    if (bandsStatus?.available && bandsStatus.paths.red && bandsStatus.paths.nir && bandsStatus.paths.green) {
      setBandPaths({ red: bandsStatus.paths.red!, nir: bandsStatus.paths.nir!, green: bandsStatus.paths.green! });
    }
  }, [bandsStatus]);

  const runStep = useCallback(async (step: Step) => {
    if (!polygon) return;
    setActiveStep(step);
    
    try {
      if (step === 'area') await areaMut.mutateAsync({ geo: polygon, store: true });
      if (step === 'slope') await slopeMut.mutateAsync({ geojson: polygon, demSource: 'sample' });
      if (step === 'vegetation') {
        const bands = bandPaths || (await genBands.mutateAsync(polygon)).paths;
        await vegMut.mutateAsync({ redPath: bands.red, nirPath: bands.nir, greenPath: bands.green, polygon });
      }
      if (step === 'road') await roadMut.mutateAsync({ polygon });
      if (step === 'amenities') await amenitiesMut.mutateAsync(polygon);
      if (step === 'solar') {
        await solarMut.mutateAsync({ 
          latitude: centerLat, 
          longitude: centerLng, 
          slopePercent: slopeMut.data?.slope_statistics.mean || 5 
        });
      }
      if (step === 'suitability') {
        await suitMut.mutateAsync({
          slope_percent: slopeMut.data?.slope_statistics.mean ?? 5,
          ndvi: vegMut.data?.ndvi.mean ?? 0.4,
          ndwi: vegMut.data?.ndwi.mean ?? 0.0,
          road_connectivity_score: roadMut.data?.connectivity_score.score ?? 50,
          amenities_score: amenitiesMut.data?.accessibility_score ?? 50,
          solar_potential: solarMut.data?.metrics.annual_insolation_kwh_m2 ?? 1800,
        });
      }
      if (step === 'economics') {
        await econMut.mutateAsync({
          areaSqm: areaMut.data?.area.square_meters ?? 1000,
          suitabilityScore: suitMut.data?.suitability_score ?? 0.5,
          landUse: 'residential'
        });
      }
    } catch (e) {
      console.error(`Step ${step} failed`, e);
    }
  }, [polygon, bandPaths, areaMut, slopeMut, vegMut, roadMut, amenitiesMut, solarMut, suitMut, econMut, genBands, centerLat, centerLng]);

  // Data for display (either from mutation or from global store)
  const areaData = areaMut.data || analysisResults.area;
  const slopeData = slopeMut.data || analysisResults.slope;
  const vegData = vegMut.data || analysisResults.vegetation;
  const roadData = roadMut.data || analysisResults.road;
  const amenitiesData = amenitiesMut.data || analysisResults.amenities;
  const solarData = solarMut.data || analysisResults.solar;
  const suitData = suitMut.data || analysisResults.suitability;
  const econData = econMut.data || analysisResults.economics;

  useEffect(() => {
    if (polygon && onFlyTo) {
      onFlyTo(centerLat, centerLng, 1800);
    }
  }, [polygon, centerLat, centerLng, onFlyTo]);

  const fmt = (n: any, d = 2) => {
    if (n === undefined || n === null || isNaN(n)) return '---';
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  return (
    <div className={`fixed left-0 top-0 bottom-0 z-50 flex transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="w-[440px] bg-slate-900/95 backdrop-blur-2xl border-r border-white/5 flex flex-col shadow-2xl relative">
        {/* Toggle Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-24 bg-slate-900/95 backdrop-blur-2xl border-y border-r border-white/10 rounded-r-3xl flex items-center justify-center pointer-events-auto hover:bg-slate-800 transition-colors shadow-2xl"
        >
          {isOpen ? <ChevronLeft className="text-white/40" /> : <ChevronRight className="text-white/40" />}
        </button>

        {/* Header */}
        <div className="p-8 bg-slate-950/50 border-b border-white/5 pointer-events-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Urban Intel</h1>
              <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Multi-Spectral Analysis Suite</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 p-2 bg-white/5 rounded-2xl border border-white/5">
            {[
              { id: 'area', icon: Grid3X3, color: '#06b6d4' },
              { id: 'slope', icon: Mountain, color: '#f59e0b' },
              { id: 'vegetation', icon: Leaf, color: '#22c55e' },
              { id: 'road', icon: Route, color: '#f97316' },
              { id: 'amenities', icon: Building2, color: '#3b82f6' },
              { id: 'solar', icon: Sun, color: '#eab308' },
              { id: 'suitability', icon: Zap, color: '#a855f7' },
              { id: 'economics', icon: Coins, color: '#10b981' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => runStep(s.id as Step)}
                className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  activeStep === s.id 
                    ? 'bg-white text-slate-900 shadow-xl scale-110' 
                    : 'text-white/30 hover:bg-white/5'
                }`}
              >
                <s.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pointer-events-auto">
          {!polygon ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                <Crosshair className="w-10 h-10" />
              </div>
              <p className="text-lg font-bold text-white mb-2">Awaiting Selection</p>
              <p className="text-sm max-w-[200px]">Draw a polygon on the map to begin the analysis pipeline.</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Step Title */}
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                  {activeStep}
                </h2>
                <div className="h-1 w-12 bg-indigo-500 rounded-full" />
              </div>

              {/* AREA ANALYSIS */}
              {activeStep === 'area' && (
                areaData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Metric label="Acres" value={fmt(areaData.area.acres, 2)} icon={Ruler} />
                      <Metric label="Hectares" value={fmt(areaData.area.hectares, 2)} />
                      <Metric label="Perimeter" value={`${fmt(areaData.perimeter_meters, 0)}m`} />
                      <Metric label="Type" value={areaData.geometry_type} />
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-3">Bounding Box</p>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div><span className="text-white/20 mr-2">MIN</span> <span className="text-white font-mono">{areaData.bounding_box.min_longitude.toFixed(4)}, {areaData.bounding_box.min_latitude.toFixed(4)}</span></div>
                        <div><span className="text-white/20 mr-2">MAX</span> <span className="text-white font-mono">{areaData.bounding_box.max_longitude.toFixed(4)}, {areaData.bounding_box.max_latitude.toFixed(4)}</span></div>
                      </div>
                    </div>
                  </div>
                ) : <Loading step="geospatial geometry" />
              )}

              {/* TERRAIN / SLOPE */}
              {activeStep === 'slope' && (
                slopeData ? (
                  <div className="space-y-6">
                    <div className="h-48 w-full bg-white/5 rounded-2xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={Object.entries(slopeData.slope_distribution).map(([name, value]) => ({ name, value }))}>
                          <defs>
                            <linearGradient id="colorSlope" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} hide />
                          <YAxis hide />
                          <ReTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                          <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSlope)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Metric label="Mean Slope" value={`${fmt(slopeData.slope_statistics.mean, 1)}°`} />
                      <Metric label="Max Elev" value={`${fmt(slopeData.elevation_stats.max, 0)}m`} />
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[10px] font-black text-amber-400 uppercase mb-3 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" /> AI Topography Insights
                      </p>
                      <p className="text-sm text-white/80 leading-relaxed italic">"{slopeData.slope_classification.description}"</p>
                    </div>
                  </div>
                ) : <Loading step="elevation models" />
              )}

              {/* VEGETATION */}
              {activeStep === 'vegetation' && (
                vegData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Metric label="NDVI Index" value={fmt(vegData.ndvi.mean, 2)} icon={EcoIcon} />
                      <Metric label="Water Content" value={fmt(vegData.ndwi.mean, 2)} icon={Droplets} />
                    </div>

                    <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Eco-System Services</p>
                        <span className="px-2 py-1 rounded bg-emerald-500 text-[10px] font-black text-slate-900 uppercase">{vegData.vegetation_class.category}</span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/40">Carbon Sequestration</span>
                          <span className="text-white font-black">{vegData.environmental_impact.carbon_sequestration} t/yr</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/40">Microclimate Cooling</span>
                          <span className="text-white font-black">{vegData.environmental_impact.cooling_impact}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/40">Biodiversity Index</span>
                          <span className="text-white font-black">{fmt(vegData.environmental_impact.biodiversity_index, 2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/40">Ecosystem Valuation</span>
                          <span className="font-black text-emerald-400">{vegData.environmental_impact.valuation}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed px-2">"{vegData.vegetation_class.description}"</p>
                  </div>
                ) : <Loading step="multi-spectral bands" />
              )}

              {/* ROADS */}
              {activeStep === 'road' && (
                roadData ? (
                  <div className="space-y-6">
                    <div className="h-48 w-full bg-white/5 rounded-2xl p-4 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart outerRadius={60} data={[
                          { subject: 'Density', A: roadData.connectivity_score.score, fullMark: 100 },
                          { subject: 'Degree', A: roadData.network_metrics.average_degree * 25, fullMark: 100 },
                          { subject: 'Nodes', A: Math.min(100, roadData.network_metrics.total_nodes), fullMark: 100 },
                          { subject: 'Edges', A: Math.min(100, roadData.network_metrics.total_edges / 2), fullMark: 100 },
                        ]}>
                          <PolarGrid stroke="#ffffff10" />
                          <PolarAngleAxis dataKey="subject" stroke="#ffffff40" fontSize={10} />
                          <Radar name="Roads" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Metric label="Connectivity" value={`${fmt(roadData.connectivity_score.score, 1)}%`} />
                      <Metric label="Nodes" value={roadData.network_metrics.total_nodes} />
                    </div>
                    <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                      <p className="text-sm text-white/80 leading-relaxed font-medium italic">"{roadData.connectivity_score.description}"</p>
                    </div>
                  </div>
                ) : <Loading step="street network graph" />
              )}

              {/* AMENITIES */}
              {activeStep === 'amenities' && (
                amenitiesData ? (
                  <div className="space-y-6">
                    <div className="h-48 w-full bg-white/5 rounded-2xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(amenitiesData.counts).map(([name, value]) => ({ name, value }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff30" fontSize={10} />
                          <YAxis hide />
                          <ReTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                          <ReBar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Metric label="Transit Nodes" value={amenitiesData.counts.transit} icon={Bus} />
                      <Metric label="Access Score" value={`${amenitiesData.accessibility_score}/100`} />
                    </div>
                    <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" /> Urban Audit Insights
                      </p>
                      <p className="text-sm text-white/80 leading-relaxed italic">"{amenitiesData.ai_insight}"</p>
                    </div>
                  </div>
                ) : <Loading step="POI geo-spatial features" />
              )}

              {/* SOLAR */}
              {activeStep === 'solar' && (
                solarData ? (
                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 text-center shadow-2xl">
                      <Sun className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-[10px] text-amber-300 font-black uppercase tracking-[0.3em] mb-2">Annual Potential</p>
                      <p className="text-5xl font-black text-white tracking-tighter">
                        {fmt(solarData.metrics.annual_insolation_kwh_m2, 0)}
                        <span className="text-lg font-bold text-amber-400/60 ml-2">kWh/m²</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Metric label="Peak Power" value={`${fmt(solarData.metrics.daily_peak_w_m2, 0)}W`} />
                      <Metric label="Optimal Tilt" value={`${solarData.metrics.optimal_tilt_deg}°`} />
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-sm text-white/70 leading-relaxed italic">"{solarData.ai_insight}"</p>
                    </div>
                  </div>
                ) : <Loading step="solar irradiance model" />
              )}

              {/* SUITABILITY */}
              {activeStep === 'suitability' && (
                suitData ? (
                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl bg-purple-600 border-4 border-white/10 text-center shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                      <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                      <p className="relative text-xs text-white/60 font-black uppercase tracking-[0.4em] mb-2">Composite Suitability</p>
                      <p className="relative text-7xl font-black text-white tracking-tighter">
                        {(suitData.suitability_score * 100).toFixed(0)}%
                      </p>
                      <p className="relative text-sm font-black text-purple-200 mt-2 uppercase tracking-widest">{suitData.classification}</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      {Object.entries(suitData.normalized_scores).map(([k, v]) => (
                        <Bar key={k} label={k.replace(/_score/g, '')} val={v as number} color="#a855f7" />
                      ))}
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mt-4">
                      <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-3">Planning Verdict</p>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {suitData.verdict || (
                          suitData.classification === 'high' 
                            ? "Optimal candidate for intensive urban development. Minimal environmental constraints and high logistical readiness detected."
                            : suitData.classification === 'medium'
                            ? "Suitable for development with moderate infrastructure investment. Topographical or ecological factors require specific engineering attention."
                            : "Development not recommended without significant remediation. High risk factors or low logistical connectivity detected."
                        )}
                      </p>
                    </div>
                  </div>
                ) : <Loading step="multi-criteria scoring engine" />
              )}

              {/* ECONOMICS */}
              {activeStep === 'economics' && (
                econData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Metric label="Market Value" value={econData.economics.estimated_market_value} icon={TrendingUp} />
                      <Metric label="Annual Tax" value={econData.economics.annual_tax_revenue} />
                    </div>
                    
                    <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 text-center shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent)]" />
                      <Coins className="absolute -left-4 -bottom-4 w-24 h-24 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                      <p className="relative text-[10px] text-emerald-300 font-black uppercase tracking-[0.3em] mb-2">Projected ROI</p>
                      <p className="relative text-6xl font-black text-white tracking-tighter">
                        {econData.economics.projected_roi}
                      </p>
                      <div className="relative mt-4 flex items-center justify-center gap-2">
                        <div className="h-1.5 w-12 bg-emerald-500 rounded-full" />
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Investment Grade</p>
                        <div className="h-1.5 w-12 bg-emerald-500 rounded-full" />
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="text-white/40">Infrastructure Load Cost</span>
                        <span className="text-white font-black">{econData.economics.infrastructure_cost}</span>
                      </div>
                      <div className="h-px bg-white/5 mb-4" />
                      <p className="text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" /> AI Yield Analysis
                      </p>
                      <p className="text-sm text-white/70 leading-relaxed italic">"{econData.economics.ai_verdict}"</p>
                    </div>
                  </div>
                ) : <Loading step="urban economic financial model" />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950/80 border-t border-white/5 pointer-events-auto flex items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                const steps: Step[] = ['area', 'slope', 'vegetation', 'road', 'amenities', 'solar'];
                await Promise.all(steps.map(s => runStep(s)));
                await runStep('suitability');
                await runStep('economics');
              }}
              disabled={!polygon || suitMut.isPending}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
            >
              Run All
            </button>
            <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => runStep('suitability')}
            disabled={!polygon || suitMut.isPending}
            className="px-8 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-black uppercase tracking-widest transition-all disabled:opacity-40 shadow-lg shadow-indigo-500/20"
          >
            Run Final Score
          </button>
        </div>
      </div>
    </div>
  );
}

const Loading = ({ step }: { step: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-6">
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-indigo-500 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Activity className="w-6 h-6 text-indigo-500 animate-pulse" />
      </div>
    </div>
    <div className="text-center">
      <p className="text-lg font-black text-white/80 uppercase tracking-tighter">Analyzing</p>
      <p className="text-xs text-white/30 uppercase font-bold tracking-widest mt-1">Processing {step}...</p>
    </div>
  </div>
);
