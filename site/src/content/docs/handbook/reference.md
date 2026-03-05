---
title: Reference
description: Packages, tech stack, and project structure.
sidebar:
  order: 4
---

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@mcptoolshop/physics-svg` | Deterministic 2D physics engine with SVG and Canvas renderers | Published on npm |
| `@mcp-tool-shop/siege-types` | Shared TypeScript types for physics, game state, and animations | Internal |

## Apps

| App | Description |
|-----|-------------|
| SiegeGammon | Inverse-backgammon strategy game built with React 19 and GSAP 3 |
| Anim DevTools | Chrome extension for inspecting physics simulations and animation timelines |

## Monorepo structure

The project uses Turborepo for orchestration with pnpm workspaces:

```
siege-kit/
├── packages/
│   ├── physics-svg/      # @mcptoolshop/physics-svg (npm)
│   └── siege-types/      # @mcp-tool-shop/siege-types (internal)
├── apps/
│   ├── siegegammon/       # Strategy board game (React + GSAP)
│   └── anim-devtools/    # Chrome DevTools extension
├── turbo.json             # Turborepo config
└── pnpm-workspace.yaml    # Workspace definition
```

## Physics engine details

| Property | Value |
|----------|-------|
| Integration | Semi-implicit Euler |
| Timestep | Fixed 60 Hz |
| Narrow-phase | Circle, AABB, SAT |
| Resolution | Impulse-based |
| Solver | Projected Gauss-Seidel |
| Sleep | Automatic when still |
| SVG rendering | Imperative transforms (zero React re-renders) |
| Canvas fallback | Automatic above 200 bodies |
