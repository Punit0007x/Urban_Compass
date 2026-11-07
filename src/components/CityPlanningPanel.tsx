import { useState, useCallback } from 'react';
import {
  Users, Home, School, Hospital, Zap, TrendingUp, AlertCircle, 
  CheckCircle2, X, Loader2, MapPin, Building2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { GeoJSONPolygon } from '@/services/api';

interface CityPlanningPanelProps {
  polygon: GeoJSONPolygon | null;
  suitabilityScore?: number;
  ndvi?: number;
  ndwi?: number;
  onGenerateCity?: (config: CityConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export interface CityConfig {
  population: number;
  density: 'low' | 'medium' | 'high';
  polygon: GeoJSONPolygon;
}

const CityPlanningPanel = ({ 
  polygon, 
  suitabilityScore = 0.5,
  ndvi = 0.4,
  ndwi = 0.3,
  onGenerateCity,
  isOpen,
  onClose
}: CityPlanningPanelProps) => {
  const [population, setPopulation] = useState('50000');
  const [density, setDensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  // Simple calculations
  const populationNum = parseInt(population) || 0;
  const calculations = {
    houses: Math.floor(populationNum / 4),
    schools: Math.floor(populationNum / 5000),
    hospitals: Math.floor(populationNum / 20000),
    policeStations: Math.floor(populationNum / 50000),
    parks: Math.floor(populationNum / 15000),
  };

  const densityMultiplier = {
    low: 0.7,
    medium: 1,
    high: 1.4,
  }[density];

  const handleGenerate = useCallback(() => {
    if (!polygon || !populationNum) {
      alert('Please draw an area and enter a valid population');
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      onGenerateCity?.({ population: populationNum, density, polygon });
      setIsGenerating(false);
    }, 1500);
  }, [polygon, populationNum, density, onGenerateCity]);

  if (!isOpen) return null;

  const isLandGood = suitabilityScore > 0.6;
  const improvements = [];
  
  if (suitabilityScore < 0.5) improvements.push('Improve terrain or road access');
  if (ndvi < 0.3) improvements.push('Consider vegetation restoration');
  if (ndwi < 0.2) improvements.push('Add water management infrastructure');

  return (
    <div className="relative w-full">
      <div className="overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-xl">
        
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center border-b border-slate-700/50 bg-gradient-to-r from-purple-900/50 to-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500 shadow-lg">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">City Planner</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Configure your future city</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {!polygon && (
            <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300">Draw an area on the map first</p>
            </div>
          )}

          {polygon && (
            <>
              {/* Land Quality Assessment */}
              <div className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Land Quality</p>
                  {isLandGood ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Good
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertCircle className="w-3 h-3" /> Needs Work
                    </span>
                  )}
                </div>

                {/* Score visualization */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-slate-400">Suitability</span>
                      <span className="text-[10px] font-bold text-white">{(suitabilityScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                        style={{ width: `${suitabilityScore * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-slate-400">Vegetation (NDVI)</span>
                      <span className="text-[10px] font-bold text-white">{(ndvi * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                        style={{ width: `${Math.min(ndvi * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-slate-400">Water (NDWI)</span>
                      <span className="text-[10px] font-bold text-white">{(ndwi * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                        style={{ width: `${Math.min(ndwi * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Improvements */}
                {improvements.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1">
                    <p className="text-[10px] font-bold text-slate-300 uppercase">Suggestions</p>
                    {improvements.map((imp, i) => (
                      <p key={i} className="text-[11px] text-slate-400 flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">→</span> {imp}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Population Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  Target Population
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 50000"
                  value={population}
                  onChange={(e) => setPopulation(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500"
                  disabled={isGenerating}
                />
              </div>

              {/* Density Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider">Density Profile</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDensity(d)}
                      disabled={isGenerating}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        density === d
                          ? 'bg-purple-500 text-white border border-purple-400'
                          : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Infrastructure Estimates */}
              {populationNum > 0 && (
                <div className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/50 space-y-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">Infrastructure Needs</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-slate-300">{calculations.houses.toLocaleString()} houses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <School className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-slate-300">{calculations.schools} schools</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hospital className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-slate-300">{calculations.hospitals} hospitals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-slate-300">{calculations.policeStations} police</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/50">
                    <p className="text-[10px] text-slate-400">With {density.charAt(0).toUpperCase() + density.slice(1)} Density ×{densityMultiplier.toFixed(1)}</p>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !populationNum}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating City...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Generate Smart City
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[10px] text-blue-200">
                <p>This generates a basic city plan with zoning, roads, and infrastructure placement. You can edit it afterwards.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CityPlanningPanel;
