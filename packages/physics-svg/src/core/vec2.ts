import type { Vec2 } from '@mcp-tool-shop/siege-types';

// ---------------------------------------------------------------------------
// Vec2 Math Utilities
// ---------------------------------------------------------------------------
// Functional style — all functions return new objects (no mutation).
// For hot-path mutation, use the *Mut variants.
// ---------------------------------------------------------------------------

/** Create a new Vec2. */
export function vec2(x = 0, y = 0): Vec2 {
  return { x, y };
}

/** Return a zero vector. */
export function zero(): Vec2 {
  return { x: 0, y: 0 };
}

// ---- Arithmetic (immutable) ------------------------------------------------

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function negate(v: Vec2): Vec2 {
  return { x: -v.x, y: -v.y };
}

// ---- Arithmetic (mutating — hot path) --------------------------------------

/** out = a + b */
export function addMut(out: Vec2, a: Vec2, b: Vec2): Vec2 {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  return out;
}

/** out = a - b */
export function subMut(out: Vec2, a: Vec2, b: Vec2): Vec2 {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  return out;
}

/** out = v * s */
export function scaleMut(out: Vec2, v: Vec2, s: number): Vec2 {
  out.x = v.x * s;
  out.y = v.y * s;
  return out;
}

/** v += delta (in-place) */
export function addTo(v: Vec2, delta: Vec2): Vec2 {
  v.x += delta.x;
  v.y += delta.y;
  return v;
}

/** v -= delta (in-place) */
export function subFrom(v: Vec2, delta: Vec2): Vec2 {
  v.x -= delta.x;
  v.y -= delta.y;
  return v;
}

/** v *= s (in-place) */
export function scaleBy(v: Vec2, s: number): Vec2 {
  v.x *= s;
  v.y *= s;
  return v;
}

// ---- Products --------------------------------------------------------------

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** 2D cross product (scalar): a × b = ax*by - ay*bx */
export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

/** Cross product of scalar × vec2: returns perpendicular vector. */
export function crossSV(s: number, v: Vec2): Vec2 {
  return { x: -s * v.y, y: s * v.x };
}

/** Cross product of vec2 × scalar: returns perpendicular vector. */
export function crossVS(v: Vec2, s: number): Vec2 {
  return { x: s * v.y, y: -s * v.x };
}

// ---- Length / Distance -----------------------------------------------------

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function distanceSq(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt(distanceSq(a, b));
}

// ---- Normalization ---------------------------------------------------------

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Normalize in-place. */
export function normalizeMut(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-10) {
    v.x = 0;
    v.y = 0;
  } else {
    v.x /= len;
    v.y /= len;
  }
  return v;
}

// ---- Perpendicular ---------------------------------------------------------

/** Return the left-hand perpendicular (-y, x). */
export function perpL(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

/** Return the right-hand perpendicular (y, -x). */
export function perpR(v: Vec2): Vec2 {
  return { x: v.y, y: -v.x };
}

// ---- Interpolation ---------------------------------------------------------

/** Linear interpolation between a and b at parameter t ∈ [0, 1]. */
export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// ---- Clamping --------------------------------------------------------------

/** Clamp vector length to maxLen. */
export function clampLength(v: Vec2, maxLen: number): Vec2 {
  const lenSq = lengthSq(v);
  if (lenSq > maxLen * maxLen) {
    const len = Math.sqrt(lenSq);
    return { x: (v.x / len) * maxLen, y: (v.y / len) * maxLen };
  }
  return { x: v.x, y: v.y };
}

// ---- Projection / Reflection -----------------------------------------------

/** Project a onto b. */
export function project(a: Vec2, b: Vec2): Vec2 {
  const d = dot(b, b);
  if (d < 1e-10) return { x: 0, y: 0 };
  const s = dot(a, b) / d;
  return { x: b.x * s, y: b.y * s };
}

/** Reflect v off a surface with the given normal. */
export function reflect(v: Vec2, normal: Vec2): Vec2 {
  const d = 2 * dot(v, normal);
  return { x: v.x - d * normal.x, y: v.y - d * normal.y };
}

// ---- Utility ---------------------------------------------------------------

/** Copy src into dst. */
export function copy(dst: Vec2, src: Vec2): Vec2 {
  dst.x = src.x;
  dst.y = src.y;
  return dst;
}

/** Clone a vector. */
export function clone(v: Vec2): Vec2 {
  return { x: v.x, y: v.y };
}

/** Check if two vectors are approximately equal. */
export function approxEqual(a: Vec2, b: Vec2, epsilon = 1e-6): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

/** Rotate a vector by angle (radians). */
export function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}
