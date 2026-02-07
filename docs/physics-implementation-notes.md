# Physics-SVG Engine — Implementation Notes

Quick-reference for building the @mcp-tool-shop/physics-svg engine.
Full details in `physics-engine-reference.md`.

---

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Integration method | Semi-Implicit Euler | Used by Box2D/Rapier, simple, stable, symplectic |
| Timestep | Fixed 60Hz with accumulator | Deterministic, no spiral-of-death |
| Collision broad phase | Spatial hash | Best for ~30-100 objects, O(n) average |
| Collision narrow phase | Circle-circle, circle-AABB, SAT for convex | Covers all game piece shapes |
| Collision resolution | Impulse-based with sequential solver | Industry standard, handles restitution + friction |
| Constraint solver | Projected Gauss-Seidel (iterative) | Warm starting for stability, 4-6 iterations |
| Rendering | Imperative SVG transforms via refs | Zero React re-renders, GPU-composited |
| Interpolation | Alpha blending between physics states | Smooth rendering at any display refresh rate |
| Sleeping | Velocity threshold + timer | Skip simulation for resting bodies |

---

## Core Formulas

### Semi-Implicit Euler Integration
```
velocity += acceleration * dt
position += velocity * dt
acceleration = 0  // reset each frame, forces re-applied next step
```

### Fixed Timestep with Accumulator
```
accumulator += frameTime  (clamped to 250ms max)
while accumulator >= dt:
    save previousState
    stepPhysics(dt)
    save currentState
    accumulator -= dt
alpha = accumulator / dt   // 0-1 interpolation factor
renderPosition = current * alpha + previous * (1 - alpha)
```

### Impulse Resolution
```
relativeVelocity = vB - vA
normalSpeed = dot(relativeVelocity, normal)
if normalSpeed > 0: return  // separating

e = min(restitutionA, restitutionB)
j = -(1 + e) * normalSpeed / (invMassA + invMassB)

vA -= j * invMassA * normal
vB += j * invMassB * normal
```

### Spring Constraint (Hooke's Law)
```
displacement = posB - posA
distance = length(displacement)
direction = displacement / distance
stretch = distance - restLength

force = -stiffness * stretch - damping * dot(relativeVelocity, direction)
forceVector = force * direction
```

### Critical Damping
```
damping = 2 * sqrt(stiffness * mass)
```

---

## SVG Rendering Architecture

### Layered SVG Structure
```xml
<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
  <g id="board">       <!-- React-managed, static, React.memo -->
  <g id="shadows">     <!-- pointer-events: none -->
  <g id="pieces">      <!-- React creates once, rAF animates transforms -->
  <g id="effects">     <!-- pointer-events: none -->
  <g id="ui-overlay">  <!-- React-managed, pointer-events: none -->
</svg>
```

### React + Imperative Rendering Split
- **React owns**: element creation/destruction, static board, UI state
- **rAF loop owns**: position/rotation updates via refs (zero re-renders)
- **Never** route per-frame positions through React `useState`

### SVG Transform Performance
- SVG attribute `transform` triggers layout + repaint
- CSS `transform` on wrapper elements is GPU-composited (2-5x faster)
- For single root SVG: use `el.setAttribute('transform', ...)` — accept repaint
- For individual pieces: wrap in `<div>` with CSS transform when possible
- `will-change: transform` on the SVG container, NOT on child elements
- Chrome treats inner SVG as single compositing layer regardless

### Coordinate Conversion (screen → SVG)
```typescript
function screenToSVG(svg: SVGSVGElement, screenX: number, screenY: number) {
  const point = svg.createSVGPoint();
  point.x = screenX;
  point.y = screenY;
  return point.matrixTransform(svg.getScreenCTM()!.inverse());
}
```

### Hit Testing
- Invisible larger `<circle>` behind visible piece with `pointer-events="all"`
- Visible piece gets `pointer-events="none"` (events fall through)
- Use `fill="transparent"` (not `fill="none"`) for hit areas
- Effect/overlay layers get `pointer-events: none`

---

## Board Game Animation Patterns

### Arc Trajectory (piece moving between points)
Compute quadratic Bezier: start → control point (elevated midpoint) → end.
Evaluate at t ∈ [0,1] with easing for natural motion.
```
control.x = (start.x + end.x) / 2
control.y = min(start.y, end.y) - arcHeight
B(t) = (1-t)²·start + 2(1-t)t·control + t²·end
```

### Bounce-and-Settle
Set `restitution = 0.3-0.5`. Each bounce naturally loses energy.
Sleep threshold: `speed < 0.5 px/frame for 30+ frames → sleep`.

### Spring-to-Cursor Drag
Create kinematic body at cursor position. Attach spring to dragged piece.
Stiffness guide: 100 (loose), 300 (responsive), 800 (snappy).

### Stack Stabilization
- Low restitution (0.1-0.3) for stacked pieces
- Penetration slop (0.5px) prevents micro-bouncing
- Sort contacts bottom-to-top for better solver convergence
- 6+ solver iterations for stacks of 5+ pieces

### Explosion Burst
Apply radial impulse from center point. Strength falls off with distance.
Add random angular velocity for visual variety.

---

## Performance Budget

| Metric | Target | Notes |
|---|---|---|
| Physics step | < 2ms | 30-100 bodies, 4-6 solver iterations |
| SVG render | < 4ms | Attribute writes only, no layout reads |
| Total frame | < 8ms | Leaves 8ms headroom for 60fps |
| Bodies before Canvas fallback | ~200 | SVG DOM overhead becomes visible |
| Sleep threshold | 0.5 px/frame | Tune per game feel |
| Substeps | 2-4 per frame | More for high-velocity scenarios |

---

## Reference Engines

| Engine | Integration | Solver | Notes |
|---|---|---|---|
| Matter.js | Verlet | Iterative impulse | JS, 23k stars, broad adoption |
| Planck.js | Semi-Implicit Euler | PGS + warm start | Box2D port to TS, deterministic |
| Rapier | Semi-Implicit Euler | XPBD | Rust/WASM, 5-8x faster, npm pkg |

Our engine follows the **Planck.js/Box2D** pattern (semi-implicit Euler + PGS)
but simplified for the board game use case (no rotation physics initially,
circle + rect shapes only, ~100 bodies max).
