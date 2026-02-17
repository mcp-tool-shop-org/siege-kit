# @mcptoolshop/physics-svg

[![npm](https://img.shields.io/npm/v/@mcptoolshop/physics-svg)](https://www.npmjs.com/package/@mcptoolshop/physics-svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/mcp-tool-shop-org/siege-kit/blob/main/LICENSE)

**Deterministic 2D physics engine with SVG rendering for web games and simulations.**

Part of the [siege-kit](https://github.com/mcp-tool-shop-org/siege-kit) monorepo.

## Install

```bash
npm install @mcptoolshop/physics-svg
```

## Usage

```js
import { createWorld, step } from '@mcptoolshop/physics-svg';

const world = createWorld({ gravity: [0, 9.81] });
// Add bodies, step the simulation, render to SVG
```

### With React

```jsx
import { PhysicsCanvas } from '@mcptoolshop/physics-svg/react';

function App() {
  return <PhysicsCanvas width={800} height={600} />;
}
```

## Features

- **Deterministic simulation**: Same inputs always produce the same outputs
- **SVG rendering**: Crisp vector graphics at any resolution
- **React bindings**: Optional `@mcptoolshop/physics-svg/react` entry point
- **GSAP integration**: Optional GSAP-powered animations
- **Tree-shakeable**: Only import what you use

## Peer Dependencies

| Package | Required | Version |
|---------|----------|---------|
| `react` | Optional | >= 18 |
| `react-dom` | Optional | >= 18 |
| `gsap` | Optional | >= 3 |

## Links

- [GitHub Repository](https://github.com/mcp-tool-shop-org/siege-kit)
- [Package Source](https://github.com/mcp-tool-shop-org/siege-kit/tree/main/packages/physics-svg)

## License

MIT
