import { bench, describe } from 'vitest';
import { createBody } from './body.js';
import { createConstraint } from './constraint.js';
import { PhysicsEngine } from './engine.js';
import { detectCollisions } from './collision.js';
import * as V from './vec2.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function worldConfig(bounds = true) {
  return {
    gravity: { x: 0, y: 980 },
    substeps: 4,
    velocityIterations: 4,
    ...(bounds
      ? { bounds: { min: { x: 0, y: 0 }, max: { x: 1000, y: 1000 } } }
      : {}),
  };
}

function createCircleEngine(count: number): PhysicsEngine {
  const engine = new PhysicsEngine(worldConfig());

  for (let i = 0; i < count; i++) {
    const body = createBody({
      position: {
        x: 100 + Math.random() * 800,
        y: 100 + Math.random() * 400,
      },
      shape: { type: 'circle', radius: 5 },
      mass: 1,
    });
    engine.addBody(body);
  }

  // Static floor
  engine.addBody(
    createBody({
      isStatic: true,
      position: { x: 500, y: 980 },
      shape: { type: 'rect', width: 1000, height: 40 },
    }),
  );

  return engine;
}

// ---------------------------------------------------------------------------
// 1-3. Falling Circles
// ---------------------------------------------------------------------------

describe('Falling circles', () => {
  bench(
    '100 bodies - 100 steps',
    () => {
      const engine = createCircleEngine(100);
      for (let i = 0; i < 100; i++) {
        engine.update(1 / 60);
      }
    },
    { iterations: 20 },
  );

  bench(
    '500 bodies - 100 steps',
    () => {
      const engine = createCircleEngine(500);
      for (let i = 0; i < 100; i++) {
        engine.update(1 / 60);
      }
    },
    { iterations: 10 },
  );

  bench(
    '1000 bodies - 100 steps',
    () => {
      const engine = createCircleEngine(1000);
      for (let i = 0; i < 100; i++) {
        engine.update(1 / 60);
      }
    },
    { iterations: 5 },
  );
});

// ---------------------------------------------------------------------------
// 4. Pyramid Stack (55 bodies)
// ---------------------------------------------------------------------------

describe('Pyramid stack', () => {
  bench(
    '55 rect bodies (10 rows) - 100 steps',
    () => {
      const engine = new PhysicsEngine(worldConfig());

      const boxSize = 30;
      const rows = 10;
      const baseX = 500;
      const baseY = 900;

      for (let row = 0; row < rows; row++) {
        const count = rows - row;
        const startX = baseX - (count * boxSize) / 2 + boxSize / 2;

        for (let col = 0; col < count; col++) {
          const body = createBody({
            position: {
              x: startX + col * boxSize,
              y: baseY - row * boxSize,
            },
            shape: { type: 'rect', width: boxSize - 2, height: boxSize - 2 },
            mass: 1,
          });
          engine.addBody(body);
        }
      }

      // Static floor
      engine.addBody(
        createBody({
          isStatic: true,
          position: { x: 500, y: 950 },
          shape: { type: 'rect', width: 1000, height: 40 },
        }),
      );

      for (let i = 0; i < 100; i++) {
        engine.update(1 / 60);
      }
    },
    { iterations: 20 },
  );
});

// ---------------------------------------------------------------------------
// 5. Constraint Chain (50 bodies, 49 springs)
// ---------------------------------------------------------------------------

describe('Constraint chain', () => {
  bench(
    '50 bodies + 49 spring constraints - 100 steps',
    () => {
      const engine = new PhysicsEngine(worldConfig());

      const bodies: string[] = [];
      for (let i = 0; i < 50; i++) {
        const body = createBody({
          position: { x: 100 + i * 16, y: 200 },
          shape: { type: 'circle', radius: 4 },
          mass: 1,
          // Pin the first body
          isStatic: i === 0,
        });
        bodies.push(engine.addBody(body));
      }

      for (let i = 0; i < 49; i++) {
        const constraint = createConstraint({
          bodyA: bodies[i]!,
          bodyB: bodies[i + 1]!,
          type: 'spring',
          stiffness: 0.8,
          damping: 0.1,
          length: 16,
        });
        engine.addConstraint(constraint);
      }

      for (let i = 0; i < 100; i++) {
        engine.update(1 / 60);
      }
    },
    { iterations: 20 },
  );
});

// ---------------------------------------------------------------------------
// 6. Mixed Scene (200 bodies, 50 constraints)
// ---------------------------------------------------------------------------

describe('Mixed scene', () => {
  bench(
    '150 circles + 50 rects + 50 springs - 100 steps',
    () => {
      const engine = new PhysicsEngine(worldConfig());

      const ids: string[] = [];

      // 150 circles
      for (let i = 0; i < 150; i++) {
        const body = createBody({
          position: {
            x: 50 + Math.random() * 900,
            y: 50 + Math.random() * 400,
          },
          shape: { type: 'circle', radius: 3 + Math.random() * 7 },
          mass: 0.5 + Math.random() * 2,
        });
        ids.push(engine.addBody(body));
      }

      // 50 rects
      for (let i = 0; i < 50; i++) {
        const body = createBody({
          position: {
            x: 50 + Math.random() * 900,
            y: 50 + Math.random() * 400,
          },
          shape: {
            type: 'rect',
            width: 10 + Math.random() * 20,
            height: 10 + Math.random() * 20,
          },
          mass: 1 + Math.random() * 3,
        });
        ids.push(engine.addBody(body));
      }

      // 50 spring constraints between random pairs
      for (let i = 0; i < 50; i++) {
        const aIdx = Math.floor(Math.random() * ids.length);
        let bIdx = Math.floor(Math.random() * ids.length);
        if (bIdx === aIdx) bIdx = (bIdx + 1) % ids.length;

        const constraint = createConstraint({
          bodyA: ids[aIdx]!,
          bodyB: ids[bIdx]!,
          type: 'spring',
          stiffness: 0.3 + Math.random() * 0.5,
          damping: 0.05 + Math.random() * 0.1,
          length: 30 + Math.random() * 70,
        });
        engine.addConstraint(constraint);
      }

      // Static floor
      engine.addBody(
        createBody({
          isStatic: true,
          position: { x: 500, y: 980 },
          shape: { type: 'rect', width: 1000, height: 40 },
        }),
      );

      for (let i = 0; i < 100; i++) {
        engine.update(1 / 60);
      }
    },
    { iterations: 10 },
  );
});

// ---------------------------------------------------------------------------
// 7. Vec2 Operations (Micro)
// ---------------------------------------------------------------------------

describe('Vec2 micro-benchmarks', () => {
  const a = V.vec2(3.14, 2.72);
  const b = V.vec2(1.41, 1.73);

  bench(
    'add - 10000 iterations',
    () => {
      for (let i = 0; i < 10000; i++) {
        V.add(a, b);
      }
    },
    { iterations: 100 },
  );

  bench(
    'sub - 10000 iterations',
    () => {
      for (let i = 0; i < 10000; i++) {
        V.sub(a, b);
      }
    },
    { iterations: 100 },
  );

  bench(
    'dot - 10000 iterations',
    () => {
      for (let i = 0; i < 10000; i++) {
        V.dot(a, b);
      }
    },
    { iterations: 100 },
  );

  bench(
    'normalize - 10000 iterations',
    () => {
      for (let i = 0; i < 10000; i++) {
        V.normalize(a);
      }
    },
    { iterations: 100 },
  );

  bench(
    'lerp - 10000 iterations',
    () => {
      for (let i = 0; i < 10000; i++) {
        V.lerp(a, b, 0.5);
      }
    },
    { iterations: 100 },
  );
});

// ---------------------------------------------------------------------------
// 8. Collision Detection Only (500 bodies)
// ---------------------------------------------------------------------------

describe('Collision detection only', () => {
  bench(
    '500 bodies - detectCollisions x100',
    () => {
      // Pre-create bodies (included in measurement since it's part of setup
      // within the bench fn, but detection dominates at O(n^2))
      const bodies = [];
      for (let i = 0; i < 500; i++) {
        bodies.push(
          createBody({
            position: {
              x: Math.random() * 1000,
              y: Math.random() * 1000,
            },
            shape: { type: 'circle', radius: 5 },
          }),
        );
      }

      for (let i = 0; i < 100; i++) {
        detectCollisions(bodies);
      }
    },
    { iterations: 5 },
  );
});
