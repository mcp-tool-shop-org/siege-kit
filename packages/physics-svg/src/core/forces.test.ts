import { describe, it, expect } from 'vitest';
import {
  applyGravity,
  applyDrag,
  applyWind,
  applyAttraction,
  applyForceFields,
} from './forces.js';
import { createBody } from './body.js';
import type { ForceField } from '@mcp-tool-shop/siege-types';

// ---------------------------------------------------------------------------
// applyGravity
// ---------------------------------------------------------------------------

describe('applyGravity', () => {
  it('adds gravity to acceleration (a.x += g.x, a.y += g.y)', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
    });

    applyGravity(body, { x: 0, y: 9.8 });

    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(9.8);
  });

  it('accumulates with existing acceleration', () => {
    const body = createBody({
      acceleration: { x: 5, y: 3 },
    });

    applyGravity(body, { x: -1, y: 9.8 });

    expect(body.acceleration.x).toBeCloseTo(4, 10);
    expect(body.acceleration.y).toBeCloseTo(12.8, 10);
  });

  it('zero gravity does nothing', () => {
    const body = createBody({
      acceleration: { x: 10, y: 20 },
    });

    applyGravity(body, { x: 0, y: 0 });

    expect(body.acceleration.x).toBe(10);
    expect(body.acceleration.y).toBe(20);
  });

  it('works with negative (upward) gravity', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
    });

    applyGravity(body, { x: 0, y: -9.8 });

    expect(body.acceleration.y).toBeCloseTo(-9.8, 10);
  });
});

// ---------------------------------------------------------------------------
// applyDrag
// ---------------------------------------------------------------------------

describe('applyDrag', () => {
  it('reduces acceleration proportional to velocity * coefficient', () => {
    const body = createBody({
      velocity: { x: 100, y: 50 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    applyDrag(body, 0.5);

    // F_drag = -coeff * v, a += F_drag * invMass
    // invMass = 1 for mass=1
    expect(body.acceleration.x).toBeCloseTo(-0.5 * 100, 10);
    expect(body.acceleration.y).toBeCloseTo(-0.5 * 50, 10);
  });

  it('zero velocity produces no drag', () => {
    const body = createBody({
      velocity: { x: 0, y: 0 },
      acceleration: { x: 5, y: 5 },
      mass: 1,
    });

    applyDrag(body, 0.5);

    expect(body.acceleration.x).toBe(5);
    expect(body.acceleration.y).toBe(5);
  });

  it('respects invMass (heavier body gets less acceleration)', () => {
    const light = createBody({
      velocity: { x: 100, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });
    const heavy = createBody({
      velocity: { x: 100, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 5,
    });

    applyDrag(light, 0.5);
    applyDrag(heavy, 0.5);

    // light: a = -0.5 * 100 * 1 = -50
    // heavy: a = -0.5 * 100 * 0.2 = -10
    expect(light.acceleration.x).toBeCloseTo(-50, 10);
    expect(heavy.acceleration.x).toBeCloseTo(-10, 10);
  });

  it('does nothing for a static body (invMass <= 0)', () => {
    const body = createBody({
      isStatic: true,
      velocity: { x: 100, y: 100 },
      acceleration: { x: 0, y: 0 },
    });

    applyDrag(body, 0.5);

    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applyWind
// ---------------------------------------------------------------------------

describe('applyWind', () => {
  it('adds wind force to acceleration (direction * strength * invMass)', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    applyWind(body, { x: 1, y: 0 }, 50);

    expect(body.acceleration.x).toBeCloseTo(50, 10);
    expect(body.acceleration.y).toBeCloseTo(0, 10);
  });

  it('wind in diagonal direction', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    applyWind(body, { x: 0.707, y: 0.707 }, 10);

    expect(body.acceleration.x).toBeCloseTo(7.07, 1);
    expect(body.acceleration.y).toBeCloseTo(7.07, 1);
  });

  it('heavier body gets less acceleration from same wind', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
      mass: 4,
    });

    applyWind(body, { x: 1, y: 0 }, 100);

    // a = direction.x * strength * invMass = 1 * 100 * 0.25 = 25
    expect(body.acceleration.x).toBeCloseTo(25, 10);
  });

  it('does nothing for a static body', () => {
    const body = createBody({
      isStatic: true,
      acceleration: { x: 0, y: 0 },
    });

    applyWind(body, { x: 1, y: 0 }, 100);

    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(0);
  });

  it('zero strength wind does nothing', () => {
    const body = createBody({
      acceleration: { x: 5, y: 5 },
      mass: 1,
    });

    applyWind(body, { x: 1, y: 1 }, 0);

    expect(body.acceleration.x).toBe(5);
    expect(body.acceleration.y).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// applyAttraction
// ---------------------------------------------------------------------------

describe('applyAttraction', () => {
  it('with "none" falloff: constant force regardless of distance', () => {
    const near = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });
    const far = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const point = { x: 1000, y: 0 };

    applyAttraction(near, { x: 100, y: 0 }, 50, 'none');
    applyAttraction(far, point, 50, 'none');

    // Both should get the same magnitude of force (50), just different directions.
    // forceMag = strength = 50 for 'none'
    // near: direction ~ (1,0), accel.x ~ 50 * 1 * 1 = 50
    // far:  direction ~ (1,0), accel.x ~ 50 * 1 * 1 = 50
    const nearMag = Math.sqrt(near.acceleration.x ** 2 + near.acceleration.y ** 2);
    const farMag = Math.sqrt(far.acceleration.x ** 2 + far.acceleration.y ** 2);
    expect(nearMag).toBeCloseTo(farMag, 5);
  });

  it('with "linear" falloff: force scales with 1/distance', () => {
    const body1 = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });
    const body2 = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    // Point at x=100 vs x=200. MIN_DIST_SQ=100 (dist=10), so both distances
    // are well above the clamp.
    applyAttraction(body1, { x: 100, y: 0 }, 1000, 'linear');
    applyAttraction(body2, { x: 200, y: 0 }, 1000, 'linear');

    // body1: dist=100, forceMag = 1000/100 = 10, accel.x = 1*10*1 = 10
    // body2: dist=200, forceMag = 1000/200 = 5,  accel.x = 1*5*1  = 5
    // Ratio should be 2:1
    expect(body1.acceleration.x).toBeCloseTo(10, 5);
    expect(body2.acceleration.x).toBeCloseTo(5, 5);
    expect(body1.acceleration.x / body2.acceleration.x).toBeCloseTo(2, 5);
  });

  it('with "quadratic" falloff: force scales with 1/distance^2', () => {
    const body1 = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });
    const body2 = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    applyAttraction(body1, { x: 100, y: 0 }, 100000, 'quadratic');
    applyAttraction(body2, { x: 200, y: 0 }, 100000, 'quadratic');

    // body1: distSq = 10000, forceMag = 100000/10000 = 10, accel.x = 10
    // body2: distSq = 40000, forceMag = 100000/40000 = 2.5, accel.x = 2.5
    // Ratio should be 4:1
    expect(body1.acceleration.x / body2.acceleration.x).toBeCloseTo(4, 3);
  });

  it('default falloff is quadratic', () => {
    const body = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    applyAttraction(body, { x: 100, y: 0 }, 100000);

    // Same as quadratic: distSq = 10000, forceMag = 100000/10000 = 10
    expect(body.acceleration.x).toBeCloseTo(10, 5);
  });

  it('body at the attraction point does NOT produce NaN', () => {
    const body = createBody({
      position: { x: 50, y: 50 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    // Point is exactly at body position — distance is 0
    applyAttraction(body, { x: 50, y: 50 }, 100, 'quadratic');

    expect(Number.isNaN(body.acceleration.x)).toBe(false);
    expect(Number.isNaN(body.acceleration.y)).toBe(false);
    expect(Number.isFinite(body.acceleration.x)).toBe(true);
    expect(Number.isFinite(body.acceleration.y)).toBe(true);
  });

  it('body very close to attraction point is clamped (MIN_DIST_SQ)', () => {
    const body = createBody({
      position: { x: 50, y: 50 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    // 1 unit away — distSq = 1, gets clamped to MIN_DIST_SQ = 100
    applyAttraction(body, { x: 51, y: 50 }, 1000, 'quadratic');

    // clampedDistSq = 100, dist = 10
    // direction = (1, 0) / 10 = (0.1, 0)  -- Wait, delta = (1, 0), dist=sqrt(100)=10
    // direction = (1/10, 0) = (0.1, 0)
    // forceMag = 1000 / 100 = 10
    // accel = 0.1 * 10 * 1 = 1
    expect(body.acceleration.x).toBeCloseTo(1, 3);
    expect(body.acceleration.y).toBeCloseTo(0, 10);
  });

  it('does nothing for a static body (invMass <= 0)', () => {
    const body = createBody({
      isStatic: true,
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
    });

    applyAttraction(body, { x: 100, y: 0 }, 50, 'none');

    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(0);
  });

  it('negative strength produces repulsion', () => {
    const body = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    applyAttraction(body, { x: 100, y: 0 }, -50, 'none');

    // direction toward point is positive x, but strength is negative
    // so acceleration should be negative x (away from point)
    expect(body.acceleration.x).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// applyForceFields
// ---------------------------------------------------------------------------

describe('applyForceFields', () => {
  it('empty array does nothing', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
    });

    applyForceFields(body, [], { x: 0, y: 9.8 });

    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(0);
  });

  it('routes gravity field to applyGravity', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
    });

    const fields: ForceField[] = [
      { type: 'gravity', vector: { x: 0, y: 5 } },
    ];

    applyForceFields(body, fields, { x: 0, y: 9.8 });

    // Should use field.vector, not the gravity parameter
    expect(body.acceleration.y).toBeCloseTo(5, 10);
  });

  it('gravity field with no vector uses default gravity parameter', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
    });

    const fields: ForceField[] = [{ type: 'gravity' }];

    applyForceFields(body, fields, { x: 0, y: 9.8 });

    // Falls back to the gravity parameter
    expect(body.acceleration.y).toBeCloseTo(9.8, 10);
  });

  it('routes drag field to applyDrag', () => {
    const body = createBody({
      velocity: { x: 100, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const fields: ForceField[] = [{ type: 'drag', strength: 0.5 }];

    applyForceFields(body, fields, { x: 0, y: 0 });

    // drag: a += -0.5 * 100 * 1 = -50
    expect(body.acceleration.x).toBeCloseTo(-50, 10);
  });

  it('drag field with no strength uses default 0.01', () => {
    const body = createBody({
      velocity: { x: 100, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const fields: ForceField[] = [{ type: 'drag' }];

    applyForceFields(body, fields, { x: 0, y: 0 });

    // default strength = 0.01: a += -0.01 * 100 * 1 = -1
    expect(body.acceleration.x).toBeCloseTo(-1, 10);
  });

  it('routes wind field to applyWind', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const fields: ForceField[] = [
      { type: 'wind', vector: { x: 1, y: 0 }, strength: 30 },
    ];

    applyForceFields(body, fields, { x: 0, y: 0 });

    expect(body.acceleration.x).toBeCloseTo(30, 10);
  });

  it('wind field without vector is skipped', () => {
    const body = createBody({
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const fields: ForceField[] = [{ type: 'wind', strength: 30 }];

    applyForceFields(body, fields, { x: 0, y: 0 });

    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(0);
  });

  it('routes attraction field to applyAttraction', () => {
    const body = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const fields: ForceField[] = [
      {
        type: 'attraction',
        vector: { x: 100, y: 0 },
        strength: 50,
        falloff: 'none',
      },
    ];

    applyForceFields(body, fields, { x: 0, y: 0 });

    // With 'none' falloff and strength 50, direction ~ (1,0): accel.x ~ 50
    expect(body.acceleration.x).toBeGreaterThan(0);
  });

  it('attraction field without vector is skipped', () => {
    const body = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const fields: ForceField[] = [
      { type: 'attraction', strength: 50, falloff: 'none' },
    ];

    applyForceFields(body, fields, { x: 0, y: 0 });

    expect(body.acceleration.x).toBe(0);
    expect(body.acceleration.y).toBe(0);
  });

  it('multiple fields accumulate their effects', () => {
    const body = createBody({
      velocity: { x: 10, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const fields: ForceField[] = [
      { type: 'gravity', vector: { x: 0, y: 10 } },
      { type: 'wind', vector: { x: 1, y: 0 }, strength: 5 },
      { type: 'drag', strength: 0.1 },
    ];

    applyForceFields(body, fields, { x: 0, y: 0 });

    // gravity: ay += 10
    // wind:    ax += 5
    // drag:    ax += -0.1 * 10 * 1 = -1 (velocity is x=10)
    expect(body.acceleration.x).toBeCloseTo(5 - 1, 5);
    expect(body.acceleration.y).toBeCloseTo(10, 5);
  });

  it('attraction defaults to quadratic falloff when not specified', () => {
    const body = createBody({
      position: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
    });

    const fields: ForceField[] = [
      { type: 'attraction', vector: { x: 100, y: 0 }, strength: 100000 },
    ];

    applyForceFields(body, fields, { x: 0, y: 0 });

    // quadratic: distSq=10000, forceMag=100000/10000=10, direction=(1,0), accel.x=10
    expect(body.acceleration.x).toBeCloseTo(10, 3);
  });
});
