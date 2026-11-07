# Integrations

## External Services

### Cesium Ion
- **Purpose**: Provides 3D tilesets, terrain data, and high-resolution imagery.
- **Integration**: Accessed via Cesium Ion API token in `.env`.
- **Primary Files**: `src/components/CesiumViewer.tsx`

### Google Maps Platform
- **Purpose**: Location search and place discovery.
- **Integration**: Google Maps API Key in `.env`.
- **Primary Files**: `src/components/CoordinateSearch.tsx`

### OpenStreetMap (OSM)
- **Purpose**: Street networks, building footprints, and point-of-interest data.
- **Integration**: Fetched via `osmnx` in the Python backend.
- **Primary Files**: `backend/app/services/geo_service.py`

## Internal APIs

### FastAPI Backend
- **Base URL**: Configured in `.env` (default: `http://localhost:8000`)
- **Endpoints**:
  - `/analysis/analyze`: Geospatial analysis for a given area.
  - `/wasteland/detect`: Detects underutilized or wasteland areas.
- **Frontend Client**: `src/services/api.ts`
