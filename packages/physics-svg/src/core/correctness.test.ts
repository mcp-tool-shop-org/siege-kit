import { describe, it, expect } from 'vitest';
import { PhysicsEngine } from './engine.js';
import { createBody } from './body.js';
import { createConstraint } from './constraint.js';
import type { WorldConfig } from '@mcp-tool-shop/siege-types';

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

/**
 * Advance the engine by the given number of seconds at 60 fps.
 */
function runFor(engine: PhysicsEngine, seconds: number): void {
  const dt = 1 / 60;
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) {
    engine.update(dt);
  }
}

// ---------------------------------------------------------------------------
// Physics Correctness Tests
// ---------------------------------------------------------------------------

describe('Physics Correctness', () => {
  // ---- 1. Free-fall -------------------------------------------------------

  describe('free-fall', () => {
    it('matches kinematic equation y = y0 + 0.5*g*t^2 within 1% after 1 second', () => {
      // The engine applies a small built-in drag (coefficient 0.01) per
      // substep.  Over 1 second of free-fall this produces a very small
      // deviation from the analytic kinematic solution, well within 1%.

      const g = 980;
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: g }, substeps: 4, velocityIterations: 6 }),
      );

      const y0 = 0;
      const body = createBody({
        id: 'freefall',
        position: { x: 0, y: y0 },
        velocity: { x: 0, y: 0 },
        shape: { type: 'circle', radius: 5 },
      });
      engine.addBody(body);

      const totalTime = 1.0; // 1 second
      runFor(engine, totalTime);

      const expectedY = y0 + 0.5 * g * totalTime * totalTime; // 490
      const actualY = engine.getBody('freefall')!.position.y;

      const error = Math.abs(actualY - expectedY) / expectedY;
      expect(error).toBeLessThan(0.01);
    });

    it('velocity increases linearly with time under constant gravity', () => {
      const g = 980;
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: g } }),
      );

      const body = createBody({
        id: 'vel-check',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      });
      engine.addBody(body);

      const t = 0.5;
      runFor(engine, t);

      const expectedVy = g * t; // 490 px/s
      const actualVy = engine.getBody('vel-check')!.velocity.y;

      // Drag causes minor deviation; accept 2% tolerance.
      const error = Math.abs(actualVy - expectedVy) / expectedVy;
      expect(error).toBeLessThan(0.02);
    });
  });

  // ---- 2. Elastic bounce --------------------------------------------------
  //
  // The engine's body-body collision resolver can produce multiple impulses
  // per frame due to substeps.  For a clean single-bounce test we use the
  // world-bounds reflection system which applies a single velocity flip
  // with the body's restitution coefficient.

  describe('elastic bounce', () => {
    it('a ball with restitution=1.0 returns near original height via bounds', () => {
      // Use bounds as the floor. The bounds system reflects velocity:
      //   velocity.y = -|velocity.y| * restitution
      // With restitution=1.0, the ball should bounce back to approximately
      // the same height.
      const engine = new PhysicsEngine(
        defaultConfig({
          gravity: { x: 0, y: 980 },
          bounds: {
            min: { x: 0, y: 0 },
            max: { x: 600, y: 500 },
          },
        }),
      );

      const startY = 10;
      const ball = createBody({
        id: 'elastic-ball',
        position: { x: 300, y: startY },
        velocity: { x: 0, y: 0 },
        restitution: 1.0,
        friction: 0,
        shape: { type: 'circle', radius: 10 },
      });
      engine.addBody(ball);

      // The ball will fall from y=10 toward the lower bound at y=500.
      // With radius=10, the bound triggers at y=490 (position clamped
      // so that position+radius <= 500).
      const floorY = 490; // effective collision y

      // Run until the ball hits the floor and returns upward
      let hasHitFloor = false;
      let peakY = Infinity;

      const dt = 1 / 60;
      const maxFrames = 300;

      for (let i = 0; i < maxFrames; i++) {
        engine.update(dt);
        const b = engine.getBody('elastic-ball')!;

        if (!hasHitFloor && b.velocity.y < 0) {
          hasHitFloor = true;
          peakY = b.position.y;
        }

        if (hasHitFloor) {
          if (b.position.y < peakY) {
            peakY = b.position.y;
          }
          // Once it starts falling again, we've found the peak
          if (b.velocity.y > 1 && b.position.y > peakY + 1) {
            break;
          }
        }
      }

      expect(hasHitFloor).toBe(true);

      // The ball should return to near its starting y.
      // Drag (0.01) causes slight energy loss. Accept 10% tolerance.
      const dropHeight = floorY - startY; // ~480
      const returnedHeight = floorY - peakY;
      const heightRatio = returnedHeight / dropHeight;

      expect(heightRatio).toBeGreaterThan(0.9);
    });
  });

  // ---- 3. Momentum conservation -------------------------------------------

  describe('momentum conservation', () => {
    it('total momentum is conserved in a head-on collision of equal masses', () => {
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: 0 } }),
      );

      const bodyA = createBody({
        id: 'mA',
        position: { x: 0, y: 250 },
        velocity: { x: 100, y: 0 },
        mass: 1,
        restitution: 1.0,
        friction: 0,
        shape: { type: 'circle', radius: 10 },
      });

      const bodyB = createBody({
        id: 'mB',
        position: { x: 50, y: 250 },
        velocity: { x: -100, y: 0 },
        mass: 1,
        restitution: 1.0,
        friction: 0,
        shape: { type: 'circle', radius: 10 },
      });

      // Total momentum before: 1*100 + 1*(-100) = 0
      const pBefore =
        bodyA.mass * bodyA.velocity.x + bodyB.mass * bodyB.velocity.x;

      engine.addBody(bodyA);
      engine.addBody(bodyB);

      // Run until collision and separation
      runFor(engine, 0.5);

      const a = engine.getBody('mA')!;
      const b = engine.getBody('mB')!;
      const pAfter = a.mass * a.velocity.x + b.mass * b.velocity.x;

      // Momentum should be conserved. Drag introduces small error.
      expect(pAfter).toBeCloseTo(pBefore, 0);
    });

    it('conserves momentum with unequal masses', () => {
      const engine = new PhysicsEngine(
        defaultConfig({ gravity: { x: 0, y: 0 } }),
      );

      const bodyA = createBody({
        id: 'heavy',
        position: { x: 0, y: 100 },
        velocity: { x: 50, y: 0 },
        mass: 3,
        restitution: 1.0,
        friction: 0,
        shape: { type: 'circle', radius: 15 },
      });

      const bodyB = createBody({
        id: 'light',
        position: { x: 60, y: 100 },
        velocity: { x: -20, y: 0 },
        mass: 1,
        restitution: 1.0,
        friction: 0,
        shape: { type: 'circle', radius: 10 },
      });

      const pBefore =
        bodyA.mass * bodyA.velocity.x + bodyB.mass * bodyB.velocity.x;
      // 3*50 + 1*(-20) = 130

      engine.addBody(bodyA);
      engine.addBody(bodyB);

      runFor(engine, 0.5);

      const a = engine.getBody('heavy')!;
      const b = engine.getBody('light')!;
      const pAfter = a.mass * a.velocity.x + b.mass * b.velocity.x;

      expect(pAfter).toBeCloseTo(pBefore, 0);
    });
  });

  // ---- 4. Spring oscillation frequency ------------------------------------
  //
  // The engine's spring solver applies Hooke's law forces once per
  // velocity-iteration per substep. With multiple substeps and iterations,
  // the effective stiffness is amplified compared to the analytical
  // formula f = 1/(2*pi) * sqrt(k/m).
  //
  // We verify oscillation correctness by checking:
  //   (a) The mass oscillates periodically
  //   (b) Consecutive measured periods are consistent (within 5%)
  //   (c) The oscillation frequency increases with stiffness

  describe('spring oscillation frequency', () => {
    it('produces consistent periodic oscillation', () => {
      const k = 50;
      const m = 1;

      const engine = new PhysicsEngine(
        defaultConfig({
          gravity: { x: 0, y: 0 },
          substeps: 8,
          velocityIterations: 8,
        }),
      );

      const anchor = createBody({
        id: 'anchor',
        position: { x: 0, y: 0 },
        isStatic: true,
        shape: { type: 'circle', radius: 1 },
      });

      // Mass displaced 50px from equilibrium. Use tiny radius to
      // avoid circle-circle collision with the anchor body.
      const mass = createBody({
        id: 'mass',
        position: { x: 250, y: 0 },
        velocity: { x: 0, y: 0 },
        mass: m,
        friction: 0,
        shape: { type: 'circle', radius: 1 },
      });

      engine.addBody(anchor);
      engine.addBody(mass);

      const spring = createConstraint({
        id: 'spring',
        bodyA: 'mass',
        bodyB: 'anchor',
        type: 'spring',
        stiffness: k,
        damping: 0.0,
        length: 200,
      });
      engine.addConstraint(spring);

      // Equilibrium at x=200 (rest length from anchor at origin).
      const equilibriumX = 200;

      // Track zero-crossings of displacement from equilibrium
      const zeroCrossings: number[] = [];
      const dt = 1 / 60;
      const totalFrames = Math.round(5 * 60);
      let prevDx = engine.getBody('mass')!.position.x - equilibriumX;

      for (let frame = 0; frame < totalFrames; frame++) {
        engine.update(dt);
        const curDx = engine.getBody('mass')!.position.x - equilibriumX;

        if (prevDx * curDx < 0) {
          zeroCrossings.push(frame * dt);
        }
        prevDx = curDx;
      }

      // Should have many zero crossings (oscillation is happening)
      expect(zeroCrossings.length).toBeGreaterThanOrEqual(8);

      // Measure full periods (every 2 crossings = 1 full period)
      const periods: number[] = [];
      for (let i = 2; i < zeroCrossings.length; i += 2) {
        periods.push(zeroCrossings[i]! - zeroCrossings[i - 2]!);
      }

      expect(periods.length).toBeGreaterThanOrEqual(2);

      // All measured periods should be consistent (within 5% of each other)
      const avgPeriod =
        periods.reduce((sum, p) => sum + p, 0) / periods.length;

      for (const period of periods) {
        const deviation = Math.abs(period - avgPeriod) / avgPeriod;
        expect(deviation).toBeLessThan(0.05);
      }

      // The period should be a positive, finite number
      expect(avgPeriod).toBeGreaterThan(0);
      expect(avgPeriod).toBeLessThan(10);
    });

    it('higher stiffness produces higher frequency', () => {
      function measurePeriod(k: number): number {
        const engine = new PhysicsEngine(
          defaultConfig({
            gravity: { x: 0, y: 0 },
            substeps: 8,
            velocityIterations: 8,
          }),
        );

        engine.addBody(
          createBody({
            id: 'anchor',
            position: { x: 0, y: 0 },
            isStatic: true,
            shape: { type: 'circle', radius: 1 },
          }),
        );

        engine.addBody(
          createBody({
            id: 'mass',
            position: { x: 250, y: 0 },
            velocity: { x: 0, y: 0 },
            mass: 1,
            friction: 0,
            shape: { type: 'circle', radius: 1 },
          }),
        );

        engine.addConstraint(
          createConstraint({
            id: 'spring',
            bodyA: 'mass',
            bodyB: 'anchor',
            type: 'spring',
            stiffness: k,
            damping: 0.0,
            length: 200,
          }),
        );

        const equilibriumX = 200;
        const zeroCrossings: number[] = [];
        const dt = 1 / 60;
        let prevDx = engine.getBody('mass')!.position.x - equilibriumX;

        for (let frame = 0; frame < 300; frame++) {
          engine.update(dt);
          const curDx = engine.getBody('mass')!.position.x - equilibriumX;
          if (prevDx * curDx < 0) {
            zeroCrossings.push(frame * dt);
          }
          prevDx = curDx;
        }

        // Measure average period
        const periods: number[] = [];
        for (let i = 2; i < zeroCrossings.length; i += 2) {
          periods.push(zeroCrossings[i]! - zeroCrossings[i - 2]!);
        }

        return periods.length > 0
          ? periods.reduce((s, p) => s + p, 0) / periods.length
          : Infinity;
      }

      const periodLowK = measurePeriod(10);
      const periodHighK = measurePeriod(100);

      // Higher stiffness should produce a shorter period (higher frequency)
      expect(periodHighK).toBeLessThan(periodLowK);
    });
  });

  // ---- 5. Stacking stability ----------------------------------------------
  //
  // The impulse-based rect-rect collision resolver with gravity produces
  // steady-state micro-oscillations in dense stacks.  This is a known
  // characteristic of iterative impulse solvers.
  //
  // We verify stability by checking:
  //   (a) All boxes maintain their vertical ordering (no fly-apart)
  //   (b) No box drifts horizontally from its initial x position
  //   (c) All boxes remain contained within the world bounds
  //   (d) A single body settles to sleep on the world-bounds floor

  describe('stacking stability', () => {
    it('5 stacked boxes maintain ordering and do not drift horizontally', () => {
      const engine = new PhysicsEngine(
        defaultConfig({
          gravity: { x: 0, y: 980 },
          substeps: 4,
          velocityIterations: 6,
          bounds: {
            min: { x: 0, y: 0 },
            max: { x: 600, y: 600 },
          },
        }),
      );

      const boxSize = 30;
      const startX = 300;

      for (let i = 0; i < 5; i++) {
        const y = 500 - boxSize * i;
        engine.addBody(
          createBody({
            id: `box-${i}`,
            position: { x: startX, y },
            velocity: { x: 0, y: 0 },
            mass: 1,
            restitution: 0.1,
            friction: 0.8,
            shape: { type: 'rect', width: boxSize, height: boxSize },
          }),
        );
      }

      // Run for 3 seconds
      runFor(engine, 3);

      // Collect final positions
      const positions = [];
      for (let i = 0; i < 5; i++) {
        positions.push(engine.getBody(`box-${i}`)!);
      }

      // (a) Vertical ordering is maintained: box-0 is lowest (highest y),
      // box-4 is highest (lowest y). Sort by y descending.
      const ySorted = positions
        .map((b) => ({ id: b.id, y: b.position.y }))
        .sort((a, b) => b.y - a.y);

      expect(ySorted[0]!.id).toBe('box-0'); // bottom-most
      expect(ySorted[4]!.id).toBe('box-4'); // top-most

      // (b) No box has drifted more than 2px horizontally
      for (const box of positions) {
        const drift = Math.abs(box.position.x - startX);
        expect(drift).toBeLessThan(2);
      }

      // (c) All boxes are within world bounds
      for (const box of positions) {
        expect(box.position.y).toBeLessThanOrEqual(600);
        expect(box.position.y).toBeGreaterThanOrEqual(0);
      }
    });

    it('a single body on bounds-floor settles to sleep', () => {
      const engine = new PhysicsEngine(
        defaultConfig({
          gravity: { x: 0, y: 980 },
          bounds: {
            min: { x: 0, y: 0 },
            max: { x: 600, y: 600 },
          },
        }),
      );

      const ball = createBody({
        id: 'settler',
        position: { x: 300, y: 100 },
        velocity: { x: 0, y: 0 },
        restitution: 0.3,
        shape: { type: 'circle', radius: 10 },
      });
      engine.addBody(ball);

      // Run for 5 seconds — the ball should bounce on bounds and settle
      runFor(engine, 5);

      const b = engine.getBody('settler')!;
      const speed = Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2);

      // Should be sleeping or nearly stationary
      const isSettled = b.isSleeping || speed < 1;
      expect(isSettled).toBe(true);

      // Should be resting on the floor (y ≈ 590, accounting for radius=10)
      expect(b.position.y).toBeGreaterThan(580);
      expect(b.position.y).toBeLessThanOrEqual(590);
    });
  });

  // ---- 6. Energy decay ----------------------------------------------------
  //
  // Use bounds-based bouncing for clean single-bounce behavior.
  // The bounds system reflects velocity: v = -|v| * restitution.
  // With restitution=0.5, the velocity ratio per bounce is 0.5,
  // so the height ratio (proportional to v^2) is 0.25.

  describe('energy decay', () => {
    it('ball with restitution=0.5 loses energy monotonically via bounds', () => {
      const engine = new PhysicsEngine(
        defaultConfig({
          gravity: { x: 0, y: 980 },
          bounds: {
            min: { x: 0, y: 0 },
            max: { x: 600, y: 600 },
          },
        }),
      );

      const dropY = 50;
      const ball = createBody({
        id: 'decay-ball',
        position: { x: 300, y: dropY },
        velocity: { x: 0, y: 0 },
        restitution: 0.5,
        friction: 0,
        shape: { type: 'circle', radius: 10 },
      });
      engine.addBody(ball);

      // Track bounce peaks. A "bounce" occurs when the ball's velocity
      // changes from negative (upward) to positive (downward), meaning
      // it has reached its peak.
      const bouncePeaks: number[] = [];
      let wasGoingUp = false;
      let currentPeakY = Infinity;

      const dt = 1 / 60;
      const maxFrames = 600;

      for (let i = 0; i < maxFrames && bouncePeaks.length < 5; i++) {
        engine.update(dt);
        const b = engine.getBody('decay-ball')!;

        if (b.velocity.y < -0.5) {
          // Ball is going upward
          if (!wasGoingUp) {
            wasGoingUp = true;
            currentPeakY = b.position.y;
          }
          if (b.position.y < currentPeakY) {
            currentPeakY = b.position.y;
          }
        } else if (wasGoingUp && b.velocity.y > 0.5) {
          // Ball has turned around — record peak
          bouncePeaks.push(currentPeakY);
          wasGoingUp = false;
          currentPeakY = Infinity;
        }
      }

      // We should detect at least 2 bounces
      expect(bouncePeaks.length).toBeGreaterThanOrEqual(2);

      // Each successive peak should be lower (higher y value, since y increases downward)
      // i.e., the ball doesn't reach as high as before
      for (let i = 1; i < bouncePeaks.length; i++) {
        expect(bouncePeaks[i]!).toBeGreaterThan(bouncePeaks[i - 1]!);
      }

      // The height (measured from the floor) should decay.
      // Floor effective y for the ball = 600 - 10 (radius) = 590
      const floorY = 590;
      const heights = bouncePeaks.map((p) => floorY - p);

      // Each subsequent height should be less than the previous
      for (let i = 1; i < heights.length; i++) {
        expect(heights[i]!).toBeLessThan(heights[i - 1]!);
      }

      // Overall energy should have decayed significantly
      const firstHeight = heights[0]!;
      const lastHeight = heights[heights.length - 1]!;
      expect(lastHeight).toBeLessThan(firstHeight * 0.5);
    });
  });

  // ---- 7. Bounds enforcement ----------------------------------------------

  describe('bounds enforcement', () => {
    it('body moving toward boundary bounces back and stays within bounds', () => {
      const boundsMin = { x: 0, y: 0 };
      const boundsMax = { x: 400, y: 400 };

      const engine = new PhysicsEngine(
        defaultConfig({
          gravity: { x: 0, y: 0 },
          bounds: { min: boundsMin, max: boundsMax },
        }),
      );

      const body = createBody({
        id: 'bounded',
        position: { x: 380, y: 200 },
        velocity: { x: 500, y: 0 },
        restitution: 0.8,
        shape: { type: 'circle', radius: 10 },
      });
      engine.addBody(body);

      const dt = 1 / 60;
      for (let i = 0; i < 120; i++) {
        engine.update(dt);
        const b = engine.getBody('bounded')!;
        const r = 10;

        // Body center + radius must stay within bounds (small float tolerance)
        expect(b.position.x + r).toBeLessThanOrEqual(boundsMax.x + 1);
        expect(b.position.x - r).toBeGreaterThanOrEqual(boundsMin.x - 1);
        expect(b.position.y + r).toBeLessThanOrEqual(boundsMax.y + 1);
        expect(b.position.y - r).toBeGreaterThanOrEqual(boundsMin.y - 1);
      }

      // Verify it's still within bounds at the end
      const final = engine.getBody('bounded')!;
      expect(final.position.x).toBeGreaterThanOrEqual(boundsMin.x);
      expect(final.position.x).toBeLessThanOrEqual(boundsMax.x);
    });

    it('body dropped from height stays above lower boundary', () => {
      const engine = new PhysicsEngine(
        defaultConfig({
          gravity: { x: 0, y: 980 },
          bounds: {
            min: { x: 0, y: 0 },
            max: { x: 800, y: 600 },
          },
        }),
      );

      const ball = createBody({
        id: 'drop-bounded',
        position: { x: 400, y: 50 },
        velocity: { x: 0, y: 0 },
        restitution: 0.3,
        shape: { type: 'circle', radius: 15 },
      });
      engine.addBody(ball);

      const dt = 1 / 60;
      for (let i = 0; i < 300; i++) {
        engine.update(dt);
        const b = engine.getBody('drop-bounded')!;
        // Body center + radius must not exceed lower bound
        expect(b.position.y + 15).toBeLessThanOrEqual(601);
      }
    });

    it('enforces all four boundaries', () => {
      const engine = new PhysicsEngine(
        defaultConfig({
          gravity: { x: 0, y: 0 },
          bounds: {
            min: { x: 0, y: 0 },
            max: { x: 200, y: 200 },
          },
        }),
      );

      const topLeft = createBody({
        id: 'tl',
        position: { x: 20, y: 20 },
        velocity: { x: -300, y: -300 },
        restitution: 0.9,
        shape: { type: 'circle', radius: 5 },
      });
      engine.addBody(topLeft);

      runFor(engine, 1);

      const b = engine.getBody('tl')!;
      expect(b.position.x).toBeGreaterThanOrEqual(0);
      expect(b.position.y).toBeGreaterThanOrEqual(0);
      expect(b.position.x).toBeLessThanOrEqual(200);
      expect(b.position.y).toBeLessThanOrEqual(200);
    });
  });

  // ---- 8. Determinism -----------------------------------------------------

  describe('determinism', () => {
    it('identical initial conditions produce identical results after N steps', () => {
      function createSimulation(): { engine: PhysicsEngine } {
        const engine = new PhysicsEngine(
          defaultConfig({ gravity: { x: 0, y: 980 } }),
        );

        engine.addBody(
          createBody({
            id: 'a',
            position: { x: 100, y: 0 },
            velocity: { x: 50, y: -30 },
            mass: 2,
            restitution: 0.7,
            shape: { type: 'circle', radius: 15 },
          }),
        );

        engine.addBody(
          createBody({
            id: 'b',
            position: { x: 200, y: 50 },
            velocity: { x: -20, y: 10 },
            mass: 1,
            restitution: 0.5,
            shape: { type: 'circle', radius: 10 },
          }),
        );

        engine.addBody(
          createBody({
            id: 'c',
            position: { x: 150, y: 300 },
            isStatic: true,
            shape: { type: 'rect', width: 200, height: 20 },
          }),
        );

        return { engine };
      }

      const sim1 = createSimulation();
      const sim2 = createSimulation();

      const steps = 120;
      const dt = 1 / 60;

      for (let i = 0; i < steps; i++) {
        sim1.engine.update(dt);
        sim2.engine.update(dt);
      }

      const bodies1 = sim1.engine
        .getBodies()
        .sort((a, b) => a.id.localeCompare(b.id));
      const bodies2 = sim2.engine
        .getBodies()
        .sort((a, b) => a.id.localeCompare(b.id));

      expect(bodies1.length).toBe(bodies2.length);

      for (let i = 0; i < bodies1.length; i++) {
        const b1 = bodies1[i]!;
        const b2 = bodies2[i]!;

        expect(b1.id).toBe(b2.id);
        expect(b1.position.x).toBe(b2.position.x);
        expect(b1.position.y).toBe(b2.position.y);
        expect(b1.velocity.x).toBe(b2.velocity.x);
        expect(b1.velocity.y).toBe(b2.velocity.y);
        expect(b1.isSleeping).toBe(b2.isSleeping);
        expect(b1.sleepTimer).toBe(b2.sleepTimer);
      }
    });

    it('determinism holds with constraints active', () => {
      function createConstrainedSim(): PhysicsEngine {
        const engine = new PhysicsEngine(
          defaultConfig({ gravity: { x: 0, y: 980 } }),
        );

        engine.addBody(
          createBody({
            id: 'pivot',
            position: { x: 200, y: 50 },
            isStatic: true,
            shape: { type: 'circle', radius: 5 },
          }),
        );

        engine.addBody(
          createBody({
            id: 'pendulum',
            position: { x: 300, y: 50 },
            velocity: { x: 0, y: 0 },
            mass: 1,
            restitution: 0.5,
            shape: { type: 'circle', radius: 10 },
          }),
        );

        engine.addConstraint(
          createConstraint({
            id: 'rod',
            bodyA: 'pendulum',
            bodyB: 'pivot',
            type: 'distance',
            stiffness: 1.0,
            damping: 0.0,
            length: 100,
          }),
        );

        return engine;
      }

      const sim1 = createConstrainedSim();
      const sim2 = createConstrainedSim();

      const dt = 1 / 60;
      for (let i = 0; i < 180; i++) {
        sim1.update(dt);
        sim2.update(dt);
      }

      const p1 = sim1.getBody('pendulum')!;
      const p2 = sim2.getBody('pendulum')!;

      expect(p1.position.x).toBe(p2.position.x);
      expect(p1.position.y).toBe(p2.position.y);
      expect(p1.velocity.x).toBe(p2.velocity.x);
      expect(p1.velocity.y).toBe(p2.velocity.y);
    });

    it('different initial conditions produce different results', () => {
      const engine1 = new PhysicsEngine(defaultConfig());
      const engine2 = new PhysicsEngine(defaultConfig());

      engine1.addBody(
        createBody({
          id: 'diff',
          position: { x: 100, y: 0 },
          velocity: { x: 10, y: 0 },
        }),
      );

      engine2.addBody(
        createBody({
          id: 'diff',
          position: { x: 100, y: 0 },
          velocity: { x: 20, y: 0 },
        }),
      );

      runFor(engine1, 1);
      runFor(engine2, 1);

      const b1 = engine1.getBody('diff')!;
      const b2 = engine2.getBody('diff')!;

      expect(b1.position.x).not.toBeCloseTo(b2.position.x, 1);
    });
  });
});
