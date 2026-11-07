import { useState, useRef, useEffect } from 'react';
import { Navigation, MapPin, X, Search, RefreshCw, Sparkles, Loader2, Target } from 'lucide-react';

import { useWastelandDetection } from '@/services/hooks';
import type { WastelandCandidate } from '@/services/api';

interface CoordinateSearchProps {
  onFlyTo: (lat: number, lng: number, altitude?: number) => void;
  onGetCurrentCenter: () => { lat: number, lng: number, alt: number } | null;
  isViewerReady: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  { name: 'Hubli', lat: 15.3647, lng: 75.1240 },
  { name: 'Mangaluru', lat: 12.9141, lng: 74.8560 },
  { name: 'Belagavi', lat: 15.8497, lng: 74.4977 },
  { name: 'Hampi', lat: 15.3350, lng: 76.4600 },
];

interface GoogleMapsOptions {
  fields: string[];
  types: string[];
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceGeometry {
  location: {
    lat: () => number;
    lng: () => number;
  };
}

interface PlaceResult {
  geometry?: PlaceGeometry;
  address_components?: AddressComponent[];
  name?: string;
}

interface Autocomplete {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => PlaceResult;
}

interface GoogleMaps {
  maps: {
    places: {
      Autocomplete: new (input: HTMLInputElement, options?: GoogleMapsOptions) => Autocomplete;
    };
  };
}

declare global {
  interface Window {
    google: {
      maps: {
        importLibrary: (name: string) => Promise<unknown>;
      };
    };
  }
}

const CoordinateSearch = ({ onFlyTo, onGetCurrentCenter, isViewerReady, isOpen, onClose }: CoordinateSearchProps) => {
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [altInput, setAltInput] = useState('1200');
  const [error, setError] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<unknown>(null);
  const [candidates, setCandidates] = useState<WastelandCandidate[]>([]);
  const [isSearchingWasteland, setIsSearchingWasteland] = useState(false);

  const wastelandMut = useWastelandDetection({
    onSuccess: (data) => {
      setCandidates(data.candidates);
      setIsSearchingWasteland(false);
    },
    onError: () => {
      setError('Wasteland detection failed');
      setIsSearchingWasteland(false);
    }
  });

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (googleMapsApiKey && !window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [googleMapsApiKey]);

  useEffect(() => {
    if (isOpen && searchInputRef.current && window.google) {
      const initAutocomplete = async () => {
        try {
          const { Autocomplete } = await window.google.maps.importLibrary("places");
          
          if (!autocompleteRef.current) {
            const autocomplete = new Autocomplete(searchInputRef.current, {
              fields: ["address_components", "geometry", "name"],
              types: ["establishment", "geocode"],
            });
            
            autocomplete.addListener("place_changed", () => {
              const place = autocomplete.getPlace();
              if (place.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setLatInput(lat.toFixed(6));
                setLngInput(lng.toFixed(6));
                onFlyTo(lat, lng, 1200);
                setIsFlying(true);
                setTimeout(() => setIsFlying(false), 2000);
              }
            });
            
            autocompleteRef.current = autocomplete;
          }
        } catch (e) {
          console.error("Failed to load Autocomplete:", e);
        }
      };

      initAutocomplete();
    }
  }, [isOpen, onFlyTo]);

  const handleFlyTo = () => {
    setError('');
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    const alt = parseFloat(altInput) || 1200;

    if (isNaN(lat) || isNaN(lng)) {
      setError('Invalid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -181 || lng > 181) {
      setError('Coordinates out of range');
      return;
    }

    setIsFlying(true);
    onFlyTo(lat, lng, alt);
    setTimeout(() => setIsFlying(false), 2000);
  };

  const handleSyncCenter = () => {
    const center = onGetCurrentCenter();
    if (center) {
      setLatInput(center.lat.toFixed(6));
      setLngInput(center.lng.toFixed(6));
      setAltInput(center.alt.toString());
      setError('');
    }
  };

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setLatInput(preset.lat.toString());
    setLngInput(preset.lng.toString());
    setShowPresets(false);
    onFlyTo(preset.lat, preset.lng, 1200);
    setIsFlying(true);
    setTimeout(() => setIsFlying(false), 2000);
  };

  const handleDetectWasteland = async () => {
    const center = onGetCurrentCenter();
    if (!center) return;
    
    setError('');
    setIsSearchingWasteland(true);
    setCandidates([]);
    
    await wastelandMut.mutateAsync({
      lat: center.lat,
      lng: center.lng,
      radiusKm: 2.0
    });
  };

  if (!isOpen) return null;


  return (
    <div className="relative w-full">
      <div className="overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-xl">
        
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isFlying ? 'bg-emerald-500' : 'bg-indigo-500'} shadow-lg`}>
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">Navigate</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{isFlying ? 'Flying...' : 'Enter coordinates'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          
          {/* Search by Place */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Search Place</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search location..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Coordinates Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Coordinates</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={latInput}
                onChange={(e) => { setLatInput(e.target.value); setError(''); }}
                placeholder="Lat"
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600"
              />
              <input
                type="number"
                value={lngInput}
                onChange={(e) => { setLngInput(e.target.value); setError(''); }}
                placeholder="Lng"
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600"
              />
              <input
                type="number"
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                placeholder="Alt"
                className="w-20 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncCenter}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-slate-600 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-indigo-500/10 group"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Sync
          </button>

          {/* Error */}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-xs flex items-center gap-2">
              <span className="font-bold">✕</span>
              <span>{error}</span>
            </div>
          )}

          {/* Preset Cities */}
          <div className="space-y-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-all"
            >
              Quick Cities
              <span className={`transition-transform ${showPresets ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {showPresets && (
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetClick(preset)}
                    className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-indigo-500/30 text-white text-xs font-semibold transition-all border border-slate-700 hover:border-indigo-500/50"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Wasteland Detection Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Discovery Mode
              </label>
              <span className="text-[10px] text-emerald-500/50 font-black uppercase">Wasteland Audit</span>
            </div>
            
            <button
              onClick={handleDetectWasteland}
              disabled={isSearchingWasteland}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-emerald-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              {isSearchingWasteland ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4 group-hover:scale-125 transition-transform" />
              )}
              <span className="relative">{isSearchingWasteland ? 'Auditing Urban Core...' : 'Detect Nearby Wastelands'}</span>
            </button>

            {candidates.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onFlyTo(c.center.lat, c.center.lng, 800)}
                    className="w-full p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-emerald-500/40 text-left transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[10px] font-black text-white uppercase">{c.land_use_tag.replace('_', ' ')}</span>
                      <span className="text-[10px] font-black text-emerald-400">{(c.suitability_index * 100).toFixed(0)}% MATCH</span>
                    </div>
                    <p className="text-[11px] text-white/60 leading-tight line-clamp-2 italic">"{c.technical_description}"</p>
                    <div className="mt-2 flex items-center gap-2 text-[9px] text-white/30 font-bold uppercase">
                      <MapPin className="w-2.5 h-2.5" />
                      {c.center.lat.toFixed(4)}, {c.center.lng.toFixed(4)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleFlyTo}
              disabled={!isViewerReady || isFlying || !latInput || !lngInput}
              className="flex-1 py-2.5 px-3 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              {isFlying ? 'Flying...' : 'Fly To'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold uppercase tracking-wider border border-slate-700 hover:border-slate-600 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinateSearch;
