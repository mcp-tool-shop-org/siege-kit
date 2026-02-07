import type { PhysicsBody, Constraint } from '@mcp-tool-shop/siege-types';
import type { Renderer } from './renderer.js';

/**
 * CanvasRenderer — fallback renderer using `<canvas>` for scenes with
 * high element counts where SVG DOM overhead becomes a bottleneck.
 *
 * TODO: Implement full canvas drawing pipeline.
 */
export class CanvasRenderer implements Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  init(container: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = container.clientWidth || 800;
    this.canvas.height = container.clientHeight || 600;
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
  }

  render(bodies: PhysicsBody[], constraints: Constraint[]): void {
    if (!this.ctx || !this.canvas) return;

    // TODO: render constraints as lines
    void constraints;

    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw each body
    for (const body of bodies) {
      this.ctx.save();
      this.ctx.translate(body.position.x, body.position.y);
      this.ctx.fillStyle = '#6366f1';

      switch (body.shape.type) {
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, body.shape.radius, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case 'rect':
          this.ctx.fillRect(
            -body.shape.width / 2,
            -body.shape.height / 2,
            body.shape.width,
            body.shape.height,
          );
          break;

        case 'polygon': {
          const verts = body.shape.vertices;
          if (verts.length < 2) break;
          this.ctx.beginPath();
          this.ctx.moveTo(verts[0]!.x, verts[0]!.y);
          for (let i = 1; i < verts.length; i++) {
            this.ctx.lineTo(verts[i]!.x, verts[i]!.y);
          }
          this.ctx.closePath();
          this.ctx.fill();
          break;
        }
      }

      this.ctx.restore();
    }
  }

  destroy(): void {
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }
}
