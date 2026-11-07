# Coding Conventions

## General
- **Version Control**: Git with conventional commits (e.g., `feat:`, `fix:`, `docs:`).
- **Environment**: Configuration via `.env` files.

## Frontend (TypeScript/React)
- **Formatting**: Managed via ESLint.
- **Naming**:
  - Components: PascalCase (`CesiumViewer.tsx`).
  - Hooks: `use` prefix camelCase (`useAnalysis.ts`).
  - Utils/Services: camelCase (`api.ts`).
- **Patterns**:
  - Functional components with hooks.
  - Strict TypeScript usage (prefer interfaces over types for objects).
  - Shadcn UI for atomic components.
- **Styling**: Utility-first CSS via Tailwind.

## Backend (Python/FastAPI)
- **Formatting**: PEP 8 standards.
- **Naming**:
  - Modules/Files: snake_case (`geo_service.py`).
  - Classes: PascalCase.
  - Functions/Variables: snake_case.
- **Validation**: Strict use of Pydantic models for request/response payloads.
- **Error Handling**: Use of FastAPI's `HTTPException` for standardized error responses.

## Geospatial Data
- **CRS**: Primarily WGS 84 (EPSG:4326) for coordinates, Web Mercator (EPSG:3857) for area/distance calculations.
- **Format**: GeoJSON for geometry exchange between frontend and backend.
