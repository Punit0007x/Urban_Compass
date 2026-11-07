import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Layers, TrendingUp, Building2, Leaf, Mountain,
  Droplets, Route, CheckCircle2, AlertCircle, Loader2, BarChart3,
  PieChart, Activity, Zap, TreePine, Home, Hospital, School,
  Bus, TreeDeciduous, Waves, Wind, Sun, Thermometer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAreaAnalysis, useSlopeAnalysis, useVegetationAnalysis,
  useRoadConnectivityAnalysis, useSuitabilityAnalysis, useGenerateSampleBands,
  useSampleBandsStatus, useHealthCheck
} from '@/services/hooks';
import html2pdf from 'html2pdf.js';
import type { 
  GeoJSONPolygon, 
  AreaAnalysisResponse, 
  SlopeAnalysisResponse,
  VegetationResponse,
  RoadAnalysisResponse,
  LandSuitabilityResponse
} from '@/services/api';

interface AnalysisData {
  area?: AreaAnalysisResponse;
  slope?: SlopeAnalysisResponse;
  vegetation?: VegetationResponse;
  road?: RoadAnalysisResponse;
  suitability?: LandSuitabilityResponse;
}

const LandAnalysis = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const polygonParam = searchParams.get('polygon');
  const areaName = searchParams.get('name') || 'Selected Area';
  
  const [polygon, setPolygon] = useState<GeoJSONPolygon | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData>({});
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (polygonParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(polygonParam));
        setPolygon(decoded);
      } catch (e) {
        console.error('Failed to parse polygon:', e);
      }
    }
  }, [polygonParam]);

  const { data: health } = useHealthCheck();
  const isApiConnected = health?.status === 'healthy';

  const { data: bandsStatus, refetch: refetchBandsStatus } = useSampleBandsStatus();
  const [bandPaths, setBandPaths] = useState<{red: string; nir: string; green: string} | null>(null);

  const generateBandsMutation = useGenerateSampleBands({
    onSuccess: (data) => {
      setBandPaths(data.paths);
      refetchBandsStatus();
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

  const areaMutation = useAreaAnalysis(polygon, {
    onSuccess: (data) => {
      setAnalysisData(prev => ({ ...prev, area: data }));
      setLoadingStep('');
    }
  });

  const slopeMutation = useSlopeAnalysis({
    onSuccess: (data) => {
      setAnalysisData(prev => ({ ...prev, slope: data }));
      setLoadingStep('');
    }
  });

  const vegetationMutation = useVegetationAnalysis({
    onSuccess: (data) => {
      setAnalysisData(prev => ({ ...prev, vegetation: data }));
      setLoadingStep('');
    }
  });

  const roadMutation = useRoadConnectivityAnalysis({
    onSuccess: (data) => {
      setAnalysisData(prev => ({ ...prev, road: data }));
      setLoadingStep('');
    }
  });

  const suitabilityMutation = useSuitabilityAnalysis({
    onSuccess: (data) => {
      setAnalysisData(prev => ({ ...prev, suitability: data }));
      setLoadingStep('');
    }
  });

  const runFullAnalysis = useCallback(async () => {
    if (!polygon || !isApiConnected) {
      setError(!polygon ? 'No area selected' : 'API not connected');
      return;
    }

    setError(null);
    setLoadingStep('area');
    areaMutation.mutate({ geo: polygon, name: areaName, store: true });

    setLoadingStep('slope');
    slopeMutation.mutate({ geojson: polygon, demSource: 'sample', name: areaName });

    setLoadingStep('vegetation');
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

    setLoadingStep('road');
    roadMutation.mutate({ polygon, networkType: 'drive' });

  }, [polygon, isApiConnected, bandPaths, areaName, areaMutation, slopeMutation, vegetationMutation, roadMutation, generateBandsMutation]);

  useEffect(() => {
    if (analysisData.area && analysisData.slope && analysisData.vegetation && analysisData.road) {
      setLoadingStep('suitability');
      suitabilityMutation.mutate({
        slope_percent: analysisData.slope.slope_statistics.mean,
        ndvi: analysisData.vegetation.ndvi.mean,
        ndwi: analysisData.vegetation.ndwi.mean,
        road_connectivity_score: analysisData.road.connectivity_score.score,
      });
    }
  }, [analysisData.area, analysisData.slope, analysisData.vegetation, analysisData.road, suitabilityMutation]);

  const hasAllAnalysis = !!(analysisData.area && analysisData.slope && analysisData.vegetation && analysisData.road && analysisData.suitability);

  // Auto-run analysis when polygon is loaded and API is connected
  useEffect(() => {
    if (polygon && isApiConnected && !loadingStep && !hasAllAnalysis) {
      const timer = setTimeout(() => {
        runFullAnalysis();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [polygon, isApiConnected, loadingStep, hasAllAnalysis, runFullAnalysis]);

  const suitabilityScore = analysisData.suitability?.suitability_score || 0;
  const classification = analysisData.suitability?.classification || 'medium';

  const formatNumber = (num: number, decimals: number = 2) => {
    return num?.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) || '0.00';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-emerald-400';
    if (score >= 0.4) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 0.7) return 'bg-emerald-500';
    if (score >= 0.4) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const handleExportPDF = () => {
    const element = document.getElementById('analysis-report');
    if (!element) return;
    
    const opt = {
      margin: 0.5,
      filename: `land-analysis-${areaName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" id="analysis-report">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Land Analysis Report</h1>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  {areaName}
                  <span className={`w-2 h-2 rounded-full ${isApiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isApiConnected ? 'API Connected' : 'Connecting...'}
                </p>
                {error && (
                  <p className="text-sm text-red-400 flex items-center gap-2 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </p>
                )}
                {loadingStep && (
                  <p className="text-sm text-cyan-400 flex items-center gap-2 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing {loadingStep}...
                  </p>
                )}
              </div>
            </div>
            
            <Button
              onClick={handleExportPDF}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Export PDF
            </Button>
          </div>
        </div>
      </header>


      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section - Main Score */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 border border-slate-700/50 p-8">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full flex items-center justify-center bg-slate-800/50 border-4 border-slate-700">
                    <div className="text-center">
                      <p className="text-5xl font-black text-white">{Math.round(suitabilityScore * 100)}</p>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Score</p>
                    </div>
                  </div>
                  <svg className="absolute inset-0 w-40 h-40 -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      strokeWidth="8"
                      stroke={suitabilityScore >= 0.7 ? '#10b981' : suitabilityScore >= 0.4 ? '#f59e0b' : '#ef4444'}
                      strokeDasharray={`${suitabilityScore * 440} 440`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      classification === 'high' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' :
                      classification === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' :
                      'bg-red-500/20 text-red-400 border border-red-500/50'
                    }`}>
                      {classification} Priority
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Land Suitability Assessment</h2>
                  <p className="text-slate-400 max-w-lg">
                    Comprehensive analysis of terrain, vegetation, water resources, and infrastructure connectivity
                    for urban development planning.
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Area', value: analysisData.area ? `${formatNumber(analysisData.area.area.hectares)} ha` : '--', icon: Layers },
                  { label: 'Avg Slope', value: analysisData.slope ? `${formatNumber(analysisData.slope.slope_statistics.mean)}°` : '--', icon: Mountain },
                  { label: 'NDVI', value: analysisData.vegetation ? formatNumber(analysisData.vegetation.ndvi.mean) : '--', icon: Leaf },
                  { label: 'Connectivity', value: analysisData.road ? `${formatNumber(analysisData.road.connectivity_score.score * 100)}%` : '--', icon: Route },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1 rounded-xl mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="terrain" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Terrain</TabsTrigger>
            <TabsTrigger value="environment" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Environment</TabsTrigger>
            <TabsTrigger value="infrastructure" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">Infrastructure</TabsTrigger>
            <TabsTrigger value="planning" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">City Planning</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Factor Breakdown */}
              <Card className="bg-slate-800/30 border-slate-700/50 col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-cyan-400" />
                    Factor Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.suitability ? (
                    <div className="space-y-4">
                      {[
                        { label: 'Slope Score', value: analysisData.suitability.normalized_scores.slope_score, icon: Mountain, color: 'amber' },
                        { label: 'Water Availability', value: analysisData.suitability.normalized_scores.water_score, icon: Droplets, color: 'blue' },
                        { label: 'Road Connectivity', value: analysisData.suitability.normalized_scores.connectivity_score, icon: Route, color: 'orange' },
                        { label: 'Vegetation', value: analysisData.suitability.normalized_scores.vegetation_score, icon: Leaf, color: 'green' },
                      ].map((factor, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <factor.icon className={`w-4 h-4 text-${factor.color}-400`} />
                              <span className="text-sm text-slate-300">{factor.label}</span>
                            </div>
                            <span className={`text-sm font-bold ${getScoreColor(factor.value)}`}>
                              {Math.round(factor.value * 100)}%
                            </span>
                          </div>
                          <Progress value={factor.value * 100} className="h-2 bg-slate-700" 
                            indicatorClassName={getScoreBg(factor.value)} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Run analysis to see factor breakdown</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-slate-300"
                    onClick={() => setActiveTab('terrain')}
                  >
                    <Mountain className="w-4 h-4 mr-2" />
                    View Terrain Details
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-slate-300"
                    onClick={() => setActiveTab('environment')}
                  >
                    <Leaf className="w-4 h-4 mr-2" />
                    View Environmental Data
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-slate-300"
                    onClick={() => setActiveTab('infrastructure')}
                  >
                    <Route className="w-4 h-4 mr-2" />
                    View Infrastructure
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-slate-300"
                    onClick={() => setActiveTab('planning')}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Generate City Plan
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Terrain Tab */}
          <TabsContent value="terrain">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mountain className="w-5 h-5 text-amber-400" />
                    Elevation Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.slope ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase">Max Elevation</p>
                        <p className="text-2xl font-bold text-white">{formatNumber(analysisData.slope.elevation_stats.max)}m</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase">Min Elevation</p>
                        <p className="text-2xl font-bold text-white">{formatNumber(analysisData.slope.elevation_stats.min)}m</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase">Mean Elevation</p>
                        <p className="text-2xl font-bold text-white">{formatNumber(analysisData.slope.elevation_stats.mean)}m</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase">Avg Slope</p>
                        <p className="text-2xl font-bold text-white">{formatNumber(analysisData.slope.slope_statistics.mean)}°</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see elevation data</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                    Slope Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.slope ? (
                    <div className="space-y-3">
                      {Object.entries(analysisData.slope.slope_distribution).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="w-20 text-xs text-slate-400 uppercase">{key.replace('_percent', '')}</span>
                          <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${Number(val) > 50 ? 'bg-amber-500' : 'bg-slate-600'}`} 
                              style={{ width: `${val}%` }} 
                            />
                          </div>
                          <span className="w-12 text-xs text-white text-right">{val.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see slope distribution</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Environment Tab */}
          <TabsContent value="environment">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-green-400" />
                    Vegetation Index
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.vegetation ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                        <p className="text-xs text-green-400 uppercase mb-1">NDVI Mean</p>
                        <p className="text-3xl font-bold text-white">{formatNumber(analysisData.vegetation.ndvi.mean)}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                        <p className="text-xs text-green-400 uppercase mb-1">Classification</p>
                        <p className="text-lg font-bold text-white">{analysisData.vegetation.vegetation_class.category}</p>
                        <p className="text-xs text-green-300/70">{analysisData.vegetation.vegetation_class.description}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see vegetation data</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-400" />
                    Water Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.vegetation ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                        <p className="text-xs text-blue-400 uppercase mb-1">NDWI Mean</p>
                        <p className="text-3xl font-bold text-white">{formatNumber(analysisData.vegetation.ndwi.mean)}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                        <p className="text-xs text-blue-400 uppercase mb-1">Water Detection</p>
                        <p className="text-lg font-bold text-white">{analysisData.vegetation.water_detection.classification}</p>
                        <p className="text-xs text-blue-300/70">{analysisData.vegetation.water_detection.description}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see water data</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TreeDeciduous className="w-5 h-5 text-emerald-400" />
                    Environmental Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.vegetation ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <span className="text-sm text-slate-300">Vegetation Density</span>
                        <span className="text-sm font-bold text-green-400">
                          {analysisData.vegetation.vegetation_class.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <span className="text-sm text-slate-300">Water Presence</span>
                        <span className="text-sm font-bold text-blue-400">
                          {analysisData.vegetation.water_detection.presence_percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <span className="text-sm text-slate-300">Environmental Score</span>
                        <span className="text-sm font-bold text-cyan-400">
                          {Math.round(((analysisData.vegetation.ndvi.mean + analysisData.vegetation.ndwi.mean) / 2) * 100)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see summary</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Infrastructure Tab */}
          <TabsContent value="infrastructure">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Route className="w-5 h-5 text-orange-400" />
                    Road Network Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.road ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                        <p className="text-xs text-orange-400 uppercase mb-1">Connectivity Grade</p>
                        <p className="text-2xl font-bold text-white">{analysisData.road.connectivity_score.grade.toUpperCase()}</p>
                        <p className="text-xs text-orange-300/70">{analysisData.road.connectivity_score.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase">Road Density</p>
                          <p className="text-lg font-bold text-white">{formatNumber(analysisData.road.road_density.density_km_per_km2)} km/km²</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase">Connectivity Score</p>
                          <p className="text-lg font-bold text-white">{formatNumber(analysisData.road.connectivity_score.score * 100)}%</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase">Total Roads</p>
                          <p className="text-lg font-bold text-white">{formatNumber(analysisData.road.road_density.total_length_km)} km</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase">Area</p>
                          <p className="text-lg font-bold text-white">{formatNumber(analysisData.road.area_sq_km)} km²</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see road data</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Network Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.road ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase">Total Nodes</p>
                          <p className="text-lg font-bold text-white">{analysisData.road.network_metrics.total_nodes}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase">Total Edges</p>
                          <p className="text-lg font-bold text-white">{analysisData.road.network_metrics.total_edges}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase">Avg Degree</p>
                          <p className="text-lg font-bold text-white">{formatNumber(analysisData.road.network_metrics.average_degree)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase">Clustering</p>
                          <p className="text-lg font-bold text-white">{formatNumber(analysisData.road.network_metrics.clustering_coefficient)}</p>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase mb-3">Nearest Road Stats</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">Mean Distance</p>
                            <p className="text-sm font-bold text-white">{formatNumber(analysisData.road.nearest_road_stats.mean_distance_m)}m</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Median Distance</p>
                            <p className="text-sm font-bold text-white">{formatNumber(analysisData.road.nearest_road_stats.median_distance_m)}m</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Within 100m</p>
                            <p className="text-sm font-bold text-white">{analysisData.road.nearest_road_stats.percentage_within_100m.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see network metrics</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* City Planning Tab */}
          <TabsContent value="planning">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recommendations */}
              <Card className="bg-slate-800/30 border-slate-700/50 col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    Development Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.suitability ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Strengths */}
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-400">Strengths</span>
                        </div>
                        <ul className="space-y-2">
                          {analysisData.suitability.normalized_scores.slope_score > 0.6 && (
                            <li className="text-xs text-emerald-200 flex items-start gap-2">
                              <span className="text-emerald-400">✓</span> Favorable terrain for construction
                            </li>
                          )}
                          {analysisData.suitability.normalized_scores.water_score > 0.5 && (
                            <li className="text-xs text-emerald-200 flex items-start gap-2">
                              <span className="text-emerald-400">✓</span> Good water availability
                            </li>
                          )}
                          {analysisData.suitability.normalized_scores.connectivity_score > 0.6 && (
                            <li className="text-xs text-emerald-200 flex items-start gap-2">
                              <span className="text-emerald-400">✓</span> Excellent road connectivity
                            </li>
                          )}
                          {analysisData.suitability.normalized_scores.vegetation_score < 0.4 && (
                            <li className="text-xs text-emerald-200 flex items-start gap-2">
                              <span className="text-emerald-400">✓</span> Low vegetation - minimal clearing needed
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Challenges */}
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-bold text-amber-400">Challenges</span>
                        </div>
                        <ul className="space-y-2">
                          {analysisData.suitability.normalized_scores.slope_score < 0.4 && (
                            <li className="text-xs text-amber-200 flex items-start gap-2">
                              <span className="text-amber-400">!</span> Steep terrain - foundation work needed
                            </li>
                          )}
                          {analysisData.suitability.normalized_scores.water_score < 0.3 && (
                            <li className="text-xs text-amber-200 flex items-start gap-2">
                              <span className="text-amber-400">!</span> Water infrastructure required
                            </li>
                          )}
                          {analysisData.suitability.normalized_scores.connectivity_score < 0.4 && (
                            <li className="text-xs text-amber-200 flex items-start gap-2">
                              <span className="text-amber-400">!</span> Road access needs improvement
                            </li>
                          )}
                          {analysisData.suitability.normalized_scores.vegetation_score > 0.6 && (
                            <li className="text-xs text-amber-200 flex items-start gap-2">
                              <span className="text-amber-400">!</span> Vegetation restoration planned
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see recommendations</div>
                  )}
                </CardContent>
              </Card>

              {/* Estimated Infrastructure */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Home className="w-5 h-5 text-cyan-400" />
                    Estimated Infrastructure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisData.area ? (
                    <div className="space-y-3">
                      {[
                        { icon: Home, label: 'Residential Units', value: Math.floor(analysisData.area.area.hectares * 50) },
                        { icon: School, label: 'Schools', value: Math.floor(analysisData.area.area.hectares * 2) },
                        { icon: Hospital, label: 'Healthcare', value: Math.floor(analysisData.area.area.hectares * 0.5) },
                        { icon: Bus, label: 'Transit Stops', value: Math.floor(analysisData.area.area.hectares * 5) },
                        { icon: TreeDeciduous, label: 'Parks', value: Math.floor(analysisData.area.area.hectares * 3) },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                          <div className="flex items-center gap-2">
                            <item.icon className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-400">{item.label}</span>
                          </div>
                          <span className="text-sm font-bold text-white">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">Run analysis to see estimates</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LandAnalysis;
