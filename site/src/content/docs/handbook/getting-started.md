---
title: Getting Started
description: Install and run the Siege Kit monorepo.
sidebar:
  order: 1
---

Siege Kit is a physics-first board game toolkit built as a Turborepo monorepo.

## Prerequisites

- Node.js 22 or later
- pnpm 10

## Install and run

```bash
git clone https://github.com/mcp-tool-shop-org/siege-kit.git
cd siege-kit
pnpm install
pnpm dev
```

## Run individual packages

```bash
# SiegeGammon game
pnpm --filter siegegammon dev

# Physics engine
pnpm --filter physics-svg dev
```

## Tech stack

| Tool | Version |
|------|---------|
| TypeScript | 5.7 |
| Node.js | 22+ |
| pnpm | 10 |
| Vite | 6 |
| Turbo | 2.4 |
| Vitest | 3 |
| React | 19 |
| GSAP | 3 |
