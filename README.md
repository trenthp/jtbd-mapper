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

## Change tracking

Editing an entity's content (title, description, data, tags, status) records a `ChangeEvent` and flags every entity reachable through connections to a *higher* layer as `DOWNSTREAM_IMPACT`. Flagged entities get a dotted amber border on the canvas and appear in the sidebar's **Review** tab, where they can be jumped to or marked as reviewed. Deleting an entity flags every entity it was directly connected to (any layer, either direction) plus its downstream set. Editing a flagged entity clears its own flag. Moving entities never counts as a change. With one entity selected, the Review tab also previews what a change to it would affect.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4
- Konva / react-konva for the canvas
- Zustand for client state (`src/stores`)
- Prisma 6 + SQLite (`prisma/dev.db`, local only, not committed)

## Getting started

```bash
npm install
npx prisma migrate dev      # creates prisma/dev.db (path is set in prisma/schema.prisma)
npm run dev                 # http://localhost:3000
npm test                    # vitest: pure geometry and impact-analysis helpers
```

## Workspace layout

- **Top bar** — back, project name (click to rename), undo/redo, zoom, Review badge, and a `⋯` menu (rename, export JSON, delete project).
- **Layer nav** (floating, top-left of the canvas) — shows the current layer; the layers icon expands it into a vertical list of all four with entity/flag counts, plus an eye toggle for the ghosted adjacent layers. The outline toggle sits directly beneath it.
- **Tool strip** (floating, bottom-centre) — Select (V), Pan (H), Connect (C), Add (creates the layer's default type; the chevron picks another), snap-to-grid, zoom to fit.
- **Outline** (left) — searchable list of the current layer's entities grouped by type; searching spans all layers.
- **Inspector** (right) — the selected entity (all fields, connections, review state, what depends on it), the selected connection (type, strength, rationale), or the review queue when nothing is selected.

On screens narrower than 1024px the outline becomes a drawer, the inspector a bottom sheet, and the canvas supports one-finger pan, pinch zoom, and double-tap to edit.

## Project layout

```
src/app/                 routes and API handlers (app/api/{projects,entities,connections})
src/components/Workspace/ header, layer nav, tool strip, outline, inspector, responsive layout
src/components/Canvas/   Konva canvas: LayerCanvas + hooks, EntityNode, ConnectionPath, minimap, grid
src/components/Projects/ project grid, canvas host, review queue
src/hooks/               keyboard shortcuts, clipboard, media queries
src/stores/              zustand stores (entities, canvas, history, ui)
src/lib/entityTypes.ts   layers, entity types, and their editable fields — single source of truth
src/lib/api/             Prisma data-access functions used by the API routes
src/lib/types.ts         shared entity/connection types
prisma/schema.prisma     data model
```

## Canvas shortcuts

- Scroll to zoom, drag empty space (or hold Space) to pan, `0` to zoom-to-fit
- Click / shift-click / drag-rectangle to select; drag to move selection
- Alt-drag to duplicate; `Ctrl+C` / `Ctrl+V` / `Ctrl+D`; `Delete` to remove
- `Ctrl+Z` undo, `Ctrl+Shift+Z` / `Ctrl+Y` redo (moves, edits, creates, deletes, paste)
- Connect tool (C): click one entity, then another
- V / H switch to Select / Pan
