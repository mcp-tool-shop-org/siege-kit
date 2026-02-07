import type { Constraint, Vec2 } from '@mcp-tool-shop/siege-types';

/** Default zero-vector helper. */
const ZERO: Vec2 = { x: 0, y: 0 };

/**
 * Factory that creates a fully-populated {@link Constraint} from a partial
 * configuration. Any omitted fields receive sensible defaults.
 *
 * Defaults: stiffness = 0.5, damping = 0.1, type = 'spring'.
 */
export function createConstraint(
  partial: Partial<Constraint> & { bodyA: string; bodyB: string },
): Constraint {
  return {
    id: partial.id ?? crypto.randomUUID(),
    type: partial.type ?? 'spring',
    bodyA: partial.bodyA,
    bodyB: partial.bodyB,
    anchorA: partial.anchorA ?? { ...ZERO },
    anchorB: partial.anchorB ?? { ...ZERO },
    stiffness: partial.stiffness ?? 0.5,
    damping: partial.damping ?? 0.1,
    length: partial.length,
  };
}
