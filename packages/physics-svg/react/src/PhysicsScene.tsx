import {
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import type { WorldConfig } from '@mcp-tool-shop/siege-types';
import { PhysicsEngine } from '../../src/core/engine.js';
import { SvgRenderer } from '../../src/rendering/svg-renderer.js';
import { PhysicsContext } from './context.js';

/** Props for the {@link PhysicsScene} component. */
export interface PhysicsSceneProps {
  /** World configuration for the physics engine. */
  config?: Partial<WorldConfig>;
  /** Width of the SVG viewport. */
  width?: number | string;
  /** Height of the SVG viewport. */
  height?: number | string;
  /** Child components (e.g. `<Body>`, `<Spring>`). */
  children?: ReactNode;
}

/** Default world config. */
const DEFAULT_CONFIG: WorldConfig = {
  gravity: { x: 0, y: 980 },
  substeps: 4,
  velocityIterations: 6,
};

/**
 * PhysicsScene — root React component that owns the physics engine and SVG
 * renderer.
 *
 * Provides the engine via React context so child components and hooks can
 * register bodies and constraints.
 *
 * Runs a `requestAnimationFrame` loop that steps the simulation and renders
 * each frame.
 */
export function PhysicsScene({
  config,
  width = '100%',
  height = '100%',
  children,
}: PhysicsSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mergedConfig: WorldConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const engine = useMemo(() => new PhysicsEngine(mergedConfig), [mergedConfig]);

  const rendererRef = useRef<SvgRenderer | null>(null);

  // Initialise renderer
  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new SvgRenderer();
    renderer.init(containerRef.current);
    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Animation loop
  useEffect(() => {
    let lastTime = performance.now();
    let rafId: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50 ms
      lastTime = now;

      engine.update(dt);

      if (rendererRef.current) {
        rendererRef.current.alpha = engine.alpha;
        rendererRef.current.render(
          engine.getBodies(),
          engine.getConstraints(),
        );
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [engine]);

  return (
    <PhysicsContext.Provider value={engine}>
      <div
        ref={containerRef}
        style={{ width, height, position: 'relative' }}
      >
        {/* SVG is created by SvgRenderer.init() */}
        {/* Children are declarative body/constraint definitions */}
        {children}
      </div>
    </PhysicsContext.Provider>
  );
}
