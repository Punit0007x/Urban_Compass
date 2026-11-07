/// <reference types="vite/client" />

interface CesiumType {
  Cartesian2: new (x: number, y: number) => unknown;
  Cartesian3: {
    fromDegrees: (lng: number, lat: number, height?: number) => any;
    fromDegreesArray: (coordinates: number[]) => any;
    fromCartesian: (cartesian: unknown) => any;
  };
  Cartographic: {
    fromDegrees: (lng: number, lat: number, height?: number) => any;
    fromCartesian: (cartesian: unknown) => any;
  };
  sampleTerrainMostDetailed: (provider: unknown, positions: unknown[]) => Promise<{ height: number }[]>;
  Entity: new (options: unknown) => any;
  Color: {
    fromCssColorString: (color: string) => any;
    withAlpha: (color: unknown, alpha: number) => any;
    RED: any;
    WHITE: any;
  };
  CallbackProperty: new (callback: () => unknown) => any;
  HeightReference: {
    CLAMP_TO_GROUND: any;
  };
  Math: {
    toRadians: (degrees: number) => number;
    toDegrees: (radians: number) => number;
  };
  JulianDate: {
    fromIso8601: (iso: string) => any;
  };
  ScreenSpaceEventHandler: new (canvas: any) => any;
  ScreenSpaceEventType: {
    MOUSE_MOVE: any;
    LEFT_CLICK: any;
  };
  defined: (value: any) => boolean;
  VerticalOrigin: {
    BOTTOM: any;
  };
  Rectangle: {
    fromDegrees: (west: number, south: number, east: number, north: number) => any;
  };
  UrlTemplateImageryProvider: new (options: any) => any;
  createWorldTerrainAsync: () => Promise<any>;
  createOsmBuildingsAsync: () => Promise<any>;
  createWorldImageryAsync: (options: any) => Promise<any>;
  IonWorldImageryStyle: {
    ROADMAP_SELECTIVE: any;
  };
  GeoJsonDataSource: {
    load: (url: string, options?: any) => Promise<any>;
  };
  Transforms: {
    headingPitchRollQuaternion: (origin: any, hpr: any) => any;
  };
  HeadingPitchRoll: new (heading: number, pitch: number, roll: number) => any;
  PolylineDashMaterialProperty: new (options: any) => any;
  PolygonHierarchy: new (positions: any[]) => any;
  LabelStyle: {
    FILL_AND_OUTLINE: any;
  };
  Ion: {
    defaultAccessToken: string;
  };
  Viewer: new (container: HTMLElement, options?: any) => any;
}

declare const Cesium: CesiumType;
