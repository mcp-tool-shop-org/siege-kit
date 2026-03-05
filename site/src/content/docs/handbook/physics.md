---
title: Physics Engine
description: Deterministic 2D physics with SVG and Canvas rendering.
sidebar:
  order: 2
---

The `@mcptoolshop/physics-svg` package is a deterministic 2D physics engine published on npm.

## Integration method

Semi-implicit Euler integration at a fixed 60 Hz timestep — the same approach used by Box2D and Rapier. This ensures reproducible simulations across platforms.

## Collision detection

The engine provides a full collision stack:

- **Circle** collision detection
- **AABB** (axis-aligned bounding box) detection
- **SAT** (separating axis theorem) for convex polygons

Resolution uses impulse-based physics with a projected Gauss-Seidel constraint solver. Bodies automatically sleep when still to save computation.

## Rendering

Two rendering backends:

| Backend | When used | How it works |
|---------|-----------|-------------|
| SVG | Default (< 200 bodies) | Imperative transform updates — zero React re-renders |
| Canvas | Fallback (200+ bodies) | Kicks in automatically when body count is high |

The SVG renderer uses direct DOM manipulation for transforms rather than React state updates, which avoids the overhead of virtual DOM diffing for physics animations.
