import type { PhysicsBody, Constraint, Vec2 } from '@mcp-tool-shop/siege-types';
import type { Renderer } from './renderer.js';
import * as V from '../core/vec2.js';

/**
 * SvgRenderer — renders physics bodies as SVG elements.
 *
 * Each body is mapped to an SVG primitive and positioned via the `transform`
 * attribute. Supports render interpolation for smooth display between physics steps.
 */
export class SvgRenderer implements Renderer {
  private svg: SVGSVGElement | null = null;
  private elementMap: Map<string, SVGElement> = new Map();
  private constraintMap: Map<string, SVGLineElement> = new Map();

  /** Interpolation alpha (0 = previous state, 1 = current state). */
  alpha = 1;

  init(container: HTMLElement): void {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.overflow = 'visible';
    container.appendChild(this.svg);
  }

  render(bodies: PhysicsBody[], constraints: Constraint[]): void {
    if (!this.svg) return;

    this.renderConstraints(constraints, bodies);
    this.renderBodies(bodies);
  }

  destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.elementMap.clear();
    this.constraintMap.clear();
  }

  // ---- Body Rendering ------------------------------------------------------

  private renderBodies(bodies: PhysicsBody[]): void {
    const activeIds = new Set<string>();

    for (const body of bodies) {
      activeIds.add(body.id);
      let el = this.elementMap.get(body.id);

      if (!el) {
        el = this.createElement(body);
        this.elementMap.set(body.id, el);
        this.svg!.appendChild(el);
      }

      // Interpolated position for smooth rendering
      const pos = this.interpolate(body);

      el.setAttribute(
        'transform',
        `translate(${pos.x}, ${pos.y})`,
      );

      // Dim sleeping bodies
      el.setAttribute('opacity', body.isSleeping ? '0.5' : '1');
    }

    // Remove elements for deleted bodies
    for (const [id, el] of this.elementMap) {
      if (!activeIds.has(id)) {
        el.remove();
        this.elementMap.delete(id);
      }
    }
  }

  /** Interpolate between previous and current position. */
  private interpolate(body: PhysicsBody): Vec2 {
    if (this.alpha >= 1) return body.position;
    return V.lerp(body.previousPosition, body.position, this.alpha);
  }

  /** Create the appropriate SVG element for a body's shape. */
  private createElement(body: PhysicsBody): SVGElement {
    const ns = 'http://www.w3.org/2000/svg';

    switch (body.shape.type) {
      case 'circle': {
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('r', String(body.shape.radius));
        circle.setAttribute('fill', '#6366f1');
        return circle;
      }
      case 'rect': {
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('width', String(body.shape.width));
        rect.setAttribute('height', String(body.shape.height));
        rect.setAttribute('x', String(-body.shape.width / 2));
        rect.setAttribute('y', String(-body.shape.height / 2));
        rect.setAttribute('fill', '#6366f1');
        return rect;
      }
      case 'polygon': {
        const polygon = document.createElementNS(ns, 'polygon');
        const points = body.shape.vertices
          .map((v) => `${v.x},${v.y}`)
          .join(' ');
        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', '#6366f1');
        return polygon;
      }
    }
  }

  // ---- Constraint Rendering ------------------------------------------------

  private renderConstraints(
    constraints: Constraint[],
    bodies: PhysicsBody[],
  ): void {
    const bodyMap = new Map(bodies.map((b) => [b.id, b]));
    const activeIds = new Set<string>();

    for (const constraint of constraints) {
      const bodyA = bodyMap.get(constraint.bodyA);
      const bodyB = bodyMap.get(constraint.bodyB);
      if (!bodyA || !bodyB) continue;

      activeIds.add(constraint.id);
      let line = this.constraintMap.get(constraint.id);

      if (!line) {
        line = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'line',
        );
        line.setAttribute('stroke', '#94a3b8');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4 2');
        this.constraintMap.set(constraint.id, line);
        // Insert constraints behind bodies
        this.svg!.insertBefore(line, this.svg!.firstChild);
      }

      const posA = this.interpolate(bodyA);
      const posB = this.interpolate(bodyB);
      const anchorA = V.add(posA, constraint.anchorA);
      const anchorB = V.add(posB, constraint.anchorB);

      line.setAttribute('x1', String(anchorA.x));
      line.setAttribute('y1', String(anchorA.y));
      line.setAttribute('x2', String(anchorB.x));
      line.setAttribute('y2', String(anchorB.y));
    }

    // Remove lines for deleted constraints
    for (const [id, line] of this.constraintMap) {
      if (!activeIds.has(id)) {
        line.remove();
        this.constraintMap.delete(id);
      }
    }
  }
}
