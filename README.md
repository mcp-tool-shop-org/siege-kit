<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/siege-kit/readme.png" alt="Siege Kit" width="400">
</p>

<p align="center">
  <a href="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit" alt="License"></a>
  <a href="https://mcp-tool-shop-org.github.io/siege-kit/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

A physics-first board game toolkit. Deterministic 2D physics engine with SVG rendering, a complete strategy board game (SiegeGammon), and a Chrome DevTools extension for debugging animations — all in a Turborepo monorepo.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| **@mcptoolshop/physics-svg** | Deterministic 2D physics engine with SVG and Canvas renderers | Published on npm |
| **@mcp-tool-shop/siege-types** | Shared TypeScript types for physics, game state, and animations | Internal |

## Apps

| App | Description |
|-----|-------------|
| **SiegeGammon** | Inverse-backgammon strategy game — deploy, advance, and lock checkers into the Siege Zone |
| **Anim DevTools** | Chrome extension for inspecting physics simulations and animation timelines |

## SiegeGammon

SiegeGammon flips backgammon on its head: instead of bearing off, players deploy checkers from reserve onto an empty board and race to lock all 15 into the opponent's home territory. The board's spatial inversion — your Garrison overlaps their Siege Zone — keeps contact and tension high from first move to last.

## Physics Engine

Semi-implicit Euler integration at a fixed 60 Hz timestep, the same approach used by Box2D and Rapier. Circle, AABB, and SAT collision detection with impulse-based resolution. Constraints solved via projected Gauss-Seidel. Bodies sleep when still. SVG rendering uses imperative transform updates (zero React re-renders); Canvas fallback kicks in at 200+ bodies.

## Tech Stack

- **TypeScript 5.7** / **Node 22+** / **pnpm 10**
- **Vite 6** for apps and library builds
- **Turbo 2.4** for monorepo orchestration
- **Vitest 3** for testing
- **React 19** + **GSAP 3** in the game app

## Getting Started

```bash
pnpm install
pnpm dev
```

## License

[MIT](LICENSE)

---

Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
