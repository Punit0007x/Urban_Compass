# Architecture

## System Overview
Urban Compass is a full-stack geospatial application designed for urban planning and analysis. It combines a high-fidelity 3D visualization frontend with a specialized Python backend for spatial computation.

## Frontend Architecture (React SPA)
The frontend follows a modern component-based architecture.

### Key Layers:
- **Presentation Layer**: Components in `src/components` and `src/pages`. Uses Shadcn UI for consistent styling.
- **Service Layer**: `src/services/api.ts` handles all backend communication.
- **State Management**: Primarily local state and custom hooks (`src/services/hooks.ts`).
- **3D Visualization**: `CesiumViewer.tsx` serves as the central hub for the 3D map.

### Data Flow:
1. User interacts with a panel (e.g., `AnalysisPanel`).
2. Panel triggers a service call in `api.ts`.
3. `api.ts` fetches data from the FastAPI backend.
4. Data is returned and reflected in the UI and Cesium map.

## Backend Architecture (FastAPI)
The backend is structured to handle heavy geospatial computations efficiently.

### Key Layers:
- **API Routing**: `backend/app/api` defines the endpoints.
- **Service Logic**: `backend/app/services/geo_service.py` contains the core geospatial algorithms.
- **Entry Point**: `backend/main.py` initializes the FastAPI application and includes routers.

### Patterns:
- **Dependency Injection**: Used in FastAPI for configuration and services.
- **Pydantic Models**: Ensuring data integrity between frontend and backend.
- **Functional Geo-processing**: Using `shapely` and `geojson` for stateless geometry operations.
