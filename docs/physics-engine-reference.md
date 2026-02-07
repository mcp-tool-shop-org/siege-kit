# @mcp-tool-shop/physics-svg — Engine Reference Notes

Comprehensive technical reference for building a production-quality 2D physics engine
in TypeScript, targeting SVG (and optional Canvas) rendering for board game animations.

---

## Table of Contents

1. [Integration Methods](#1-integration-methods)
2. [Collision Detection](#2-collision-detection)
3. [Collision Resolution](#3-collision-resolution)
4. [Constraints](#4-constraints)
5. [Forces](#5-forces)
6. [Board Game Patterns](#6-board-game-patterns)
7. [Performance](#7-performance)
8. [Reference Implementations](#8-reference-implementations)

---

## 1. Integration Methods

### 1.1 Comparison: Verlet vs Semi-Implicit Euler vs RK4

| Property               | Stormer-Verlet (Position)  | Semi-Implicit Euler         | Velocity Verlet            | RK4                         |
|------------------------|----------------------------|-----------------------------|----------------------------|-----------------------------|
| Order of accuracy      | O(dt^4) position           | O(dt) global                | O(dt^2) global             | O(dt^4) global              |
| Symplectic             | Yes                        | Yes                         | Yes                        | No                          |
| Energy conservation    | Excellent                  | Good (drifts phase)         | Excellent                  | Loses energy over time      |
| Velocity tracking      | Implicit (from positions)  | Explicit                    | Explicit                   | Explicit                    |
| Constraint handling    | Trivial (move positions)   | Requires impulses           | Requires impulses          | Complex with constraints    |
| Force evaluations/step | 1                          | 1                           | 2                          | 4                           |
| Complexity             | Very simple                | Very simple                 | Simple                     | Moderate                    |
| Best for               | Particle/cloth sims        | Rigid body engines          | Molecular dynamics         | Orbital mechanics           |

**RECOMMENDATION for browser-based board game engine:**
- **Semi-Implicit Euler** for rigid body dynamics (used by Box2D, Rapier, most game engines)
- **Stormer-Verlet** for particle effects, cloth-like chains, simple spring systems
- RK4 is overkill — 4x the force evaluations for marginal benefit in a board game context

### 1.2 Exact Formulas

#### Semi-Implicit Euler (Symplectic Euler)

Update velocity FIRST, then use new velocity for position:

```typescript
// Semi-implicit Euler — the standard for rigid body engines
function integrateBody(body: Body, dt: number): void {
  // 1. Update velocity with acceleration
  body.velocity.x += body.acceleration.x * dt;
  body.velocity.y += body.acceleration.y * dt;
  body.angularVelocity += body.angularAcceleration * dt;

  // 2. Update position with NEW velocity (this is what makes it "semi-implicit")
  body.position.x += body.velocity.x * dt;
  body.position.y += body.velocity.y * dt;
  body.angle += body.angularVelocity * dt;

  // 3. Clear forces for next frame
  body.acceleration.x = 0;
  body.acceleration.y = 0;
  body.angularAcceleration = 0;
}
```

Key insight: Updating velocity before position is what makes this symplectic. If you
update position first with old velocity, you get explicit Euler (unstable, gains energy).

#### Stormer-Verlet (Position-Based)

No explicit velocity — velocity is implicit from position history:

```typescript
// Stormer-Verlet — ideal for particles and position-based constraints
function verletIntegrate(body: VerletBody, dt: number): void {
  const dtSq = dt * dt;

  const newX = 2 * body.x - body.prevX + body.ax * dtSq;
  const newY = 2 * body.y - body.prevY + body.ay * dtSq;

  body.prevX = body.x;
  body.prevY = body.y;
  body.x = newX;
  body.y = newY;
}

// Derive velocity when needed (e.g., for collision response):
function getVelocity(body: VerletBody, dt: number): Vec2 {
  return {
    x: (body.x - body.prevX) / dt,
    y: (body.y - body.prevY) / dt,
  };
}

// Apply damping by scaling the implicit velocity:
function applyDamping(body: VerletBody, factor: number): void {
  // factor = 0.99 means 1% damping per frame
  body.prevX = body.x - (body.x - body.prevX) * factor;
  body.prevY = body.y - (body.y - body.prevY) * factor;
}
```

#### Velocity Verlet

Explicit velocity, two force evaluations, higher accuracy:

```typescript
function velocityVerletIntegrate(body: Body, dt: number): void {
  const halfDt = dt * 0.5;
  const dtSq = dt * dt;

  // 1. Update position using current velocity and acceleration
  body.position.x += body.velocity.x * dt + 0.5 * body.acceleration.x * dtSq;
  body.position.y += body.velocity.y * dt + 0.5 * body.acceleration.y * dtSq;

  // 2. Half-step velocity
  body.velocity.x += body.acceleration.x * halfDt;
  body.velocity.y += body.acceleration.y * halfDt;

  // 3. Compute new acceleration from forces at NEW position
  const newAcc = computeAcceleration(body); // re-evaluate forces

  // 4. Complete velocity update with new acceleration
  body.velocity.x += newAcc.x * halfDt;
  body.velocity.y += newAcc.y * halfDt;

  body.acceleration = newAcc;
}
```

### 1.3 Fixed Timestep with Accumulator

The gold standard game loop pattern from Glenn Fiedler's "Fix Your Timestep!":

```typescript
const FIXED_DT = 1 / 60;        // 60 Hz physics
const MAX_FRAME_TIME = 0.25;     // Spiral-of-death clamp (250ms)

let accumulator = 0;
let prevTime = performance.now() / 1000;
let physicsState: PhysicsState;
let prevPhysicsState: PhysicsState;

function gameLoop(timestamp: number): void {
  const currentTime = timestamp / 1000;
  let frameTime = currentTime - prevTime;
  prevTime = currentTime;

  // Clamp to prevent spiral of death
  if (frameTime > MAX_FRAME_TIME) {
    frameTime = MAX_FRAME_TIME;
  }

  accumulator += frameTime;

  // Run physics in fixed steps
  while (accumulator >= FIXED_DT) {
    prevPhysicsState = cloneState(physicsState);
    step(physicsState, FIXED_DT);
    accumulator -= FIXED_DT;
  }

  // Interpolate for smooth rendering
  const alpha = accumulator / FIXED_DT;
  const renderState = lerpState(prevPhysicsState, physicsState, alpha);
  render(renderState);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

**Spiral of death explained:** If physics takes longer than FIXED_DT to compute,
the accumulator grows faster than it drains, creating more substeps, which take
more time, which grows the accumulator further. Clamping frameTime at 0.25s means
at most ~15 physics steps per frame (at 60Hz fixed step).

**Interpolation formula:**
```
renderPosition = prevPosition * (1 - alpha) + currentPosition * alpha
```

### 1.4 Substep Strategy

For board game animations with ~30-100 objects:
- **1 substep** is usually sufficient for basic movement and simple collisions
- **2-4 substeps** for stacking stability and constraint-heavy scenes
- **8+ substeps** (TGS-style) for high-quality joint/constraint behavior

Box2D v3 moved from iteration-heavy PGS to sub-step-heavy TGS. For a board game
engine, 2-4 substeps with 4-6 solver iterations is a good balance.

```typescript
const SUBSTEPS = 2;
const SOLVER_ITERATIONS = 4;

function step(world: World, dt: number): void {
  const subDt = dt / SUBSTEPS;

  for (let sub = 0; sub < SUBSTEPS; sub++) {
    applyForces(world, subDt);
    integrateVelocities(world, subDt);

    // Collision detection (can be done once per full step for perf)
    if (sub === 0) {
      broadPhase(world);
      narrowPhase(world);
    }

    // Iterative constraint/collision solving
    for (let i = 0; i < SOLVER_ITERATIONS; i++) {
      solveConstraints(world, subDt);
      solveCollisions(world, subDt);
    }

    integratePositions(world, subDt);
  }
}
```

---

## 2. Collision Detection

### 2.1 Broad Phase

For 30-100 objects, choose based on scene characteristics:

| Method             | Best for                                   | Complexity      | Memory    |
|--------------------|---------------------------------------------|-----------------|-----------|
| Spatial Hashing    | Uniform-size objects, fixed world size      | O(n) average    | O(cells)  |
| Sweep and Prune    | Objects moving smoothly (coherence)          | O(n log n) sort | O(n)      |
| Uniform Grid       | Dense, small worlds                          | O(n)            | O(cells)  |
| Brute Force (n^2)  | < 30 objects                                 | O(n^2)          | O(1)      |

**RECOMMENDATION:** For a board game with 30-100 pieces, **sweep-and-prune on X axis**
is ideal — objects move smoothly, and insertion sort on a nearly-sorted array is O(n).
Matter.js uses this approach.

#### Spatial Hash Implementation

```typescript
class SpatialHash {
  private cellSize: number;
  private cells: Map<string, Body[]> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(body: Body): void {
    const aabb = body.getAABB();
    const minCX = Math.floor(aabb.minX / this.cellSize);
    const minCY = Math.floor(aabb.minY / this.cellSize);
    const maxCX = Math.floor(aabb.maxX / this.cellSize);
    const maxCY = Math.floor(aabb.maxY / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const k = this.key(cx, cy);
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k)!.push(body);
      }
    }
  }

  getPotentialPairs(): Array<[Body, Body]> {
    const pairs: Array<[Body, Body]> = [];
    const seen = new Set<string>();

    for (const bucket of this.cells.values()) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const a = bucket[i];
          const b = bucket[j];
          const pairKey = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
          if (!seen.has(pairKey)) {
            seen.add(pairKey);
            pairs.push([a, b]);
          }
        }
      }
    }
    return pairs;
  }
}
```

#### Sweep and Prune (Sort-and-Sweep)

```typescript
function sweepAndPrune(bodies: Body[]): Array<[Body, Body]> {
  // Sort by AABB min-x (insertion sort for temporal coherence)
  for (let i = 1; i < bodies.length; i++) {
    const key = bodies[i];
    const keyMinX = key.aabb.minX;
    let j = i - 1;
    while (j >= 0 && bodies[j].aabb.minX > keyMinX) {
      bodies[j + 1] = bodies[j];
      j--;
    }
    bodies[j + 1] = key;
  }

  // Sweep — check overlaps on X then Y
  const pairs: Array<[Body, Body]> = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      if (bodies[j].aabb.minX > bodies[i].aabb.maxX) break; // no more overlaps
      if (aabbOverlap(bodies[i].aabb, bodies[j].aabb)) {
        pairs.push([bodies[i], bodies[j]]);
      }
    }
  }
  return pairs;
}
```

### 2.2 Narrow Phase: Circle-Circle

```typescript
interface ContactManifold {
  bodyA: Body;
  bodyB: Body;
  normal: Vec2;       // Points from A to B
  penetration: number; // Overlap depth (positive = overlapping)
  contacts: Vec2[];    // Contact point(s) in world space
}

function circleVsCircle(a: CircleBody, b: CircleBody): ContactManifold | null {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const distSq = dx * dx + dy * dy;
  const radiusSum = a.radius + b.radius;

  if (distSq > radiusSum * radiusSum) return null;

  const dist = Math.sqrt(distSq);

  let normal: Vec2;
  let penetration: number;

  if (dist === 0) {
    // Circles are at the same position — pick arbitrary normal
    normal = { x: 1, y: 0 };
    penetration = a.radius;
  } else {
    normal = { x: dx / dist, y: dy / dist };
    penetration = radiusSum - dist;
  }

  // Contact point is on the surface of A towards B
  const contact: Vec2 = {
    x: a.position.x + normal.x * a.radius,
    y: a.position.y + normal.y * a.radius,
  };

  return {
    bodyA: a,
    bodyB: b,
    normal,
    penetration,
    contacts: [contact],
  };
}
```

### 2.3 Narrow Phase: AABB vs AABB

```typescript
function aabbVsAabb(a: RectBody, b: RectBody): ContactManifold | null {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;

  const aHalfW = a.width / 2;
  const aHalfH = a.height / 2;
  const bHalfW = b.width / 2;
  const bHalfH = b.height / 2;

  const overlapX = aHalfW + bHalfW - Math.abs(dx);
  if (overlapX <= 0) return null;

  const overlapY = aHalfH + bHalfH - Math.abs(dy);
  if (overlapY <= 0) return null;

  let normal: Vec2;
  let penetration: number;

  if (overlapX < overlapY) {
    // Separate on X axis (minimum penetration axis)
    normal = { x: dx < 0 ? -1 : 1, y: 0 };
    penetration = overlapX;
  } else {
    // Separate on Y axis
    normal = { x: 0, y: dy < 0 ? -1 : 1 };
    penetration = overlapY;
  }

  // Contact point: midpoint of the overlapping edge region
  const contact: Vec2 = {
    x: a.position.x + normal.x * aHalfW,
    y: a.position.y + normal.y * aHalfH,
  };

  return {
    bodyA: a,
    bodyB: b,
    normal,
    penetration,
    contacts: [contact],
  };
}
```

### 2.4 Narrow Phase: Circle vs AABB

```typescript
function circleVsAabb(circle: CircleBody, rect: RectBody): ContactManifold | null {
  const dx = circle.position.x - rect.position.x;
  const dy = circle.position.y - rect.position.y;

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  // Clamp circle center to closest point on AABB
  let closestX = clamp(dx, -halfW, halfW);
  let closestY = clamp(dy, -halfH, halfH);

  // Check if circle center is inside the AABB
  let inside = false;
  if (dx === closestX && dy === closestY) {
    inside = true;
    // Push to nearest edge
    if (Math.abs(dx) > Math.abs(dy)) {
      closestX = closestX > 0 ? halfW : -halfW;
    } else {
      closestY = closestY > 0 ? halfH : -halfH;
    }
  }

  const normalX = dx - closestX;
  const normalY = dy - closestY;
  const distSq = normalX * normalX + normalY * normalY;
  const r = circle.radius;

  if (distSq > r * r && !inside) return null;

  const dist = Math.sqrt(distSq);
  const normal: Vec2 = inside
    ? { x: -normalX / dist, y: -normalY / dist }  // Flip for inside
    : { x: normalX / dist, y: normalY / dist };

  return {
    bodyA: rect,
    bodyB: circle,
    normal,
    penetration: r - dist,
    contacts: [{
      x: rect.position.x + closestX,
      y: rect.position.y + closestY,
    }],
  };
}
```

### 2.5 SAT (Separating Axis Theorem) for Convex Polygons

```typescript
interface Projection {
  min: number;
  max: number;
}

function projectPolygon(vertices: Vec2[], axis: Vec2): Projection {
  let min = dot(axis, vertices[0]);
  let max = min;
  for (let i = 1; i < vertices.length; i++) {
    const p = dot(axis, vertices[i]);
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return { min, max };
}

function getAxes(vertices: Vec2[]): Vec2[] {
  const axes: Vec2[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const edgeX = vertices[j].x - vertices[i].x;
    const edgeY = vertices[j].y - vertices[i].y;
    // Perpendicular (left normal)
    const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
    axes.push({ x: -edgeY / len, y: edgeX / len });
  }
  return axes;
}

function satTest(vertsA: Vec2[], vertsB: Vec2[]): ContactManifold | null {
  const axesA = getAxes(vertsA);
  const axesB = getAxes(vertsB);
  const allAxes = [...axesA, ...axesB];

  let minOverlap = Infinity;
  let bestAxis: Vec2 | null = null;

  for (const axis of allAxes) {
    const projA = projectPolygon(vertsA, axis);
    const projB = projectPolygon(vertsB, axis);

    // Check for gap
    if (projA.max < projB.min || projB.max < projA.min) {
      return null; // Separating axis found — no collision
    }

    // Calculate overlap on this axis
    const overlap = Math.min(projA.max - projB.min, projB.max - projA.min);

    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestAxis = axis;
    }
  }

  if (!bestAxis) return null;

  // Ensure normal points from A to B
  const centerA = polygonCenter(vertsA);
  const centerB = polygonCenter(vertsB);
  const d = { x: centerB.x - centerA.x, y: centerB.y - centerA.y };
  if (dot(bestAxis, d) < 0) {
    bestAxis = { x: -bestAxis.x, y: -bestAxis.y };
  }

  return {
    bodyA: null as any, // Set by caller
    bodyB: null as any,
    normal: bestAxis,
    penetration: minOverlap,
    contacts: findContactPoints(vertsA, vertsB, bestAxis),
  };
}
```

### 2.6 Contact Point Generation (Clipping Method)

```typescript
// Find the two vertices that form the "support edge" (most aligned with normal)
function findSupportEdge(vertices: Vec2[], normal: Vec2): [Vec2, Vec2] {
  let bestDot = -Infinity;
  let bestIdx = 0;
  for (let i = 0; i < vertices.length; i++) {
    const d = dot(vertices[i], normal);
    if (d > bestDot) {
      bestDot = d;
      bestIdx = i;
    }
  }

  const v = vertices[bestIdx];
  const prev = vertices[(bestIdx - 1 + vertices.length) % vertices.length];
  const next = vertices[(bestIdx + 1) % vertices.length];

  // Choose edge whose normal is more aligned with collision normal
  const edgePrev = normalize(sub(v, prev));
  const edgeNext = normalize(sub(next, v));

  if (Math.abs(dot(edgePrev, normal)) <= Math.abs(dot(edgeNext, normal))) {
    return [prev, v];
  } else {
    return [v, next];
  }
}

// Sutherland-Hodgman clipping to find contact points
function clipSegmentToEdge(
  contacts: Vec2[], v1: Vec2, v2: Vec2, normal: Vec2, offset: number
): Vec2[] {
  const result: Vec2[] = [];
  const d1 = dot(normal, v1) - offset;
  const d2 = dot(normal, v2) - offset;

  if (d1 >= 0) result.push(v1);
  if (d2 >= 0) result.push(v2);

  if (d1 * d2 < 0) {
    const t = d1 / (d1 - d2);
    result.push({
      x: v1.x + t * (v2.x - v1.x),
      y: v1.y + t * (v2.y - v1.y),
    });
  }

  return result;
}
```

---

## 3. Collision Resolution

### 3.1 Impulse-Based Resolution (Core Formula)

The impulse scalar `j` for a collision between bodies A and B:

```
        -(1 + e) * (v_rel . n)
j = ──────────────────────────────────────────────────
     1/m_A + 1/m_B + (r_A x n)^2/I_A + (r_B x n)^2/I_B
```

Where:
- `e` = coefficient of restitution = min(e_A, e_B)
- `v_rel` = relative velocity at contact point
- `n` = collision normal (unit vector, A to B)
- `m_A, m_B` = masses (use inverse mass; 0 = infinite/static)
- `r_A, r_B` = vectors from body center-of-mass to contact point
- `I_A, I_B` = moments of inertia
- `x` = 2D cross product (scalar): a x b = a.x*b.y - a.y*b.x

```typescript
function resolveCollision(manifold: ContactManifold): void {
  const { bodyA: a, bodyB: b, normal: n, contacts } = manifold;

  for (const contact of contacts) {
    // Vectors from COM to contact point
    const rA: Vec2 = { x: contact.x - a.position.x, y: contact.y - a.position.y };
    const rB: Vec2 = { x: contact.x - b.position.x, y: contact.y - b.position.y };

    // Relative velocity at contact point (includes rotation)
    const vA: Vec2 = {
      x: a.velocity.x + (-a.angularVelocity * rA.y),
      y: a.velocity.y + (a.angularVelocity * rA.x),
    };
    const vB: Vec2 = {
      x: b.velocity.x + (-b.angularVelocity * rB.y),
      y: b.velocity.y + (b.angularVelocity * rB.x),
    };
    const vRel: Vec2 = { x: vB.x - vA.x, y: vB.y - vA.y };

    // Relative velocity along normal
    const velAlongNormal = dot(vRel, n);

    // Bodies separating — skip
    if (velAlongNormal > 0) continue;

    // Coefficient of restitution (with restitution slop for settling)
    const RESTITUTION_SLOP = 0.5; // m/s — velocities below this don't bounce
    const e = Math.abs(velAlongNormal) < RESTITUTION_SLOP
      ? 0
      : Math.min(a.restitution, b.restitution);

    // Cross products for rotational component
    const rAxN = cross(rA, n);
    const rBxN = cross(rB, n);

    // Effective mass denominator
    const effectiveMass =
      a.inverseMass + b.inverseMass +
      rAxN * rAxN * a.inverseInertia +
      rBxN * rBxN * b.inverseInertia;

    // Impulse magnitude (divide by contact count for multi-point manifolds)
    const j = -(1 + e) * velAlongNormal / effectiveMass / contacts.length;

    // Apply impulse
    const impulse: Vec2 = { x: j * n.x, y: j * n.y };

    a.velocity.x -= a.inverseMass * impulse.x;
    a.velocity.y -= a.inverseMass * impulse.y;
    a.angularVelocity -= a.inverseInertia * cross(rA, impulse);

    b.velocity.x += b.inverseMass * impulse.x;
    b.velocity.y += b.inverseMass * impulse.y;
    b.angularVelocity += b.inverseInertia * cross(rB, impulse);
  }
}
```

### 3.2 Friction Impulse

```typescript
function resolveFriction(manifold: ContactManifold, normalImpulse: number): void {
  const { bodyA: a, bodyB: b, normal: n, contacts } = manifold;

  for (const contact of contacts) {
    const rA = sub(contact, a.position);
    const rB = sub(contact, b.position);

    // Relative velocity at contact
    const vRel = getRelativeVelocity(a, b, rA, rB);

    // Tangent vector (perpendicular to normal, in direction of sliding)
    const tangent: Vec2 = {
      x: vRel.x - dot(vRel, n) * n.x,
      y: vRel.y - dot(vRel, n) * n.y,
    };
    const tangentLen = length(tangent);
    if (tangentLen < 1e-6) continue;

    // Normalize tangent
    tangent.x /= tangentLen;
    tangent.y /= tangentLen;

    // Friction impulse magnitude
    const rAxT = cross(rA, tangent);
    const rBxT = cross(rB, tangent);
    const effectiveMass =
      a.inverseMass + b.inverseMass +
      rAxT * rAxT * a.inverseInertia +
      rBxT * rBxT * b.inverseInertia;

    let jt = -dot(vRel, tangent) / effectiveMass / contacts.length;

    // Coulomb friction: clamp friction impulse to mu * normal impulse
    const mu = pythagoreanSolve(a.staticFriction, b.staticFriction);
    const jPerContact = normalImpulse / contacts.length;

    let frictionImpulse: Vec2;
    if (Math.abs(jt) < jPerContact * mu) {
      // Static friction — apply exact tangential impulse
      frictionImpulse = { x: jt * tangent.x, y: jt * tangent.y };
    } else {
      // Dynamic friction — apply clamped impulse
      const dynamicMu = pythagoreanSolve(a.dynamicFriction, b.dynamicFriction);
      jt = -jPerContact * dynamicMu;
      frictionImpulse = { x: jt * tangent.x, y: jt * tangent.y };
    }

    // Apply
    a.velocity.x -= a.inverseMass * frictionImpulse.x;
    a.velocity.y -= a.inverseMass * frictionImpulse.y;
    a.angularVelocity -= a.inverseInertia * cross(rA, frictionImpulse);
    b.velocity.x += b.inverseMass * frictionImpulse.x;
    b.velocity.y += b.inverseMass * frictionImpulse.y;
    b.angularVelocity += b.inverseInertia * cross(rB, frictionImpulse);
  }
}

// Pythagorean friction mixing: sqrt(muA^2 + muB^2)
function pythagoreanSolve(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}
```

### 3.3 Position Correction

Prevents sinking due to floating-point accumulation. Two approaches:

#### Linear Projection (Simple, used by Matter.js)

```typescript
function positionalCorrection(manifold: ContactManifold): void {
  const { bodyA: a, bodyB: b, normal: n, penetration } = manifold;

  const PERCENT = 0.4;    // Correction percentage (0.2 - 0.8)
  const SLOP = 0.005;     // Penetration allowance to prevent jitter

  const correctionMag =
    Math.max(penetration - SLOP, 0) /
    (a.inverseMass + b.inverseMass) *
    PERCENT;

  const correction: Vec2 = {
    x: correctionMag * n.x,
    y: correctionMag * n.y,
  };

  a.position.x -= a.inverseMass * correction.x;
  a.position.y -= a.inverseMass * correction.y;
  b.position.x += b.inverseMass * correction.x;
  b.position.y += b.inverseMass * correction.y;
}
```

#### Baumgarte Stabilization (Mixed into velocity solve)

Adds a bias velocity to push objects apart:

```typescript
// Inside velocity constraint solve:
const BAUMGARTE = 0.2;
const bias = (BAUMGARTE / dt) * Math.max(penetration - SLOP, 0);
// Add 'bias' to the numerator of the impulse calculation:
const j = (-(1 + e) * velAlongNormal + bias) / effectiveMass;
```

**Trade-offs:**
- Linear projection: simple, no energy injection, but can look jumpy
- Baumgarte: smoother but injects energy, can cause bouncing on stacks
- NGS (Nonlinear Gauss-Seidel): best quality, most expensive — used by Box2D v3

### 3.4 Static vs Dynamic Body Handling

```typescript
interface Body {
  inverseMass: number;     // 0 = static/infinite mass
  inverseInertia: number;  // 0 = cannot rotate
  isStatic: boolean;
  // ... other properties
}

// Static bodies: inverseMass = 0, inverseInertia = 0
// This naturally causes impulse to only affect the dynamic body:
// a.velocity -= 0 * impulse   (no effect on static)
// b.velocity += b.inverseMass * impulse  (full effect on dynamic)
```

### 3.5 Sequential Impulse Solver Pattern

The complete solving loop per frame:

```typescript
function solveCollisions(manifolds: ContactManifold[], dt: number): void {
  const VELOCITY_ITERATIONS = 6;
  const POSITION_ITERATIONS = 3;

  // Warm start: apply cached impulses from persistent contacts
  for (const m of manifolds) {
    if (m.persistent && m.cachedImpulse) {
      const warmImpulse = scale(m.normal, m.cachedImpulse * 0.8); // fraction
      applyImpulse(m.bodyA, m.bodyB, warmImpulse, m.contacts[0]);
    }
  }

  // Velocity iterations
  for (let i = 0; i < VELOCITY_ITERATIONS; i++) {
    for (const m of manifolds) {
      resolveCollision(m);
      resolveFriction(m, m.cachedImpulse);
    }
  }

  // Position iterations (correction)
  for (let i = 0; i < POSITION_ITERATIONS; i++) {
    for (const m of manifolds) {
      positionalCorrection(m);
    }
  }
}
```

---

## 4. Constraints

### 4.1 Distance Constraint (Rigid Rod)

Keeps two bodies at a fixed distance from each other:

```typescript
class DistanceConstraint {
  bodyA: Body;
  bodyB: Body;
  anchorA: Vec2;  // Local space offset on A
  anchorB: Vec2;  // Local space offset on B
  targetDistance: number;
  stiffness: number; // 0-1, 1 = perfectly rigid

  solve(dt: number): void {
    // World-space anchor positions
    const worldA = localToWorld(this.bodyA, this.anchorA);
    const worldB = localToWorld(this.bodyB, this.anchorB);

    // Current distance vector
    const delta = sub(worldB, worldA);
    const currentDist = length(delta);

    if (currentDist < 1e-7) return;

    // Constraint error
    const error = currentDist - this.targetDistance;
    const normal = scale(delta, 1 / currentDist);

    // Effective mass
    const rA = sub(worldA, this.bodyA.position);
    const rB = sub(worldB, this.bodyB.position);
    const rAxN = cross(rA, normal);
    const rBxN = cross(rB, normal);
    const effectiveMass =
      this.bodyA.inverseMass + this.bodyB.inverseMass +
      rAxN * rAxN * this.bodyA.inverseInertia +
      rBxN * rBxN * this.bodyB.inverseInertia;

    if (effectiveMass === 0) return;

    // Impulse to satisfy constraint
    const lambda = -error * this.stiffness / effectiveMass;
    const impulse = scale(normal, lambda);

    // Apply
    this.bodyA.position.x -= this.bodyA.inverseMass * impulse.x;
    this.bodyA.position.y -= this.bodyA.inverseMass * impulse.y;
    this.bodyB.position.x += this.bodyB.inverseMass * impulse.x;
    this.bodyB.position.y += this.bodyB.inverseMass * impulse.y;
  }
}
```

### 4.2 Spring Constraint (Hooke's Law with Damping)

```typescript
class SpringConstraint {
  bodyA: Body;
  bodyB: Body;
  restLength: number;
  stiffness: number;   // k — spring constant (N/m equivalent)
  damping: number;      // b — damping coefficient

  applyForce(dt: number): void {
    const delta = sub(this.bodyB.position, this.bodyA.position);
    const currentLength = length(delta);

    if (currentLength < 1e-7) return;

    const direction = scale(delta, 1 / currentLength);

    // Hooke's law: F = -k * (currentLength - restLength)
    const stretch = currentLength - this.restLength;
    const springForce = this.stiffness * stretch;

    // Damping: F_damp = -b * v_rel_along_spring
    const relVel = sub(this.bodyB.velocity, this.bodyA.velocity);
    const dampingForce = this.damping * dot(relVel, direction);

    // Total force magnitude along spring direction
    const forceMag = springForce + dampingForce;
    const force: Vec2 = {
      x: direction.x * forceMag,
      y: direction.y * forceMag,
    };

    // Apply equal and opposite forces
    // F = ma  =>  a = F / m  =>  a = F * inverseMass
    this.bodyA.velocity.x += force.x * this.bodyA.inverseMass * dt;
    this.bodyA.velocity.y += force.y * this.bodyA.inverseMass * dt;
    this.bodyB.velocity.x -= force.x * this.bodyB.inverseMass * dt;
    this.bodyB.velocity.y -= force.y * this.bodyB.inverseMass * dt;
  }
}
```

**Critical damping** (no oscillation, fastest convergence):
```
b_critical = 2 * sqrt(k * m)
```

Under-damped (b < b_critical): oscillates and decays
Over-damped (b > b_critical): slowly returns without oscillation
Critically damped: fastest return without oscillation — ideal for UI/drag springs

### 4.3 Pin Constraint (Fixed to World)

Anchors a body to a fixed world position:

```typescript
class PinConstraint {
  body: Body;
  worldPoint: Vec2;   // Fixed point in world space
  localAnchor: Vec2;  // Attachment point on body (local space)
  stiffness: number;  // 0-1

  solve(dt: number): void {
    const worldAnchor = localToWorld(this.body, this.localAnchor);
    const delta = sub(this.worldPoint, worldAnchor);
    const dist = length(delta);

    if (dist < 1e-7) return;

    const normal = scale(delta, 1 / dist);
    const r = sub(worldAnchor, this.body.position);
    const rCrossN = cross(r, normal);

    const effectiveMass =
      this.body.inverseMass +
      rCrossN * rCrossN * this.body.inverseInertia;

    if (effectiveMass === 0) return;

    const lambda = dist * this.stiffness / effectiveMass;
    const impulse = scale(normal, lambda);

    this.body.position.x += this.body.inverseMass * impulse.x;
    this.body.position.y += this.body.inverseMass * impulse.y;
    this.body.angle += this.body.inverseInertia * cross(r, impulse);
  }
}
```

### 4.4 Iterative Constraint Solving

Constraints are solved iteratively because solving one constraint can violate another.
The Sequential Impulse / Projected Gauss-Seidel approach:

```typescript
function solveConstraints(constraints: Constraint[], iterations: number): void {
  for (let i = 0; i < iterations; i++) {
    for (const c of constraints) {
      c.solve(dt);
    }
  }
}
```

**Why iterative?** With N constraints, solving them simultaneously requires
inverting an NxN matrix. Iterative solving handles each constraint independently
and converges over multiple passes. For 30-100 board game objects, 4-8 iterations
is typically sufficient.

### 4.5 Warm Starting for Constraints

Cache the Lagrange multiplier (accumulated impulse) per constraint across frames:

```typescript
class WarmStartableConstraint {
  accumulatedLambda: number = 0;

  solve(dt: number): void {
    // Calculate impulse delta as normal
    const deltaLambda = computeDelta();

    // Clamp accumulated impulse (e.g., >= 0 for contact constraints)
    const oldLambda = this.accumulatedLambda;
    this.accumulatedLambda = Math.max(0, oldLambda + deltaLambda);
    const actualDelta = this.accumulatedLambda - oldLambda;

    // Apply only the delta
    applyImpulse(actualDelta);
  }

  warmStart(): void {
    // At frame start, re-apply a fraction of the cached impulse
    applyImpulse(this.accumulatedLambda * 0.8);
  }
}
```

**Contact matching for persistent contacts:**
- Store contact points in local body coordinates
- Each frame, compare new contacts to old ones by proximity
- If a new contact is within threshold distance of an old one, inherit its
  accumulated impulse
- Typical manifold size: max 4 contacts per pair

---

## 5. Forces

### 5.1 Gravity (Constant Acceleration)

```typescript
function applyGravity(bodies: Body[], gravity: Vec2): void {
  for (const body of bodies) {
    if (body.isStatic || body.isSleeping) continue;
    // Gravity is acceleration, not force — same for all masses
    body.velocity.x += gravity.x * dt;
    body.velocity.y += gravity.y * dt;
  }
}

// Typical: gravity = { x: 0, y: 9.81 } (positive Y = down in screen coords)
// For board games: gravity = { x: 0, y: 400 } (pixels/s^2, tuned to feel right)
```

### 5.2 Drag (Velocity-Dependent Damping)

```typescript
function applyDrag(body: Body, dragCoefficient: number): void {
  // Linear drag: F = -drag * v
  // Simple scaling approach (stable):
  body.velocity.x *= (1 - dragCoefficient);
  body.velocity.y *= (1 - dragCoefficient);
  body.angularVelocity *= (1 - dragCoefficient);
}

// Or force-based (more physically accurate):
function applyDragForce(body: Body, dragCoefficient: number, dt: number): void {
  // F_drag = -c * |v| * v  (quadratic drag)
  // or F_drag = -c * v     (linear drag, simpler)
  const fx = -dragCoefficient * body.velocity.x;
  const fy = -dragCoefficient * body.velocity.y;
  body.velocity.x += fx * body.inverseMass * dt;
  body.velocity.y += fy * body.inverseMass * dt;
}

// Matter.js approach (frictionAir):
// velocity *= (1 - frictionAir)
// Default frictionAir = 0.01
```

### 5.3 Wind (Directional Constant Force)

```typescript
function applyWind(body: Body, wind: Vec2, dt: number): void {
  if (body.isStatic) return;
  // Wind is a force, so F = m * a => a = F * inverseMass
  body.velocity.x += wind.x * body.inverseMass * dt;
  body.velocity.y += wind.y * body.inverseMass * dt;
}

// With cross-section scaling (area-dependent):
function applyWindWithArea(body: Body, wind: Vec2, area: number, dt: number): void {
  const force = scale(wind, area);
  body.velocity.x += force.x * body.inverseMass * dt;
  body.velocity.y += force.y * body.inverseMass * dt;
}
```

### 5.4 Attraction/Repulsion (Inverse Square Law)

```typescript
function applyAttraction(
  body: Body,
  attractor: Vec2,
  strength: number, // Positive = attract, Negative = repel
  dt: number
): void {
  const delta = sub(attractor, body.position);
  const distSq = dot(delta, delta);

  // Minimum distance to prevent singularity
  const MIN_DIST_SQ = 100; // 10px minimum
  const clampedDistSq = Math.max(distSq, MIN_DIST_SQ);

  const dist = Math.sqrt(clampedDistSq);
  const direction = scale(delta, 1 / dist);

  // F = G * m1 * m2 / r^2   (simplified: strength / r^2)
  const forceMag = strength / clampedDistSq;

  body.velocity.x += direction.x * forceMag * body.inverseMass * dt;
  body.velocity.y += direction.y * forceMag * body.inverseMass * dt;
}

// N-body gravity between all bodies:
function applyMutualGravity(bodies: Body[], G: number, dt: number): void {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const delta = sub(b.position, a.position);
      const distSq = Math.max(dot(delta, delta), 100);
      const dist = Math.sqrt(distSq);
      const forceMag = G / (distSq * a.inverseMass * b.inverseMass);
      const dir = scale(delta, 1 / dist);

      a.velocity.x += dir.x * forceMag * a.inverseMass * dt;
      a.velocity.y += dir.y * forceMag * a.inverseMass * dt;
      b.velocity.x -= dir.x * forceMag * b.inverseMass * dt;
      b.velocity.y -= dir.y * forceMag * b.inverseMass * dt;
    }
  }
}
```

---

## 6. Board Game Animation Patterns

### 6.1 Arc Trajectory (Piece Moving Between Board Positions)

Use a quadratic Bezier curve for parabolic arcs:

```typescript
interface ArcAnimation {
  body: Body;
  start: Vec2;
  end: Vec2;
  control: Vec2;    // Bezier control point (determines arc height/shape)
  duration: number;  // seconds
  elapsed: number;
  onComplete?: () => void;
}

// Compute the control point for a natural-looking arc:
function computeArcControl(start: Vec2, end: Vec2, heightFactor: number = 0.5): Vec2 {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dist = distance(start, end);

  return {
    x: midX,
    y: midY - dist * heightFactor, // Arc above the midpoint
  };
}

// Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
function evaluateBezier(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

// Bezier derivative for velocity direction:
function bezierDerivative(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  return {
    x: 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

// Easing function for natural acceleration/deceleration:
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function updateArc(arc: ArcAnimation, dt: number): boolean {
  arc.elapsed += dt;
  const rawT = Math.min(arc.elapsed / arc.duration, 1);
  const t = easeInOutQuad(rawT);

  const pos = evaluateBezier(arc.start, arc.control, arc.end, t);
  arc.body.position.x = pos.x;
  arc.body.position.y = pos.y;

  // Set velocity for collision purposes (derivative of bezier)
  const vel = bezierDerivative(arc.start, arc.control, arc.end, t);
  const speed = length(vel);
  if (speed > 0) {
    arc.body.velocity.x = vel.x / arc.duration;
    arc.body.velocity.y = vel.y / arc.duration;
  }

  if (rawT >= 1) {
    arc.onComplete?.();
    return true; // Animation complete
  }
  return false;
}
```

### 6.2 Bounce-and-Settle (Landing Animation)

Body lands with restitution, each bounce decreases until settled:

```typescript
interface BounceAnimation {
  body: Body;
  landingY: number;        // The "ground" Y position
  restitution: number;      // Initial bounce coefficient (0.4 - 0.7 for board pieces)
  settleThreshold: number;  // Minimum velocity to consider "settled" (e.g., 0.5 px/s)
  settled: boolean;
  onSettle?: () => void;
}

function initBounce(body: Body, landingY: number): BounceAnimation {
  return {
    body,
    landingY,
    restitution: 0.5,
    settleThreshold: 0.5,
    settled: false,
  };
}

// This works naturally with the physics engine:
// 1. Set body restitution to desired value
// 2. Create a static floor body at landingY
// 3. Enable gravity
// 4. Use restitution slop to ensure settling

// Manual approach (without full physics):
function updateBounce(bounce: BounceAnimation, gravity: number, dt: number): void {
  if (bounce.settled) return;

  // Apply gravity
  bounce.body.velocity.y += gravity * dt;

  // Update position
  bounce.body.position.y += bounce.body.velocity.y * dt;

  // Floor collision
  if (bounce.body.position.y >= bounce.landingY) {
    bounce.body.position.y = bounce.landingY;

    // Check if we should settle
    if (Math.abs(bounce.body.velocity.y) < bounce.settleThreshold) {
      bounce.body.velocity.y = 0;
      bounce.body.velocity.x = 0;
      bounce.settled = true;
      bounce.onSettle?.();
      return;
    }

    // Bounce with energy loss
    bounce.body.velocity.y *= -bounce.restitution;

    // Optional: reduce horizontal velocity too (friction on landing)
    bounce.body.velocity.x *= 0.8;
  }
}

// Energy-based settling (alternative):
function kineticEnergy(body: Body): number {
  const v = body.velocity;
  const speed = v.x * v.x + v.y * v.y;
  return 0.5 * (1 / body.inverseMass) * speed;
}

function isSettled(body: Body, threshold: number = 0.01): boolean {
  return kineticEnergy(body) < threshold;
}
```

### 6.3 Spring-to-Cursor Drag

Body attached to mouse position via spring constraint:

```typescript
class CursorDragController {
  private spring: SpringConstraint | null = null;
  private dragBody: Body | null = null;
  private cursorBody: Body; // Kinematic body at cursor position

  constructor() {
    // Create a kinematic (infinite mass) body to represent the cursor
    this.cursorBody = createBody({
      position: { x: 0, y: 0 },
      inverseMass: 0,         // Infinite mass — not affected by physics
      inverseInertia: 0,
      isStatic: true,
    });
  }

  startDrag(body: Body, cursorPos: Vec2): void {
    this.dragBody = body;
    this.cursorBody.position = { ...cursorPos };

    this.spring = new SpringConstraint();
    this.spring.bodyA = this.cursorBody;
    this.spring.bodyB = body;
    this.spring.restLength = 0;  // Pull to cursor position
    this.spring.stiffness = 50;  // Tune for feel (higher = snappier)
    this.spring.damping = 5;     // Prevents oscillation

    // Wake the body if sleeping
    body.isSleeping = false;
  }

  updateCursor(cursorPos: Vec2): void {
    this.cursorBody.position = { ...cursorPos };
  }

  endDrag(): void {
    this.spring = null;
    this.dragBody = null;
  }

  getSpring(): SpringConstraint | null {
    return this.spring;
  }
}

// Usage in the game loop:
// dragController.startDrag(body, mousePos);
// Each frame: dragController.updateCursor(mousePos);
// On mouse up: dragController.endDrag();  // Body flies with current velocity
```

**Spring stiffness tuning for drag feel:**
- `stiffness: 20, damping: 3` — Loose, elastic, playful feel
- `stiffness: 50, damping: 7` — Responsive, slight lag
- `stiffness: 200, damping: 15` — Very snappy, almost direct
- Critical damping: `damping = 2 * sqrt(stiffness * mass)`

### 6.4 Stack Stabilization

Making stacked circles settle without jitter:

```typescript
// Key techniques for stable stacking:

// 1. Restitution slop — kills micro-bounces
const RESTITUTION_SLOP = 0.5; // m/s
function getEffectiveRestitution(e: number, closingSpeed: number): number {
  if (closingSpeed < RESTITUTION_SLOP) return 0;
  return e;
}

// 2. Penetration slop — allows minor overlap without correction
const PENETRATION_SLOP = 0.5; // pixels
function getCorrectionForce(penetration: number, beta: number, dt: number): number {
  return (beta / dt) * Math.max(penetration - PENETRATION_SLOP, 0);
}

// 3. Sleep system — bodies that stop moving go to sleep
function shouldSleep(body: Body, sleepThreshold: number, sleepTimer: number): boolean {
  const motion = body.velocity.x * body.velocity.x +
                 body.velocity.y * body.velocity.y +
                 body.angularVelocity * body.angularVelocity;
  return motion < sleepThreshold && body.awakeTime > sleepTimer;
}

// 4. Contact persistence + warm starting (see Section 4.5)
// Without this, stacks will vibrate because each frame starts solving from scratch.

// 5. Multiple solver iterations (6-10 for stacks)
const VELOCITY_ITERATIONS = 8;
const POSITION_ITERATIONS = 4;

// 6. Sort contacts bottom-to-top for better convergence
function sortContactsByHeight(manifolds: ContactManifold[]): void {
  manifolds.sort((a, b) => {
    const yA = Math.max(a.bodyA.position.y, a.bodyB.position.y);
    const yB = Math.max(b.bodyA.position.y, b.bodyB.position.y);
    return yB - yA; // Bottom contacts first
  });
}
```

### 6.5 Explosion/Burst (Radial Impulse)

```typescript
function applyRadialImpulse(
  bodies: Body[],
  epicenter: Vec2,
  strength: number,
  radius: number,
  falloff: 'linear' | 'quadratic' = 'quadratic'
): void {
  for (const body of bodies) {
    if (body.isStatic) continue;

    const delta = sub(body.position, epicenter);
    const dist = length(delta);

    if (dist > radius || dist < 1e-6) continue;

    const direction = scale(delta, 1 / dist);

    // Falloff calculation
    let factor: number;
    if (falloff === 'linear') {
      factor = 1 - dist / radius;
    } else {
      factor = 1 - (dist * dist) / (radius * radius);
    }

    const impulse = strength * factor;

    body.velocity.x += direction.x * impulse * body.inverseMass;
    body.velocity.y += direction.y * impulse * body.inverseMass;

    // Add some random spin for visual interest
    body.angularVelocity += (Math.random() - 0.5) * impulse * 0.1;

    // Wake body if sleeping
    body.isSleeping = false;
  }
}

// Usage: Piece captured — scatter nearby pieces
function onPieceCaptured(capturedPos: Vec2, world: World): void {
  applyRadialImpulse(
    world.bodies,
    capturedPos,
    500,    // strength (tune to feel)
    200,    // radius in pixels
    'quadratic'
  );
}

// Implosion (attract inward):
function applyImplosion(bodies: Body[], center: Vec2, strength: number, radius: number): void {
  applyRadialImpulse(bodies, center, -strength, radius, 'linear');
}
```

---

## 7. Performance

### 7.1 Object Pooling

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 32) {
    this.factory = factory;
    this.reset = reset;

    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  get available(): number {
    return this.pool.length;
  }
}

// Usage:
const vec2Pool = new ObjectPool<Vec2>(
  () => ({ x: 0, y: 0 }),
  (v) => { v.x = 0; v.y = 0; },
  128
);

const manifoldPool = new ObjectPool<ContactManifold>(
  () => ({
    bodyA: null!, bodyB: null!,
    normal: { x: 0, y: 0 },
    penetration: 0,
    contacts: [],
  }),
  (m) => {
    m.bodyA = null!;
    m.bodyB = null!;
    m.normal.x = 0;
    m.normal.y = 0;
    m.penetration = 0;
    m.contacts.length = 0;
  },
  64
);
```

### 7.2 Sleeping Bodies

```typescript
interface SleepConfig {
  velocityThreshold: number;    // px/s below which body may sleep (default: 0.5)
  angularThreshold: number;     // rad/s below which body may sleep (default: 0.01)
  timeToSleep: number;          // seconds below threshold before sleeping (default: 0.5)
}

const DEFAULT_SLEEP_CONFIG: SleepConfig = {
  velocityThreshold: 0.5,
  angularThreshold: 0.01,
  timeToSleep: 0.5,
};

function updateSleepState(body: Body, config: SleepConfig, dt: number): void {
  if (body.isStatic) return;

  const speed = length(body.velocity);
  const angSpeed = Math.abs(body.angularVelocity);

  if (speed < config.velocityThreshold && angSpeed < config.angularThreshold) {
    body.sleepCounter += dt;

    if (body.sleepCounter >= config.timeToSleep) {
      body.isSleeping = true;
      body.velocity.x = 0;
      body.velocity.y = 0;
      body.angularVelocity = 0;
    }
  } else {
    body.sleepCounter = 0;
    body.isSleeping = false;
  }
}

function wakeBody(body: Body): void {
  body.isSleeping = false;
  body.sleepCounter = 0;
}

// Wake neighbors when a body wakes up or a collision occurs:
function wakeOnCollision(bodyA: Body, bodyB: Body): void {
  if (bodyA.isSleeping && !bodyB.isSleeping) wakeBody(bodyA);
  if (bodyB.isSleeping && !bodyA.isSleeping) wakeBody(bodyB);
}

// Skip sleeping bodies in the simulation loop:
function step(world: World, dt: number): void {
  for (const body of world.bodies) {
    if (body.isStatic || body.isSleeping) continue;
    integrate(body, dt);
  }
  // ... collision detection still checks sleeping bodies for wake-up
}
```

### 7.3 requestAnimationFrame Loop with Fixed Timestep

Complete production loop:

```typescript
class PhysicsLoop {
  private world: World;
  private fixedDt: number;
  private maxFrameTime: number;
  private accumulator: number = 0;
  private prevTime: number = 0;
  private prevState: PhysicsState | null = null;
  private running: boolean = false;
  private rafId: number = 0;
  private onRender: (alpha: number) => void;

  constructor(
    world: World,
    onRender: (alpha: number) => void,
    fixedHz: number = 60,
    maxFrameMs: number = 250
  ) {
    this.world = world;
    this.onRender = onRender;
    this.fixedDt = 1 / fixedHz;
    this.maxFrameTime = maxFrameMs / 1000;
  }

  start(): void {
    this.running = true;
    this.prevTime = performance.now() / 1000;
    this.tick(performance.now());
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    const currentTime = timestamp / 1000;
    let frameTime = currentTime - this.prevTime;
    this.prevTime = currentTime;

    // Spiral of death clamp
    if (frameTime > this.maxFrameTime) {
      frameTime = this.maxFrameTime;
    }

    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedDt) {
      this.prevState = this.world.saveState();
      this.world.step(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Alpha for interpolation
    const alpha = this.accumulator / this.fixedDt;
    this.onRender(alpha);

    this.rafId = requestAnimationFrame(this.tick);
  };
}
```

### 7.4 SVG-Specific Performance Tips

```typescript
// 1. Use transform attribute instead of cx/cy for circles
// Transform is GPU-accelerated in most browsers
function updateSVGBody(element: SVGElement, body: Body, alpha: number): void {
  const x = lerp(body.prevPosition.x, body.position.x, alpha);
  const y = lerp(body.prevPosition.y, body.position.y, alpha);
  const angle = lerpAngle(body.prevAngle, body.angle, alpha);
  const deg = angle * 180 / Math.PI;

  element.setAttribute('transform', `translate(${x},${y}) rotate(${deg})`);
}

// 2. Batch SVG updates using documentFragment or requestAnimationFrame
// (already handled by the game loop above)

// 3. Use will-change: transform on animated SVG groups
// <g style="will-change: transform">

// 4. For > 100 objects, consider switching to Canvas rendering:
function renderToCanvas(ctx: CanvasRenderingContext2D, bodies: Body[]): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const body of bodies) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    // Draw body shape...
    ctx.restore();
  }
}

// 5. Visibility culling for off-screen bodies
function isVisible(body: Body, viewport: AABB): boolean {
  const aabb = body.getAABB();
  return aabb.maxX >= viewport.minX && aabb.minX <= viewport.maxX &&
         aabb.maxY >= viewport.minY && aabb.minY <= viewport.maxY;
}
```

---

## 8. Reference Implementations

### 8.1 Matter.js (liabru/matter-js)

**Architecture:** Modular, single-threaded, pure JavaScript.

**Key source files and patterns:**
- `src/core/Engine.js` — Central simulation loop; `Engine.update()` runs the 11-phase cycle
- `src/body/Body.js` — Rigid body with Verlet integration
- `src/collision/Detector.js` — Broadphase (sort-and-sweep on X)
- `src/collision/Collision.js` — Narrowphase (SAT for convex polygons)
- `src/collision/Pairs.js` — Contact pair lifecycle management (create/active/end)
- `src/collision/Resolver.js` — Position and velocity resolution (iterative)
- `src/constraint/Constraint.js` — Distance/spring constraints

**Integration method:** Time-corrected position Verlet
```
velocity = (position - positionPrev) * frictionAir + (force / mass) * dt^2
position += velocity
```

**Solver config defaults:**
- Position iterations: 6
- Velocity iterations: 4
- Constraint iterations: 2

**Strengths:** Excellent documentation, many demos, easy to understand.
**Weaknesses:** Performance degrades above ~300 bodies, no WASM option, single-threaded.

### 8.2 Planck.js (piqnt/planck.js)

**Architecture:** JavaScript rewrite of Box2D (not a direct port/binding).

**Key differences from Box2D C++:**
- `b2` prefix dropped: `b2World` becomes `planck.World`
- Methods are lowerCamelCase instead of UpperCamelCase
- Definition classes replaced by inline JS objects
- Listener classes replaced with `world.on('event', fn)` pattern

**Solver:** Sequential impulse (Projected Gauss-Seidel) with warm starting.

**Strengths:** Battle-tested Box2D algorithms, well-documented, typed.
**Weaknesses:** Heavier API surface, overkill for simple board game physics.

### 8.3 Rapier (dimforge/rapier)

**Architecture:** Written in Rust, compiled to WASM, with JavaScript bindings.

**Key characteristics:**
- Published as `@dimforge/rapier2d` on npm
- 5-8x faster than pure JS engines for equivalent simulations
- Uses XPBD (Extended Position-Based Dynamics) solver
- Supports continuous collision detection (CCD)
- Deterministic simulation

**Strengths:** Best raw performance, modern solver design.
**Weaknesses:** WASM binary overhead (~200KB), opaque debugging, less customizable.

### 8.4 Lightweight TypeScript Physics Engines on GitHub

1. **Sopiro/Physics** — Full-featured 2D rigid body engine in TypeScript.
   Includes SAT collision, joints, constraint solver. Good study reference.

2. **code0wl/coalesce** — Minimalist 2D engine using TypeScript + RxJS.
   Explicitly aims for lightweight code. Good for understanding core patterns.

3. **Altanis/kinetics** — Fast TypeScript physics for both Node.js and browsers.

4. **voidbert/PhysicsSimulator** — Very simple TypeScript 2D engine.
   Best for learning, not for production use.

5. **jriecken/sat-js** — Standalone SAT implementation in JavaScript.
   Lightweight collision-detection-only library. Good reference for SAT.

---

## Quick Reference: Essential Math Utilities

```typescript
interface Vec2 { x: number; y: number; }

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Rotate a vector by angle (radians)
function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

// Transform a local-space point to world space
function localToWorld(body: Body, local: Vec2): Vec2 {
  const rotated = rotate(local, body.angle);
  return add(body.position, rotated);
}
```

---

## Sources

### Integration Methods
- [Verlet Integration — Algorithm Archive](https://www.algorithm-archive.org/contents/verlet_integration/verlet_integration.html)
- [Integration Basics — Gaffer On Games](https://gafferongames.com/post/integration_basics/)
- [Fix Your Timestep! — Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/)
- [Semi-Implicit Euler — Wikipedia](https://en.wikipedia.org/wiki/Semi-implicit_Euler_method)
- [Verlet Integration — Wikipedia](https://en.wikipedia.org/wiki/Verlet_integration)

### Collision Detection
- [SAT — dyn4j.org](https://dyn4j.org/2010/01/sat/)
- [2D Collision Detection — MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)
- [Circle-Circle Collision — Jeffrey Thompson](https://www.jeffreythompson.org/collision-detection/circle-circle.php)
- [2D Collision Detection and Resolution — Tim Wheeler](https://timallanwheeler.com/blog/2024/08/01/2d-collision-detection-and-resolution/)
- [Spatial Hashing — Build New Games](http://buildnewgames.com/broad-phase-collision-detection/)

### Collision Resolution
- [Custom 2D Physics Engine: Impulse Resolution — Envato Tuts+](https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-the-basics-and-impulse-resolution--gamedev-6331t)
- [Custom 2D Physics Engine: Friction — Envato Tuts+](https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-friction-scene-and-jump-table--gamedev-7756t)
- [Collision Response and Coulomb Friction — Gaffer On Games](https://gafferongames.com/post/collision_response_and_coulomb_friction/)
- [Understanding Constraint Resolution — GameDev.net](https://www.gamedev.net/tutorials/programming/math-and-physics/understanding-constraint-resolution-in-physics-engine-r4839/)
- [Understanding Collision Constraint Solvers — Erik Onarheim](https://erikonarheim.com/posts/understanding-collision-constraint-solvers/)

### Constraints and Solvers
- [Sequential Impulses — Erin Catto GDC 2006 (PDF)](https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf)
- [Understanding Constraints — Erin Catto GDC 2014 (PDF)](https://box2d.org/files/ErinCatto_UnderstandingConstraints_GDC2014.pdf)
- [Game Physics: Constraints & Sequential Impulse — Allen Chou](https://allenchou.net/2013/12/game-physics-constraints-sequential-impulse/)
- [Game Physics: Warm Starting — Allen Chou](https://allenchou.net/2014/01/game-physics-stability-warm-starting/)
- [Game Physics: Slops — Allen Chou](https://allenchou.net/2014/01/game-physics-stability-slops/)
- [Solver2D — Box2D Blog](https://box2d.org/posts/2024/02/solver2d/)
- [Spring Physics — Gaffer On Games](https://gafferongames.com/post/spring_physics/)

### Reference Implementations
- [Matter.js — GitHub](https://github.com/liabru/matter-js)
- [Matter.js Architecture — DeepWiki](https://deepwiki.com/liabru/matter-js)
- [Planck.js — GitHub](https://github.com/piqnt/planck.js)
- [Rapier — dimforge](https://rapier.rs/)
- [Sopiro/Physics — GitHub](https://github.com/Sopiro/Physics)
- [sat-js — GitHub](https://github.com/jriecken/sat-js)
- [box2d-lite — GitHub](https://github.com/erincatto/box2d-lite)

### Performance
- [Object Pool Pattern — Game Programming Patterns](https://gameprogrammingpatterns.com/object-pool.html)
- [Object Pool in JS — egghead.io](https://egghead.io/blog/object-pool-design-pattern)
- [Roblox Sleep System — Medium](https://medium.com/@nwarren_4475/roblox-physics-building-a-better-sleep-system-84158c75b62d)
- [Building a Game Loop in TypeScript — DEV Community](https://dev.to/stormsidali2001/building-a-professional-game-loop-in-typescript-from-basic-to-advanced-implementation-eo8)
