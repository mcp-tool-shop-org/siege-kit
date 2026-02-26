import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Siege Kit',
  description: 'Physics-first board game toolkit — deterministic 2D engine, SVG rendering, and a complete strategy game in a Turborepo monorepo.',
  logoBadge: 'SK',
  brandName: 'Siege Kit',
  repoUrl: 'https://github.com/mcp-tool-shop-org/siege-kit',
  footerText: 'MIT Licensed — built by <a href="https://github.com/mcp-tool-shop-org" style="color:var(--color-muted);text-decoration:underline">mcp-tool-shop-org</a>',

  hero: {
    badge: 'Open source',
    headline: 'Physics meets',
    headlineAccent: 'board games.',
    description: 'A deterministic 2D physics engine with SVG rendering, a strategy board game that inverts backgammon, and a Chrome DevTools extension — all in one Turborepo monorepo.',
    primaryCta: { href: '#packages', label: 'Explore packages' },
    secondaryCta: { href: '#game', label: 'About the game' },
    previews: [
      { label: 'Clone', code: 'git clone https://github.com/mcp-tool-shop-org/siege-kit.git' },
      { label: 'Install', code: 'pnpm install' },
      { label: 'Dev', code: 'pnpm dev' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'Core Capabilities',
      subtitle: 'Everything you need for physics-driven game development.',
      features: [
        { title: 'Deterministic Physics', desc: 'Semi-implicit Euler integration at fixed 60 Hz — the same approach as Box2D and Rapier. Reproducible simulations across platforms.' },
        { title: 'SVG + Canvas Rendering', desc: 'Imperative SVG transforms for zero React re-renders. Canvas fallback kicks in automatically above 200 bodies.' },
        { title: 'Full Collision Stack', desc: 'Circle, AABB, and SAT narrow-phase detection with impulse-based resolution and a projected Gauss-Seidel constraint solver.' },
      ],
    },
    {
      kind: 'features',
      id: 'game',
      title: 'SiegeGammon',
      subtitle: 'A strategy board game that flips backgammon on its head.',
      features: [
        { title: 'Deploy, Advance, Lock', desc: 'Start from an empty board. Deploy checkers from reserve, advance them forward, and lock them into the Siege Zone to win.' },
        { title: 'Spatial Inversion', desc: 'Your Garrison overlaps the opponent\'s Siege Zone, keeping contact and tension high from the first move to the last.' },
        { title: 'Doubling Cube', desc: 'Standard backgammon doubling with Siege (2x) and Total Siege (3x) multipliers for high-stakes games.' },
      ],
    },
    {
      kind: 'data-table',
      id: 'packages',
      title: 'Packages',
      subtitle: 'The monorepo at a glance.',
      columns: ['Package', 'Description', 'Status'],
      rows: [
        ['@mcptoolshop/physics-svg', 'Deterministic 2D physics engine with SVG and Canvas renderers', 'Published'],
        ['@mcp-tool-shop/siege-types', 'Shared TypeScript types for physics, game, and animation', 'Internal'],
        ['SiegeGammon', 'Inverse-backgammon strategy game (React + GSAP)', 'Private app'],
        ['Anim DevTools', 'Chrome extension for inspecting physics and animations', 'Private app'],
      ],
    },
    {
      kind: 'code-cards',
      id: 'quickstart',
      title: 'Quick Start',
      cards: [
        { title: 'Clone & install', code: 'git clone https://github.com/mcp-tool-shop-org/siege-kit.git\ncd siege-kit\npnpm install' },
        { title: 'Run dev server', code: 'pnpm dev\n\n# Individual packages:\npnpm --filter siegegammon dev\npnpm --filter physics-svg dev' },
      ],
    },
  ],
};
