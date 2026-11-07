# Technical Concerns & Debt

## Architecture Concerns

### Large Monolithic Components
- **`CesiumViewer.tsx`**: Exceeds 800 lines. It manages map initialization, state, multiple UI overlays, and complex event listeners. This makes it difficult to maintain and test.
- **`AnalysisBuilderPage.tsx` / `CityBuilderPage.tsx`**: Both are large and contain significant duplicated logic for full-screen workspace management.

### State Management
- Heavy reliance on prop drilling and local state within large components. As the application grows, a centralized state manager (like TanStack Store or Context API refactor) might be needed to avoid complexity.

## Code Quality

### Testing Coverage
- Current test coverage is very low (~1-2 example tests). Core geospatial logic and API integrations are currently unverified by automated tests.

### Duplication
- High degree of similarity between "Analysis" and "City Building" features suggests a need for a common "Workspace" abstraction.

## Security & Performance

### Secret Management
- `.env` files contain sensitive API keys. Ensure these are never committed (currently blocked by `.gitignore`, but worth constant vigilance).

### Heavy Computation on Main Thread
- Some geospatial processing on the frontend might impact map performance (FPS). Consider moving more complex operations to the Python backend or using Web Workers.
