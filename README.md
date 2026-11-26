# Kurt — Portfolio

An interactive 3D studio portfolio built with React, Vite, TypeScript, and Three.js (React Three Fiber) for Kurt — 3D artist, front-end developer, and web designer based in Metro Manila, Philippines.

## Overview

The entire portfolio lives inside one continuous full-viewport Three.js WebGL studio with five spatial sections connected by smooth camera fly-through navigation:

- **Intro (`/`)** — Sculpted dual-material 3D `K` logo monolith lit by a procedural `PMREMGenerator` studio softbox environment over floating volumetric bokeh.
- **About (`/about`)** — Portrait, background, tech stack, and interactive certifications modal (with privacy-redacted credential previews).
- **Projects (`/projects`)** — Bounded 3D exhibition carousel with discipline filters (`All Projects`, `Web Design`, `3D`, `Animation`), single-mesh WebGL image & live `VideoTexture` previews, hover-reactive specular lighting and corner tilt, and 3D fly-through transitions into standalone `/projects/<slug>` showcase pages.
- **Experience (`/experience`)** — Organization-grouped roles and highlights.
- **Contact (`/contact`)** — Copyable email, LinkedIn/GitHub links, and Privacy Policy modal.

Under `prefers-reduced-motion: reduce` or WebGL fallback, the 3D scene stays unmounted and semantic HTML/CSS views keep every section, project, and control accessible.

## Tech Stack

- **Framework & Build:** React, TypeScript, Vite
- **3D & Graphics:** Three.js, React Three Fiber, custom GLSL card/backdrop/particle shaders
- **Typography:** Self-hosted Archivo & Manrope (OFL-licensed Latin WOFF2)
- **Tooling:** ESLint, Prettier, Node built-in test runner

## Getting Started

1. Install Node.js 24 and npm.
2. Install dependencies:
   ```sh
   npm ci
   ```
3. Start the local dev server:
   ```sh
   npm run dev
   ```
4. Build and preview production output:
   ```sh
   npm run build
   npm run preview
   ```

## Scripts

```sh
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
```

## Project Structure

```text
portfolio/
├── index.html
├── package.json / package-lock.json
├── vite.config.ts / tsconfig.json
├── eslint.config.mjs / .gitignore
├── public/
│   ├── brand/                 logo assets
│   ├── certificates/          redacted certification previews
│   ├── fonts/                 self-hosted Archivo & Manrope fonts + OFL licenses
│   ├── portrait/              studio portrait assets
│   └── work/                  project screenshots, 3D renders, and video previews
├── scripts/
│   └── portfolio.test.mjs     route and navigation unit tests
└── src/
    ├── main.tsx
    └── portfolio/
        ├── Portfolio.tsx      History API routing, project showcase pages & canvas video player
        ├── StudioHome.tsx     5-chapter spatial HUD, filters, modals & detached video decoder pool
        ├── StudioUniverse.tsx Three.js / R3F 3D studio scene, shaders & camera choreography
        ├── SkeletonMedia.tsx  canvas-backed image renderer with skeleton shimmer
        ├── FeatureLab.tsx     interactive training-carousel breakdown
        ├── content.ts         project metadata and summaries
        ├── routes.ts          route resolution helpers
        ├── studio.css         spatial studio HUD styles
        └── portfolio.css      project showcase viewer styles
```
