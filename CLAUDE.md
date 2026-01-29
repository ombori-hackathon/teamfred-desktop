# TeamfredClient - Electron React App

Windows desktop app that communicates with the FastAPI backend.

## Commands
- Dev: `npm run dev` (runs Vite + Electron concurrently)
- Build: `npm run build` (creates distributable)
- Vite only: `npm run dev:vite` (for web testing)

## Architecture
- Electron main process: electron/main.ts
- React app: src/
- Entry point: src/main.tsx
- Main component: src/App.tsx
- Data models: src/types.ts
- Uses fetch for API calls
- TypeScript throughout

## API Integration
- Backend runs at http://localhost:8000
- Health check: GET /health
- Sample data: GET /items (returns list of items)

## Adding Features
1. Create new React components in src/components/
2. Add new types in src/types.ts
3. Use fetch() for API calls
4. Add new routes if using react-router
