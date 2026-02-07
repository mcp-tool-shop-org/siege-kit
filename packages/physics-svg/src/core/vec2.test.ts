import { describe, it, expect } from 'vitest';
import * as V from './vec2.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand to assert {x, y} within floating-point tolerance. */
function expectVec(v: { x: number; y: number }, ex: number, ey: number, digits = 10) {
  expect(v.x).toBeCloseTo(ex, digits);
  expect(v.y).toBeCloseTo(ey, digits);
}

// ---------------------------------------------------------------------------
// vec2 / zero — construction
// ---------------------------------------------------------------------------

describe('vec2()', () => {
  it('creates (0, 0) with no arguments', () => {
    expectVec(V.vec2(), 0, 0);
  });

  it('creates a vector with given x and y', () => {
    expectVec(V.vec2(3, -7), 3, -7);
  });

  it('defaults y to 0 when only x is given', () => {
    expectVec(V.vec2(5), 5, 0);
  });

  it('handles negative values', () => {
    expectVec(V.vec2(-99, -0.001), -99, -0.001);
  });
});

describe('zero()', () => {
  it('returns (0, 0)', () => {
    expectVec(V.zero(), 0, 0);
  });

  it('returns a new object each call', () => {
    const a = V.zero();
    const b = V.zero();
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Immutable arithmetic
// ---------------------------------------------------------------------------

describe('add()', () => {
  it('adds two vectors', () => {
    expectVec(V.add({ x: 1, y: 2 }, { x: 3, y: 4 }), 4, 6);
  });

  it('handles negative components', () => {
    expectVec(V.add({ x: -5, y: 3 }, { x: 2, y: -8 }), -3, -5);
  });

  it('identity: a + zero = a', () => {
    const a = { x: 7, y: -3 };
    expectVec(V.add(a, V.zero()), 7, -3);
  });

  it('does NOT mutate inputs', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 3, y: 4 };
    V.add(a, b);
    expect(a).toEqual({ x: 1, y: 2 });
    expect(b).toEqual({ x: 3, y: 4 });
  });
});

describe('sub()', () => {
  it('subtracts two vectors', () => {
    expectVec(V.sub({ x: 5, y: 7 }, { x: 2, y: 3 }), 3, 4);
  });

  it('a - a = zero', () => {
    const a = { x: 42, y: -13 };
    expectVec(V.sub(a, a), 0, 0);
  });

  it('does NOT mutate inputs', () => {
    const a = { x: 5, y: 7 };
    const b = { x: 2, y: 3 };
    V.sub(a, b);
    expect(a).toEqual({ x: 5, y: 7 });
    expect(b).toEqual({ x: 2, y: 3 });
  });
});

describe('scale()', () => {
  it('scales a vector by a scalar', () => {
    expectVec(V.scale({ x: 3, y: -2 }, 4), 12, -8);
  });

  it('scaling by 0 gives zero vector', () => {
    expectVec(V.scale({ x: 100, y: -50 }, 0), 0, 0);
  });

  it('scaling by 1 is identity', () => {
    expectVec(V.scale({ x: 7, y: 3 }, 1), 7, 3);
  });

  it('scaling by -1 negates', () => {
    expectVec(V.scale({ x: 2, y: -5 }, -1), -2, 5);
  });

  it('does NOT mutate input', () => {
    const v = { x: 3, y: -2 };
    V.scale(v, 10);
    expect(v).toEqual({ x: 3, y: -2 });
  });
});

describe('negate()', () => {
  it('negates both components', () => {
    expectVec(V.negate({ x: 3, y: -7 }), -3, 7);
  });

  it('double negate returns original values', () => {
    expectVec(V.negate(V.negate({ x: 11, y: -4 })), 11, -4);
  });

  it('negating zero is zero', () => {
    expectVec(V.negate(V.zero()), 0, 0);
  });

  it('does NOT mutate input', () => {
    const v = { x: 3, y: -7 };
    V.negate(v);
    expect(v).toEqual({ x: 3, y: -7 });
  });
});

// ---------------------------------------------------------------------------
// Mutating arithmetic (out = ...)
// ---------------------------------------------------------------------------

describe('addMut()', () => {
  it('writes a + b into out', () => {
    const out = { x: 0, y: 0 };
    V.addMut(out, { x: 1, y: 2 }, { x: 3, y: 4 });
    expectVec(out, 4, 6);
  });

  it('returns the out reference', () => {
    const out = { x: 0, y: 0 };
    const ret = V.addMut(out, { x: 1, y: 1 }, { x: 2, y: 2 });
    expect(ret).toBe(out);
  });

  it('can use the same object for out and a', () => {
    const v = { x: 5, y: 3 };
    V.addMut(v, v, { x: 1, y: 1 });
    expectVec(v, 6, 4);
  });
});

describe('subMut()', () => {
  it('writes a - b into out', () => {
    const out = { x: 0, y: 0 };
    V.subMut(out, { x: 10, y: 5 }, { x: 3, y: 8 });
    expectVec(out, 7, -3);
  });

  it('returns the out reference', () => {
    const out = { x: 0, y: 0 };
    const ret = V.subMut(out, { x: 1, y: 1 }, { x: 1, y: 1 });
    expect(ret).toBe(out);
  });
});

describe('scaleMut()', () => {
  it('writes v * s into out', () => {
    const out = { x: 0, y: 0 };
    V.scaleMut(out, { x: 3, y: -4 }, 2);
    expectVec(out, 6, -8);
  });

  it('returns the out reference', () => {
    const out = { x: 0, y: 0 };
    const ret = V.scaleMut(out, { x: 1, y: 1 }, 5);
    expect(ret).toBe(out);
  });

  it('scaling by 0 zeroes out', () => {
    const out = { x: 99, y: 99 };
    V.scaleMut(out, { x: 100, y: 200 }, 0);
    expectVec(out, 0, 0);
  });
});

// ---------------------------------------------------------------------------
// In-place mutation (v += / v -= / v *= )
// ---------------------------------------------------------------------------

describe('addTo()', () => {
  it('adds delta to v in-place', () => {
    const v = { x: 1, y: 2 };
    V.addTo(v, { x: 10, y: 20 });
    expectVec(v, 11, 22);
  });

  it('returns the same reference', () => {
    const v = { x: 0, y: 0 };
    expect(V.addTo(v, { x: 1, y: 1 })).toBe(v);
  });

  it('adding zero is identity', () => {
    const v = { x: 5, y: -3 };
    V.addTo(v, V.zero());
    expectVec(v, 5, -3);
  });
});

describe('subFrom()', () => {
  it('subtracts delta from v in-place', () => {
    const v = { x: 10, y: 20 };
    V.subFrom(v, { x: 3, y: 7 });
    expectVec(v, 7, 13);
  });

  it('returns the same reference', () => {
    const v = { x: 0, y: 0 };
    expect(V.subFrom(v, { x: 1, y: 1 })).toBe(v);
  });
});

describe('scaleBy()', () => {
  it('scales v in-place', () => {
    const v = { x: 4, y: -3 };
    V.scaleBy(v, 5);
    expectVec(v, 20, -15);
  });

  it('returns the same reference', () => {
    const v = { x: 1, y: 1 };
    expect(V.scaleBy(v, 2)).toBe(v);
  });

  it('scaling by 0 zeroes v', () => {
    const v = { x: 999, y: -999 };
    V.scaleBy(v, 0);
    expectVec(v, 0, 0);
  });
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

describe('dot()', () => {
  it('computes dot product', () => {
    expect(V.dot({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
  });

  it('dot of perpendicular vectors is 0', () => {
    expect(V.dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
  });

  it('dot of parallel vectors equals product of lengths', () => {
    expect(V.dot({ x: 3, y: 0 }, { x: 5, y: 0 })).toBe(15);
  });

  it('dot with zero vector is 0', () => {
    expect(V.dot({ x: 42, y: -7 }, V.zero())).toBe(0);
  });

  it('dot of opposite-direction vectors is negative', () => {
    expect(V.dot({ x: 1, y: 0 }, { x: -1, y: 0 })).toBe(-1);
  });
});

describe('cross()', () => {
  it('computes 2D cross product (scalar)', () => {
    // (1)(4) - (2)(3) = -2
    expect(V.cross({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(-2);
  });

  it('parallel vectors have zero cross product', () => {
    expect(V.cross({ x: 2, y: 4 }, { x: 1, y: 2 })).toBe(0);
  });

  it('perpendicular unit vectors have cross = +/-1', () => {
    expect(V.cross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1);
    expect(V.cross({ x: 0, y: 1 }, { x: 1, y: 0 })).toBe(-1);
  });
});

describe('crossSV()', () => {
  it('returns (-s*v.y, s*v.x)', () => {
    // s=2, v=(3,4) -> (-8, 6)
    expectVec(V.crossSV(2, { x: 3, y: 4 }), -8, 6);
  });

  it('with s=0 returns zero', () => {
    expectVec(V.crossSV(0, { x: 5, y: 5 }), 0, 0);
  });

  it('with negative scalar', () => {
    // s=-3, v=(1,2) -> (6, -3)
    expectVec(V.crossSV(-3, { x: 1, y: 2 }), 6, -3);
  });
});

describe('crossVS()', () => {
  it('returns (s*v.y, -s*v.x)', () => {
    // s=2, v=(3,4) -> (8, -6)
    expectVec(V.crossVS({ x: 3, y: 4 }, 2), 8, -6);
  });

  it('with s=0 returns zero', () => {
    expectVec(V.crossVS({ x: 5, y: 5 }, 0), 0, 0);
  });

  it('crossSV and crossVS are negatives of each other', () => {
    const sv = V.crossSV(3, { x: 2, y: 5 });
    const vs = V.crossVS({ x: 2, y: 5 }, 3);
    expectVec(sv, -vs.x, -vs.y);
  });
});

// ---------------------------------------------------------------------------
// Length / Distance
// ---------------------------------------------------------------------------

describe('lengthSq()', () => {
  it('computes squared length', () => {
    expect(V.lengthSq({ x: 3, y: 4 })).toBe(25);
  });

  it('zero vector has lengthSq 0', () => {
    expect(V.lengthSq(V.zero())).toBe(0);
  });

  it('unit axis vector has lengthSq 1', () => {
    expect(V.lengthSq({ x: 1, y: 0 })).toBe(1);
  });
});

describe('length()', () => {
  it('computes Euclidean length', () => {
    expect(V.length({ x: 3, y: 4 })).toBe(5);
  });

  it('zero vector has length 0', () => {
    expect(V.length(V.zero())).toBe(0);
  });

  it('unit vector has length 1', () => {
    expect(V.length({ x: 0, y: 1 })).toBe(1);
  });

  it('handles negative components', () => {
    expect(V.length({ x: -3, y: -4 })).toBe(5);
  });
});

describe('distanceSq()', () => {
  it('computes squared distance between two points', () => {
    expect(V.distanceSq({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });

  it('distance to self is 0', () => {
    const p = { x: 7, y: -3 };
    expect(V.distanceSq(p, p)).toBe(0);
  });

  it('is symmetric', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 4, y: 6 };
    expect(V.distanceSq(a, b)).toBe(V.distanceSq(b, a));
  });
});

describe('distance()', () => {
  it('computes Euclidean distance', () => {
    expect(V.distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('distance to self is 0', () => {
    expect(V.distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('distance between (1,0) and (0,1) is sqrt(2)', () => {
    expect(V.distance({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.SQRT2, 10);
  });
});

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

describe('normalize()', () => {
  it('normalizes a vector to unit length', () => {
    const n = V.normalize({ x: 3, y: 4 });
    expect(V.length(n)).toBeCloseTo(1, 10);
    expectVec(n, 3 / 5, 4 / 5);
  });

  it('normalizing a unit vector returns unit vector', () => {
    const n = V.normalize({ x: 1, y: 0 });
    expectVec(n, 1, 0);
  });

  it('returns zero for zero vector', () => {
    expectVec(V.normalize(V.zero()), 0, 0);
  });

  it('returns zero for near-zero vector (< 1e-10)', () => {
    expectVec(V.normalize({ x: 1e-12, y: 1e-12 }), 0, 0);
  });

  it('normalizes vector just above threshold', () => {
    // sqrt(2) * 1e-5 ~ 1.41e-5 >> 1e-10, should normalize fine
    const n = V.normalize({ x: 1e-5, y: 1e-5 });
    expect(V.length(n)).toBeCloseTo(1, 5);
  });

  it('does NOT mutate input', () => {
    const v = { x: 3, y: 4 };
    V.normalize(v);
    expect(v).toEqual({ x: 3, y: 4 });
  });
});

describe('normalizeMut()', () => {
  it('normalizes in-place', () => {
    const v = { x: 0, y: 5 };
    V.normalizeMut(v);
    expectVec(v, 0, 1);
  });

  it('returns the same reference', () => {
    const v = { x: 3, y: 4 };
    expect(V.normalizeMut(v)).toBe(v);
  });

  it('zeroes out a near-zero vector in-place', () => {
    const v = { x: 1e-12, y: 0 };
    V.normalizeMut(v);
    expectVec(v, 0, 0);
  });

  it('zeroes out the actual zero vector', () => {
    const v = { x: 0, y: 0 };
    V.normalizeMut(v);
    expectVec(v, 0, 0);
  });
});

// ---------------------------------------------------------------------------
// Perpendicular
// ---------------------------------------------------------------------------

describe('perpL()', () => {
  it('returns left perpendicular (-y, x)', () => {
    expectVec(V.perpL({ x: 3, y: 4 }), -4, 3);
  });

  it('perpL of (1, 0) is (0, 1)', () => {
    expectVec(V.perpL({ x: 1, y: 0 }), 0, 1);
  });

  it('perpL of zero is zero', () => {
    expectVec(V.perpL(V.zero()), 0, 0);
  });

  it('dot of v and perpL(v) is 0 (orthogonal)', () => {
    const v = { x: 7, y: -3 };
    expect(V.dot(v, V.perpL(v))).toBeCloseTo(0, 10);
  });

  it('does NOT mutate input', () => {
    const v = { x: 3, y: 4 };
    V.perpL(v);
    expect(v).toEqual({ x: 3, y: 4 });
  });
});

describe('perpR()', () => {
  it('returns right perpendicular (y, -x)', () => {
    expectVec(V.perpR({ x: 3, y: 4 }), 4, -3);
  });

  it('perpR of (1, 0) is (0, -1)', () => {
    expectVec(V.perpR({ x: 1, y: 0 }), 0, -1);
  });

  it('perpR of zero is zero', () => {
    expectVec(V.perpR(V.zero()), 0, 0);
  });

  it('dot of v and perpR(v) is 0 (orthogonal)', () => {
    const v = { x: -2, y: 9 };
    expect(V.dot(v, V.perpR(v))).toBeCloseTo(0, 10);
  });

  it('perpL and perpR are negatives of each other', () => {
    const v = { x: 5, y: -3 };
    const l = V.perpL(v);
    const r = V.perpR(v);
    expectVec(l, -r.x, -r.y);
  });
});

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

describe('lerp()', () => {
  it('t=0 returns a', () => {
    expectVec(V.lerp({ x: 1, y: 2 }, { x: 10, y: 20 }, 0), 1, 2);
  });

  it('t=1 returns b', () => {
    expectVec(V.lerp({ x: 1, y: 2 }, { x: 10, y: 20 }, 1), 10, 20);
  });

  it('t=0.5 returns midpoint', () => {
    expectVec(V.lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5), 5, 10);
  });

  it('handles negative t (extrapolation)', () => {
    expectVec(V.lerp({ x: 0, y: 0 }, { x: 10, y: 0 }, -1), -10, 0);
  });

  it('handles t > 1 (extrapolation)', () => {
    expectVec(V.lerp({ x: 0, y: 0 }, { x: 10, y: 0 }, 2), 20, 0);
  });

  it('does NOT mutate inputs', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 10, y: 20 };
    V.lerp(a, b, 0.5);
    expect(a).toEqual({ x: 1, y: 2 });
    expect(b).toEqual({ x: 10, y: 20 });
  });
});

// ---------------------------------------------------------------------------
// Clamping
// ---------------------------------------------------------------------------

describe('clampLength()', () => {
  it('does not change a vector shorter than maxLen', () => {
    const v = { x: 3, y: 4 }; // length = 5
    expectVec(V.clampLength(v, 10), 3, 4);
  });

  it('clamps a vector longer than maxLen', () => {
    const v = { x: 6, y: 8 }; // length = 10
    const c = V.clampLength(v, 5);
    expect(V.length(c)).toBeCloseTo(5, 10);
    // direction preserved: (6/10*5, 8/10*5) = (3, 4)
    expectVec(c, 3, 4);
  });

  it('clamps to exactly maxLen when equal', () => {
    const v = { x: 3, y: 4 }; // length = 5
    const c = V.clampLength(v, 5);
    expect(V.length(c)).toBeCloseTo(5, 10);
  });

  it('zero vector stays zero', () => {
    expectVec(V.clampLength(V.zero(), 5), 0, 0);
  });

  it('does NOT mutate input', () => {
    const v = { x: 6, y: 8 };
    V.clampLength(v, 5);
    expect(v).toEqual({ x: 6, y: 8 });
  });
});

// ---------------------------------------------------------------------------
// Projection / Reflection
// ---------------------------------------------------------------------------

describe('project()', () => {
  it('projects a onto b', () => {
    // project (3,4) onto (1,0) -> (3,0)
    expectVec(V.project({ x: 3, y: 4 }, { x: 1, y: 0 }), 3, 0);
  });

  it('projects onto a non-unit vector', () => {
    // project (3,4) onto (2,0) -> (3,0)
    expectVec(V.project({ x: 3, y: 4 }, { x: 2, y: 0 }), 3, 0);
  });

  it('projecting onto zero returns zero', () => {
    expectVec(V.project({ x: 5, y: 5 }, V.zero()), 0, 0);
  });

  it('projecting onto near-zero returns zero', () => {
    expectVec(V.project({ x: 5, y: 5 }, { x: 1e-12, y: 0 }), 0, 0);
  });

  it('projecting a onto itself returns a (for non-zero a)', () => {
    const a = { x: 3, y: 4 };
    const p = V.project(a, a);
    expectVec(p, 3, 4, 8);
  });

  it('projection of perpendicular vectors is zero', () => {
    expectVec(V.project({ x: 0, y: 5 }, { x: 3, y: 0 }), 0, 0);
  });

  it('does NOT mutate inputs', () => {
    const a = { x: 3, y: 4 };
    const b = { x: 1, y: 0 };
    V.project(a, b);
    expect(a).toEqual({ x: 3, y: 4 });
    expect(b).toEqual({ x: 1, y: 0 });
  });
});

describe('reflect()', () => {
  it('reflects off a horizontal surface (normal up)', () => {
    // v = (1, -1) hitting floor with normal (0, 1) -> (1, 1)
    // reflect: v - 2*(v.n)*n = (1,-1) - 2*(-1)*(0,1) = (1,-1)+(0,2) = (1,1)
    expectVec(V.reflect({ x: 1, y: -1 }, { x: 0, y: 1 }), 1, 1);
  });

  it('reflects off a vertical surface (normal right)', () => {
    // v = (-1, 1), normal = (1, 0)
    // reflect: (-1,1) - 2*(-1)*(1,0) = (-1,1)+(2,0) = (1,1)
    expectVec(V.reflect({ x: -1, y: 1 }, { x: 1, y: 0 }), 1, 1);
  });

  it('head-on reflection reverses direction', () => {
    // v = (0, -5), normal = (0, 1)
    // reflect: (0,-5) - 2*(-5)*(0,1) = (0,-5)+(0,10) = (0,5)
    expectVec(V.reflect({ x: 0, y: -5 }, { x: 0, y: 1 }), 0, 5);
  });

  it('reflecting along surface leaves vector unchanged', () => {
    // v = (5, 0), normal = (0, 1) -> dot = 0 -> reflect = v
    expectVec(V.reflect({ x: 5, y: 0 }, { x: 0, y: 1 }), 5, 0);
  });

  it('does NOT mutate inputs', () => {
    const v = { x: 1, y: -1 };
    const n = { x: 0, y: 1 };
    V.reflect(v, n);
    expect(v).toEqual({ x: 1, y: -1 });
    expect(n).toEqual({ x: 0, y: 1 });
  });
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

describe('copy()', () => {
  it('copies src values into dst', () => {
    const dst = { x: 0, y: 0 };
    V.copy(dst, { x: 5, y: -3 });
    expectVec(dst, 5, -3);
  });

  it('returns the dst reference', () => {
    const dst = { x: 0, y: 0 };
    expect(V.copy(dst, { x: 1, y: 1 })).toBe(dst);
  });

  it('does NOT mutate src', () => {
    const src = { x: 5, y: -3 };
    V.copy({ x: 0, y: 0 }, src);
    expect(src).toEqual({ x: 5, y: -3 });
  });
});

describe('clone()', () => {
  it('creates a new object with same values', () => {
    const v = { x: 7, y: -2 };
    const c = V.clone(v);
    expectVec(c, 7, -2);
    expect(c).not.toBe(v);
  });

  it('modifying clone does not affect original', () => {
    const v = { x: 1, y: 2 };
    const c = V.clone(v);
    c.x = 99;
    expect(v.x).toBe(1);
  });
});

describe('approxEqual()', () => {
  it('returns true for identical vectors', () => {
    expect(V.approxEqual({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
  });

  it('returns true for vectors within default epsilon (1e-6)', () => {
    expect(V.approxEqual({ x: 1, y: 2 }, { x: 1 + 1e-7, y: 2 - 1e-7 })).toBe(true);
  });

  it('returns false for vectors outside default epsilon', () => {
    expect(V.approxEqual({ x: 1, y: 2 }, { x: 1.001, y: 2 })).toBe(false);
  });

  it('returns false when only x differs', () => {
    expect(V.approxEqual({ x: 0, y: 0 }, { x: 0.1, y: 0 })).toBe(false);
  });

  it('returns false when only y differs', () => {
    expect(V.approxEqual({ x: 0, y: 0 }, { x: 0, y: 0.1 })).toBe(false);
  });

  it('respects custom epsilon', () => {
    expect(V.approxEqual({ x: 1, y: 2 }, { x: 1.05, y: 2 }, 0.1)).toBe(true);
    expect(V.approxEqual({ x: 1, y: 2 }, { x: 1.2, y: 2 }, 0.1)).toBe(false);
  });

  it('zero vectors are approximately equal', () => {
    expect(V.approxEqual(V.zero(), V.zero())).toBe(true);
  });
});

describe('rotate()', () => {
  it('rotating by 0 is identity', () => {
    const v = { x: 3, y: 4 };
    const r = V.rotate(v, 0);
    expectVec(r, 3, 4, 10);
  });

  it('rotating (1, 0) by PI/2 gives (0, 1)', () => {
    const r = V.rotate({ x: 1, y: 0 }, Math.PI / 2);
    expectVec(r, 0, 1, 10);
  });

  it('rotating (1, 0) by PI gives (-1, 0)', () => {
    const r = V.rotate({ x: 1, y: 0 }, Math.PI);
    expectVec(r, -1, 0, 10);
  });

  it('rotating (1, 0) by -PI/2 gives (0, -1)', () => {
    const r = V.rotate({ x: 1, y: 0 }, -Math.PI / 2);
    expectVec(r, 0, -1, 10);
  });

  it('full rotation (2*PI) returns to original', () => {
    const v = { x: 3, y: 4 };
    const r = V.rotate(v, 2 * Math.PI);
    expectVec(r, 3, 4, 10);
  });

  it('preserves vector length', () => {
    const v = { x: 3, y: 4 };
    const r = V.rotate(v, 1.234);
    expect(V.length(r)).toBeCloseTo(V.length(v), 10);
  });

  it('rotating zero vector by any angle is zero', () => {
    expectVec(V.rotate(V.zero(), Math.PI / 3), 0, 0);
  });

  it('does NOT mutate input', () => {
    const v = { x: 1, y: 0 };
    V.rotate(v, Math.PI / 2);
    expect(v).toEqual({ x: 1, y: 0 });
  });
});
