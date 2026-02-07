import type { PhysicsBody, Constraint } from '@mcp-tool-shop/siege-types';

/**
 * Renderer — abstraction over the visual output backend.
 *
 * Implementations translate physics state into visual elements
 * (SVG, Canvas, WebGL, etc.).
 */
export interface Renderer {
  /** Initialise the renderer inside the given DOM container. */
  init(container: HTMLElement): void;

  /** Render the current frame for the given bodies and constraints. */
  render(bodies: PhysicsBody[], constraints: Constraint[]): void;

  /** Tear down all DOM elements and release resources. */
  destroy(): void;
}
