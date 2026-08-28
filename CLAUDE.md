# JTBD Mapper — notes for Claude

See README.md for the product overview and layout.

## Commands
- `npm run dev` — dev server (Webpack; Turbopack is deliberately disabled in next.config.ts)
- `npm run build` / `npm run lint` — verify before committing
- `npx prisma migrate dev` — apply schema changes; `npx prisma studio` to inspect data

## Conventions
- API routes in `src/app/api/**` are thin: validate input, call a function in `src/lib/api/*`, return `{ <resource> }` JSON. Keep Prisma calls out of route files.
- Client state is Zustand: `entityStore` (Map of entities + connections) and `canvasStore` (viewport, selection, tool mode). Components call the API with `fetch` and then update the store; there is no server-state library.
- Layers are numbered 1–4 (see LayerTabs.tsx for names). Connections must be same-layer or adjacent — enforced server-side in `lib/api/connections.ts`.
- Entity `data` is a JSON column; the per-type shapes are in `src/lib/types.ts`.

## Known state
- No auth; `createdBy` is a hardcoded `'user'`.
- `ChangeEvent`, `ImpactAnalysis`, `ConflictResolution`, `ProjectSnapshot`, `ReconciliationStatus` exist in the schema but have no API or UI yet.
- `prisma/dev.db` is local and gitignored.
