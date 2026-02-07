import { describe, it, expect } from 'vitest';
import { createBody } from './body.js';
import { createConstraint } from './constraint.js';
import { PhysicsEngine } from './engine.js';
import { detectCollisions } from './collision.js';
import { integrate, solveConstraints } from './solver.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard world config for edge-case tests. */
function defaultConfig() {
  return {
    gravity: { x: 0, y: 980 },
    substeps: 4,
    velocityIterations: 4,
  } as const;
}

/** Assert that a number is finite and not NaN. */
function expectFinite(value: number, label = 'value') {
  expect(Number.isFinite(value), `${label} should be finite, got ${value}`).toBe(true);
}

/** Assert that a body's position and velocity are finite. */
function expectBodySane(body: { position: { x: number; y: number }; velocity: { x: number; y: number } }) {
  expectFinite(body.position.x, 'position.x');
  expectFinite(body.position.y, 'position.y');
  expectFinite(body.velocity.x, 'velocity.x');
  expectFinite(body.velocity.y, 'velocity.y');
}

// ---------------------------------------------------------------------------
// Edge Case Tests
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  // -----------------------------------------------------------------------
  // 1. Zero-mass body (non-static)
  // -----------------------------------------------------------------------
  it('zero-mass non-static body: apply force produces no NaN', () => {
    // mass=0 but isStatic=false is degenerate: invMass would be Infinity
    // if the factory doesn't clamp. createBody sets invMass = mass > 0 ? 1/mass : 0,
    // so mass=0 + isStatic=false gets invMass=0 (same as static).
    const body = createBody({ mass: 0, isStatic: false });

    // invMass is 0 — force application via acceleration should still be safe
    body.acceleration.x = 100;
    body.acceleration.y = 200;

    integrate(body, 1 / 60);

    expectBodySane(body);
  });

  // -----------------------------------------------------------------------
  // 2. Two static bodies — detectCollisions should skip them
  // -----------------------------------------------------------------------
  it('two static bodies: detectCollisions skips them entirely', () => {
    const a = createBody({
      isStatic: true,
      position: { x: 0, y: 0 },
      shape: { type: 'circle', radius: 50 },
    });
    const b = createBody({
      isStatic: true,
      position: { x: 10, y: 0 },
      shape: { type: 'circle', radius: 50 },
    });

    const pairs = detectCollisions([a, b]);
    expect(pairs).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // 3. Coincident bodies — fallback normal
  // -----------------------------------------------------------------------
  it('coincident circles: collision returns valid fallback normal {x:0, y:1}', () => {
    const a = createBody({
      position: { x: 100, y: 100 },
      shape: { type: 'circle', radius: 10 },
    });
    const b = createBody({
      position: { x: 100, y: 100 },
      shape: { type: 'circle', radius: 10 },
    });

    const pairs = detectCollisions([a, b]);
    expect(pairs).toHaveLength(1);

    const pair = pairs[0]!;
    expect(pair.normal.x).toBe(0);
    expect(pair.normal.y).toBe(1);
    expectFinite(pair.penetration, 'penetration');
    expect(pair.penetration).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // 4. Large mass ratio: light body on heavy floor
  // -----------------------------------------------------------------------
  it('large mass ratio: 0.1kg circle on 10000kg static floor, 120 steps', () => {
    const engine = new PhysicsEngine(defaultConfig());

    const ball = createBody({
      mass: 0.1,
      position: { x: 500, y: 400 },
      shape: { type: 'circle', radius: 10 },
    });

    const floor = createBody({
      isStatic: true,
      position: { x: 500, y: 500 },
      shape: { type: 'rect', width: 1000, height: 40 },
    });

    engine.addBody(ball);
    engine.addBody(floor);

    for (let i = 0; i < 120; i++) {
      engine.update(1 / 60);
    }

    const b = engine.getBody(ball.id)!;
    expectBodySane(b);

    // The ball should not have flown off to unreasonable positions
    expect(Math.abs(b.position.x)).toBeLessThan(1e6);
    expect(Math.abs(b.position.y)).toBeLessThan(1e6);
  });

  // -----------------------------------------------------------------------
  // 5. Very high velocity (tunneling check)
  // -----------------------------------------------------------------------
  it('very high velocity (10000 px/s): simulation does not crash', () => {
    // NOTE: CCD is not implemented. A small circle at 10000 px/s with
    // 60Hz * 4 substeps moves ~41.7px per substep, which exceeds the
    // 5px radius. Tunneling through thin walls WILL occur. This test
    // verifies the simulation remains stable (no crash, no NaN).
    const engine = new PhysicsEngine({
      ...defaultConfig(),
      bounds: { min: { x: 0, y: 0 }, max: { x: 1000, y: 1000 } },
    });

    const bullet = createBody({
      mass: 0.5,
      position: { x: 50, y: 500 },
      velocity: { x: 10000, y: 0 },
      shape: { type: 'circle', radius: 5 },
    });

    const wall = createBody({
      isStatic: true,
      position: { x: 800, y: 500 },
      shape: { type: 'rect', width: 10, height: 200 },
    });

    engine.addBody(bullet);
    engine.addBody(wall);

    // Run 60 frames (1 second)
    for (let i = 0; i < 60; i++) {
      engine.update(1 / 60);
    }

    const b = engine.getBody(bullet.id)!;
    expectBodySane(b);
  });

  // -----------------------------------------------------------------------
  // 6. NaN propagation guard
  // -----------------------------------------------------------------------
  it('NaN velocity: integrate propagates NaN (known gap, documented)', () => {
    const body = createBody({
      position: { x: 100, y: 100 },
      velocity: { x: NaN, y: NaN },
    });

    integrate(body, 1 / 60);

    // Current implementation does NOT guard against NaN input.
    // This test documents the known behavior: NaN propagates to position.
    // A future improvement would be to add NaN guards in integrate().
    expect(Number.isNaN(body.position.x)).toBe(true);
    expect(Number.isNaN(body.position.y)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 7. Empty world step — no crash
  // -----------------------------------------------------------------------
  it('empty world: update(1/60) does not crash', () => {
    const engine = new PhysicsEngine(defaultConfig());

    expect(() => {
      engine.update(1 / 60);
    }).not.toThrow();
  });

  // -----------------------------------------------------------------------
  // 8. Remove body during simulation
  // -----------------------------------------------------------------------
  it('remove body mid-simulation: remaining bodies continue normally', () => {
    const engine = new PhysicsEngine(defaultConfig());

    const a = createBody({ position: { x: 100, y: 100 } });
    const b = createBody({ position: { x: 200, y: 100 } });
    const c = createBody({ position: { x: 300, y: 100 } });

    engine.addBody(a);
    engine.addBody(b);
    engine.addBody(c);

    // Step once
    engine.update(1 / 60);

    // Remove middle body
    engine.removeBody(b.id);

    // Step again — should not crash
    expect(() => {
      engine.update(1 / 60);
    }).not.toThrow();

    // Remaining bodies should still exist and be sane
    expect(engine.getBodies()).toHaveLength(2);
    const bodyA = engine.getBody(a.id)!;
    const bodyC = engine.getBody(c.id)!;
    expectBodySane(bodyA);
    expectBodySane(bodyC);

    // Under gravity they should have moved down
    expect(bodyA.position.y).toBeGreaterThan(100);
    expect(bodyC.position.y).toBeGreaterThan(100);
  });

  // -----------------------------------------------------------------------
  // 9. Constraint with missing body
  // -----------------------------------------------------------------------
  it('constraint referencing non-existent bodyId: solveConstraints skips gracefully', () => {
    const bodies = new Map<string, ReturnType<typeof createBody>>();
    const real = createBody({ position: { x: 100, y: 100 } });
    bodies.set(real.id, real);

    const constraints = new Map<string, ReturnType<typeof createConstraint>>();
    const constraint = createConstraint({
      bodyA: real.id,
      bodyB: 'non-existent-id',
      type: 'spring',
      stiffness: 0.5,
      length: 50,
    });
    constraints.set(constraint.id, constraint);

    // Should not throw
    expect(() => {
      solveConstraints(constraints, bodies, 4);
    }).not.toThrow();

    // The real body should be unaffected
    expectBodySane(real);
  });

  // -----------------------------------------------------------------------
  // 10. Zero-length distance constraint
  // -----------------------------------------------------------------------
  it('zero-length distance constraint: no divide-by-zero', () => {
    const a = createBody({ position: { x: 100, y: 100 } });
    const b = createBody({ position: { x: 100, y: 100 } });

    const bodies = new Map<string, ReturnType<typeof createBody>>();
    bodies.set(a.id, a);
    bodies.set(b.id, b);

    const constraints = new Map<string, ReturnType<typeof createConstraint>>();
    const constraint = createConstraint({
      bodyA: a.id,
      bodyB: b.id,
      type: 'distance',
      length: 0,
    });
    constraints.set(constraint.id, constraint);

    // When bodies are at same position and length=0, delta is zero vector.
    // The solver should guard against division by zero (dist < 1e-10 → early return).
    expect(() => {
      solveConstraints(constraints, bodies, 4);
    }).not.toThrow();

    expectBodySane(a);
    expectBodySane(b);
  });

  // -----------------------------------------------------------------------
  // 11. Extreme coordinates
  // -----------------------------------------------------------------------
  it('extreme coordinates (1e6, 1e6): gravity still works correctly', () => {
    const engine = new PhysicsEngine({
      gravity: { x: 0, y: 980 },
      substeps: 4,
      velocityIterations: 4,
    });

    const body = createBody({
      position: { x: 1e6, y: 1e6 },
      shape: { type: 'circle', radius: 10 },
    });

    engine.addBody(body);

    const startY = body.position.y;

    for (let i = 0; i < 60; i++) {
      engine.update(1 / 60);
    }

    const b = engine.getBody(body.id)!;
    expectBodySane(b);

    // Under gravity the body should have moved down
    expect(b.position.y).toBeGreaterThan(startY);

    // X should remain essentially unchanged (no horizontal force)
    // Allow a small tolerance for floating point at large magnitudes
    expect(Math.abs(b.position.x - 1e6)).toBeLessThan(1);
  });

  // -----------------------------------------------------------------------
  // 12. Rapid body creation — 1000 bodies
  // -----------------------------------------------------------------------
  it('rapid body creation: add 1000 bodies and step once without crash', () => {
    const engine = new PhysicsEngine(defaultConfig());

    const ids: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const body = createBody({
        position: { x: Math.random() * 1000, y: Math.random() * 1000 },
        shape: { type: 'circle', radius: 2 },
      });
      ids.push(engine.addBody(body));
    }

    expect(engine.getBodies()).toHaveLength(1000);

    // Step once — the O(n^2) collision detection will be expensive but must not crash
    expect(() => {
      engine.update(1 / 60);
    }).not.toThrow();

    // Verify all bodies still exist
    expect(engine.getBodies()).toHaveLength(1000);

    // Spot-check a few bodies
    for (let i = 0; i < 10; i++) {
      const b = engine.getBody(ids[i]!)!;
      expect(b).toBeDefined();
      expectBodySane(b);
    }
  });
});
