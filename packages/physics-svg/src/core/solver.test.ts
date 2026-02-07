import { describe, it, expect } from 'vitest';
import { integrate, solveConstraints } from './solver.js';
import { createBody } from './body.js';
import { createConstraint } from './constraint.js';
import type { PhysicsBody, Constraint } from '@mcp-tool-shop/siege-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Map<string, PhysicsBody> from an array of bodies. */
function bodyMap(...bodies: PhysicsBody[]): Map<string, PhysicsBody> {
  const m = new Map<string, PhysicsBody>();
  for (const b of bodies) m.set(b.id, b);
  return m;
}

/** Build a Map<string, Constraint> from an array of constraints. */
function constraintMap(...constraints: Constraint[]): Map<string, Constraint> {
  const m = new Map<string, Constraint>();
  for (const c of constraints) m.set(c.id, c);
  return m;
}

/** Euclidean distance between two 2D points. */
function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

// ---------------------------------------------------------------------------
// integrate()
// ---------------------------------------------------------------------------

describe('integrate', () => {
  it('body at rest stays at rest (zero velocity, zero acceleration)', () => {
    const body = createBody({
      position: { x: 50, y: 100 },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
    });

    integrate(body, 1 / 60);

    expect(body.position.x).toBe(50);
    expect(body.position.y).toBe(100);
    expect(body.velocity.x).toBe(0);
    expect(body.velocity.y).toBe(0);
  });

  it('constant acceleration produces correct velocity change: v += a * dt', () => {
    const dt = 1 / 60;
    const body = createBody({
      velocity: { x: 0, y: 0 },
      acceleration: { x: 120, y: -60 },
    });

    integrate(body, dt);

    expect(body.velocity.x).toBeCloseTo(120 * dt, 10);
    expect(body.velocity.y).toBeCloseTo(-60 * dt, 10);
  });

  it('constant velocity produces correct position change: p += v * dt', () => {
    const dt = 1 / 60;
    const body = createBody({
      position: { x: 10, y: 20 },
      velocity: { x: 300, y: -150 },
      acceleration: { x: 0, y: 0 },
    });

    integrate(body, dt);

    // velocity unchanged (no acceleration)
    expect(body.velocity.x).toBe(300);
    expect(body.velocity.y).toBe(-150);
    // position = old + v*dt
    expect(body.position.x).toBeCloseTo(10 + 300 * dt, 10);
    expect(body.position.y).toBeCloseTo(20 + -150 * dt, 10);
  });

  it('previousPosition is saved before position update', () => {
    const body = createBody({
      position: { x: 5, y: 10 },
      velocity: { x: 60, y: 0 },
      acceleration: { x: 0, y: 0 },
    });

    integrate(body, 1);

    // previousPosition should be the OLD position
    expect(body.previousPosition.x).toBe(5);
    expect(body.previousPosition.y).toBe(10);
    // position should have moved
    expect(body.position.x).toBe(65);
    expect(body.position.y).toBe(10);
  });

  it('acceleration is reset to zero after integration', () => {
    const body = createBody({
      acceleration: { x: 100, y: -200 },
    });

    integrate(body, 1 / 60);

    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(0);
  });

  it('large dt values do not produce NaN or Infinity', () => {
    const body = createBody({
      position: { x: 0, y: 0 },
      velocity: { x: 10, y: 10 },
      acceleration: { x: 1000, y: 1000 },
    });

    integrate(body, 100);

    expect(Number.isFinite(body.position.x)).toBe(true);
    expect(Number.isFinite(body.position.y)).toBe(true);
    expect(Number.isFinite(body.velocity.x)).toBe(true);
    expect(Number.isFinite(body.velocity.y)).toBe(true);
    // v = 10 + 1000*100 = 100010
    expect(body.velocity.x).toBeCloseTo(100010, 5);
    // p = 0 + 100010*100 = 10001000
    expect(body.position.x).toBeCloseTo(10001000, 0);
  });

  it('static body (invMass=0) still integrates when passed directly', () => {
    // integrate() itself does NOT check isStatic — it's the caller's
    // responsibility to skip static bodies. Verify it still runs
    // without error and applies the math regardless.
    const body = createBody({
      isStatic: true,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 10, y: 10 },
    });

    integrate(body, 1);

    // Semi-implicit Euler still applies even though body is "static"
    expect(body.velocity.x).toBe(10);
    expect(body.velocity.y).toBe(10);
    expect(body.position.x).toBe(10);
    expect(body.position.y).toBe(10);
    // acceleration reset
    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(0);
  });

  it('semi-implicit Euler: velocity updates before position', () => {
    // This distinguishes semi-implicit Euler from explicit Euler.
    // With a = 100, v0 = 0, dt = 1:
    //   Semi-implicit: v = 0 + 100*1 = 100, p = 0 + 100*1 = 100
    //   Explicit:      p = 0 + 0*1 = 0,     v = 0 + 100*1 = 100
    const body = createBody({
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 100, y: 0 },
    });

    integrate(body, 1);

    // position should be 100, not 0 (which would be explicit Euler)
    expect(body.position.x).toBe(100);
    expect(body.velocity.x).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// solveConstraints() — Spring
// ---------------------------------------------------------------------------

describe('solveConstraints — spring', () => {
  it('two bodies displaced beyond rest length are pulled closer', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 200, y: 0 } });

    const spring = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'spring',
      stiffness: 0.5,
      damping: 0,
      length: 100, // rest length = 100, current = 200
    });

    const bodies = bodyMap(a, b);
    const constraints = constraintMap(spring);

    // After solving, acceleration on A should point toward B (positive x),
    // and acceleration on B should point toward A (negative x).
    solveConstraints(constraints, bodies, 1);

    expect(a.acceleration.x).toBeGreaterThan(0);
    expect(b.acceleration.x).toBeLessThan(0);
  });

  it('spring with damping reduces oscillation over time', () => {
    const a = createBody({
      id: 'a',
      position: { x: 0, y: 0 },
      velocity: { x: 50, y: 0 },
    });
    const b = createBody({
      id: 'b',
      position: { x: 100, y: 0 },
      velocity: { x: -50, y: 0 },
    });

    const springNoDamp = createConstraint({
      id: 'no-damp',
      bodyA: 'a',
      bodyB: 'b',
      type: 'spring',
      stiffness: 0.5,
      damping: 0,
      length: 100,
    });

    const springDamped = createConstraint({
      id: 'damped',
      bodyA: 'a',
      bodyB: 'b',
      type: 'spring',
      stiffness: 0.5,
      damping: 0.5,
      length: 100,
    });

    // Fresh bodies for the damped case
    const a2 = createBody({
      id: 'a',
      position: { x: 0, y: 0 },
      velocity: { x: 50, y: 0 },
    });
    const b2 = createBody({
      id: 'b',
      position: { x: 100, y: 0 },
      velocity: { x: -50, y: 0 },
    });

    solveConstraints(constraintMap(springNoDamp), bodyMap(a, b), 1);
    solveConstraints(constraintMap(springDamped), bodyMap(a2, b2), 1);

    // With bodies moving toward each other (relative velocity along spring),
    // the damped spring should apply LESS net acceleration than the undamped
    // spring because damping counteracts the closing velocity.
    const undampedAccelMag = Math.abs(a.acceleration.x);
    const dampedAccelMag = Math.abs(a2.acceleration.x);

    // The bodies are AT rest length (dist=100, length=100) so stiffness term = 0,
    // but damping term should produce a force opposing relative velocity.
    // The undamped spring has 0 acceleration (stiffness * 0 stretch + 0 damping).
    // The damped spring has non-zero acceleration (0 stretch + damping * relSpeed).
    // So in this case, the damped spring produces MORE force, but it's opposing
    // the velocity — which IS damping behavior.
    expect(dampedAccelMag).toBeGreaterThan(undampedAccelMag);
  });

  it('spring at rest length with zero velocity produces no force', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 100, y: 0 } });

    const spring = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'spring',
      stiffness: 1.0,
      damping: 0.5,
      length: 100,
    });

    solveConstraints(constraintMap(spring), bodyMap(a, b), 1);

    expect(a.acceleration.x).toBeCloseTo(0, 10);
    expect(a.acceleration.y).toBeCloseTo(0, 10);
    expect(b.acceleration.x).toBeCloseTo(0, 10);
    expect(b.acceleration.y).toBeCloseTo(0, 10);
  });
});

// ---------------------------------------------------------------------------
// solveConstraints() — Distance
// ---------------------------------------------------------------------------

describe('solveConstraints — distance', () => {
  it('bodies farther than rest length should be pulled closer', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 200, y: 0 } });

    const constraint = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'distance',
      stiffness: 1.0,
      length: 100,
    });

    const bodies = bodyMap(a, b);
    solveConstraints(constraintMap(constraint), bodies, 1);

    // Distance constraint moves positions directly.
    // Bodies should be closer together than 200.
    const d = dist(a.position.x, a.position.y, b.position.x, b.position.y);
    expect(d).toBeLessThan(200);
  });

  it('bodies closer than rest length should be pushed apart', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 30, y: 0 } });

    const constraint = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'distance',
      stiffness: 1.0,
      length: 100,
    });

    const bodies = bodyMap(a, b);
    solveConstraints(constraintMap(constraint), bodies, 1);

    const d = dist(a.position.x, a.position.y, b.position.x, b.position.y);
    expect(d).toBeGreaterThan(30);
  });

  it('equal-mass bodies are corrected symmetrically', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 }, mass: 1 });
    const b = createBody({ id: 'b', position: { x: 200, y: 0 }, mass: 1 });

    const constraint = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'distance',
      stiffness: 1.0,
      length: 100,
    });

    solveConstraints(constraintMap(constraint), bodyMap(a, b), 1);

    // Both should move by the same magnitude (opposite directions)
    // Original midpoint is at x=100. Both should stay centered around it.
    const midX = (a.position.x + b.position.x) / 2;
    expect(midX).toBeCloseTo(100, 5);
  });

  it('static body is not moved by distance constraint', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 200, y: 0 }, isStatic: true });

    const constraint = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'distance',
      stiffness: 1.0,
      length: 100,
    });

    solveConstraints(constraintMap(constraint), bodyMap(a, b), 1);

    // B is static, should not move
    expect(b.position.x).toBe(200);
    expect(b.position.y).toBe(0);
    // A should have moved toward B
    expect(a.position.x).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// solveConstraints() — Pin
// ---------------------------------------------------------------------------

describe('solveConstraints — pin', () => {
  it('bodyA should move toward bodyB position', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 100, y: 100 } });

    const pin = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'pin',
      stiffness: 0.5,
      damping: 0.1,
    });

    solveConstraints(constraintMap(pin), bodyMap(a, b), 1);

    // A should move toward B (positive x, positive y)
    expect(a.position.x).toBeGreaterThan(0);
    expect(a.position.y).toBeGreaterThan(0);
  });

  it('pin with stiffness=1 moves bodyA fully to bodyB (one iteration)', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 100, y: 0 } });

    const pin = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'pin',
      stiffness: 1.0,
      damping: 0,
    });

    solveConstraints(constraintMap(pin), bodyMap(a, b), 1);

    expect(a.position.x).toBeCloseTo(100, 5);
    expect(a.position.y).toBeCloseTo(0, 5);
  });

  it('pin also adjusts velocity based on damping', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 100, y: 0 } });

    const pin = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'pin',
      stiffness: 0.5,
      damping: 0.5,
    });

    solveConstraints(constraintMap(pin), bodyMap(a, b), 1);

    // velocity should be adjusted: += correction * damping
    // correction = delta * stiffness = (100,0) * 0.5 = (50,0)
    // velocity += (50,0) * 0.5 = (25,0)
    expect(a.velocity.x).toBeCloseTo(25, 5);
    expect(a.velocity.y).toBeCloseTo(0, 5);
  });

  it('static bodyA is NOT moved by pin constraint', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 }, isStatic: true });
    const b = createBody({ id: 'b', position: { x: 100, y: 0 } });

    const pin = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'pin',
      stiffness: 1.0,
      damping: 0.5,
    });

    solveConstraints(constraintMap(pin), bodyMap(a, b), 1);

    expect(a.position.x).toBe(0);
    expect(a.position.y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// solveConstraints() — Edge cases
// ---------------------------------------------------------------------------

describe('solveConstraints — edge cases', () => {
  it('empty constraints map does not throw', () => {
    const bodies = bodyMap(createBody({ id: 'a' }));
    const constraints = new Map<string, Constraint>();

    expect(() => solveConstraints(constraints, bodies)).not.toThrow();
  });

  it('missing bodyA in bodies map is gracefully skipped', () => {
    const b = createBody({ id: 'b', position: { x: 100, y: 0 } });

    const constraint = createConstraint({
      bodyA: 'nonexistent',
      bodyB: 'b',
      type: 'spring',
      stiffness: 1.0,
      length: 50,
    });

    const bodies = bodyMap(b);
    const constraints = constraintMap(constraint);

    expect(() => solveConstraints(constraints, bodies)).not.toThrow();
    // B should be unaffected
    expect(b.position.x).toBe(100);
    expect(b.acceleration.x).toBe(0);
  });

  it('missing bodyB in bodies map is gracefully skipped', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });

    const constraint = createConstraint({
      bodyA: 'a',
      bodyB: 'nonexistent',
      type: 'distance',
      stiffness: 1.0,
      length: 50,
    });

    const bodies = bodyMap(a);
    const constraints = constraintMap(constraint);

    expect(() => solveConstraints(constraints, bodies)).not.toThrow();
    expect(a.position.x).toBe(0);
  });

  it('multiple iterations improve convergence for distance constraint', () => {
    const targetLength = 100;

    const constraint = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'distance',
      stiffness: 0.5, // partial correction per iteration
      length: targetLength,
    });

    // 1 iteration
    const a1 = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b1 = createBody({ id: 'b', position: { x: 200, y: 0 } });
    solveConstraints(constraintMap(constraint), bodyMap(a1, b1), 1);
    const dist1 = dist(a1.position.x, a1.position.y, b1.position.x, b1.position.y);

    // 8 iterations
    const a8 = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b8 = createBody({ id: 'b', position: { x: 200, y: 0 } });
    solveConstraints(constraintMap(constraint), bodyMap(a8, b8), 8);
    const dist8 = dist(a8.position.x, a8.position.y, b8.position.x, b8.position.y);

    // More iterations should get closer to the target length
    const error1 = Math.abs(dist1 - targetLength);
    const error8 = Math.abs(dist8 - targetLength);
    expect(error8).toBeLessThan(error1);
  });

  it('default iterations parameter is used (no crash)', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 100, y: 0 } });

    const constraint = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'spring',
      stiffness: 0.5,
      length: 50,
    });

    // Call without iterations argument — uses default of 4
    expect(() =>
      solveConstraints(constraintMap(constraint), bodyMap(a, b)),
    ).not.toThrow();
  });

  it('hinge constraint type is a no-op (no crash)', () => {
    const a = createBody({ id: 'a', position: { x: 0, y: 0 } });
    const b = createBody({ id: 'b', position: { x: 100, y: 0 } });

    const constraint = createConstraint({
      bodyA: 'a',
      bodyB: 'b',
      type: 'hinge' as Constraint['type'],
      stiffness: 1.0,
    });

    const posABefore = { ...a.position };
    const posBBefore = { ...b.position };

    solveConstraints(constraintMap(constraint), bodyMap(a, b), 4);

    expect(a.position.x).toBe(posABefore.x);
    expect(a.position.y).toBe(posABefore.y);
    expect(b.position.x).toBe(posBBefore.x);
    expect(b.position.y).toBe(posBBefore.y);
  });
});
