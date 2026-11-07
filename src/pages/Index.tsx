import { useState, useCallback, useRef, useEffect } from 'react';
import CesiumViewer from '@/components/CesiumViewer';
import AnalysisBuilderPage from '@/components/AnalysisBuilderPage';
import CityBuilderPage from '@/components/CityBuilderPage';
import ControlPanel from '@/components/ControlPanel';
import CoordinateSearch from '@/components/CoordinateSearch';
import AreaMeasurement from '@/components/AreaMeasurement';
import ProjectBadge from '@/components/ProjectBadge';
import BackendStatus from '@/components/BackendStatus';
import MainNavigation, { PanelType } from '@/components/MainNavigation';
import type { GeoJSONPolygon } from '@/services/api';
import { useAppStore } from '@/store';

const Index = () => {
  const {
    layers, toggleLayer,
    translucency, setTranslucency,
    terrainExaggeration, setTerrainExaggeration,
    isViewerReady, setIsViewerReady,
    isNightMode, setIsNightMode,
    currentPolygon, setCurrentPolygon,
    centerLat, centerLng, setCenter,
    activePanel, setActivePanel,
    autoZoom, setAutoZoom,
    activeBuilderTool, setActiveBuilderTool,
    isAreaLocked, setIsAreaLocked
  } = useAppStore();

  const flyToRef = useRef<((lat: number, lng: number, alt?: number) => void) | null>(null);
  const getCenterRef = useRef<(() => { lat: number, lng: number, alt: number } | null) | null>(null);
  const drawAreaRef = useRef<((lat: number, lng: number, areaSqm: number, shape: 'circle' | 'square', cityModel?: string) => void) | null>(null);
  const clearAreaRef = useRef<(() => void) | null>(null);
  const generateCityRef = useRef<((config: Record<string, unknown>) => void) | null>(null);

  const [analysisResults, setAnalysisResults] = useState({
    suitability: 0.65,
    ndvi: 0.4,
    ndwi: 0.3
  });

  const handleAnalysisComplete = useCallback((results: { suitability: number; ndvi: number; ndwi: number }): void => {
    setAnalysisResults(results);
  }, []);

  const handleToggleLayer = useCallback((key: keyof typeof layers) => {
    toggleLayer(key as "buildings" | "googleLabels");
  }, [toggleLayer]);

  const handleReady = useCallback(() => setIsViewerReady(true), [setIsViewerReady]);

  const handleFlyToReady = useCallback((flyTo: (lat: number, lng: number, alt?: number) => void) => {
    flyToRef.current = flyTo;
  }, []);

  const handleGetCenterReady = useCallback((getCenter: () => { lat: number, lng: number, alt: number } | null) => {
    getCenterRef.current = getCenter;
  }, []);

  const handleDrawAreaReady = useCallback((drawArea: (lat: number, lng: number, areaSqm: number, shape: 'circle' | 'square', cityModel?: string) => void) => {
    drawAreaRef.current = drawArea;
  }, []);

  const handleClearAreasReady = useCallback((clearAreas: () => void) => {
    clearAreaRef.current = clearAreas;
  }, []);

  const handleGenerateCityReady = useCallback((generateCity: (config: Record<string, unknown>) => void) => {
    generateCityRef.current = generateCity;
  }, []);

  const handleFlyTo = useCallback((lat: number, lng: number, alt?: number) => {
    if (flyToRef.current) {
      flyToRef.current(lat, lng, alt);
    }
  }, []);

  const handleGetCurrentCenter = useCallback(() => {
    return getCenterRef.current ? getCenterRef.current() : null;
  }, []);

  const handleDrawArea = useCallback((areaSqm: number, shape: 'circle' | 'square', cityModel?: string) => {
    const center = handleGetCurrentCenter();
    if (center && drawAreaRef.current) {
      drawAreaRef.current(center.lat, center.lng, areaSqm, shape, cityModel);
      
      const halfSide = Math.sqrt(areaSqm) / 2;
      const latOffset = (halfSide / 111320);
      const lngOffset = halfSide / (111320 * Math.cos(center.lat * Math.PI / 180));
      
      const polygon: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [[
          [center.lng - lngOffset, center.lat - latOffset],
          [center.lng + lngOffset, center.lat - latOffset],
          [center.lng + lngOffset, center.lat + latOffset],
          [center.lng - lngOffset, center.lat + latOffset],
          [center.lng - lngOffset, center.lat - latOffset],
        ]],
      };
      
      setCurrentPolygon(polygon);
      setCenter(center.lat, center.lng);
      setAutoZoom(false); // Disable auto-zoom when manually drawing
      
      // Auto-open analysis panel after drawing
      setActivePanel('analyze');
    }
  }, [handleGetCurrentCenter]);

  const handleClearArea = useCallback(() => {
    if (isAreaLocked) return;
    if (clearAreaRef.current) {
      clearAreaRef.current();
      setCurrentPolygon(null);
    }
  }, [isAreaLocked]);

  const handlePolygonCreated = useCallback((polygon: GeoJSONPolygon, lat: number, lng: number) => {
    setCurrentPolygon(polygon);
    setCenter(lat, lng);
  }, [setCurrentPolygon, setCenter]);

  const handleGenerateCity = useCallback((config: Record<string, unknown>): void => {
    if (generateCityRef.current) {
      generateCityRef.current(config);
    }
  }, []);

  const handlePanelToggle = useCallback((panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  }, [activePanel, setActivePanel]);

  const handleMovePolygon = useCallback((latOffset: number, lngOffset: number) => {
    if (!currentPolygon) return;
    
    const newCoords = currentPolygon.coordinates[0].map(([lng, lat]) => [
      lng + lngOffset,
      lat + latOffset
    ]);

    const newPolygon: GeoJSONPolygon = {
      ...currentPolygon,
      coordinates: [newCoords] as any
    };

    setCurrentPolygon(newPolygon);
    setCenter(centerLat + latOffset, centerLng + lngOffset);
  }, [currentPolygon, centerLat, centerLng, setCurrentPolygon, setCenter]);

  // Only fly to the area when it is FIRST selected or changed, not every time the panel toggles
  useEffect(() => {
    if (currentPolygon && centerLat && centerLng && !isAreaLocked) {
      handleFlyTo(centerLat, centerLng, 1200);
    }
  }, [currentPolygon]); // Only depend on the polygon itself changing

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background font-sans">
      <CesiumViewer
        layers={layers}
        translucency={translucency}
        isNightMode={isNightMode}
        terrainExaggeration={terrainExaggeration}
        selectedPolygon={currentPolygon}
        autoZoom={autoZoom}
        activeBuilderTool={activeBuilderTool}
        isBuilderMode={activePanel === 'plan'}
        onReady={handleReady}
        onFlyToReady={handleFlyToReady}
        onGetCenterReady={handleGetCenterReady}
        onPlaceIdentified={() => {}}
        onDrawAreaReady={handleDrawAreaReady}
        onClearAreasReady={handleClearAreasReady}
        onPolygonCreated={handlePolygonCreated}
        onGenerateCityReady={handleGenerateCityReady}
      />

<div className="absolute top-4 left-4 z-20 pointer-events-none">
          <ProjectBadge />
          <div className="mt-2 pointer-events-auto">
            <BackendStatus />
          </div>
        </div>

       {/* RIGHT SIDE PANEL CONTAINER */}
       <div className="absolute top-4 right-4 z-20 w-[380px] flex flex-col gap-4 pointer-events-none max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
          <div className="space-y-4 pointer-events-auto">
            {/* NAVIGATE PANEL */}
            <div className={activePanel === 'navigate' ? 'animate-in fade-in slide-in-from-right duration-500' : 'hidden'}>
               <div className="space-y-4">
                  <CoordinateSearch
                    onFlyTo={handleFlyTo}
                    onGetCurrentCenter={handleGetCurrentCenter}
                    isViewerReady={isViewerReady}
                    isOpen={activePanel === 'navigate'}
                    onClose={() => setActivePanel(null)}
                  />
                  <AreaMeasurement
                    onDrawArea={handleDrawArea}
                    onClearArea={handleClearArea}
                    isViewerReady={isViewerReady}
                  />
               </div>
            </div>

            {/* PLAN – Analysis Side Panel is now a full-screen overlay (see below) */}

            {/* SETTINGS PANEL */}
            <div className={activePanel === 'settings' ? 'animate-in fade-in slide-in-from-right duration-500' : 'hidden'}>
              <ControlPanel
                layers={layers}
                onToggleLayer={handleToggleLayer}
                translucency={translucency}
                onTranslucencyChange={setTranslucency}
                terrainExaggeration={terrainExaggeration}
                onTerrainExaggerationChange={setTerrainExaggeration}
                isNightMode={isNightMode}
                onToggleNightMode={() => setIsNightMode(!isNightMode)}
                isViewerReady={isViewerReady}
                isOpen={activePanel === 'settings'}
                onClose={() => setActivePanel(null)}
              />
            </div>


           </div>
        </div>

       {/* MAIN NAVIGATION DOCK - Always visible as requested */}
       <div>
         <MainNavigation 
           activePanel={activePanel} 
           onPanelToggle={handlePanelToggle} 
         />
       </div>

       {/* ANALYSIS BUILDER – Full-screen overlay */}
       {activePanel === 'analyze' && (
         <AnalysisBuilderPage
           polygon={currentPolygon}
           centerLat={centerLat}
           centerLng={centerLng}
           onFlyTo={handleFlyTo}
           onAnalysisComplete={handleAnalysisComplete}
           onClose={() => setActivePanel(null)}
         />
       )}

{/* CITY BUILDER – Full-screen SimCity overlay */}
        {activePanel === 'plan' && (
          <CityBuilderPage
            polygon={currentPolygon}
            polygonLat={centerLat}
            polygonLng={centerLng}
            suitabilityScore={analysisResults.suitability}
            ndvi={analysisResults.ndvi}
            ndwi={analysisResults.ndwi}
            isAreaLocked={isAreaLocked}
            onAreaLockToggle={() => setIsAreaLocked(!isAreaLocked)}
            activeBuilderTool={activeBuilderTool}
            onToolSelect={setActiveBuilderTool}
            onFlyTo={handleFlyTo}
            onGenerateCity={handleGenerateCity}
            onMovePolygon={handleMovePolygon}
            onClose={() => { setActivePanel(null); setActiveBuilderTool(null); }}
            onSelectArea={() => setActivePanel('navigate')}
          />
        )}
    </div>
  );
};

export default Index;
