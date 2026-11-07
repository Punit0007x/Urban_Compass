# Directory Structure

## Frontend (`src/`)
- `components/`: UI components and feature-specific panels.
  - `ui/`: Base Shadcn UI components.
  - `CesiumViewer.tsx`: The main 3D map component.
  - `AnalysisBuilderPage.tsx`: Full-screen analysis workspace.
  - `CityBuilderPage.tsx`: Full-screen urban planning workspace.
- `pages/`: Route-level components (e.g., `Index.tsx`).
- `services/`: API communication and custom hooks.
  - `api.ts`: Central API client.
  - `hooks.ts`: Shared React hooks.
- `lib/`: Utility functions (e.g., `utils.ts` for Tailwind merge).
- `types/`: TypeScript interfaces and types.
- `test/`: Test setup and examples.

## Backend (`backend/`)
- `app/`: Main application logic.
  - `api/`: Endpoint handlers (`analysis.py`, `wasteland.py`).
  - `services/`: Core business logic (`geo_service.py`).
- `main.py`: Application entry point.
- `requirements.txt`: Python dependencies.
- `.env`: Backend configuration.

## Root Directory
- `.planning/`: GSD project planning and codebase map.
- `public/`: Static assets for the frontend.
- `dist/`: Production build output.
- `venv/` / `.venv/`: Python virtual environments.
