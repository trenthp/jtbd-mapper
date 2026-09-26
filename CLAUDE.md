# Layer Map — notes for Claude

See README.md for the product overview and layout.

## Commands
- `npm run dev` — dev server (Webpack; Turbopack is deliberately disabled in next.config.ts)
- `npm test` — vitest, covers `src/lib/impact.ts`, `src/lib/canvas/geometry.ts`, and `src/lib/canvas/cardLayout.ts`; add tests there for any change to graph walks, snapping, or card layout
- `npm run build` / `npm run lint` — verify before committing
- `npx prisma migrate dev` — apply schema changes; `npx prisma studio` to inspect data

## Conventions
- API routes in `src/app/api/**` are thin: validate input, call a function in `src/lib/api/*`, return `{ <resource> }` JSON. Keep Prisma calls out of route files.
- Client state is Zustand: `entityStore` (Map of entities + connections) and `canvasStore` (viewport, selection, tool mode). Components call the API with `fetch` and then update the store; there is no server-state library.
- Layers, entity types, per-type editable fields, and connection/status enums are defined once in `src/lib/entityTypes.ts`; never hardcode them in components. Connections must be same-layer or adjacent — enforced server-side in `lib/api/connections.ts`.
- Entity `data` is a JSON column; the per-type shapes are in `src/lib/types.ts`. New entities start with `data: {}`; a type's `fields` are optional and the inspector adds them on request. `STICKY` (`type: 'note'`) is the blank default that can be converted to any type on its layer.

- Workspace chrome lives in `src/components/Workspace/`. Panels are the same components on every screen size; `WorkspaceLayout` decides column vs. drawer/sheet using `useIsMobile()` (Tailwind `lg`, 1024px). Keep new UI usable at 400px wide.
- Chrome outside the canvas reaches zoom/pan through `canvasStore.viewActions`, registered by `LayerCanvas`.

## Known state
- No auth; `createdBy` is a hardcoded `'user'`.
- Undo/redo: every canvas mutation goes through `src/lib/commands.ts` (which calls `src/lib/client/api.ts`) and pushes a Command onto `historyStore`. New mutations should follow that pattern rather than calling `fetch` directly.
- Change tracking: pure graph/diff logic in `src/lib/impact.ts` (shared with the client), Prisma glue in `src/lib/api/reconciliation.ts`, hooked into PUT and DELETE on `/api/entities/[id]`. A `ReconciliationStatus` row exists only while an entity is flagged. `ConflictResolution` and `ProjectSnapshot` are still schema-only.
- Canvas logic is split into `src/components/Canvas/hooks/*` and pure helpers in `src/lib/canvas/geometry.ts`; keep `LayerCanvas.tsx` as composition + JSX.
- Cards show title + description only, plus whichever optional fields/tags the user has added; connection handles appear only in Connect mode. Card height is content-driven: `cardLayout()`/`entityHeight()` in `src/lib/canvas/cardLayout.ts` is the single source for it, and geometry (anchors, snapping, selection, minimap) reads height from there rather than a constant.
- Database is Postgres via `DATABASE_URL` (gitignored `.env`; see `.env.example`). Vercel runs `vercel-build`, which applies migrations before `next build`, over `DATABASE_URL_UNPOOLED` when set (Neon's pooler breaks Prisma's advisory lock). The old `prisma/dev.db` is obsolete.
