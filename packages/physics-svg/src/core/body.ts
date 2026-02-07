import type { PhysicsBody, BodyShape, Vec2 } from '@mcp-tool-shop/siege-types';

/** Default zero-vector helper. */
const ZERO: Vec2 = { x: 0, y: 0 };

/** Default circle shape. */
const DEFAULT_SHAPE: BodyShape = { type: 'circle', radius: 10 };

/**
 * Factory that creates a fully-populated {@link PhysicsBody} from a partial
 * configuration. Any omitted fields receive sensible defaults.
 *
 * A unique `id` is generated via `crypto.randomUUID()` unless one is provided.
 */
export function createBody(
  partial: Partial<PhysicsBody> = {},
): PhysicsBody {
  return {
    id: partial.id ?? crypto.randomUUID(),
    position: partial.position ?? { ...ZERO },
    velocity: partial.velocity ?? { ...ZERO },
    acceleration: partial.acceleration ?? { ...ZERO },
    mass: partial.mass ?? 1,
    restitution: partial.restitution ?? 0.5,
    friction: partial.friction ?? 0.3,
    isStatic: partial.isStatic ?? false,
    shape: partial.shape ?? { ...DEFAULT_SHAPE },
    userData: partial.userData,
  };
}
