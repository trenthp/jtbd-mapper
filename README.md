# JTBD Mapper

An interactive canvas for mapping Jobs-to-be-Done across four design layers, with typed connections between layers so you can trace a job all the way down to the interface that serves it.

## Layers

| Layer | Name | Contains |
|---|---|---|
| 1 | Jobs & Objectives | User jobs, business objectives, secondary considerations |
| 2 | Specifications | Functional specs, content requirements, system needs |
| 3 | Interactions | Interaction flows and information architecture |
| 4 | Interface Design | Screens and components that deliver each interaction |

Entities live on one layer. Connections (`SUPPORTS`, `DERIVES_FROM`, `CONFLICTS_WITH`, `INFORMS`) may link entities on the same or an adjacent layer. The canvas shows the current layer in full with the adjacent layers ghosted behind it.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4
- Konva / react-konva for the canvas
- Zustand for client state (`src/stores`)
- Prisma 6 + SQLite (`prisma/dev.db`, local only, not committed)

## Getting started

```bash
npm install
cp .env.example .env        # sets DATABASE_URL to the local sqlite file
npx prisma migrate dev      # creates prisma/dev.db and applies migrations
npm run dev                 # http://localhost:3000
```

## Project layout

```
src/app/                 routes and API handlers (app/api/{projects,entities,connections})
src/components/Canvas/   Konva canvas: LayerCanvas, EntityNode, ConnectionPath, minimap, grid, toolbar
src/components/Projects/ project sidebar, grid, layer tabs
src/components/Entity/   entity editor forms
src/hooks/               keyboard shortcuts, clipboard
src/stores/              zustand stores (entities, canvas viewport/selection)
src/lib/api/             Prisma data-access functions used by the API routes
src/lib/types.ts         shared entity/connection types
prisma/schema.prisma     data model
```

## Canvas shortcuts

- Scroll to zoom, drag empty space (or hold Space) to pan, `0` to zoom-to-fit
- Click / shift-click / drag-rectangle to select; drag to move selection
- Alt-drag to duplicate; `Ctrl+C` / `Ctrl+V` / `Ctrl+D`; `Delete` to remove
- Drag from an entity's edge anchor to another entity to create a connection
