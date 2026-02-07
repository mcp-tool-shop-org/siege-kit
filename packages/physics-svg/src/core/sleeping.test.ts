import { describe, it, expect } from 'vitest';
import { createBody } from './body.js';
import { updateSleepState, wakeBody, wakeOnCollision } from './sleeping.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shortcut to create a dynamic circle body with given velocity and sleep state. */
function dynamicBody(
  overrides: Parameters<typeof createBody>[0] = {},
) {
  return createBody({
    id: overrides.id ?? 'test',
    shape: { type: 'circle', radius: 10 },
    ...overrides,
  });
}

// ===========================================================================
// updateSleepState
// ===========================================================================

describe('updateSleepState', () => {
  it('increments sleepTimer when speed is below threshold (0.5)', () => {
    const body = dynamicBody({
      velocity: { x: 0.1, y: 0.1 }, // speed ~0.14
      sleepTimer: 0,
    });

    updateSleepState(body);

    expect(body.sleepTimer).toBe(1);
    expect(body.isSleeping).toBe(false);
  });

  it('resets sleepTimer and sets isSleeping=false when speed >= threshold', () => {
    const body = dynamicBody({
      velocity: { x: 3, y: 4 }, // speed = 5
      sleepTimer: 20,
      isSleeping: false,
    });

    updateSleepState(body);

    expect(body.sleepTimer).toBe(0);
    expect(body.isSleeping).toBe(false);
  });

  it('puts body to sleep after 30 consecutive frames below threshold', () => {
    const body = dynamicBody({
      velocity: { x: 0.1, y: 0 },
      sleepTimer: 29, // one frame away from sleeping
    });

    updateSleepState(body);

    expect(body.sleepTimer).toBe(30);
    expect(body.isSleeping).toBe(true);
    expect(body.velocity.x).toBe(0);
    expect(body.velocity.y).toBe(0);
  });

  it('does not change a static body (early return)', () => {
    const body = dynamicBody({
      isStatic: true,
      velocity: { x: 0.1, y: 0 },
      sleepTimer: 0,
      isSleeping: false,
    });

    updateSleepState(body);

    expect(body.sleepTimer).toBe(0);
    expect(body.isSleeping).toBe(false);
  });

  it('wakes up a sleeping body that now has high velocity', () => {
    const body = dynamicBody({
      velocity: { x: 10, y: 0 },
      isSleeping: true,
      sleepTimer: 30,
    });

    updateSleepState(body);

    expect(body.isSleeping).toBe(false);
    expect(body.sleepTimer).toBe(0);
  });

  it('does NOT sleep on frame 29 (needs full 30)', () => {
    const body = dynamicBody({
      velocity: { x: 0.1, y: 0 },
      sleepTimer: 28,
    });

    updateSleepState(body);

    expect(body.sleepTimer).toBe(29);
    expect(body.isSleeping).toBe(false);
  });

  it('keeps incrementing sleepTimer past 30 if already sleeping', () => {
    const body = dynamicBody({
      velocity: { x: 0, y: 0 },
      sleepTimer: 50,
      isSleeping: true,
    });

    updateSleepState(body);

    expect(body.sleepTimer).toBe(51);
    expect(body.isSleeping).toBe(true);
  });
});

// ===========================================================================
// wakeBody
// ===========================================================================

describe('wakeBody', () => {
  it('sets isSleeping=false and sleepTimer=0', () => {
    const body = dynamicBody({
      isSleeping: true,
      sleepTimer: 45,
    });

    wakeBody(body);

    expect(body.isSleeping).toBe(false);
    expect(body.sleepTimer).toBe(0);
  });

  it('is a no-op for an already-awake body (values remain the same)', () => {
    const body = dynamicBody({
      isSleeping: false,
      sleepTimer: 0,
    });

    wakeBody(body);

    expect(body.isSleeping).toBe(false);
    expect(body.sleepTimer).toBe(0);
  });
});

// ===========================================================================
// wakeOnCollision
// ===========================================================================

describe('wakeOnCollision', () => {
  it('wakes sleeping A when B is awake', () => {
    const a = dynamicBody({ id: 'A', isSleeping: true, sleepTimer: 30 });
    const b = dynamicBody({ id: 'B', isSleeping: false, sleepTimer: 0 });

    wakeOnCollision(a, b);

    expect(a.isSleeping).toBe(false);
    expect(a.sleepTimer).toBe(0);
  });

  it('wakes sleeping B when A is awake', () => {
    const a = dynamicBody({ id: 'A', isSleeping: false, sleepTimer: 0 });
    const b = dynamicBody({ id: 'B', isSleeping: true, sleepTimer: 30 });

    wakeOnCollision(a, b);

    expect(b.isSleeping).toBe(false);
    expect(b.sleepTimer).toBe(0);
  });

  it('does NOT wake either body when both are sleeping', () => {
    const a = dynamicBody({ id: 'A', isSleeping: true, sleepTimer: 30 });
    const b = dynamicBody({ id: 'B', isSleeping: true, sleepTimer: 30 });

    wakeOnCollision(a, b);

    expect(a.isSleeping).toBe(true);
    expect(a.sleepTimer).toBe(30);
    expect(b.isSleeping).toBe(true);
    expect(b.sleepTimer).toBe(30);
  });

  it('does not change either body when both are awake', () => {
    const a = dynamicBody({ id: 'A', isSleeping: false, sleepTimer: 5 });
    const b = dynamicBody({ id: 'B', isSleeping: false, sleepTimer: 10 });

    wakeOnCollision(a, b);

    expect(a.isSleeping).toBe(false);
    expect(a.sleepTimer).toBe(5);
    expect(b.isSleeping).toBe(false);
    expect(b.sleepTimer).toBe(10);
  });

  it('does NOT wake sleeping body when the other is static (not awake dynamic)', () => {
    const sleeping = dynamicBody({ id: 'S', isSleeping: true, sleepTimer: 30 });
    const staticBody = dynamicBody({ id: 'W', isStatic: true, isSleeping: false });

    wakeOnCollision(sleeping, staticBody);

    // Static body has isStatic=true, so !b.isStatic is false → sleeping stays asleep
    expect(sleeping.isSleeping).toBe(true);
    expect(sleeping.sleepTimer).toBe(30);
  });

  it('does NOT wake sleeping body when static is first arg', () => {
    const staticBody = dynamicBody({ id: 'W', isStatic: true, isSleeping: false });
    const sleeping = dynamicBody({ id: 'S', isSleeping: true, sleepTimer: 30 });

    wakeOnCollision(staticBody, sleeping);

    // a is static and not sleeping, b is sleeping
    // condition: b.isSleeping && !a.isSleeping && !a.isStatic
    // a.isStatic is true, so !a.isStatic is false → sleeping stays asleep
    expect(sleeping.isSleeping).toBe(true);
    expect(sleeping.sleepTimer).toBe(30);
  });
});
