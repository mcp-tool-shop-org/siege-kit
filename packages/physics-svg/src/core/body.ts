import type { PhysicsBody, BodyShape, Vec2 } from '@mcp-tool-shop/siege-types';

/** Default zero-vector helper. */
const ZERO: Vec2 = { x: 0, y: 0 };

/** Default circle shape. */
const DEFAULT_SHAPE: BodyShape = { type: 'circle', radius: 10 };

/**
 * Factory that creates a fully-populated {@link PhysicsBody} from a partial
 * configuration. Any omitted fields receive sensible defaults.
 *
 * - `invMass` is computed automatically from `mass` (0 for static bodies).
 * - `previousPosition` is initialized to match `position` (no interpolation delta).
 * - `isSleeping` defaults to false; `sleepTimer` starts at 0.
 */
export function createBody(
  partial: Partial<PhysicsBody> = {},
): PhysicsBody {
  const isStatic = partial.isStatic ?? false;
  const mass = isStatic ? 0 : (partial.mass ?? 1);
  const position = partial.position ?? { ...ZERO };

  return {
    id: partial.id ?? crypto.randomUUID(),
    position: { ...position },
    previousPosition: partial.previousPosition ?? { ...position },
    velocity: partial.velocity ?? { ...ZERO },
    acceleration: partial.acceleration ?? { ...ZERO },
    mass,
    invMass: mass > 0 ? 1 / mass : 0,
    restitution: partial.restitution ?? 0.5,
    friction: partial.friction ?? 0.3,
    isStatic,
    isSleeping: partial.isSleeping ?? false,
    sleepTimer: partial.sleepTimer ?? 0,
    shape: partial.shape ?? { ...DEFAULT_SHAPE },
    userData: partial.userData,
  };
}
