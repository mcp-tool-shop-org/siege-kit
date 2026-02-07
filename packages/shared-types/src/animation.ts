// Animation types shared between physics-svg engine and devtools

export type AnimationSource =
  | 'web-animations'
  | 'css-transition'
  | 'css-animation'
  | 'gsap'
  | 'physics-svg';

export interface AnimationDescriptor {
  id: string;
  name?: string;
  source: AnimationSource;
  targetSelector: string;
  targetElement?: string;
}

export type AnimationState = 'idle' | 'running' | 'paused' | 'finished';

export interface KeyframeSnapshot {
  offset: number; // 0-1
  properties: Record<string, string | number>;
  easing: string;
}

export interface AnimationTimeline {
  id: string;
  descriptor: AnimationDescriptor;
  duration: number; // ms, Infinity for physics
  currentTime: number;
  playbackRate: number;
  state: AnimationState;
  startTime: number;
  keyframes: KeyframeSnapshot[];
}

export type AnimationEventType =
  | 'animation:created'
  | 'animation:started'
  | 'animation:paused'
  | 'animation:resumed'
  | 'animation:finished'
  | 'animation:cancelled'
  | 'animation:updated';

export interface AnimationEvent {
  type: AnimationEventType;
  timestamp: number;
  animation: AnimationTimeline;
}

export interface AnimationPerformance {
  animationId: string;
  fps: number;
  frameDuration: number; // avg ms
  droppedFrames: number;
  jank: number; // cumulative layout shift
}
