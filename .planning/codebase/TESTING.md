# Testing Strategy

## Frameworks

### Unit & Integration Testing
- **Tool**: [Vitest](https://vitest.dev/)
- **Configuration**: `vitest.config.ts`
- **Location**: `src/**/*.{test,spec}.{ts,tsx}`
- **Environment**: `jsdom` for React component testing.

### End-to-End (E2E) Testing
- **Tool**: [Playwright](https://playwright.dev/)
- **Configuration**: `playwright.config.ts`
- **Location**: Top-level `tests/` directory (if exists) or specified in config.

## Current State
- **Unit Tests**: Found in `src/test/example.test.ts`. Minimal coverage currently.
- **E2E Tests**: Configuration exists, but active tests are sparse.

## Best Practices
- **Mocking**: Use Vitest mocks for API calls in unit tests.
- **Setup**: `src/test/setup.ts` handles global test configuration and environment setup.
- **Execution**:
  - Run unit tests: `npm test`
  - Run E2E tests: `npx playwright test`
