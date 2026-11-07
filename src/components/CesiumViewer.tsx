import { useEffect, useRef, useState, memo } from 'react';
import { MALLESHWARAM_CENTER } from '@/data/malleshwaram-utilities';
import type { GeoJSONPolygon } from '@/services/api';
import { useAppStore } from '@/store';

interface LayerVisibility {
  buildings: boolean;
  googleLabels: boolean;
}

interface CesiumViewerProps {
  layers: LayerVisibility;
  translucency: number;
  isNightMode: boolean;
  terrainExaggeration: number;
  selectedPolygon?: GeoJSONPolygon | null;
  onReady: () => void;
  onFlyToReady: (flyTo: (lat: number, lng: number, alt?: number) => void) => void;
  onGetCenterReady: (getCenter: () => { lat: number, lng: number, alt: number } | null) => void;
  onPlaceIdentified?: (lat: number, lng: number, name: string) => void;
  onDrawAreaReady?: (drawArea: (lat: number, lng: number, areaSqm: number, shape: 'circle' | 'square', cityModel?: string) => void) => void;
  onClearAreasReady?: (clearAreas: () => void) => void;
  onPolygonCreated?: (polygon: GeoJSONPolygon, lat: number, lng: number) => void;
  onGenerateCityReady?: (generateCity: (config: Record<string, any>) => void) => void;
  onPolygonBoundsReady?: (bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) => void;
  activeBuilderTool?: string | null;
  onPlaceEntity?: (lat: number, lng: number, type: string) => void;
  autoZoom?: boolean;
  isBuilderMode?: boolean;
}

type CesiumType = any;

const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || '';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const CesiumViewer = ({ 
  layers, 
  translucency, 
  isNightMode,
  terrainExaggeration = 1.0,
  selectedPolygon,
  onReady, 
  onFlyToReady, 
  onGetCenterReady, 
  onPlaceIdentified,
  onDrawAreaReady,
  onClearAreasReady,
  onPolygonCreated,
  onGenerateCityReady,
  onPolygonBoundsReady,
  activeBuilderTool,
  onPlaceEntity,
  autoZoom = false,
  isBuilderMode = false
}: CesiumViewerProps) => {
  const onReadyRef = useRef(onReady);
  const onFlyToReadyRef = useRef(onFlyToReady);
  const onGetCenterReadyRef = useRef(onGetCenterReady);
  const onPlaceIdentifiedRef = useRef(onPlaceIdentified);
  const onDrawAreaReadyRef = useRef(onDrawAreaReady);
  const onClearAreasReadyRef = useRef(onClearAreasReady);
  const onPolygonCreatedRef = useRef(onPolygonCreated);
  const onGenerateCityReadyRef = useRef(onGenerateCityReady);
  const onPolygonBoundsReadyRef = useRef(onPolygonBoundsReady);
  const onPlaceEntityRef = useRef(onPlaceEntity);
  const activeBuilderToolRef = useRef(activeBuilderTool);
  const isBuilderModeRef = useRef(isBuilderMode);

  useEffect(() => {
    onReadyRef.current = onReady;
    onFlyToReadyRef.current = onFlyToReady;
    onGetCenterReadyRef.current = onGetCenterReady;
    onPlaceIdentifiedRef.current = onPlaceIdentified;
    onDrawAreaReadyRef.current = onDrawAreaReady;
    onClearAreasReadyRef.current = onClearAreasReady;
    onPolygonCreatedRef.current = onPolygonCreated;
    onGenerateCityReadyRef.current = onGenerateCityReady;
    onPolygonBoundsReadyRef.current = onPolygonBoundsReady;
    onPlaceEntityRef.current = onPlaceEntity;
    activeBuilderToolRef.current = activeBuilderTool;
  }, [
    onReady, 
    onFlyToReady, 
    onGetCenterReady, 
    onPlaceIdentified, 
    onDrawAreaReady, 
    onClearAreasReady, 
    onPolygonCreated, 
    onGenerateCityReady, 
    onPolygonBoundsReady,
    onPlaceEntity,
    activeBuilderTool,
    isBuilderMode
  ]);

  useEffect(() => {
    isBuilderModeRef.current = isBuilderMode;
  }, [isBuilderMode]);

  const { placedBuildings, interactionMode, selectedBuildingModel, isEditMode, addPlacedBuilding, removePlacedBuilding, updatePlacedBuilding } = useAppStore();

  const markerRef = useRef<CesiumType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumType>(null);
  const entitiesRef = useRef<Map<string, CesiumType>>(new Map());
  const buildingsRef = useRef<CesiumType>(null);
  const labelsLayerRef = useRef<CesiumType>(null);
  const selectionPolygonEntityRef = useRef<CesiumType>(null);
  const previewEntityRef = useRef<CesiumType>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number; height: number | null }>({ lat: 0, lng: 0, height: null });
  const selectionCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const [selectionScreenPos, setSelectionScreenPos] = useState<{ x: number; y: number } | null>(null);

  const isNightModeRef = useRef(isNightMode);
  const layersRef = useRef(layers);

  useEffect(() => {
    isNightModeRef.current = isNightMode;
  }, [isNightMode]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const Cesium = (window as any).Cesium;

    if (isBuilderMode) {
      // Hide all existing layers
      for (let i = 0; i < viewer.imageryLayers.length; i++) {
        viewer.imageryLayers.get(i).show = false;
      }

      // Add Grid Layer
      const gridProvider = new Cesium.GridImageryProvider({
        color: Cesium.Color.fromCssColorString('#334155').withAlpha(0.2),
        glowColor: Cesium.Color.fromCssColorString('#00d2ff').withAlpha(0.1),
        backgroundColor: Cesium.Color.fromCssColorString('#0f172a'),
        canvasSize: 512,
        cells: 8
      });
      const gridLayer = viewer.imageryLayers.addImageryProvider(gridProvider);
      (viewer as any)._builderGridLayer = gridLayer; // store reference
      
      viewer.scene.skyAtmosphere.show = false;
      viewer.scene.fog.enabled = false;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0f172a');
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0f172a');

      // Update cartographic limit rectangle to isolate the selected area
      if (selectedPolygon && selectedPolygon.coordinates[0]) {
        const coords = selectedPolygon.coordinates[0];
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        coords.forEach((c: number[]) => {
          minLng = Math.min(minLng, c[0]);
          maxLng = Math.max(maxLng, c[0]);
          minLat = Math.min(minLat, c[1]);
          maxLat = Math.max(maxLat, c[1]);
        });
        viewer.scene.globe.cartographicLimitRectangle = Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat);
      }
      
      // Hide identification UI
      if (viewer.infoBox) viewer.infoBox.container.style.display = 'none';
      if (viewer.selectionIndicator) viewer.selectionIndicator.viewModel.showSelectionIndicator = false;
      
    } else {
      // Remove Grid Layer if it exists
      if ((viewer as any)._builderGridLayer) {
        viewer.imageryLayers.remove((viewer as any)._builderGridLayer);
        delete (viewer as any)._builderGridLayer;
      }

      // Show original layers
      for (let i = 0; i < viewer.imageryLayers.length; i++) {
        viewer.imageryLayers.get(i).show = true;
      }
      
      // Re-enable Real World Mode
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.fog.enabled = true;
      viewer.scene.globe.baseColor = Cesium.Color.BLACK;
      
      const karnatakaRectangle = Cesium.Rectangle.fromDegrees(74.0, 11.5, 78.6, 18.5);
      viewer.scene.globe.cartographicLimitRectangle = karnatakaRectangle;
      
      if (viewer.infoBox) viewer.infoBox.container.style.display = 'block';
      if (viewer.selectionIndicator) viewer.selectionIndicator.viewModel.showSelectionIndicator = true;
    }

    // Toggle OSM Buildings based on City Section (isBuilderMode)
    if (buildingsRef.current) {
      buildingsRef.current.show = !isBuilderMode;
    }
  }, [isBuilderMode, selectedPolygon]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    
    const Cesium: CesiumType = (window as CesiumType).Cesium;
    if (!Cesium || !Cesium.Viewer) {
      console.error('CesiumJS not loaded');
      return;
    }

    if (CESIUM_TOKEN && Cesium.Ion && Cesium.Ion.defaultAccessToken !== undefined) {
      try {
        Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;
      } catch (e) {
        console.warn('Could not set Cesium Ion token:', e);
      }
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrainProvider: undefined,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: !isBuilderModeRef.current,
      selectionIndicator: !isBuilderModeRef.current,
      shadows: false,
    });

    viewerRef.current = viewer;

    // Enable lighting for day/night and restrict to Karnataka
    viewer.scene.globe.enableLighting = true;
    const karnatakaRectangle = Cesium.Rectangle.fromDegrees(74.0, 11.5, 78.6, 18.5);
    viewer.scene.globe.cartographicLimitRectangle = karnatakaRectangle;

    // Sandbox / Builder Mode initial setup
    if (isBuilderModeRef.current) {
      viewer.scene.skyAtmosphere.show = false;
      viewer.scene.fog.enabled = false;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0f172a');
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0f172a');
      viewer.scene.moon.show = false;
      viewer.scene.sun.show = false;
    }

    // Set terrain
    Cesium.createWorldTerrainAsync().then((terrain: unknown) => {
      if (!viewerRef.current || viewerRef.current.isDestroyed?.()) return;
      viewerRef.current.terrainProvider = terrain;
    });

    // Add Google Maps Imagery (Satellite Base + Labels Overlay)
    try {
      // Base Satellite (lyrs=s) - Clean satellite imagery without any labels
      const googleSatellite = new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', 
        credit: 'Google Satellite'
      });
      
      viewer.imageryLayers.addImageryProvider(googleSatellite);

      // Labels Overlay (lyrs=h) - Transparent layer with shops, roads, and place names
      const labelOverlay = new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', 
        credit: 'Google Maps Labels'
      });
      labelsLayerRef.current = viewer.imageryLayers.addImageryProvider(labelOverlay);
      labelsLayerRef.current.show = layersRef.current.googleLabels;
    } catch (e) {
      console.warn('Google Maps imagery failed to load, falling back to Ion:', e);
      viewer.imageryLayers.addImageryProvider(
        Cesium.createWorldImageryAsync({
          style: Cesium.IonWorldImageryStyle.ROADMAP_SELECTIVE
        })
      );
    }

    // Load OSM buildings
    Cesium.createOsmBuildingsAsync().then((buildings: unknown) => {
      if (!viewerRef.current || viewerRef.current.isDestroyed?.()) return;
      buildingsRef.current = viewerRef.current.scene.primitives.add(buildings);
    });

    // Load Karnataka State Boundary
    const karnatakaColor = Cesium.Color.fromCssColorString('#00d2ff');
    Cesium.GeoJsonDataSource.load('/karnataka.geojson', {
      stroke: karnatakaColor.withAlpha(0.8),
      fill: karnatakaColor.withAlpha(0.05),
      strokeWidth: 3,
      clampToGround: true,
    }).then((dataSource: any) => {
      if (!viewerRef.current || viewerRef.current.isDestroyed?.()) return;
      dataSource.entities.values.forEach((entity: any) => {
        if (entity.polygon) (entity.polygon as any).outline = false;
        if (entity.polyline) (entity.polyline as any).outline = false;
      });
      viewerRef.current.dataSources.add(dataSource);
    }).catch((err: any) => {
      console.error('Failed to load Karnataka border:', err);
    });

    // Fly to Malleshwaram
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        MALLESHWARAM_CENTER.longitude,
        MALLESHWARAM_CENTER.latitude,
        1200
      ),
      orientation: {
        heading: Cesium.Math.toRadians(30),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 2.5,
      complete: () => {
        setIsInitialized(true);
        onReadyRef.current?.();
      },
    });

    // Real-time Coordinate Tracking
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: Record<string, unknown>) => {
      const ray = viewer.camera.getPickRay(movement.endPosition);
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      
      if (Cesium.defined(cartesian)) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        
        // Snap to 10m grid for building placement
        const snapStep = 0.0001;
        const snappedLat = Math.round(lat / snapStep) * snapStep;
        const snappedLng = Math.round(lng / snapStep) * snapStep;
        const snappedPos = Cesium.Cartesian3.fromDegrees(snappedLng, snappedLat);

        setMouseCoords({
          lng: snappedLng,
          lat: snappedLat,
          height: cartographic.height,
        });

        // Handle Ghost Preview
        if (isBuilderModeRef.current && activeBuilderToolRef.current) {
          if (!previewEntityRef.current) {
            previewEntityRef.current = viewer.entities.add({
              name: 'Preview',
              box: {
                dimensions: new Cesium.Cartesian3(15, 15, 10),
                material: Cesium.Color.WHITE.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.WHITE
              }
            });
          }
          previewEntityRef.current.position = snappedPos;
        } else if (previewEntityRef.current) {
          viewer.entities.remove(previewEntityRef.current);
          previewEntityRef.current = null;
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Click to Identify Feature OR Place Building (Direct 3D Builder)
    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction(async (click: Record<string, unknown>) => {
      // Feature disabled - no identification popup
      return;
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Expose flyToCoordinates for external use
    const flyToCoordinates = (lat: number, lng: number, alt: number = 1200) => {
      if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
      const v = viewerRef.current;

      // Fly camera to target
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, alt),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
        duration: 2.5,
      });
    };

    onFlyToReadyRef.current?.(flyToCoordinates);

    // Expose getCenterCoordinates
    const getCenterCoordinates = () => {
      if (!viewerRef.current) return null;
      const v = viewerRef.current;
      const camera = v.camera;
      const cartographic = camera.positionCartographic;
      
      // Also try to pick the center of the screen for more "real map" center
      const windowPosition = new Cesium.Cartesian2(
        v.container.clientWidth / 2,
        v.container.clientHeight / 2
      );
      const ray = camera.getPickRay(windowPosition);
      const cartesian = v.scene.globe.pick(ray, v.scene);
      
      if (Cesium.defined(cartesian)) {
        const pickedCartographic = Cesium.Cartographic.fromCartesian(cartesian);
        return {
          lat: Cesium.Math.toDegrees(pickedCartographic.latitude),
          lng: Cesium.Math.toDegrees(pickedCartographic.longitude),
          alt: Math.round(camera.positionCartographic.height)
        };
      }

      return {
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        lng: Cesium.Math.toDegrees(cartographic.longitude),
        alt: Math.round(cartographic.height)
      };
    };

    onGetCenterReadyRef.current?.(getCenterCoordinates);

    // Expose drawArea
    const drawArea = (lat: number, lng: number, areaSqm: number, shape: 'circle' | 'square', cityModel?: string) => {
      if (!viewerRef.current) return;
      const v = viewerRef.current;
      const Cesium = (window as any).Cesium;

      const position = Cesium.Cartesian3.fromDegrees(lng, lat);
      
      const entityOptions: Record<string, unknown> = {
        position: position,
        description: `Drawn Area: ${areaSqm.toFixed(2)} sqm`,
        label: {
          text: `Area: ${(areaSqm / 4046.86).toFixed(2)} Acres`,
          font: "14px sans-serif",
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      };

      if (shape === 'circle') {
        const radius = Math.sqrt(areaSqm / Math.PI);
        entityOptions.ellipse = {
          semiMinorAxis: radius,
          semiMajorAxis: radius,
          material: Cesium.Color.fromCssColorString('#e11d48').withAlpha(0.2), // Rose 600
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        };
      } else if (shape === 'square') {
        const side = Math.sqrt(areaSqm);
        const latOffset = (side / 2) / 111320;
        const lngOffset = (side / 2) / (111320 * Math.cos(lat * Math.PI / 180));
        
        entityOptions.polygon = {
          hierarchy: Cesium.Cartesian3.fromDegreesArray([
            lng - lngOffset, lat - latOffset,
            lng + lngOffset, lat - latOffset,
            lng + lngOffset, lat + latOffset,
            lng - lngOffset, lat + latOffset,
          ]),
          material: Cesium.Color.fromCssColorString('#e11d48').withAlpha(0.2), // Rose 600
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        };
      }

      // Add 3D Model if selected
      if (cityModel) {
        const side = Math.sqrt(areaSqm);
        // Base sizes to normalize scale 1.0 (actual natural widths in meters from GLTF analysis)
        const baseSizes: Record<string, number> = {
          'city': 640,
          'city_3d_model': 2700,
          'city_mapnot_a_scan': 20300 // Corrected from 300 to 20300
        };

        const baseSize = baseSizes[cityModel] || 640;
        const scaleFactor = side / baseSize; 

        entityOptions.model = {
          uri: `/3d-models/${cityModel}/scene.gltf`,
          scale: scaleFactor,
          maximumScale: 50000,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          allowPicking: false // 'Lock' it so it doesn't highlight when clicked
        };
      }

      const entity = v.entities.add(entityOptions);
      
      // If a model is loaded, we clear selection for a 'locked' feel
      if (cityModel) {
        v.selectedEntity = undefined;
      }

      // Create GeoJSON polygon for API analysis
      let coordinates: number[][][];
      if (shape === 'circle') {
        const radius = Math.sqrt(areaSqm / Math.PI);
        const points: number[][] = [];
        const numPoints = 32;
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI;
          const dx = (radius / 111320) * Math.cos(angle);
          const dy = (radius / 111320) * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
          points.push([lng + dy, lat + dx]);
        }
        coordinates = [points];
      } else {
        const side = Math.sqrt(areaSqm);
        const latOffset = (side / 2) / 111320;
        const lngOffset = (side / 2) / (111320 * Math.cos(lat * Math.PI / 180));
        const ring: number[][] = [
          [lng - lngOffset, lat - latOffset],
          [lng + lngOffset, lat - latOffset],
          [lng + lngOffset, lat + latOffset],
          [lng - lngOffset, lat + latOffset],
          [lng - lngOffset, lat - latOffset],
        ];
        coordinates = [ring];
      }

      // Emit polygon for analysis
      if (onPolygonCreatedRef.current) {
        onPolygonCreatedRef.current({ type: 'Polygon', coordinates }, lat, lng);
      }
    };

    if (onDrawAreaReadyRef.current) {
      onDrawAreaReadyRef.current(drawArea);
    }

    // Expose clearAreas
    const clearAreas = () => {
      if (!viewerRef.current) return;
      const ds = viewerRef.current.dataSources.getByName('SmartCity')[0];
      if (ds) ds.entities.removeAll();
      // Remove manual entities placed by the tool
      viewerRef.current.entities.removeAll(); // This removes manual tool entities (which are fine to clear on Reset)
      markerRef.current = null;
    };

    // Utility for point-in-polygon check
    const isPointInPolygon = (lat: number, lng: number, polygonCoords: number[][]) => {
      let inside = false;
      for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
        const xi = polygonCoords[i][0], yi = polygonCoords[i][1];
        const xj = polygonCoords[j][0], yj = polygonCoords[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const renderCustomGridCity = (
      gridData: { cells: string[][]; size: number; pipelines?: any },
      center: { lat: number; lng: number },
      cellSize: number,
      dataSource: any,
      cityStyle: string,
      polygonCoords?: number[][]
    ) => {
      const gridSize = gridData.size;

      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      if (polygonCoords && polygonCoords.length > 0) {
        polygonCoords.forEach(c => {
          minLng = Math.min(minLng, c[0]);
          maxLng = Math.max(maxLng, c[0]);
          minLat = Math.min(minLat, c[1]);
          maxLat = Math.max(maxLat, c[1]);
        });
      } else {
        minLat = center.lat - 0.005; maxLat = center.lat + 0.005;
        minLng = center.lng - 0.005; maxLng = center.lng + 0.005;
      }

      const midLat = (minLat + maxLat) / 2;
      const cellDLat = (maxLat - minLat) / gridSize;
      const cellDLng = (maxLng - minLng) / gridSize;
      const polygonWidth = (maxLng - minLng) * 111320 * Math.cos(midLat * Math.PI / 180);
      const polygonHeight = (maxLat - minLat) * 111320;
      const actualCellSize = Math.max(polygonWidth, polygonHeight) / gridSize;
      const baseSize = Math.max(8, Math.min(40, actualCellSize * 0.6));
      const halfCell = 0.45; // fraction of cell for road width

      // ── Pass 1: Roads as polylines ──
      // Horizontal roads
      for (let y = 0; y < gridSize; y++) {
        const segments: number[] = [];
        let isPrimary = false;
        for (let x = 0; x < gridSize; x++) {
          const ct = gridData.cells[y][x];
          if (ct === 'road_primary' || ct === 'road_secondary') {
            if (ct === 'road_primary') isPrimary = true;
            const lng = minLng + (x + 0.5) / gridSize * (maxLng - minLng);
            const lat = minLat + (y + 0.5) / gridSize * (maxLat - minLat);
            if (polygonCoords && !isPointInPolygon(lat, lng, polygonCoords)) continue;
            segments.push(lng, lat);
          } else if (segments.length >= 4) {
            dataSource.entities.add({
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(segments),
                width: isPrimary ? 6 : 3,
                material: isPrimary
                  ? Cesium.Color.fromCssColorString('#fcd34d').withAlpha(0.9)
                  : Cesium.Color.fromCssColorString('#475569').withAlpha(0.7),
                clampToGround: true,
                classificationType: Cesium.ClassificationType.TERRAIN
              },
            });
            segments.length = 0;
            isPrimary = false;
          }
        }
        if (segments.length >= 4) {
          dataSource.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray(segments),
              width: isPrimary ? 6 : 3,
              material: isPrimary
                ? Cesium.Color.fromCssColorString('#fcd34d').withAlpha(0.9)
                : Cesium.Color.fromCssColorString('#475569').withAlpha(0.7),
              clampToGround: true,
            },
          });
        }
      }
      // Vertical roads
      for (let x = 0; x < gridSize; x++) {
        const segments: number[] = [];
        let isPrimary = false;
        for (let y = 0; y < gridSize; y++) {
          const ct = gridData.cells[y][x];
          if (ct === 'road_primary' || ct === 'road_secondary') {
            if (ct === 'road_primary') isPrimary = true;
            const lng = minLng + (x + 0.5) / gridSize * (maxLng - minLng);
            const lat = minLat + (y + 0.5) / gridSize * (maxLat - minLat);
            if (polygonCoords && !isPointInPolygon(lat, lng, polygonCoords)) continue;
            segments.push(lng, lat);
          } else if (segments.length >= 4) {
            dataSource.entities.add({
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(segments),
                width: isPrimary ? 6 : 3,
                material: isPrimary
                  ? Cesium.Color.fromCssColorString('#fcd34d').withAlpha(0.9)
                  : Cesium.Color.fromCssColorString('#475569').withAlpha(0.7),
                clampToGround: true,
                classificationType: Cesium.ClassificationType.TERRAIN
              },
            });
            segments.length = 0;
            isPrimary = false;
          }
        }
        if (segments.length >= 4) {
          dataSource.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray(segments),
              width: isPrimary ? 6 : 3,
              material: isPrimary
                ? Cesium.Color.fromCssColorString('#fcd34d').withAlpha(0.9)
                : Cesium.Color.fromCssColorString('#475569').withAlpha(0.7),
              clampToGround: true,
            },
          });
        }
      }

      // ── Pass 2: Buildings are now handled interactively via placedBuildings state ──

      // ── Pass 4: Utility Pipelines ──
      if (gridData.pipelines) {
        const pipeTypes = [
          { key: 'water', color: '#3b82f6', width: 2, alt: 1 },
          { key: 'sewage', color: '#78350f', width: 2.5, alt: 0.5 },
          { key: 'gas', color: '#f59e0b', width: 1.5, alt: 1.5 }
        ];

        pipeTypes.forEach(pipe => {
          const networks = gridData.pipelines[pipe.key] || [];
          networks.forEach((path: [number, number][]) => {
            const positions = path.map(p => {
              const lng = minLng + (p[0] + 0.5) / gridSize * (maxLng - minLng);
              const lat = minLat + (p[1] + 0.5) / gridSize * (maxLat - minLat);
              return Cesium.Cartesian3.fromDegrees(lng, lat, pipe.alt);
            });

            dataSource.entities.add({
              polyline: {
                positions,
                width: pipe.width,
                material: new Cesium.PolylineGlowMaterialProperty({
                  glowPower: 0.2,
                  color: Cesium.Color.fromCssColorString(pipe.color).withAlpha(0.8)
                }),
                clampToGround: true,
                classificationType: Cesium.ClassificationType.TERRAIN
              },
            });
          });
        });
      }
    };

    const generateSmartCity = async (config: { 
      population: number, 
      density: 'low' | 'medium' | 'high', 
      polygon: any,
      cityStyle?: string,
      gridData?: { cells: string[][]; size: number } | null
    }): Promise<void> => {
      if (!viewerRef.current || !config.polygon) return;
      const v = viewerRef.current;
      const hasCustomGrid = config.gridData && config.gridData.cells && config.gridData.cells.length > 0;
      const coords = config.polygon.coordinates[0];
      let sumLat = 0, sumLng = 0;
      coords.forEach((c: any) => { sumLng += c[0]; sumLat += c[1]; });
      const center = { lat: sumLat / coords.length, lng: sumLng / coords.length };
      const lats = coords.map((c: any) => c[1]);
      const lngs = coords.map((c: any) => c[0]);
      const width = (Math.max(...lngs) - Math.min(...lngs)) * 111320 * Math.cos(center.lat * Math.PI / 180);
      const height = (Math.max(...lats) - Math.min(...lats)) * 111320;
      const gridSize = hasCustomGrid ? config.gridData!.size : 50;
      const cellSize = Math.max(width, height) / gridSize;

      let dataSource = v.dataSources.getByName('SmartCity')[0];
      if (!dataSource) {
        dataSource = new Cesium.CustomDataSource('SmartCity');
        v.dataSources.add(dataSource);
      }
      dataSource.entities.removeAll();

      const baseCoords = config.polygon.coordinates[0].flat();
      dataSource.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(baseCoords),
          material: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.85),
          height: 0, 
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          extrudedHeight: -3.0, 
          outline: false
        }
      });

      if (hasCustomGrid && config.gridData) {
        renderCustomGridCity(config.gridData, center, cellSize, dataSource, config.cityStyle || 'modern', coords);
      } else {
        const { generateRoadNetwork, generateBuildings, generateEnvironment } = await import('@/lib/procedural-city');
        const cityConfig = { center, width, height, gridSize, primaryGridStep: 3 };
        const roadsArr = generateRoadNetwork(cityConfig);
        [...roadsArr.primary, ...roadsArr.secondary].forEach((road: any) => {
          v.entities.add({
            polyline: {
              positions: road,
              width: road === roadsArr.primary ? 8 : 4,
              material: new Cesium.PolylineDashMaterialProperty({
                color: road === roadsArr.primary ? Cesium.Color.fromCssColorString('#fcd34d') : Cesium.Color.fromCssColorString('#475569'),
                dashLength: 16
              }),
              clampToGround: true
            }
          });
        });
        const env = generateEnvironment(cityConfig);
        env.water.forEach((river: any) => {
          v.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(river.positions),
              material: Cesium.Color.fromCssColorString('#0ea5e9').withAlpha(0.6),
              height: 0,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          });
        });
        env.parks.forEach((park: any) => {
          v.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(park.positions),
              material: Cesium.Color.fromCssColorString('#22c55e').withAlpha(0.4),
              height: 0,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          });
        });
        const buildings = generateBuildings(cityConfig);
        buildings.forEach((b: any) => {
          if (b.modelUri) {
            v.entities.add({
              position: b.position,
              orientation: Cesium.Transforms.headingPitchRollQuaternion(b.position, new Cesium.HeadingPitchRoll(b.orientation, 0, 0)),
              model: { 
                uri: b.modelUri, 
                scale: config.density === 'high' ? 1.2 : 0.8, 
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
              }
            });
          }
        });
      }
      // 6. Fly to focus - adjust altitude based on city size
      const viewPadding = Math.max(width, height) * 2.5;
      const targetAlt = Math.max(1800, viewPadding);

      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, targetAlt),
        orientation: { 
          heading: Cesium.Math.toRadians(0.0), 
          pitch: Cesium.Math.toRadians(-35.0) 
        }
      });
    };

    onFlyToReadyRef.current?.(flyToCoordinates);
    onGetCenterReadyRef.current?.(getCenterCoordinates);
    onDrawAreaReadyRef.current?.(drawArea);
    onClearAreasReadyRef.current?.(clearAreas);
    if (onGenerateCityReadyRef.current) onGenerateCityReadyRef.current(generateSmartCity);

    // Track selection center in screen space
    const removePostRender = viewer.scene.postRender.addEventListener(() => {
      if (selectionCenterRef.current) {
        const center = selectionCenterRef.current;
        const position = Cesium.Cartesian3.fromDegrees(center.lng, center.lat);
        const screenPos = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);
        if (screenPos) {
          setSelectionScreenPos({ x: screenPos.x, y: screenPos.y });
        } else {
          setSelectionScreenPos(null);
        }
      } else {
        setSelectionScreenPos(null);
      }
    });

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed?.()) {
        removePostRender();
        viewerRef.current.destroy?.();
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect((): void => {
    const viewer = viewerRef.current as any;
    if (!viewer) return;
    const Cesium = (window as unknown as any).Cesium;

    const time = isNightMode ? '2023-01-01T18:30:00Z' : '2023-01-01T06:30:00Z';
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601?.(time);
    viewer.clock.multiplier = 0;

  }, [isNightMode]);

  // Update layer visibility
  useEffect((): void => {
    if (!isInitialized) return;

    if (buildingsRef.current) {
      buildingsRef.current.show = layers.buildings;
    }
    
    if (labelsLayerRef.current) {
      labelsLayerRef.current.show = layers.googleLabels;
    }
  }, [layers, isInitialized]);

  // Terrain Exaggeration
  useEffect((): void => {

    const viewer = viewerRef.current as any;
    if (!viewer || !viewer.scene) return;
    
    viewer.scene.verticalExaggeration = terrainExaggeration;

  }, [terrainExaggeration]);

  // Effect to handle selected polygon - zoom and highlight the area
  useEffect(() => {
    if (!selectedPolygon || !viewerRef.current || !isInitialized) {
      selectionCenterRef.current = null;
      return;
    }
    
    const coords = selectedPolygon.coordinates[0];
    if (!coords || coords.length < 3) return;
    
    // Calculate bounds
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const point of coords) {
      minLng = Math.min(minLng, point[0]);
      maxLng = Math.max(maxLng, point[0]);
      minLat = Math.min(minLat, point[1]);
      maxLat = Math.max(maxLat, point[1]);
    }
    
    // Calculate center
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    selectionCenterRef.current = { lat: centerLat, lng: centerLng };
    
    // Calculate appropriate altitude based on polygon size
    const lngRange = maxLng - minLng;
    const latRange = maxLat - minLat;
    const maxRange = Math.max(lngRange, latRange);
    const alt = Math.max(1200, maxRange * 111320 * 4);
    
    // Lock and View the polygon area properly
    const lockAndViewArea = async () => {
      const v = viewerRef.current;
      if (!v) return;
      
      // Remove existing selection highlight
      if (selectionPolygonEntityRef.current) {
        try {
          v.dataSources.remove(selectionPolygonEntityRef.current, true);
        } catch (e) {}
        selectionPolygonEntityRef.current = null;
      }
      
      try {
        const Cesium = (window as unknown as any).Cesium;
        // Create highlight
        const highlightData = await Cesium.GeoJsonDataSource.load({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: selectedPolygon.coordinates
          },
          properties: {}
        }, {
          stroke: Cesium.Color.fromCssColorString('#00d2ff'),
          fill: Cesium.Color.fromCssColorString('#00d2ff').withAlpha(0.2),
          strokeWidth: 3,
          clampToGround: true,
        });
        
        highlightData.entities.values.forEach(entity => {
          if (entity.polygon) (entity.polygon as any).outline = false;
        });
        
        selectionPolygonEntityRef.current = highlightData;
        v.dataSources.add(highlightData);

        // PERFECT VIEW: Use native flyTo on the entire highlight data source
        // This ensures the whole area is visible properly regardless of its shape
        v.flyTo(highlightData, {
          duration: 2.0,
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(0),
            Cesium.Math.toRadians(-45),
            0 // range 0 lets Cesium calculate the best distance
          )
        });

        // LOCK: If it's a new polygon, we can track it to keep it centered
        // But we must be careful not to annoy the user. 
        // We'll just ensure it flies there once very solidly.

      } catch (e) {
        console.warn('Failed to lock view on area:', e);
      }
    };
    
    lockAndViewArea();
  }, [selectedPolygon, isInitialized]);

  // Handle Placed Buildings Rendering and Interactions
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const Cesium = (window as any).Cesium;

    // --- RENDERING ---
    let interactiveDs = viewer.dataSources.getByName('InteractiveBuildings')[0];
    if (!interactiveDs) {
      interactiveDs = new Cesium.CustomDataSource('InteractiveBuildings');
      viewer.dataSources.add(interactiveDs);
    }

    // Sync placedBuildings to entities
    const currentEntityIds = new Set(interactiveDs.entities.values.map((e: any) => e.id));
    
    placedBuildings.forEach(b => {
      if (!currentEntityIds.has(b.id)) {
        // Add new building
        const position = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, 0);
        const heading = Cesium.Math.toRadians(b.rotation);
        const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
        const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
        
        interactiveDs.entities.add({
          id: b.id,
          position: position,
          orientation: orientation,
          model: {
            uri: `/models/buildings/${b.modelUrl}`,
            scale: b.scale || 1.0,
            minimumPixelSize: 32,
            maximumScale: 200,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
          },
          properties: {
            isInteractiveBuilding: true,
            buildingId: b.id
          }
        });
      } else {
        // Update existing (position/rotation)
        const entity = interactiveDs.entities.getById(b.id);
        const position = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, 0);
        const heading = Cesium.Math.toRadians(b.rotation);
        const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
        const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
        
        entity.position = position;
        entity.orientation = orientation;
      }
      currentEntityIds.delete(b.id);
    });

    // Remove deleted buildings
    currentEntityIds.forEach(id => {
      interactiveDs.entities.removeById(id);
    });

    // --- INTERACTIONS ---
    if (!isEditMode) {
      if ((viewer as any)._interactiveHandler) {
        (viewer as any)._interactiveHandler.destroy();
        delete (viewer as any)._interactiveHandler;
      }
      return;
    }

    if (!(viewer as any)._interactiveHandler) {
      (viewer as any)._interactiveHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    }
    const handler = (viewer as any)._interactiveHandler;

    let draggingEntity: any = null;

    handler.setInputAction((movement: any) => {
      const pickedObject = viewer.scene.pick(movement.position);
      
      if (interactionMode === 'place' && selectedBuildingModel) {
        // Place new
        const cartesian = viewer.scene.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          addPlacedBuilding({
            id: `bld_${Math.random().toString(36).substr(2, 9)}`,
            modelUrl: selectedBuildingModel,
            lng: Cesium.Math.toDegrees(cartographic.longitude),
            lat: Cesium.Math.toDegrees(cartographic.latitude),
            rotation: Math.random() * 360,
            scale: 1.0 // default scale for manual placement
          });
        }
      } 
      else if (interactionMode === 'delete' && pickedObject && Cesium.defined(pickedObject.id)) {
        // Delete picked
        const entity = pickedObject.id;
        if (entity.properties && entity.properties.isInteractiveBuilding) {
          removePlacedBuilding(entity.id);
        }
      }
      else if (interactionMode === 'move' && pickedObject && Cesium.defined(pickedObject.id)) {
        // Start Drag
        const entity = pickedObject.id;
        if (entity.properties && entity.properties.isInteractiveBuilding) {
          draggingEntity = entity;
          viewer.scene.screenSpaceCameraController.enableInputs = false; // Disable camera movement while dragging
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    handler.setInputAction((movement: any) => {
      if (draggingEntity && interactionMode === 'move') {
        const cartesian = viewer.scene.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          // Optimistic update for UI smoothness
          draggingEntity.position = cartesian;
          // Update store
          updatePlacedBuilding(draggingEntity.id, {
            lng: Cesium.Math.toDegrees(cartographic.longitude),
            lat: Cesium.Math.toDegrees(cartographic.latitude)
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(() => {
      if (draggingEntity) {
        draggingEntity = null;
        viewer.scene.screenSpaceCameraController.enableInputs = true;
      }
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

  }, [placedBuildings, interactionMode, selectedBuildingModel, isEditMode, addPlacedBuilding, removePlacedBuilding, updatePlacedBuilding]);

  return (
    <div className="absolute inset-0 group">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Center Crosshair / Selected Area Cursor */}
      <div 
        className="absolute pointer-events-none transition-all duration-75 ease-out z-20"
        style={{
          left: selectionScreenPos ? `${selectionScreenPos.x}px` : '50%',
          top: selectionScreenPos ? `${selectionScreenPos.y}px` : '50%',
          transform: 'translate(-50%, -50%)',
          opacity: selectedPolygon ? 1 : 0.4
        }}
      >
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className={`absolute w-full h-[1px] ${selectedPolygon ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'bg-primary/80'}`} />
          <div className={`absolute w-[1px] h-full ${selectedPolygon ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'bg-primary/80'}`} />
          <div className={`w-2 h-2 border-2 ${selectedPolygon ? 'border-primary' : 'border-primary/80'} rounded-full animate-pulse-slow`} />
          {selectedPolygon && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-background/80 backdrop-blur-sm border border-primary/20 rounded px-1.5 py-0.5 shadow-lg">
              <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">Target Locked</span>
            </div>
          )}
        </div>
      </div>

      {/* Coordinate HUD (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10 animate-reveal-up" style={{ animationDelay: '1s' }}>
        <div className="bg-card/85 backdrop-blur-md border border-border rounded-lg px-3 py-2 flex items-center gap-4 shadow-xl">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Latitude</span>
            <span className="text-xs font-mono text-bright">{mouseCoords.lat.toFixed(6)}°</span>
          </div>
          <div className="w-[1px] h-6 bg-border" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Longitude</span>
            <span className="text-xs font-mono text-bright">{mouseCoords.lng.toFixed(6)}°</span>
          </div>
          <div className="w-[1px] h-6 bg-border" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Elevation</span>
            <span className="text-xs font-mono text-primary font-bold">
              {mouseCoords.height !== null ? `${Math.round(mouseCoords.height)}m` : '---'}
            </span>
          </div>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/50 group/hud cursor-help" title="Terrain-aware coordinates">
            <span className="text-[10px] font-bold text-muted-foreground">?</span>
          </div>
        </div>
      </div>
</div>
  );
};

export default CesiumViewer;
