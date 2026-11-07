import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Mountain, Leaf, Route, CheckSquare, Loader2, AlertCircle, CheckCircle2, X,
  ChevronDown, Grid3X3, Droplets, TrendingUp, ExternalLink
} from 'lucide-react';
import { useAreaAnalysis, useSlopeAnalysis, useHealthCheck, useVegetationAnalysis, useGenerateSampleBands, useSampleBandsStatus, useRoadConnectivityAnalysis, useSuitabilityAnalysis } from '@/services/hooks';
import type { GeoJSONPolygon } from '@/services/api';

interface AnalysisPanelProps {
  polygon: GeoJSONPolygon | null;
  centerLat: number;
  centerLng: number;
  onFlyTo: (lat: number, lng: number) => void;
  onAnalysisComplete?: (results: { suitability: number; ndvi: number; ndwi: number }) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AnalysisPanel = ({ polygon, centerLat, centerLng, onFlyTo, onAnalysisComplete, isOpen, onClose }: AnalysisPanelProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'area' | 'slope' | 'vegetation' | 'road' | 'suitability'>('area');
  const [areaName, setAreaName] = useState('');
  const [networkType, setNetworkType] = useState<'all' | 'drive' | 'walk' | 'bike'>('drive');
  const [bandPaths, setBandPaths] = useState<{red: string; nir: string; green: string} | null>(null);

  const { data: health } = useHealthCheck();
  const isApiConnected = health?.status === 'healthy';
  
  const { data: bandsStatus, refetch: refetchBandsStatus } = useSampleBandsStatus();
  const generateBandsMutation = useGenerateSampleBands({
    onSuccess: (data) => {
      setBandPaths(data.paths);
      refetchBandsStatus();
      if (polygon && data.paths.red && data.paths.nir && data.paths.green) {
        vegetationMutation.mutate({
          redPath: data.paths.red,
          nirPath: data.paths.nir,
          greenPath: data.paths.green,
          polygon: polygon,
        });
      }
    },
  });

  useEffect(() => {
    if (bandsStatus?.available && bandsStatus.paths.red && bandsStatus.paths.nir && bandsStatus.paths.green) {
      setBandPaths({
        red: bandsStatus.paths.red!,
        nir: bandsStatus.paths.nir!,
        green: bandsStatus.paths.green!,
      });
    }
  }, [bandsStatus]);

  const areaMutation = useAreaAnalysis(polygon, { onSuccess: () => {} });
  const slopeMutation = useSlopeAnalysis({ onSuccess: () => {} });
  const vegetationMutation = useVegetationAnalysis({ onSuccess: () => {} });
  const roadMutation = useRoadConnectivityAnalysis({ onSuccess: () => {} });
  const suitabilityMutation = useSuitabilityAnalysis({ 
    onSuccess: (data) => {
      if (onAnalysisComplete) {
        onAnalysisComplete({
          suitability: data.suitability_score,
          ndvi: vegetationResult?.ndvi.mean || 0.4,
          ndwi: vegetationResult?.ndwi.mean || 0.3
        });
      }
    } 
  });

  const handleAnalyzeArea = useCallback(() => {
    if (!polygon) return;
    areaMutation.mutate({
      geo: polygon,
      name: areaName || undefined,
      store: true,
    });
  }, [polygon, areaName, areaMutation]);

  const handleAnalyzeSlope = useCallback(() => {
    if (!polygon) return;
    slopeMutation.mutate({
      geojson: polygon,
      demSource: 'sample',
      name: areaName || undefined,
    });
  }, [polygon, areaName, slopeMutation]);

  const handleAnalyzeVegetation = useCallback(() => {
    if (!polygon) return;
    if (bandPaths) {
      vegetationMutation.mutate({
        redPath: bandPaths.red,
        nirPath: bandPaths.nir,
        greenPath: bandPaths.green,
        polygon: polygon,
      });
    } else {
      generateBandsMutation.mutate(polygon);
    }
  }, [polygon, bandPaths, vegetationMutation, generateBandsMutation]);

  const handleAnalyzeRoad = useCallback(() => {
    if (!polygon) return;
    roadMutation.mutate({ polygon, networkType });
  }, [polygon, networkType, roadMutation]);

  const isLoading = areaMutation.isPending || slopeMutation.isPending || vegetationMutation.isPending || roadMutation.isPending;
  const areaResult = areaMutation.data;
  const slopeResult = slopeMutation.data;
  const vegetationResult = vegetationMutation.data;
  const roadResult = roadMutation.data;

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'area', label: 'Area', icon: Grid3X3, color: 'cyan' },
    { id: 'slope', label: 'Terrain', icon: Mountain, color: 'amber' },
    { id: 'vegetation', label: 'Vegetation', icon: Leaf, color: 'green' },
    { id: 'road', label: 'Roads', icon: Route, color: 'orange' },
    { id: 'suitability', label: 'Suitability', icon: CheckSquare, color: 'violet' },
  ] as const;

  return (
    <div className="relative w-full">
      <div className="overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-xl max-h-[70vh] overflow-y-auto">
        
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500 shadow-lg">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">Analysis</h2>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                {isApiConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    API Connected
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Initializing...
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-2 py-2 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colorClasses = {
                cyan: 'bg-cyan-500',
                amber: 'bg-amber-500',
                green: 'bg-green-500',
                orange: 'bg-orange-500',
                violet: 'bg-violet-500',
              };

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? `${colorClasses[tab.color]} text-white`
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
          
          {/* Info Box */}
          {!polygon && (
            <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300">Draw an area on the map to start analysis</p>
            </div>
          )}

          {polygon && isApiConnected && (
            <>
              {/* Area Tab Content */}
              {activeTab === 'area' && (
                <div className="space-y-3">
                  {areaResult ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase">Complete</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Square Meters" value={formatNumber(areaResult.area.square_meters)} />
                        <MetricCard label="Acres" value={formatNumber(areaResult.area.acres)} />
                        <MetricCard label="Hectares" value={formatNumber(areaResult.area.hectares)} />
                        <MetricCard label="Perimeter (m)" value={formatNumber(areaResult.perimeter_meters)} />
                      </div>
                    </div>
                  ) : (
                    <ActionArea 
                      label="Analyze Area Measurements"
                      description="Get precise area, perimeter, and bounding box calculations"
                      isLoading={isLoading}
                      onClick={handleAnalyzeArea}
                    />
                  )}
                </div>
              )}

              {/* Slope Tab Content */}
              {activeTab === 'slope' && (
                <div className="space-y-3">
                  {slopeResult ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase">Terrain Analyzed</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Avg Slope" value={`${formatNumber(slopeResult.slope_statistics.mean)}°`} />
                        <MetricCard label="Max Elevation" value={`${formatNumber(slopeResult.elevation_stats.max_elevation_m)}m`} />
                        <MetricCard label="Min Elevation" value={`${formatNumber(slopeResult.elevation_stats.min_elevation_m)}m`} />
                        <MetricCard label="Class" value={slopeResult.slope_classification.category} />
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <p className="text-[10px] text-slate-400 font-semibold mb-2">Distribution</p>
                        <div className="grid grid-cols-5 gap-1.5 text-center">
                          {Object.entries(slopeResult.slope_distribution).map(([key, val]) => (
                            <div key={key} className="p-1.5 rounded-lg bg-slate-700/50">
                              <p className="text-[8px] text-slate-500 uppercase">{key}</p>
                              <p className="text-xs font-bold text-white">{val.toFixed(1)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ActionArea
                      label="Analyze Terrain"
                      description="Calculate slope distribution and elevation statistics"
                      isLoading={isLoading}
                      onClick={handleAnalyzeSlope}
                    />
                  )}
                </div>
              )}

              {/* Vegetation Tab Content */}
              {activeTab === 'vegetation' && (
                <div className="space-y-3">
                  {vegetationResult ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase">Vegetation Data Ready</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-white mb-2">Vegetation Indices</p>
                        <div className="grid grid-cols-2 gap-2">
                          <MetricCard label="NDVI Mean" value={formatNumber(vegetationResult.ndvi.mean)} small />
                          <MetricCard label="NDWI Mean" value={formatNumber(vegetationResult.ndwi.mean)} small />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-green-500/20 border border-green-500/50">
                        <p className="text-[10px] text-green-300 font-semibold">{vegetationResult.vegetation_class.category}</p>
                        <p className="text-[11px] text-green-200/70 mt-1">{vegetationResult.vegetation_class.description}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-500/20 border border-blue-500/50">
                        <p className="text-[10px] text-blue-300 font-semibold flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Water Detection
                        </p>
                        <p className="text-[11px] text-blue-200/70 mt-1">{vegetationResult.water_detection.description}</p>
                      </div>
                    </div>
                  ) : (
                    <ActionArea
                      label="Analyze Vegetation"
                      description="Calculate NDVI/NDWI indices and vegetation density"
                      isLoading={isLoading || generateBandsMutation.isPending}
                      onClick={handleAnalyzeVegetation}
                    />
                  )}
                </div>
              )}

              {/* Road Tab Content */}
              {activeTab === 'road' && (
                <div className="space-y-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'drive', 'walk', 'bike'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setNetworkType(type)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                          networkType === type
                            ? 'bg-orange-500/40 text-orange-300 border border-orange-500'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {roadResult ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase">Road Analysis Complete</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Road Density" value={`${formatNumber(roadResult.road_density.density_km_per_km2)}km/km²`} small />
                        <MetricCard label="Connectivity" value={formatNumber(roadResult.connectivity_score.score, 1)} small />
                      </div>
                      <div className="p-2.5 rounded-lg bg-orange-500/20 border border-orange-500/50">
                        <p className="text-xs font-bold text-orange-300">{roadResult.connectivity_score.grade.toUpperCase()} Connectivity</p>
                        <p className="text-[11px] text-orange-200/70 mt-1">{roadResult.connectivity_score.description}</p>
                      </div>
                    </div>
                  ) : (
                    <ActionArea
                      label="Analyze Road Network"
                      description="Calculate connectivity scores and network density"
                      isLoading={isLoading}
                      onClick={handleAnalyzeRoad}
                    />
                  )}
                </div>
              )}

              {/* Suitability Tab Content */}
              {activeTab === 'suitability' && (
                <div className="space-y-3">
                  {suitabilityMutation.isPending ? (
                    <ActionArea
                      label="Calculating Suitability..."
                      description="Analyzing all factors..."
                      isLoading={true}
                      onClick={() => {}}
                    />
                  ) : suitabilityMutation.data ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase">Analysis Complete</span>
                      </div>

                      {/* Main Score */}
                      <div className="p-3 rounded-lg border-2 border-violet-500/50 bg-violet-500/10">
                        <p className="text-xs text-violet-300 font-semibold uppercase tracking-wider">Suitability Score</p>
                        <p className="text-3xl font-bold text-violet-300 mt-2">
                          {(suitabilityMutation.data.suitability_score * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm font-bold text-violet-200 mt-1 uppercase">
                          {suitabilityMutation.data.classification}
                        </p>
                      </div>

                      {/* Factor Breakdown */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-300 uppercase">Factor Breakdown</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                            <p className="text-[10px] text-slate-400 uppercase">Slope Score</p>
                            <p className="text-sm font-bold text-white mt-1">
                              {(suitabilityMutation.data.normalized_scores.slope_score * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                            <p className="text-[10px] text-slate-400 uppercase">Water Score</p>
                            <p className="text-sm font-bold text-white mt-1">
                              {(suitabilityMutation.data.normalized_scores.water_score * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                            <p className="text-[10px] text-slate-400 uppercase">Connectivity</p>
                            <p className="text-sm font-bold text-white mt-1">
                              {(suitabilityMutation.data.normalized_scores.connectivity_score * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                            <p className="text-[10px] text-slate-400 uppercase">Vegetation</p>
                            <p className="text-sm font-bold text-white mt-1">
                              {(suitabilityMutation.data.normalized_scores.vegetation_score * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Insights & Suggestions */}
                      <InsightsSection
                        score={suitabilityMutation.data.suitability_score}
                        classification={suitabilityMutation.data.classification}
                        factors={suitabilityMutation.data.normalized_scores}
                      />
                    </div>
                  ) : (
                    <ActionArea
                      label="Multi-Factor Suitability"
                      description="Run terrain + vegetation + road analysis first"
                      isLoading={false}
                      onClick={() => {
                        if (slopeResult && vegetationResult && roadResult && polygon) {
                          suitabilityMutation.mutate({
                            slope_percent: slopeResult.slope_statistics.mean,
                            ndvi: vegetationResult.ndvi.mean,
                            ndwi: vegetationResult.ndwi.mean,
                            road_connectivity_score: roadResult.connectivity_score.score,
                          });
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, small = false }: { label: string; value: string; small?: boolean }) => (
  <div className={`p-2.5 rounded-lg bg-slate-800/80 border border-slate-700`}>
    <p className={`${small ? 'text-[10px]' : 'text-[11px]'} text-slate-400 font-semibold uppercase tracking-wide`}>
      {label}
    </p>
    <p className={`${small ? 'text-sm' : 'text-lg'} font-bold text-white mt-1`}>{value}</p>
  </div>
);

interface InsightsSectionProps {
  score: number;
  classification: 'low' | 'medium' | 'high';
  factors: {
    slope_score: number;
    water_score: number;
    connectivity_score: number;
    vegetation_score: number;
  };
}

const InsightsSection = ({ score, classification, factors }: InsightsSectionProps) => {
  const reasons: string[] = [];
  const improvements: string[] = [];
  
  // Analyze factors
  if (factors.slope_score > 0.7) {
    reasons.push('Favorable terrain for construction');
  } else if (factors.slope_score < 0.3) {
    reasons.push('Steep terrain - needs foundation work');
    improvements.push('Use terracing or foundation preparation');
  }

  if (factors.water_score > 0.6) {
    reasons.push('Good water availability');
  } else {
    improvements.push('Add water infrastructure (reservoirs, wells)');
  }

  if (factors.connectivity_score > 0.7) {
    reasons.push('Excellent road connectivity');
  } else {
    improvements.push('Improve road access and connectivity');
  }

  if (factors.vegetation_score < 0.3) {
    reasons.push('Low existing vegetation (minimal clearing)');
  } else {
    improvements.push('Plan vegetation restoration areas');
  }

  const isFixable = improvements.length <= 2;

  return (
    <div className="space-y-3">
      {/* Why this score? */}
      <div className="p-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10">
        <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-2">✓ Why this score?</p>
        <ul className="space-y-1.5">
          {reasons.length > 0 ? (
            reasons.map((reason, i) => (
              <li key={i} className="text-[11px] text-emerald-200 flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span> {reason}
              </li>
            ))
          ) : (
            <li className="text-[11px] text-emerald-200">Mixed factors - review details above</li>
          )}
        </ul>
      </div>

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/10">
          <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-2">→ What should be improved?</p>
          <ul className="space-y-1.5">
            {improvements.map((imp, i) => (
              <li key={i} className="text-[11px] text-amber-200 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">→</span> {imp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fixable? */}
      <div className={`p-3 rounded-lg border-2 ${isFixable ? 'border-green-500/50 bg-green-500/10' : 'border-orange-500/50 bg-orange-500/10'}`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isFixable ? 'text-green-300' : 'text-orange-300'}`}>
          {isFixable ? '🟢 Is this land fixable?' : '🟡 Challenging but possible'}
        </p>
        <p className={`text-[11px] ${isFixable ? 'text-green-200' : 'text-orange-200'}`}>
          {isFixable 
            ? 'Yes! With suggested improvements, this is a good location for city development.'
            : 'Yes, but will require more investment in infrastructure and land preparation.'}
        </p>
      </div>
    </div>
  );
};

const ActionArea = ({ label, description, isLoading, onClick }: { label: string; description: string; isLoading: boolean; onClick: () => void }) => (
  <div className="flex flex-col items-center justify-center py-6 space-y-3">
    <div className="text-center space-y-1.5">
      <p className="text-sm font-bold text-white">{label}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
    <button
      onClick={onClick}
      disabled={isLoading}
      className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Running...
        </>
      ) : (
        <>
          <TrendingUp className="w-3.5 h-3.5" />
          Run Analysis
        </>
      )}
    </button>
  </div>
);

export default AnalysisPanel;
