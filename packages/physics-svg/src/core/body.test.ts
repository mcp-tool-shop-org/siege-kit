import { describe, it, expect } from 'vitest';
import { createBody } from './body.js';

// ---------------------------------------------------------------------------
// Default body creation
// ---------------------------------------------------------------------------

describe('createBody() — defaults', () => {
  it('returns a fully populated PhysicsBody with no arguments', () => {
    const body = createBody();

    expect(body.mass).toBe(1);
    expect(body.invMass).toBe(1);
    expect(body.restitution).toBe(0.5);
    expect(body.friction).toBe(0.3);
    expect(body.isStatic).toBe(false);
    expect(body.isSleeping).toBe(false);
    expect(body.sleepTimer).toBe(0);
    expect(body.position).toEqual({ x: 0, y: 0 });
    expect(body.previousPosition).toEqual({ x: 0, y: 0 });
    expect(body.velocity).toEqual({ x: 0, y: 0 });
    expect(body.acceleration).toEqual({ x: 0, y: 0 });
    expect(body.shape).toEqual({ type: 'circle', radius: 10 });
    expect(body.userData).toBeUndefined();
  });

  it('generates a unique id via crypto.randomUUID()', () => {
    const body = createBody();
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  it('generates different ids for each call', () => {
    const a = createBody();
    const b = createBody();
    expect(a.id).not.toBe(b.id);
  });
});

// ---------------------------------------------------------------------------
// previousPosition matches position
// ---------------------------------------------------------------------------

describe('createBody() — previousPosition', () => {
  it('previousPosition defaults to matching position', () => {
    const body = createBody({ position: { x: 42, y: -7 } });
    expect(body.previousPosition).toEqual({ x: 42, y: -7 });
  });

  it('previousPosition can be overridden independently', () => {
    const body = createBody({
      position: { x: 10, y: 20 },
      previousPosition: { x: 5, y: 15 },
    });
    expect(body.position).toEqual({ x: 10, y: 20 });
    expect(body.previousPosition).toEqual({ x: 5, y: 15 });
  });

  it('previousPosition is a separate object from position (no shared reference)', () => {
    const body = createBody({ position: { x: 1, y: 2 } });
    expect(body.previousPosition).toEqual(body.position);
    expect(body.previousPosition).not.toBe(body.position);
  });
});

// ---------------------------------------------------------------------------
// Static body
// ---------------------------------------------------------------------------

describe('createBody() — static bodies', () => {
  it('isStatic=true sets mass and invMass to 0', () => {
    const body = createBody({ isStatic: true });
    expect(body.isStatic).toBe(true);
    expect(body.mass).toBe(0);
    expect(body.invMass).toBe(0);
  });

  it('isStatic=true ignores provided mass value', () => {
    const body = createBody({ isStatic: true, mass: 999 });
    expect(body.mass).toBe(0);
    expect(body.invMass).toBe(0);
  });

  it('isStatic defaults to false', () => {
    const body = createBody();
    expect(body.isStatic).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Custom properties
// ---------------------------------------------------------------------------

describe('createBody() — custom properties', () => {
  it('accepts custom mass and computes invMass', () => {
    const body = createBody({ mass: 4 });
    expect(body.mass).toBe(4);
    expect(body.invMass).toBe(0.25);
  });

  it('accepts custom position', () => {
    const body = createBody({ position: { x: 100, y: 200 } });
    expect(body.position).toEqual({ x: 100, y: 200 });
  });

  it('accepts custom velocity', () => {
    const body = createBody({ velocity: { x: -5, y: 10 } });
    expect(body.velocity).toEqual({ x: -5, y: 10 });
  });

  it('accepts custom acceleration', () => {
    const body = createBody({ acceleration: { x: 0, y: -9.81 } });
    expect(body.acceleration).toEqual({ x: 0, y: -9.81 });
  });

  it('accepts custom restitution', () => {
    const body = createBody({ restitution: 0.8 });
    expect(body.restitution).toBe(0.8);
  });

  it('accepts custom friction', () => {
    const body = createBody({ friction: 0.1 });
    expect(body.friction).toBe(0.1);
  });

  it('accepts a rect shape', () => {
    const body = createBody({ shape: { type: 'rect', width: 50, height: 30 } });
    expect(body.shape).toEqual({ type: 'rect', width: 50, height: 30 });
  });

  it('accepts a polygon shape', () => {
    const verts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ];
    const body = createBody({ shape: { type: 'polygon', vertices: verts } });
    expect(body.shape).toEqual({ type: 'polygon', vertices: verts });
  });

  it('accepts custom id', () => {
    const body = createBody({ id: 'my-custom-id' });
    expect(body.id).toBe('my-custom-id');
  });

  it('accepts userData', () => {
    const body = createBody({ userData: { label: 'ball', score: 10 } });
    expect(body.userData).toEqual({ label: 'ball', score: 10 });
  });
});

// ---------------------------------------------------------------------------
// invMass calculation
// ---------------------------------------------------------------------------

describe('createBody() — invMass', () => {
  it('invMass = 1/mass for dynamic body', () => {
    const body = createBody({ mass: 5 });
    expect(body.invMass).toBeCloseTo(0.2, 10);
  });

  it('invMass = 1 for default mass of 1', () => {
    const body = createBody();
    expect(body.invMass).toBe(1);
  });

  it('invMass = 0 for static body', () => {
    const body = createBody({ isStatic: true });
    expect(body.invMass).toBe(0);
  });

  it('invMass = 0 when mass is explicitly 0 (dynamic but massless)', () => {
    const body = createBody({ mass: 0 });
    expect(body.invMass).toBe(0);
  });

  it('handles fractional mass', () => {
    const body = createBody({ mass: 0.5 });
    expect(body.invMass).toBeCloseTo(2, 10);
  });

  it('handles very large mass', () => {
    const body = createBody({ mass: 1e6 });
    expect(body.invMass).toBeCloseTo(1e-6, 15);
  });
});

// ---------------------------------------------------------------------------
// Sleep defaults
// ---------------------------------------------------------------------------

describe('createBody() — sleep state', () => {
  it('isSleeping defaults to false', () => {
    expect(createBody().isSleeping).toBe(false);
  });

  it('sleepTimer defaults to 0', () => {
    expect(createBody().sleepTimer).toBe(0);
  });

  it('custom isSleeping can be set', () => {
    const body = createBody({ isSleeping: true });
    expect(body.isSleeping).toBe(true);
  });

  it('custom sleepTimer can be set', () => {
    const body = createBody({ sleepTimer: 42 });
    expect(body.sleepTimer).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Position independence (no shared references)
// ---------------------------------------------------------------------------

describe('createBody() — independence', () => {
  it('two bodies created with no args have independent position objects', () => {
    const a = createBody();
    const b = createBody();
    a.position.x = 999;
    expect(b.position.x).toBe(0);
  });

  it('two bodies created with no args have independent velocity objects', () => {
    const a = createBody();
    const b = createBody();
    a.velocity.y = 42;
    expect(b.velocity.y).toBe(0);
  });

  it('position is a copy, not a reference to the input', () => {
    const pos = { x: 10, y: 20 };
    const body = createBody({ position: pos });
    pos.x = 999;
    expect(body.position.x).toBe(10);
  });

  it('shape is a copy, not a reference to the default', () => {
    const a = createBody();
    const b = createBody();
    if (a.shape.type === 'circle') {
      a.shape.radius = 999;
    }
    if (b.shape.type === 'circle') {
      expect(b.shape.radius).toBe(10);
    }
  });

  it('velocity from partial is used by reference (not copied)', () => {
    const vel = { x: 5, y: -3 };
    const body = createBody({ velocity: vel });
    // The implementation uses the provided object directly (no spread)
    vel.x = 999;
    expect(body.velocity.x).toBe(999);
  });

  it('acceleration from partial is used by reference (not copied)', () => {
    const acc = { x: 0, y: -9.81 };
    const body = createBody({ acceleration: acc });
    // The implementation uses the provided object directly (no spread)
    acc.y = 0;
    expect(body.acceleration.y).toBe(0);
  });
});
