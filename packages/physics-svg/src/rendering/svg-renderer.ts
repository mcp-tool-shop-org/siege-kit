import type { PhysicsBody, Constraint } from '@mcp-tool-shop/siege-types';
import type { Renderer } from './renderer.js';

/**
 * SvgRenderer — renders physics bodies as SVG elements.
 *
 * Each body is mapped to an SVG primitive (`<circle>`, `<rect>`, or
 * `<polygon>`) and positioned via the `transform` attribute for
 * GPU-accelerated compositing.
 */
export class SvgRenderer implements Renderer {
  private svg: SVGSVGElement | null = null;
  private elementMap: Map<string, SVGElement> = new Map();

  init(container: HTMLElement): void {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.overflow = 'visible';
    container.appendChild(this.svg);
  }

  render(bodies: PhysicsBody[], constraints: Constraint[]): void {
    if (!this.svg) return;

    // TODO: render constraints as lines between anchor points
    void constraints;

    // Reconcile DOM elements with body list
    const activeIds = new Set<string>();

    for (const body of bodies) {
      activeIds.add(body.id);
      let el = this.elementMap.get(body.id);

      if (!el) {
        el = this.createElement(body);
        this.elementMap.set(body.id, el);
        this.svg.appendChild(el);
      }

      // Position via transform for GPU acceleration
      el.setAttribute(
        'transform',
        `translate(${body.position.x}, ${body.position.y})`,
      );
    }

    // Remove elements for bodies that no longer exist
    for (const [id, el] of this.elementMap) {
      if (!activeIds.has(id)) {
        el.remove();
        this.elementMap.delete(id);
      }
    }
  }

  destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.elementMap.clear();
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
        // Center the rect on its position
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
}
