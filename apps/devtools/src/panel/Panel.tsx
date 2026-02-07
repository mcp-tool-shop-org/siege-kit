import { useState } from 'react';
import type { AnimationTimeline } from '@mcp-tool-shop/siege-types';

// TODO -- connect to background port for real animation data

export function Panel() {
  const [animations, setAnimations] = useState<AnimationTimeline[]>([]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '12px' }}>
      <header>
        <h1 style={{ fontSize: '16px', margin: '0 0 8px' }}>
          Animation DevTools
        </h1>
        <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
          {animations.length === 0
            ? 'No animations detected'
            : `${animations.length} animation${animations.length === 1 ? '' : 's'} tracked`}
        </p>
      </header>

      <section style={{ marginTop: '16px' }}>
        {/* TODO -- timeline visualization component */}
        {animations.map((anim) => (
          <div
            key={anim.id}
            style={{
              padding: '8px',
              borderBottom: '1px solid #333',
              fontSize: '12px',
            }}
          >
            <strong>{anim.descriptor.name ?? anim.id}</strong>
            <span style={{ marginLeft: '8px', color: '#aaa' }}>
              [{anim.descriptor.source}]
            </span>
            <span style={{ marginLeft: '8px' }}>{anim.state}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
