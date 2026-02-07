/**
 * GsapAdapter — bridges physics engine state with GSAP animation timelines.
 *
 * This adapter allows physics-driven motion to be blended with or handed off
 * to GSAP tweens, enabling smooth transitions between procedural physics and
 * authored keyframe animations.
 *
 * GSAP is an optional peer dependency — this module should only be imported
 * when GSAP is available.
 */

/** Minimal type for gsap.core.Tween so we don't require gsap at compile time. */
interface GsapTween {
  kill(): void;
  progress(value?: number): number;
}

/** Options for a GSAP body animation. */
export interface GsapAnimateOptions {
  duration?: number;
  ease?: string;
  onComplete?: () => void;
}

/**
 * GsapAdapter — stub implementation.
 *
 * TODO: Implement actual GSAP integration once the physics-to-keyframe
 * handoff protocol is designed.
 */
export class GsapAdapter {
  /**
   * Animate a physics body from one position/state to another using GSAP.
   *
   * TODO: Implement — currently returns null.
   *
   * @param bodyId - ID of the physics body to animate.
   * @param from   - Starting property values.
   * @param to     - Ending property values.
   * @param options - GSAP tween options.
   * @returns A GSAP Tween instance, or null if GSAP is not available.
   */
  animateBody(
    bodyId: string,
    from: Record<string, number>,
    to: Record<string, number>,
    options?: GsapAnimateOptions,
  ): GsapTween | null {
    // TODO: integrate with gsap.fromTo() and sync back to PhysicsEngine
    void bodyId;
    void from;
    void to;
    void options;
    return null;
  }
}
