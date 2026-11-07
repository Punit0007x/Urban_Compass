import React, { useState } from 'react';
import { Eye, EyeOff, Layers, MapPin, ChevronDown, ChevronRight, Activity, Moon, Sun, ChevronUp, Sliders, Settings, Mountain } from 'lucide-react';

interface LayerVisibility {
  buildings: boolean;
  googleLabels: boolean;
}

interface ControlPanelProps {
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;
  translucency: number;
  onTranslucencyChange: (value: number) => void;
  terrainExaggeration: number;
  onTerrainExaggerationChange: (value: number) => void;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  isViewerReady: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const layerConfig: { key: keyof LayerVisibility; label: string; colorVar: string; group: string; icon: React.ElementType }[] = [
  { key: 'buildings', label: '3D Buildings', colorVar: '#a3a3a3', group: 'surface', icon: Layers },
  { key: 'googleLabels', label: 'Place Labels', colorVar: '#3b82f6', group: 'surface', icon: MapPin },
];

const ControlPanel = ({ 
  layers, 
  onToggleLayer, 
  translucency, 
  onTranslucencyChange,
  terrainExaggeration,
  onTerrainExaggerationChange,
  isNightMode, 
  onToggleNightMode, 
  isViewerReady,
  isOpen,
  onClose
}: ControlPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="relative w-full">
      {/* Main Panel - Anchored to expand left */}
      <div className={`overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-xl w-full md:w-[280px]`}>
        
        {/* Header */}
        <div 
          className="px-4 py-3 flex justify-between items-center border-b border-slate-700/50 bg-slate-800/50"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-indigo-500 shadow-lg`}>
              <Settings className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wider">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800">
                {isNightMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </div>
              <div>
                <label className="text-xs font-semibold text-white block">Theme</label>
                <p className="text-[11px] text-slate-400">{isNightMode ? 'Night Mode' : 'Day Mode'}</p>
              </div>
            </div>
            <button 
              onClick={onToggleNightMode}
              className={`relative w-10 h-5.5 rounded-full transition-all duration-300 ${isNightMode ? 'bg-indigo-500' : 'bg-amber-500'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isNightMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Opacity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-white">Building Opacity</span>
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded">
                {Math.round(translucency * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={translucency * 100}
              onChange={(e) => onTranslucencyChange(Number(e.target.value) / 100)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6366f1 ${translucency * 100}%, rgba(255,255,255,0.1) ${translucency * 100}%)`,
              }}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(99,102,241,0.4);
              }
              input[type=range]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 8px rgba(99,102,241,0.4);
              }
            `}</style>
          </div>

          {/* Terrain Exaggeration Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2">
                <Mountain className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-white">Terrain Exaggeration</span>
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded">
                {terrainExaggeration.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={terrainExaggeration * 10}
              onChange={(e) => onTerrainExaggerationChange(Number(e.target.value) / 10)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6366f1 ${((terrainExaggeration - 1) / 4) * 100}%, rgba(255,255,255,0.1) ${((terrainExaggeration - 1) / 4) * 100}%)`,
              }}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(99,102,241,0.4);
              }
              input[type=range]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 8px rgba(99,102,241,0.4);
              }
            `}</style>
          </div>

          {/* Data Layers */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Data Layers</h3>
            <div className="space-y-2">
              {layerConfig.map((layer) => {
                const isActive = layers[layer.key];
                const Icon = layer.icon;
                return (
                  <button
                    key={layer.key}
                    onClick={() => onToggleLayer(layer.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 ${
                      isActive 
                        ? 'bg-slate-800/80 border-slate-600' 
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          isActive ? 'bg-indigo-500' : 'bg-slate-700'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <span className={`text-xs font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {layer.label}
                      </span>
                    </div>
                    <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 ${isActive ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
