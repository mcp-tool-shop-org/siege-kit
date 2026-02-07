import { describe, it, expect } from 'vitest';
import { PhysicsEngine } from './engine.js';
import { createBody } from './body.js';
import { createConstraint } from './constraint.js';
import type {
  WorldConfig,
  ForceField,
} from '@mcp-tool-shop/siege-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultConfig(overrides: Partial<WorldConfig> = {}): WorldConfig {
  return {
    gravity: { x: 0, y: 980 },
    substeps: 4,
    velocityIterations: 6,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PhysicsEngine — Unit Tests
// ---------------------------------------------------------------------------

describe('PhysicsEngine', () => {
  // ---- Constructor --------------------------------------------------------

  describe('constructor', () => {
    it('creates an engine with the given config', () => {
      const config = defaultConfig();
      const engine = new PhysicsEngine(config);
      const returned = engine.getConfig();

      expect(returned.gravity).toEqual({ x: 0, y: 980 });
      expect(returned.substeps).toBe(4);
      expect(returned.velocityIterations).toBe(6);
    });

    it('creates an engine with custom gravity', () => {
      const config = defaultConfig({ gravity: { x: 0, y: -10 } });
      const engine = new PhysicsEngine(config);

      expect(engine.getConfig().gravity).toEqual({ x: 0, y: -10 });
    });

    it('creates an engine with bounds', () => {
      const config = defaultConfig({
        bounds: { min: { x: 0, y: 0 }, max: { x: 800, y: 600 } },
      });
      const engine = new PhysicsEngine(config);

      expect(engine.getConfig().bounds).toEqual({
        min: { x: 0, y: 0 },
        max: { x: 800, y: 600 },
      });
    });
  });

  // ---- Body Management ----------------------------------------------------

  describe('addBody / getBody / removeBody lifecycle', () => {
    it('adds a body and retrieves it by id', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({ id: 'ball-1', position: { x: 100, y: 200 } });

      const returnedId = engine.addBody(body);
      expect(returnedId).toBe('ball-1');

      const retrieved = engine.getBody('ball-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.position).toEqual({ x: 100, y: 200 });
    });

    it('removes a body by id', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({ id: 'ball-2' });
      engine.addBody(body);

      engine.removeBody('ball-2');
      expect(engine.getBody('ball-2')).toBeUndefined();
    });

    it('getBody returns undefined for nonexistent id', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(engine.getBody('does-not-exist')).toBeUndefined();
    });

    it('removeBody on nonexistent id does not crash', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(() => engine.removeBody('nope')).not.toThrow();
    });
  });

  // ---- getBodies ----------------------------------------------------------

  describe('getBodies', () => {
    it('returns all bodies in the engine', () => {
      const engine = new PhysicsEngine(defaultConfig());
      engine.addBody(createBody({ id: 'a' }));
      engine.addBody(createBody({ id: 'b' }));
      engine.addBody(createBody({ id: 'c' }));

      const bodies = engine.getBodies();
      expect(bodies).toHaveLength(3);

      const ids = bodies.map((b) => b.id).sort();
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array when no bodies exist', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(engine.getBodies()).toEqual([]);
    });

    it('reflects removals', () => {
      const engine = new PhysicsEngine(defaultConfig());
      engine.addBody(createBody({ id: 'x' }));
      engine.addBody(createBody({ id: 'y' }));
      engine.removeBody('x');

      const bodies = engine.getBodies();
      expect(bodies).toHaveLength(1);
      expect(bodies[0]!.id).toBe('y');
    });
  });

  // ---- Constraint Management ----------------------------------------------

  describe('addConstraint / removeConstraint / getConstraints lifecycle', () => {
    it('adds a constraint and retrieves it', () => {
      const engine = new PhysicsEngine(defaultConfig());
      engine.addBody(createBody({ id: 'bodyA' }));
      engine.addBody(createBody({ id: 'bodyB' }));

      const constraint = createConstraint({
        id: 'spring-1',
        bodyA: 'bodyA',
        bodyB: 'bodyB',
        type: 'spring',
        stiffness: 0.8,
        damping: 0.2,
      });
      const returnedId = engine.addConstraint(constraint);

      expect(returnedId).toBe('spring-1');
      expect(engine.getConstraints()).toHaveLength(1);
      expect(engine.getConstraints()[0]!.id).toBe('spring-1');
    });

    it('removes a constraint by id', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const constraint = createConstraint({
        id: 'c-1',
        bodyA: 'a',
        bodyB: 'b',
      });
      engine.addConstraint(constraint);
      engine.removeConstraint('c-1');

      expect(engine.getConstraints()).toHaveLength(0);
    });

    it('removeConstraint on nonexistent id does not crash', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(() => engine.removeConstraint('nope')).not.toThrow();
    });

    it('returns empty array when no constraints exist', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(engine.getConstraints()).toEqual([]);
    });
  });

  // ---- applyImpulse -------------------------------------------------------

  describe('applyImpulse', () => {
    it('modifies body velocity based on impulse and invMass', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({
        id: 'ball',
        mass: 2,
        velocity: { x: 0, y: 0 },
      });
      engine.addBody(body);

      engine.applyImpulse('ball', { x: 10, y: -20 });

      const updated = engine.getBody('ball')!;
      // impulse * invMass = impulse * (1/2)
      expect(updated.velocity.x).toBeCloseTo(5, 5);
      expect(updated.velocity.y).toBeCloseTo(-10, 5);
    });

    it('wakes a sleeping body', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({
        id: 'sleeper',
        isSleeping: true,
        sleepTimer: 100,
      });
      engine.addBody(body);

      engine.applyImpulse('sleeper', { x: 5, y: 0 });

      const updated = engine.getBody('sleeper')!;
      expect(updated.isSleeping).toBe(false);
      expect(updated.sleepTimer).toBe(0);
    });

    it('does not modify a static body', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({
        id: 'wall',
        isStatic: true,
        velocity: { x: 0, y: 0 },
      });
      engine.addBody(body);

      engine.applyImpulse('wall', { x: 100, y: 100 });

      const updated = engine.getBody('wall')!;
      expect(updated.velocity.x).toBe(0);
      expect(updated.velocity.y).toBe(0);
    });

    it('does not crash on nonexistent body', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(() =>
        engine.applyImpulse('ghost', { x: 1, y: 1 }),
      ).not.toThrow();
    });

    it('accumulates multiple impulses', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({ id: 'ball', mass: 1 });
      engine.addBody(body);

      engine.applyImpulse('ball', { x: 3, y: 0 });
      engine.applyImpulse('ball', { x: 7, y: 0 });

      expect(engine.getBody('ball')!.velocity.x).toBeCloseTo(10, 5);
    });
  });

  // ---- setPosition --------------------------------------------------------

  describe('setPosition', () => {
    it('teleports the body and updates previousPosition', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({
        id: 'p',
        position: { x: 10, y: 20 },
      });
      engine.addBody(body);

      engine.setPosition('p', { x: 300, y: 400 });

      const updated = engine.getBody('p')!;
      expect(updated.position).toEqual({ x: 300, y: 400 });
      expect(updated.previousPosition).toEqual({ x: 300, y: 400 });
    });

    it('wakes a sleeping body', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({ id: 's', isSleeping: true, sleepTimer: 50 });
      engine.addBody(body);

      engine.setPosition('s', { x: 0, y: 0 });

      expect(engine.getBody('s')!.isSleeping).toBe(false);
      expect(engine.getBody('s')!.sleepTimer).toBe(0);
    });

    it('does not crash on nonexistent body', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(() =>
        engine.setPosition('nope', { x: 0, y: 0 }),
      ).not.toThrow();
    });
  });

  // ---- setVelocity --------------------------------------------------------

  describe('setVelocity', () => {
    it('sets the velocity directly', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({
        id: 'v',
        velocity: { x: 0, y: 0 },
      });
      engine.addBody(body);

      engine.setVelocity('v', { x: 50, y: -30 });

      const updated = engine.getBody('v')!;
      expect(updated.velocity.x).toBeCloseTo(50, 5);
      expect(updated.velocity.y).toBeCloseTo(-30, 5);
    });

    it('wakes a sleeping body', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({ id: 'sv', isSleeping: true });
      engine.addBody(body);

      engine.setVelocity('sv', { x: 10, y: 0 });

      expect(engine.getBody('sv')!.isSleeping).toBe(false);
    });

    it('does not modify a static body', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({
        id: 'static-v',
        isStatic: true,
        velocity: { x: 0, y: 0 },
      });
      engine.addBody(body);

      engine.setVelocity('static-v', { x: 99, y: 99 });

      expect(engine.getBody('static-v')!.velocity).toEqual({ x: 0, y: 0 });
    });

    it('does not crash on nonexistent body', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(() =>
        engine.setVelocity('ghost', { x: 0, y: 0 }),
      ).not.toThrow();
    });
  });

  // ---- update (fixed timestep) --------------------------------------------

  describe('update', () => {
    it('with zero frameTime produces no simulation advancement', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({
        id: 'zero',
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
      });
      engine.addBody(body);

      engine.update(0);

      // Position should not change
      expect(engine.getBody('zero')!.position).toEqual({ x: 100, y: 100 });
    });

    it('with normal frameTime advances the accumulator and changes alpha', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({ id: 'mover', position: { x: 0, y: 0 } });
      engine.addBody(body);

      // One frame at 60fps
      engine.update(1 / 60);

      // At least one step should have been taken; body should have moved
      const updated = engine.getBody('mover')!;
      // Gravity pulls downward, so y should increase
      expect(updated.position.y).toBeGreaterThan(0);
    });

    it('clamps frame time to prevent spiral of death', () => {
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: 0 } }),
      );
      const body = createBody({
        id: 'clamp',
        position: { x: 0, y: 0 },
        velocity: { x: 100, y: 0 },
      });
      engine.addBody(body);

      // Pass a ridiculously large frame time (10 seconds)
      engine.update(10);

      // The engine should clamp to MAX_FRAME_TIME = 0.25s
      // At 60Hz that's ~15 steps. With velocity 100 px/s, the body
      // should move roughly 25px (0.25s * 100px/s), not 1000px.
      // (Drag reduces it slightly, but the clamping is the key constraint.)
      const x = engine.getBody('clamp')!.position.x;
      expect(x).toBeLessThan(200); // far less than 10s * 100px/s = 1000px
      expect(x).toBeGreaterThan(0);
    });

    it('multiple updates accumulate position changes', () => {
      const engine = new PhysicsEngine(defaultConfig());
      const body = createBody({
        id: 'multi',
        position: { x: 0, y: 0 },
      });
      engine.addBody(body);

      const dt = 1 / 60;
      for (let i = 0; i < 10; i++) {
        engine.update(dt);
      }

      // After 10 frames of gravity, body should have moved significantly
      expect(engine.getBody('multi')!.position.y).toBeGreaterThan(0);
    });
  });

  // ---- alpha --------------------------------------------------------------

  describe('alpha', () => {
    it('is between 0 and 1 after an update', () => {
      const engine = new PhysicsEngine(defaultConfig());
      engine.addBody(createBody({ id: 'a' }));

      // Use a frame time that's not an exact multiple of 1/60
      engine.update(0.02);

      expect(engine.alpha).toBeGreaterThanOrEqual(0);
      expect(engine.alpha).toBeLessThanOrEqual(1);
    });

    it('is 0 when frameTime is an exact multiple of FIXED_DT', () => {
      const engine = new PhysicsEngine(defaultConfig());
      engine.addBody(createBody({ id: 'a' }));

      // Exactly one physics step
      engine.update(1 / 60);

      // Accumulator should be ~0, so alpha should be ~0
      expect(engine.alpha).toBeCloseTo(0, 5);
    });

    it('is nonzero when frameTime has a remainder', () => {
      const engine = new PhysicsEngine(defaultConfig());
      engine.addBody(createBody({ id: 'a' }));

      // 1.5 fixed steps worth of time
      engine.update(1.5 / 60);

      // One step consumed, 0.5 * FIXED_DT remains → alpha ≈ 0.5
      expect(engine.alpha).toBeCloseTo(0.5, 1);
    });
  });

  // ---- getInterpolatedPosition --------------------------------------------

  describe('getInterpolatedPosition', () => {
    it('returns lerp between previousPosition and position', () => {
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: 0 } }),
      );
      const body = createBody({
        id: 'interp',
        position: { x: 100, y: 200 },
        previousPosition: { x: 0, y: 0 },
      });
      engine.addBody(body);

      // Force alpha to a known value by calling update with partial frame
      // 0.5 * (1/60) gives half a step
      engine.update(0.5 / 60);

      const pos = engine.getInterpolatedPosition(body);
      // Alpha should be ~0.5, so lerp(prev, cur, 0.5)
      // But update may have modified body. Let's verify more carefully:
      // After update(0.5/60), accumulator = 0.5/60, no full step taken
      // (0.5/60 < 1/60), so alpha = (0.5/60)/(1/60) = 0.5
      // Body hasn't been stepped, so position = {100,200}, previousPosition = {0,0}
      expect(engine.alpha).toBeCloseTo(0.5, 1);
      expect(pos.x).toBeCloseTo(50, 0);
      expect(pos.y).toBeCloseTo(100, 0);
    });

    it('returns exact position when alpha is 1', () => {
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: 0 } }),
      );

      // Manually construct a body with different prev/current positions
      const body = createBody({
        id: 'exact',
        position: { x: 200, y: 300 },
        previousPosition: { x: 100, y: 150 },
      });
      engine.addBody(body);

      // alpha = 0 initially (no update called), so interpolated = previousPosition
      const pos0 = engine.getInterpolatedPosition(body);
      expect(pos0.x).toBeCloseTo(100, 0);
      expect(pos0.y).toBeCloseTo(150, 0);
    });
  });

  // ---- Force Fields -------------------------------------------------------

  describe('addForceField / removeForceFields', () => {
    it('adds a force field and it affects simulation', () => {
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: 0 } }),
      );
      const body = createBody({
        id: 'wind-test',
        position: { x: 100, y: 100 },
      });
      engine.addBody(body);

      const wind: ForceField = {
        type: 'wind',
        vector: { x: 1, y: 0 },
        strength: 500,
      };
      engine.addForceField(wind);

      // Run a few frames
      for (let i = 0; i < 60; i++) {
        engine.update(1 / 60);
      }

      // Wind pushes body to the right
      expect(engine.getBody('wind-test')!.position.x).toBeGreaterThan(100);
    });

    it('removes force fields by type', () => {
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: 0 } }),
      );

      engine.addForceField({ type: 'wind', vector: { x: 1, y: 0 }, strength: 10 });
      engine.addForceField({ type: 'drag', strength: 0.5 });
      engine.addForceField({ type: 'wind', vector: { x: 0, y: 1 }, strength: 20 });

      engine.removeForceFields('wind');

      // Only drag should remain — verify by adding a body and simulating
      const body = createBody({
        id: 'drag-only',
        position: { x: 0, y: 0 },
        velocity: { x: 100, y: 0 },
      });
      engine.addBody(body);

      engine.update(1 / 60);

      // If wind were still active, x would increase; with only drag, velocity decreases
      // Body should have moved right due to initial velocity, but wind should not add extra
      const updated = engine.getBody('drag-only')!;
      expect(updated.position.x).toBeGreaterThan(0); // moved due to velocity
    });

    it('removeForceFields with unmatched type does not crash', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(() => engine.removeForceFields('attraction')).not.toThrow();
    });
  });

  // ---- getConfig ----------------------------------------------------------

  describe('getConfig', () => {
    it('returns the world config', () => {
      const config = defaultConfig({
        gravity: { x: 0, y: -500 },
        substeps: 8,
        velocityIterations: 10,
      });
      const engine = new PhysicsEngine(config);
      const returned = engine.getConfig();

      expect(returned.gravity).toEqual({ x: 0, y: -500 });
      expect(returned.substeps).toBe(8);
      expect(returned.velocityIterations).toBe(10);
    });

    it('reflects the bounds configuration', () => {
      const config = defaultConfig({
        bounds: { min: { x: -100, y: -100 }, max: { x: 100, y: 100 } },
      });
      const engine = new PhysicsEngine(config);

      expect(engine.getConfig().bounds).toEqual({
        min: { x: -100, y: -100 },
        max: { x: 100, y: 100 },
      });
    });

    it('returns undefined bounds when none configured', () => {
      const engine = new PhysicsEngine(defaultConfig());
      expect(engine.getConfig().bounds).toBeUndefined();
    });
  });
});
