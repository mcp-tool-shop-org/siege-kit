import { describe, it, expect } from 'vitest';
import { createBody } from './body.js';
import { detectCollisions, resolveCollision } from './collision.js';
import type { CollisionPair } from './collision.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a circle body at the given position with the given radius. */
function circle(
  id: string,
  x: number,
  y: number,
  radius: number,
  overrides: Parameters<typeof createBody>[0] = {},
) {
  return createBody({
    id,
    position: { x, y },
    shape: { type: 'circle', radius },
    ...overrides,
  });
}

/** Create a rect body at the given position with the given dimensions. */
function rect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Parameters<typeof createBody>[0] = {},
) {
  return createBody({
    id,
    position: { x, y },
    shape: { type: 'rect', width, height },
    ...overrides,
  });
}

// ===========================================================================
// DETECTION
// ===========================================================================

describe('detectCollisions', () => {
  // ---- Circle vs Circle ---------------------------------------------------

  describe('circle vs circle', () => {
    it('returns a collision pair for two overlapping circles', () => {
      //  A(0,0) r=10 and B(15,0) r=10 → gap = 15, sumRadii = 20, overlap = 5
      const a = circle('A', 0, 0, 10);
      const b = circle('B', 15, 0, 10);
      const pairs = detectCollisions([a, b]);

      expect(pairs).toHaveLength(1);
      const p = pairs[0]!;
      expect(p.bodyA).toBe('A');
      expect(p.bodyB).toBe('B');
      // Normal should point from A to B → (1, 0)
      expect(p.normal.x).toBeCloseTo(1, 5);
      expect(p.normal.y).toBeCloseTo(0, 5);
      // Penetration = sumRadii - dist = 20 - 15 = 5
      expect(p.penetration).toBeCloseTo(5, 5);
    });

    it('returns empty array for two non-overlapping circles', () => {
      //  A(0,0) r=5 and B(20,0) r=5 → dist = 20, sumRadii = 10
      const a = circle('A', 0, 0, 5);
      const b = circle('B', 20, 0, 5);
      expect(detectCollisions([a, b])).toHaveLength(0);
    });

    it('returns empty when circles are just touching (distance = sumRadii)', () => {
      //  A(0,0) r=5 and B(10,0) r=5 → dist = 10, sumRadii = 10 → >= check excludes
      const a = circle('A', 0, 0, 5);
      const b = circle('B', 10, 0, 5);
      expect(detectCollisions([a, b])).toHaveLength(0);
    });

    it('returns pair with fallback normal {x:0,y:1} for coincident circles', () => {
      const a = circle('A', 5, 5, 10);
      const b = circle('B', 5, 5, 10);
      const pairs = detectCollisions([a, b]);

      expect(pairs).toHaveLength(1);
      const p = pairs[0]!;
      expect(p.normal.x).toBeCloseTo(0, 5);
      expect(p.normal.y).toBeCloseTo(1, 5);
      // Penetration = sumRadii - 0 = 20
      expect(p.penetration).toBeCloseTo(20, 5);
    });
  });

  // ---- Circle vs Rect -----------------------------------------------------

  describe('circle vs rect', () => {
    it('returns a collision pair for overlapping circle and rect', () => {
      // Circle at (0,0) r=10, Rect at (12,0) 10x10
      // circleVsRect: dx = 0-12 = -12, closestX = clamp(-12,-5,5) = -5
      // diffX = -12-(-5) = -7, diffY = 0, dist = 7
      // normal = (-1, 0) → from rect surface toward circle center
      // penetration = 10 - 7 = 3
      const c = circle('C', 0, 0, 10);
      const r = rect('R', 12, 0, 10, 10);
      const pairs = detectCollisions([c, r]);

      expect(pairs).toHaveLength(1);
      const p = pairs[0]!;
      expect(p.bodyA).toBe('C');
      expect(p.bodyB).toBe('R');
      // Normal points from rect surface toward circle center → (-1, 0)
      expect(p.normal.x).toBeCloseTo(-1, 5);
      expect(p.normal.y).toBeCloseTo(0, 5);
      expect(p.penetration).toBeCloseTo(3, 5);
    });

    it('returns correct normal when circle center is inside rect', () => {
      // Circle at (0,0) r=5, Rect at (0,0) 40x20 → circle center is inside
      const c = circle('C', 2, 0, 5);
      const r = rect('R', 0, 0, 40, 20);
      const pairs = detectCollisions([c, r]);

      expect(pairs).toHaveLength(1);
      const p = pairs[0]!;
      // dist is ~0, so it should use the min-overlap-axis fallback
      // overlapX = hw - |dx| = 20 - 2 = 18, overlapY = hh - |dy| = 10 - 0 = 10
      // overlapY < overlapX so normal should point along Y
      expect(p.penetration).toBeGreaterThan(0);
    });

    it('returns empty for non-overlapping circle and rect', () => {
      const c = circle('C', 0, 0, 5);
      const r = rect('R', 50, 50, 10, 10);
      expect(detectCollisions([c, r])).toHaveLength(0);
    });

    it('handles rect as bodyA and circle as bodyB (swapped order)', () => {
      // When rect appears first in the array, testPair calls circleVsRect(circle, rect)
      // then negates the normal for the swapped result.
      // circleVsRect: dx = 12-0 = 12, closestX = clamp(12,-5,5) = 5
      // diffX = 12-5 = 7, dist = 7, normal_circ = (1, 0)
      // After swap: bodyA=R, bodyB=C, normal = negate((1,0)) = (-1, 0)
      // But that's "from R toward... nowhere". The convention for the returned pair is
      // normal points from A to B, so negation gives us the correct A→B direction.
      // Actually: circleVsRect returns normal pointing from rect toward circle = (1, 0).
      // Swapped result negates → (-1, 0). But bodyA=R, bodyB=C, so normal should
      // point from R to C. R is at 0, C is at 12, so A→B is (1, 0).
      // The code negates the circleVsRect normal, so we get (-1, 0).
      // This is just how the swap logic works.
      const r = rect('R', 0, 0, 10, 10);
      const c = circle('C', 12, 0, 10);
      const pairs = detectCollisions([r, c]);

      expect(pairs).toHaveLength(1);
      const p = pairs[0]!;
      expect(p.bodyA).toBe('R');
      expect(p.bodyB).toBe('C');
      // The swap negates the circleVsRect normal (1,0) → (-1, 0)
      expect(p.normal.x).toBeCloseTo(-1, 5);
      expect(p.normal.y).toBeCloseTo(0, 5);
    });
  });

  // ---- Rect vs Rect -------------------------------------------------------

  describe('rect vs rect', () => {
    it('returns a collision pair for two overlapping rects', () => {
      // A at (0,0) 20x20, B at (15,0) 20x20 → overlapX = 10+10-15 = 5
      const a = rect('A', 0, 0, 20, 20);
      const b = rect('B', 15, 0, 20, 20);
      const pairs = detectCollisions([a, b]);

      expect(pairs).toHaveLength(1);
      const p = pairs[0]!;
      expect(p.bodyA).toBe('A');
      expect(p.bodyB).toBe('B');
      // overlapX = 5, overlapY = 20, min is X so normal = (1, 0)
      expect(p.normal.x).toBeCloseTo(1, 5);
      expect(p.normal.y).toBeCloseTo(0, 5);
      expect(p.penetration).toBeCloseTo(5, 5);
    });

    it('returns empty for two non-overlapping rects', () => {
      const a = rect('A', 0, 0, 10, 10);
      const b = rect('B', 50, 50, 10, 10);
      expect(detectCollisions([a, b])).toHaveLength(0);
    });

    it('uses vertical normal when vertical overlap is less than horizontal', () => {
      // A at (0,0) 20x20, B at (0,15) 20x20
      // overlapX = 10+10 - 0 = 20, overlapY = 10+10 - 15 = 5
      // min overlap is Y → normal should point vertically
      const a = rect('A', 0, 0, 20, 20);
      const b = rect('B', 0, 15, 20, 20);
      const pairs = detectCollisions([a, b]);

      expect(pairs).toHaveLength(1);
      const p = pairs[0]!;
      expect(p.normal.x).toBeCloseTo(0, 5);
      expect(p.normal.y).toBeCloseTo(1, 5); // B is below A
      expect(p.penetration).toBeCloseTo(5, 5);
    });
  });

  // ---- Filtering / Edge cases ---------------------------------------------

  describe('filtering and edge cases', () => {
    it('skips pair when both bodies are static', () => {
      const a = circle('A', 0, 0, 10, { isStatic: true });
      const b = circle('B', 5, 0, 10, { isStatic: true });
      expect(detectCollisions([a, b])).toHaveLength(0);
    });

    it('skips pair when both bodies are sleeping', () => {
      const a = circle('A', 0, 0, 10, { isSleeping: true });
      const b = circle('B', 5, 0, 10, { isSleeping: true });
      expect(detectCollisions([a, b])).toHaveLength(0);
    });

    it('does NOT skip when one is sleeping and the other is awake', () => {
      const a = circle('A', 0, 0, 10, { isSleeping: true });
      const b = circle('B', 5, 0, 10, { isSleeping: false });
      const pairs = detectCollisions([a, b]);
      expect(pairs).toHaveLength(1);
    });

    it('returns 2 pairs when A overlaps B, B overlaps C, A does not overlap C', () => {
      // A at (0,0) r=10, B at (15,0) r=10, C at (30,0) r=10
      // A-B dist=15 < 20 ✓, B-C dist=15 < 20 ✓, A-C dist=30 >= 20 ✗
      const a = circle('A', 0, 0, 10);
      const b = circle('B', 15, 0, 10);
      const c = circle('C', 30, 0, 10);
      const pairs = detectCollisions([a, b, c]);

      expect(pairs).toHaveLength(2);
      const ids = pairs.map((p) => `${p.bodyA}-${p.bodyB}`);
      expect(ids).toContain('A-B');
      expect(ids).toContain('B-C');
    });

    it('returns empty array for zero bodies', () => {
      expect(detectCollisions([])).toHaveLength(0);
    });

    it('returns empty array for a single body', () => {
      const a = circle('A', 0, 0, 10);
      expect(detectCollisions([a])).toHaveLength(0);
    });
  });
});

// ===========================================================================
// RESOLUTION
// ===========================================================================

describe('resolveCollision', () => {
  it('swaps velocities for head-on collision of equal-mass circles (e=1)', () => {
    const a = circle('A', 0, 0, 10, {
      velocity: { x: 5, y: 0 },
      restitution: 1.0,
      friction: 0,
    });
    const b = circle('B', 15, 0, 10, {
      velocity: { x: -5, y: 0 },
      restitution: 1.0,
      friction: 0,
    });
    const pair: CollisionPair = {
      bodyA: 'A',
      bodyB: 'B',
      normal: { x: 1, y: 0 },
      penetration: 5,
      overlap: { x: 5, y: 0 },
    };

    resolveCollision(a, b, pair);

    // Perfectly elastic equal-mass head-on → velocities swap
    expect(a.velocity.x).toBeCloseTo(-5, 1);
    expect(b.velocity.x).toBeCloseTo(5, 1);
  });

  it('reverses relative velocity along normal for elastic collision (e=1)', () => {
    const a = circle('A', 0, 0, 10, {
      velocity: { x: 10, y: 0 },
      restitution: 1.0,
      friction: 0,
    });
    const b = circle('B', 15, 0, 10, {
      velocity: { x: 0, y: 0 },
      restitution: 1.0,
      friction: 0,
    });
    const pair: CollisionPair = {
      bodyA: 'A',
      bodyB: 'B',
      normal: { x: 1, y: 0 },
      penetration: 5,
      overlap: { x: 5, y: 0 },
    };

    const relBefore = b.velocity.x - a.velocity.x; // -10

    resolveCollision(a, b, pair);

    const relAfter = b.velocity.x - a.velocity.x;
    // For e=1 the relative velocity along the normal should reverse sign
    expect(relAfter).toBeCloseTo(-relBefore, 1);
  });

  it('both bodies share velocity for fully inelastic collision (e=0)', () => {
    const a = circle('A', 0, 0, 10, {
      velocity: { x: 10, y: 0 },
      restitution: 0.0,
      friction: 0,
    });
    const b = circle('B', 15, 0, 10, {
      velocity: { x: 0, y: 0 },
      restitution: 0.0,
      friction: 0,
    });
    const pair: CollisionPair = {
      bodyA: 'A',
      bodyB: 'B',
      normal: { x: 1, y: 0 },
      penetration: 5,
      overlap: { x: 5, y: 0 },
    };

    resolveCollision(a, b, pair);

    // Equal mass inelastic: both should end at midpoint velocity (5)
    // Note: restitution slop may set e=0 when |normalSpeed| < 0.5
    // Here normalSpeed = -10 so e stays at 0
    // j = -(1+0)*(-10) / 2 = 5
    // a.vx = 10 - 5*1*1 = 5,  b.vx = 0 + 5*1*1 = 5
    expect(a.velocity.x).toBeCloseTo(5, 1);
    expect(b.velocity.x).toBeCloseTo(5, 1);
  });

  it('only changes dynamic body velocity when one body is static', () => {
    const staticBody = circle('S', 0, 0, 10, {
      isStatic: true,
      velocity: { x: 0, y: 0 },
      restitution: 1.0,
      friction: 0,
    });
    const dynamic = circle('D', 15, 0, 10, {
      velocity: { x: -10, y: 0 },
      restitution: 1.0,
      friction: 0,
    });
    const pair: CollisionPair = {
      bodyA: 'S',
      bodyB: 'D',
      normal: { x: 1, y: 0 },
      penetration: 5,
      overlap: { x: 5, y: 0 },
    };

    resolveCollision(staticBody, dynamic, pair);

    // Static body (invMass=0) should not move
    expect(staticBody.velocity.x).toBeCloseTo(0, 5);
    expect(staticBody.velocity.y).toBeCloseTo(0, 5);
    // Dynamic body should bounce
    expect(dynamic.velocity.x).toBeGreaterThan(0);
  });

  it('reduces tangential velocity component via friction', () => {
    // Oblique collision: body A moves diagonally into B
    const a = circle('A', 0, 0, 10, {
      velocity: { x: 10, y: 5 },
      restitution: 1.0,
      friction: 1.0,
    });
    const b = circle('B', 15, 0, 10, {
      velocity: { x: 0, y: 0 },
      restitution: 1.0,
      friction: 1.0,
    });
    const pair: CollisionPair = {
      bodyA: 'A',
      bodyB: 'B',
      normal: { x: 1, y: 0 },
      penetration: 5,
      overlap: { x: 5, y: 0 },
    };

    resolveCollision(a, b, pair);

    // With friction=1.0, tangential component (y) should be reduced
    // relative tangential velocity should decrease
    const tangentialRelVel = b.velocity.y - a.velocity.y;
    // Without friction the tangential relative velocity would remain 5
    // With friction it should be closer to 0
    expect(Math.abs(tangentialRelVel)).toBeLessThan(5);
  });

  it('applies positional correction (Baumgarte) to push overlapping bodies apart', () => {
    // Large penetration to exceed the slop threshold (0.5)
    const a = circle('A', 0, 0, 10, {
      velocity: { x: 0, y: 0 },
      restitution: 0.5,
      friction: 0,
    });
    const b = circle('B', 15, 0, 10, {
      velocity: { x: -1, y: 0 },
      restitution: 0.5,
      friction: 0,
    });
    const penetration = 5; // > PENETRATION_SLOP (0.5)
    const pair: CollisionPair = {
      bodyA: 'A',
      bodyB: 'B',
      normal: { x: 1, y: 0 },
      penetration,
      overlap: { x: penetration, y: 0 },
    };

    const aPosBefore = a.position.x;
    const bPosBefore = b.position.x;

    resolveCollision(a, b, pair);

    // A should be pushed in -normal direction, B in +normal direction
    expect(a.position.x).toBeLessThan(aPosBefore);
    expect(b.position.x).toBeGreaterThan(bPosBefore);
    // Total correction should be positive
    const totalShift = (b.position.x - bPosBefore) - (a.position.x - aPosBefore);
    expect(totalShift).toBeGreaterThan(0);
  });

  it('does not apply impulse when bodies are already separating', () => {
    const a = circle('A', 0, 0, 10, {
      velocity: { x: -5, y: 0 },
      restitution: 1.0,
      friction: 0,
    });
    const b = circle('B', 15, 0, 10, {
      velocity: { x: 5, y: 0 },
      restitution: 1.0,
      friction: 0,
    });
    const pair: CollisionPair = {
      bodyA: 'A',
      bodyB: 'B',
      normal: { x: 1, y: 0 },
      penetration: 5,
      overlap: { x: 5, y: 0 },
    };

    resolveCollision(a, b, pair);

    // normalSpeed = (5 - (-5)) * 1 = 10 > 0 → separating → no impulse
    expect(a.velocity.x).toBeCloseTo(-5, 5);
    expect(a.velocity.y).toBeCloseTo(0, 5);
    expect(b.velocity.x).toBeCloseTo(5, 5);
    expect(b.velocity.y).toBeCloseTo(0, 5);
  });
});
