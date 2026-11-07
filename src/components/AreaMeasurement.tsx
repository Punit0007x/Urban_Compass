import React, { useState } from 'react';
import { Square, Circle, MapPin, Maximize, Trash2, ChevronDown } from 'lucide-react';

interface AreaMeasurementProps {
  onDrawArea: (areaSqm: number, shape: 'circle' | 'square', cityModel?: string) => void;
  onClearArea: () => void;
  isViewerReady: boolean;
}

const AreaMeasurement = ({ onDrawArea, onClearArea, isViewerReady }: AreaMeasurementProps) => {
  const [areaValue, setAreaValue] = useState<string>('1');
  const [unit, setUnit] = useState<string>('acre');
  const [shape, setShape] = useState<'circle' | 'square'>('square');
  const [selectedCity, setSelectedCity] = useState<string>('none');

  // Conversion factors to Square Meters
  const units: Record<string, { label: string, toSqm: number }> = {
    acre: { label: 'Acres', toSqm: 4046.86 },
    hectare: { label: 'Hectares', toSqm: 10000 },
    sqm: { label: 'Sq Meters', toSqm: 1 },
    sqft: { label: 'Sq Feet', toSqm: 0.092903 },
  };

  const cityModels = [
    { id: 'none', label: 'No Model' },
    { id: 'city', label: 'Standard City' },
    { id: 'city_3d_model', label: 'Detailed City' },
    { id: 'city_mapnot_a_scan', label: 'Full Map Scan' },
  ];

  const handleDraw = () => {
    const value = parseFloat(areaValue);
    if (!isNaN(value) && value > 0) {
      const areaSqm = value * units[unit].toSqm;
      onDrawArea(areaSqm, shape, selectedCity !== 'none' ? selectedCity : undefined);
    }
  };

  return (
    <div className="relative w-full">
      <div className="overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl">
        
        {/* Header */}
        <div 
          className="px-4 py-3 flex items-center border-b border-white/5 bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-blue-500 shadow-lg shadow-blue-500/20`}>
              <Maximize className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">Target Area</h2>
              <p className="text-[10px] text-blue-300/50 font-bold uppercase tracking-tighter">Draw & Analyze</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-[11px] text-slate-400 leading-relaxed italic">
            Specify dimensions, select geometry, and optionally overlay procedural urban models.
          </p>

          {/* Input Row */}
          <div className="flex gap-2">
            <input 
              type="number"
              min="0.1"
              step="0.1"
              value={areaValue}
              onChange={(e) => setAreaValue(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
              placeholder="Area value"
            />
            <select 
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '28px'
              }}
            >
              {Object.entries(units).map(([key, { label }]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">{label}</option>
              ))}
            </select>
          </div>

          {/* Shape Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShape('square')}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-300 ${
                shape === 'square' 
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-inner shadow-blue-500/10' 
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <Square className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Square</span>
            </button>
            <button
              onClick={() => setShape('circle')}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-300 ${
                shape === 'circle' 
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-inner shadow-blue-500/10' 
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <Circle className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Circle</span>
            </button>
          </div>

          {/* City Model Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">
              Urban Simulation
            </label>
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '28px'
              }}
            >
              {cityModels.map((city) => (
                <option key={city.id} value={city.id} className="bg-slate-900 text-white">{city.label}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDraw}
              disabled={!isViewerReady || parseFloat(areaValue) <= 0}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Draw Projection
            </button>
            <button
              onClick={onClearArea}
              className="px-3 py-2.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 text-[10px] font-black uppercase tracking-widest transition-all"
              title="Clear projection"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
   );
 };

 export default AreaMeasurement;
