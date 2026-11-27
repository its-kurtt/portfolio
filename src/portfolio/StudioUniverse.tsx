import {
  Component,
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import type { MutableRefObject, ReactNode, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  FogExp2,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NoColorSpace,
  OctahedronGeometry,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Shape,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  Vector2,
  VideoTexture,
} from 'three'
import type { Texture } from 'three'
import type { Work } from './content'

export type StudioRoom = 'intro' | 'about' | 'work' | 'experience' | 'contact'

export type StudioMotionGoal = {
  /** Continuous 5-station 3D ride goal: 0 Intro -> 1 About -> 2 Works -> 3 Experience -> 4 Contact Vortex */
  flyTarget: number
  /** Continuous bounded carousel goal (0 .. items.length - 1), scrubbed smoothly during wheel */
  carouselGoal: number
  /** True while user is actively wheeling (uses responsive follow stiffness vs weighty glide stiffness) */
  wheeling: boolean
  /** When true, next frame snaps camera & carousel directly to target with zero spring fly-across */
  snapNow?: boolean
  /** 1 while flying through the centered 3D work card into a project page; 0 otherwise */
  projectDive?: number
  /** Active direct 1-hop fly-through between non-adjacent sections (skips intermediate stations) */
  directJump?: { from: number; to: number } | null
  /** Simple opacity crossfade (0 = visible, 1 = faded out) during a filter switch */
  filterFade?: number
  /** When true, snaps carousel index cleanly to carouselGoal (used mid-filter swap while faded) */
  snapCarouselNow?: boolean
}

export type StudioUniverseProps = {
  active?: boolean
  room: StudioRoom
  /** Mutable high-frequency motion target read directly in useFrame with zero React re-renders per wheel tick */
  motionRef: MutableRefObject<StudioMotionGoal>
  items: Work[]
  activeIndex: number
  onSelectIndex: (index: number) => void
  onOpenWork: (slug: string) => void
  onReady: () => void
  onError: () => void
  /** Shared persistent continuously-playing HTML5 <video> pool keyed by work.slug */
  videoElementsRef?: RefObject<Record<string, HTMLVideoElement | null>>
}

/* ============================================================================
   1. STUDIO ENVIRONMENT MAP (PMREM) — KURT'S OUTFIT PALETTE
   ============================================================================ */
function buildStudioEnvironment(gl: import('three').WebGLRenderer) {
  const pmrem = new PMREMGenerator(gl)
  pmrem.compileEquirectangularShader()

  const envScene = new Scene()
  envScene.background = new Color('#070a12')

  const panels: {
    pos: [number, number, number]
    rot: [number, number, number]
    size: [number, number]
    color: string
    intensity: number
  }[] = [
    {
      pos: [0, 8.8, 2.0],
      rot: [Math.PI / 2, 0, 0],
      size: [15, 7],
      color: '#f5f3ee',
      intensity: 2.3,
    },
    {
      pos: [-9.5, 1.4, 2.2],
      rot: [0, Math.PI / 2.15, 0],
      size: [10, 14],
      color: '#f26322',
      intensity: 2.4,
    },
    {
      pos: [9.5, 2.4, 3.0],
      rot: [0, -Math.PI / 2.2, 0],
      size: [10, 13],
      color: '#f5bd2a',
      intensity: 2.2,
    },
    {
      pos: [0, -1.5, -10.0],
      rot: [0, 0, 0],
      size: [24, 16],
      color: '#1b3463',
      intensity: 1.75,
    },
    {
      pos: [-6.0, 2.8, 9.8],
      rot: [0, Math.PI * 0.84, 0],
      size: [10, 9],
      color: '#d8e3f6',
      intensity: 1.45,
    },
    {
      pos: [6.2, 2.6, 9.8],
      rot: [0, -Math.PI * 0.84, 0],
      size: [10, 9],
      color: '#ffe3a3',
      intensity: 1.55,
    },
  ]

  const disposables: (PlaneGeometry | MeshBasicMaterial)[] = []
  for (const p of panels) {
    const geo = new PlaneGeometry(p.size[0], p.size[1])
    const col = new Color(p.color).multiplyScalar(p.intensity)
    const mat = new MeshBasicMaterial({ color: col })
    const mesh = new Mesh(geo, mat)
    mesh.position.set(...p.pos)
    mesh.rotation.set(...p.rot)
    envScene.add(mesh)
    disposables.push(geo, mat)
  }

  const rt = pmrem.fromScene(envScene, 0.055)
  for (const d of disposables) d.dispose()
  pmrem.dispose()
  return rt
}

/* ============================================================================
   2. PROCEDURAL FORGED CARBON-WEAVE TEXTURE FOR THE 3D "K" FACE
   ============================================================================ */
function buildCarbonWeaveTextures(): {
  roughnessMap: CanvasTexture
  bumpMap: CanvasTexture
} {
  const size = 512
  const rCanvas = document.createElement('canvas')
  rCanvas.width = size
  rCanvas.height = size
  const rCtx = rCanvas.getContext('2d')

  const bCanvas = document.createElement('canvas')
  bCanvas.width = size
  bCanvas.height = size
  const bCtx = bCanvas.getContext('2d')

  if (!rCtx || !bCtx) throw new Error('2D canvas unavailable')

  rCtx.fillStyle = '#5a5a5a'
  rCtx.fillRect(0, 0, size, size)
  bCtx.fillStyle = '#787878'
  bCtx.fillRect(0, 0, size, size)

  const cell = 16
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const phase = ((x / cell + y / cell) | 0) % 2
      if (phase === 0) {
        const gR = rCtx.createLinearGradient(x, y, x + cell, y)
        gR.addColorStop(0, '#3a3a3a')
        gR.addColorStop(0.5, '#8c8c8c')
        gR.addColorStop(1, '#3a3a3a')
        rCtx.fillStyle = gR
        rCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2)

        const gB = bCtx.createLinearGradient(x, y, x + cell, y)
        gB.addColorStop(0, '#444444')
        gB.addColorStop(0.5, '#d6d6d6')
        gB.addColorStop(1, '#444444')
        bCtx.fillStyle = gB
        bCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
      } else {
        const gR = rCtx.createLinearGradient(x, y, x, y + cell)
        gR.addColorStop(0, '#464646')
        gR.addColorStop(0.5, '#a2a2a2')
        gR.addColorStop(1, '#464646')
        rCtx.fillStyle = gR
        rCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2)

        const gB = bCtx.createLinearGradient(x, y, x, y + cell)
        gB.addColorStop(0, '#4c4c4c')
        gB.addColorStop(0.5, '#c4c4c4')
        gB.addColorStop(1, '#4c4c4c')
        bCtx.fillStyle = gB
        bCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
      }
    }
  }

  const roughnessMap = new CanvasTexture(rCanvas)
  roughnessMap.wrapS = RepeatWrapping
  roughnessMap.wrapT = RepeatWrapping
  roughnessMap.repeat.set(3.2, 3.2)

  const bumpMap = new CanvasTexture(bCanvas)
  bumpMap.wrapS = RepeatWrapping
  bumpMap.wrapT = RepeatWrapping
  bumpMap.repeat.set(3.2, 3.2)

  return { roughnessMap, bumpMap }
}

/* ============================================================================
   3. PRECISION 3D EXTRUDED GEOMETRY OF KURT'S WINGED "K" LOGO
   ============================================================================ */
function buildKurtLogoGeometry(): ExtrudeGeometry {
  const shape = new Shape()
  shape.moveTo(-1.02, 0.94)
  shape.quadraticCurveTo(-0.62, 0.8, -0.22, 0.96)
  shape.quadraticCurveTo(-0.36, 0.44, -0.35, 0.04)
  shape.quadraticCurveTo(0.45, 0.34, 0.56, 1.72)
  shape.quadraticCurveTo(1.22, 1.48, 1.58, 1.05)
  shape.quadraticCurveTo(0.55, 0.0, 1.58, -1.05)
  shape.quadraticCurveTo(1.22, -1.48, 0.56, -1.72)
  shape.quadraticCurveTo(0.45, -0.34, -0.35, -0.04)
  shape.quadraticCurveTo(-0.36, -0.44, -0.1, -0.96)
  shape.quadraticCurveTo(-0.62, -0.76, -1.16, -0.94)
  shape.quadraticCurveTo(-0.92, -0.45, -0.9, -0.07)
  shape.quadraticCurveTo(-1.12, -0.1, -1.16, -0.18)
  shape.quadraticCurveTo(-1.32, -0.04, -1.58, 0.0)
  shape.quadraticCurveTo(-1.32, 0.04, -1.16, 0.18)
  shape.quadraticCurveTo(-1.12, 0.1, -0.9, 0.07)
  shape.quadraticCurveTo(-0.9, 0.48, -1.02, 0.94)

  const geo = new ExtrudeGeometry(shape, {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.068,
    bevelOffset: 0,
    bevelSegments: 10,
    curveSegments: 48,
  })
  geo.center()
  geo.computeVertexNormals()
  return geo
}

/* ============================================================================
   4. STUDIO SILK CYCLORAMA BACKDROP (Shifts Atmosphere Smoothly Across All 5 Acts)
   ============================================================================ */
const horizonVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const horizonFrag = `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uRide;
  uniform float uWorkWeight;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.75, 1.0);
    p += uPointer * 0.035;

    float r = length(p * vec2(0.85, 1.05));

    // Smooth per-section atmospheric color palette across all 5 chapters (strictly Kurt's wardrobe tones):
    // 0 Intro:      Deep Indigo-Obsidian Darkroom
    // 1 About:      Warm Espresso-Amber Studio
    // 2 Works:      Deep Pitch-Obsidian Gallery Corridor (lets 3D cards & rim lighting own center stage)
    // 3 Experience: Rich Raw Indigo Denim Wash
    // 4 Contact:    Deep Burnt-Ember & Copper Finale
    vec3 c0 = vec3(0.068, 0.108, 0.205);
    vec3 c1 = vec3(0.165, 0.118, 0.088);
    vec3 c2 = vec3(0.022, 0.027, 0.042);
    vec3 c3 = vec3(0.078, 0.145, 0.275);
    vec3 c4 = vec3(0.195, 0.082, 0.072);

    vec3 edge0 = vec3(0.02, 0.026, 0.044);
    vec3 edge1 = vec3(0.044, 0.032, 0.026);
    vec3 edge2 = vec3(0.008, 0.010, 0.016);
    vec3 edge3 = vec3(0.022, 0.036, 0.068);
    vec3 edge4 = vec3(0.052, 0.024, 0.024);

    float s01 = smoothstep(0.0, 1.0, uRide);
    float s12 = smoothstep(1.0, 2.0, uRide);
    float s23 = smoothstep(2.0, 3.0, uRide);
    float s34 = smoothstep(3.0, 4.0, uRide);

    vec3 centerTone = mix(mix(mix(mix(c0, c1, s01), c2, s12), c3, s23), c4, s34);
    vec3 outerTone  = mix(mix(mix(mix(edge0, edge1, s01), edge2, s12), edge3, s23), edge4, s34);

    vec3 col = mix(centerTone, outerTone, smoothstep(0.0, 0.92, r));

    // Soft overhead studio silk wash
    float topWash = exp(-length(p - vec2(0.0, 0.42)) * 2.1);
    col += mix(vec3(0.12, 0.18, 0.32), vec3(0.26, 0.16, 0.1), s01 * (1.0 - s12) + s34) * topWash * 0.24 * (1.0 - uWorkWeight * 0.6);

    // Restrained warm wardrobe spill (burnt orange left, cadmium gold right)
    float breath = 0.92 + 0.08 * sin(uTime * 0.35);
    float nonWork = 1.0 - uWorkWeight * 0.72;
    float leftSpill = exp(-length(p - vec2(-0.74, 0.32)) * 2.45);
    float rightSpill = exp(-length(p - vec2(0.72, -0.34)) * 2.55);
    col += vec3(0.95, 0.39, 0.13) * leftSpill * (0.11 + s34 * 0.14) * nonWork * breath;
    col += vec3(0.96, 0.74, 0.16) * rightSpill * (0.09 + s01 * (1.0 - s12) * 0.08) * nonWork * breath;

    // Restrained darkroom gallery key behind the centered 3D card (zero foggy cursor blob)
    vec2 backCenter = vec2(-uPointer.x * 0.08, 0.05 + uPointer.y * 0.05);
    float coreHalo = exp(-length((p - backCenter) * vec2(1.5, 1.9)) * 3.2);
    float overheadShaft = exp(-abs(p.x - backCenter.x * 0.85) * 7.2) * smoothstep(-0.1, 0.54, p.y);
    col += vec3(0.95, 0.78, 0.50) * (coreHalo * 0.10 + overheadShaft * 0.08) * uWorkWeight * breath;
    col += vec3(0.24, 0.38, 0.66) * coreHalo * 0.05 * uWorkWeight;

    gl_FragColor = vec4(col, 1.0);
  }
`

/* ============================================================================
   5. SLEEK MATTE STUDIO FLOOR WITH SOFT LIGHT POOLS AT EVERY STATION
   ============================================================================ */
const floorVert = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const floorFrag = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    float p0 = exp(-length(vWorldPos.xz - vec2(0.0, 0.0)) * 0.38);
    float p1 = exp(-length(vWorldPos.xz - vec2(0.0, -7.0)) * 0.28);
    float p2 = exp(-length(vWorldPos.xz - vec2(0.0, -16.5)) * 0.24);
    float p3 = exp(-length(vWorldPos.xz - vec2(0.0, -28.0)) * 0.24);
    float p4 = exp(-length(vWorldPos.xz - vec2(0.0, -40.0)) * 0.22);

    float breathe = 0.94 + 0.06 * sin(uTime * 0.45);

    vec3 col = vec3(0.03, 0.045, 0.08);
    col += vec3(0.95, 0.62, 0.18) * (p0 * 0.2 + p2 * 0.12 + p4 * 0.26) * breathe;
    col += vec3(0.22, 0.38, 0.68) * (p1 * 0.22 + p2 * 0.18 + p3 * 0.26) * breathe;
    col += vec3(0.95, 0.39, 0.13) * p4 * 0.18 * breathe;

    float edgeFade = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x) *
                     smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
    float alpha = clamp((p0 + p1 + p2 + p3 + p4) * 0.46 * edgeFade, 0.0, 0.7);

    gl_FragColor = vec4(col, alpha);
  }
`

/* ============================================================================
   6. CONTINUOUS 3D RIDE PARTICLE STREAM + VERTICAL FIBER-OPTIC VORTEX FINALE
      Inspired by sztanki.com's streaming particle floor, orbital rings, subtle
      spatial Work guide threads, and soaring vertical vortex column at Contact!
      Strictly in Kurt's outfit palette (indigo denim, cadmium gold, burnt orange,
      crisp studio white).
   ============================================================================ */
const rideParticlesVert = `
  attribute float aScale;
  attribute float aSeed;
  attribute vec3 aColor;
  attribute float aKind; // 0 = flowing floor stream, 1 = orbital rings, 2 = spatial tunnel rails, 3 = vertical vortex column
  uniform float uTime;
  uniform float uFlyVel;
  uniform vec2 uPointer;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    float t = uTime * 0.45 + aSeed * 6.2831;

    if (aKind < 0.5) {
      // Flowing particle river along the studio floor guiding the camera ride
      pos.y += sin(pos.z * 0.35 + t) * 0.16;
      pos.x += cos(pos.z * 0.25 - t * 0.7) * 0.14 + uPointer.x * 0.25;
      pos.z += uFlyVel * 0.45;
    } else if (aKind < 1.5) {
      // Concentric orbital rings sweeping gently around Statement (z=-7) & About (z=-28)
      float ang = uTime * (0.14 + aSeed * 0.1) + aSeed * 6.2831;
      float rad = length(pos.xz - vec2(0.0, pos.z));
      // Orbit in place around its station center stored via radial offset in x/y
      float c = cos(ang);
      float s = sin(ang);
      float ox = pos.x;
      float oz = pos.y; // packed local Z offset in y!
      pos.x = ox * c - oz * s;
      pos.z = pos.z + (ox * s + oz * c);
      pos.y = -2.35 + sin(ang * 2.0 + aSeed * 9.0) * 0.35;
      rad = rad; // keep compiler clean
    } else if (aKind < 2.5) {
      // Whisper-subtle dotted spatial perspective lines framing the Work gallery (z = -10..-24)
      pos.x += uPointer.x * 0.18;
      pos.y -= uPointer.y * 0.14;
    } else {
      // Soaring Vertical Fiber-Optic Vortex Finale at Contact (z = -40)!
      // Streams spiral inward along the floor and shoot upward into a luminous column
      float phase = fract(aSeed + uTime * (0.09 + 0.05 * fract(aSeed * 7.3)));
      float funnel = pow(1.0 - phase, 2.6);
      float rad = 0.28 + funnel * 9.5;
      float swirl = phase * 5.2 + aSeed * 18.84 + uTime * 0.22;
      pos.x = cos(swirl) * rad;
      pos.z = -40.5 + sin(swirl) * rad;
      pos.y = -3.2 + pow(phase, 1.35) * 12.5;
    }

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    float dist = max(1.2, -mvPos.z);
    float sizeBoost = aKind > 2.5 ? 1.25 : 1.0;
    gl_PointSize = clamp((aScale * 28.0 * sizeBoost) / dist, 1.6, 11.0);
    vColor = aColor;

    float shimmer = 0.62 + 0.38 * sin(uTime * 1.4 + aSeed * 17.0);
    float nearFade = smoothstep(0.9, 2.8, dist);
    float farFade = smoothstep(34.0, 5.0, dist);
    vAlpha = shimmer * nearFade * farFade * (aKind > 2.5 ? 0.78 : aKind > 1.5 ? 0.45 : 0.62);
  }
`

const rideParticlesFrag = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.08, d);
    gl_FragColor = vec4(vColor, core * vAlpha);
  }
`

/* ============================================================================
   7. FOREGROUND BOKEH LENS ORBS
   ============================================================================ */
const bokehVert = `
  attribute float aScale;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uFlyBoost;
  uniform vec2 uPointer;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    float t = uTime * 0.18 + aSeed * 6.2831;
    pos.x += sin(t + pos.y * 0.28) * 0.32 + uPointer.x * 1.4 * (0.4 + aSeed * 0.7);
    pos.y += cos(t * 0.7 + pos.x * 0.24) * 0.26 - uPointer.y * 1.1 * (0.3 + aSeed * 0.5);
    pos.z += sin(t * 0.45) * 0.4 + uFlyBoost * (1.0 + aSeed * 1.4);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    float dist = max(1.1, -mvPos.z);
    gl_PointSize = clamp((aScale * 34.0) / dist, 2.5, 42.0);
    vColor = aColor;
    float twinkle = 0.55 + 0.45 * sin(uTime * 0.85 + aSeed * 14.0);
    vAlpha = twinkle * smoothstep(24.0, 3.5, dist) * smoothstep(0.8, 2.5, dist) * 0.2;
  }
`

const bokehFrag = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.1, d);
    float ring = smoothstep(0.5, 0.36, d) * smoothstep(0.22, 0.38, d) * 0.65;
    gl_FragColor = vec4(vColor, (core * 0.7 + ring * 0.48) * vAlpha);
  }
`

/* ============================================================================
   8. CRYSTAL-CLEAR HD 3D EXHIBITION CARD SHADER
      Zero scanlines · Zero mouse spotlight · Unified outline · 16-tap bokeh DoF
   ============================================================================ */
const cardVert = `
  uniform float uVelocity;
  uniform float uHover;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float nx = (uv.x - 0.5) * 2.0;

    // Gentle curved lens flex during smooth momentum glide
    pos.z += -(nx * nx) * 0.14 * abs(uVelocity);
    pos.y += nx * uVelocity * 0.05;
    pos.z += uHover * 0.18;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const cardFrag = `
  uniform sampler2D uMap;
  uniform vec2 uUvScale;
  uniform vec3 uBackdrop;
  uniform float uRimSide;
  uniform vec2 uLocalPointer;
  uniform vec2 uLightUv;
  uniform float uLightPower;
  uniform float uBlendEdges;
  uniform float uFocus;
  uniform float uHover;
  uniform float uAlpha;
  uniform float uRadius;
  uniform vec2 uAspect;
  uniform vec2 uPointer;
  uniform float uIsVideo;
  varying vec2 vUv;

  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + vec2(r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  vec3 sampleClean(vec2 uv, float lodBias) {
    float zoom = 1.0 - uHover * 0.032;
    vec2 pan = (uLocalPointer * 0.5) * uHover * 0.022;
    vec2 zoomedUv = (uv - 0.5) * zoom + 0.5 + pan;
    vec2 fitted = (zoomedUv - 0.5) * uUvScale + 0.5;

    if (uBlendEdges > 0.5) {
      vec2 cl = clamp(fitted, 0.002, 0.998);
      vec3 tex = texture2D(uMap, cl, lodBias).rgb;
      float ix = smoothstep(0.0, 0.08, fitted.x) * (1.0 - smoothstep(0.92, 1.0, fitted.x));
      float iy = smoothstep(0.0, 0.04, fitted.y) * (1.0 - smoothstep(0.96, 1.0, fitted.y));
      float vig = 1.0 - smoothstep(0.45, 1.05, length((uv - 0.5) * vec2(1.4, 1.15))) * 0.34;
      return mix(uBackdrop * vig, tex, clamp(ix * iy, 0.0, 1.0));
    }
    if (fitted.x < 0.0 || fitted.x > 1.0 || fitted.y < 0.0 || fitted.y > 1.0) {
      return uBackdrop;
    }
    return texture2D(uMap, fitted, lodBias).rgb;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uAspect;
    float d = roundedBoxSDF(p, uAspect * 0.5, uRadius);
    float mask = 1.0 - smoothstep(-0.0022, 0.0022, d);
    if (mask <= 0.001) discard;

    // Creamy hardware-mipmapped 9-tap circular Gaussian bokeh blur (identical smooth blur on both images and videos)
    float blurAmt = pow(max(0.0, 1.0 - uFocus), 1.3);
    vec3 col;
    if (blurAmt > 0.025) {
      float lod = blurAmt * 3.4;
      vec2 rad = vec2(1.0 / uAspect.x, 1.0) * blurAmt * 0.009;
      vec2 diag = rad * 0.7071;
      col = sampleClean(vUv, lod) * 0.24;
      col += sampleClean(vUv + vec2( rad.x, 0.0), lod) * 0.095;
      col += sampleClean(vUv + vec2(-rad.x, 0.0), lod) * 0.095;
      col += sampleClean(vUv + vec2(0.0,  rad.y), lod) * 0.095;
      col += sampleClean(vUv + vec2(0.0, -rad.y), lod) * 0.095;
      col += sampleClean(vUv + vec2( diag.x,  diag.y), lod) * 0.095;
      col += sampleClean(vUv + vec2(-diag.x,  diag.y), lod) * 0.095;
      col += sampleClean(vUv + vec2( diag.x, -diag.y), lod) * 0.095;
      col += sampleClean(vUv + vec2(-diag.x, -diag.y), lod) * 0.095;
    } else {
      col = sampleClean(vUv, 0.0);
    }

    // Convert static textures to display sRGB FIRST, then apply smooth C¹ focus dimming &
    // Skhiladze hover sheen in the EXACT same display sRGB space for both image and video cards
    // so there is zero lighting jump during slide-to-center handoff!
    gl_FragColor = vec4(col, mask * uAlpha);
    if (uIsVideo < 0.5) {
      #include <colorspace_fragment>
    }

    float smoothFocus = smoothstep(0.0, 1.0, uFocus);
    float dim = mix(0.56, 1.0, smoothFocus);
    gl_FragColor.rgb *= dim;

    vec2 lightUv = uLocalPointer * 0.5 + 0.5;
    float dPlanar = length((vUv - lightUv) * vec2(uAspect.x * 0.62, 1.0));
    float planar = smoothstep(1.38, 0.0, dPlanar);
    planar = planar * planar * (3.0 - 2.0 * planar);
    float faceSheen = planar * 0.095 * uHover * smoothFocus;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.95, 0.965, 1.0), faceSheen);

    // 1px hover-only specular bevel catch along edges closest to the hovered corner
    float bezel = smoothstep(-0.0036, -0.0008, d) * mask;
    float edgeDist = length((vUv - lightUv) * vec2(uAspect.x * 0.82, 1.0));
    float edgeCatch = smoothstep(0.94, 0.0, edgeDist);
    edgeCatch = edgeCatch * edgeCatch;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.97, 0.985, 1.0), bezel * edgeCatch * 0.62 * uHover * smoothFocus);

    // Subtle directional inner-edge rim on flanking cards facing the centered gallery light
    float isFlank = step(0.5, abs(uRimSide)) * (1.0 - smoothFocus);
    float innerCoord = uRimSide < 0.0 ? vUv.x : (1.0 - vUv.x);
    float verticalBell = 0.55 + 0.45 * sin(vUv.y * 3.14159);
    float innerRimEdge = smoothstep(0.76, 1.0, innerCoord) * verticalBell;
    gl_FragColor.rgb += vec3(0.96, 0.86, 0.68) * bezel * innerRimEdge * 0.28 * isFlank;
  }
`

function buildEditorialPlate(work: Work): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 820
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')

  const palettes: Record<
    string,
    {
      bg0: string
      bg1: string
      bg2: string
      glow: string
      accent: string
      bar: string
      kicker: string
      footer: string
    }
  > = {
    expo: {
      bg0: '#6e220f',
      bg1: '#2b100d',
      bg2: '#0b0c10',
      glow: 'rgba(245, 189, 42, 0.32)',
      accent: '#f5bd2a',
      bar: '#f26322',
      kicker: 'CS EXPO 2026  ·  ANIMATION',
      footer: 'OFFICIAL TRAILER  ·  4,000+ VIEWS',
    },
    'cs-night': {
      bg0: '#16284a',
      bg1: '#0e172c',
      bg2: '#080a0f',
      glow: 'rgba(245, 189, 42, 0.28)',
      accent: '#f5bd2a',
      bar: '#f5bd2a',
      kicker: 'CS NIGHT 2026  ·  3D & ANIMATION',
      footer: 'OFFICIAL EVENT TRAILER  ·  WATCH VIDEO',
    },
    elysium: {
      bg0: '#3c2a0f',
      bg1: '#1a1510',
      bg2: '#090a0e',
      glow: 'rgba(245, 189, 42, 0.34)',
      accent: '#f5bd2a',
      bar: '#f5bd2a',
      kicker: 'FEU TECH ACM  ·  3D & ANIMATION',
      footer: '18 YEARS OF ACM  ·  ELYSIUM NIGHT',
    },
    heartwired: {
      bg0: '#5a1822',
      bg1: '#260d14',
      bg2: '#090a0e',
      glow: 'rgba(242, 99, 34, 0.34)',
      accent: '#f26322',
      bar: '#f26322',
      kicker: 'FEU TECH ACM  ·  3D & ANIMATION',
      footer: 'VALENTINE’S EVENT TEASER TRAILER',
    },
    'fit-acm': {
      bg0: '#142644',
      bg1: '#111827',
      bg2: '#08090d',
      glow: 'rgba(245, 189, 42, 0.26)',
      accent: '#f5bd2a',
      bar: '#3660ad',
      kicker: 'FEU TECH ACM  ·  3D & ANIMATION',
      footer: 'SCHOOL YEAR 2025–2026 RETROSPECTIVE',
    },
    'revival-x': {
      bg0: '#471d0f',
      bg1: '#1a1216',
      bg2: '#08090d',
      glow: 'rgba(242, 99, 34, 0.32)',
      accent: '#ff7a33',
      bar: '#f5bd2a',
      kicker: 'FEU TECH ACM  ·  3D & ANIMATION',
      footer: 'FLAGSHIP EVENT TEASER TRAILER',
    },
  }

  const p = palettes[work.plateVariant ?? 'expo'] ?? palettes.expo

  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  grad.addColorStop(0, p.bg0)
  grad.addColorStop(0.55, p.bg1)
  grad.addColorStop(1, p.bg2)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const rad = ctx.createRadialGradient(980, 260, 40, 980, 260, 520)
  rad.addColorStop(0, p.glow)
  rad.addColorStop(1, 'transparent')
  ctx.fillStyle = rad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Architectural studio accent bar on right edge
  ctx.fillStyle = p.bar
  ctx.fillRect(canvas.width - 24, 0, 24, canvas.height)

  ctx.fillStyle = '#f5e4c8'
  ctx.font = '600 24px Manrope, sans-serif'
  ctx.fillText(p.kicker, 86, 122)

  const topWord = work.video?.headlineTop ?? work.title.toUpperCase()
  const accentWord = work.video?.headlineAccent ?? ''

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 154px Archivo, sans-serif'
  ctx.fillText(topWord, 82, 392)
  if (accentWord) {
    ctx.fillStyle = p.accent
    ctx.fillText(accentWord, 82, 558)
  }

  ctx.fillStyle = 'rgba(245, 243, 238, 0.78)'
  ctx.font = '500 23px Manrope, sans-serif'
  ctx.fillText(p.footer, 86, canvas.height - 92)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  return tex
}

function fitTextureUv(
  texture: Texture,
  panelAspect: number,
  contain: boolean,
  target: Vector2,
) {
  const img = texture.image as
    | {
        width?: number
        height?: number
        videoWidth?: number
        videoHeight?: number
      }
    | undefined
  const w = img?.videoWidth || img?.width
  const h = img?.videoHeight || img?.height
  if (!w || !h) {
    target.set(1, 1)
    return
  }
  const imgAspect = w / h
  target.set(1, 1)
  if (contain) {
    if (imgAspect > panelAspect) target.y = imgAspect / panelAspect
    else target.x = panelAspect / imgAspect
  } else {
    if (imgAspect > panelAspect) target.x = panelAspect / imgAspect
    else target.y = imgAspect / panelAspect
  }
}

function clampIndex(index: number, count: number) {
  if (count <= 0) return 0
  return Math.max(0, Math.min(count - 1, index))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Exact closed-form C¹ critically damped spring integrator (dt-independent across 60/120/240Hz).
 * Preserves continuous velocity with zero jerk on goal changes and zero overshoot bounce.
 */
function stepCriticallyDamped(
  current: number,
  velocity: number,
  goal: number,
  omega: number,
  dt: number,
): [number, number] {
  const diff = current - goal
  const r = (velocity + omega * diff) * dt
  const decay = Math.exp(-omega * dt)
  return [goal + (diff + r) * decay, (velocity - r * omega) * decay]
}

const CARD_SLOTS = [-2, -1, 0, 1, 2]

/** Builds the unified 4-layer Sztanki-inspired particle architecture across all 5 ride stations */
function buildRideParticlesGeometry(): BufferGeometry {
  const floorCount = 900
  const orbitCount = 650
  const railCount = 420
  const vortexCount = 1350
  const total = floorCount + orbitCount + railCount + vortexCount

  const positions = new Float32Array(total * 3)
  const scales = new Float32Array(total)
  const seeds = new Float32Array(total)
  const colors = new Float32Array(total * 3)
  const kinds = new Float32Array(total)

  const indigo = new Color('#3660ad')
  const white = new Color('#f5f3ee')
  const gold = new Color('#f5bd2a')
  const orange = new Color('#f26322')

  let seed = 4129
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967295
  }

  let idx = 0
  const push = (
    x: number,
    y: number,
    z: number,
    scale: number,
    col: Color,
    kind: number,
  ) => {
    positions[idx * 3] = x
    positions[idx * 3 + 1] = y
    positions[idx * 3 + 2] = z
    scales[idx] = scale
    seeds[idx] = rand()
    colors[idx * 3] = col.r
    colors[idx * 3 + 1] = col.g
    colors[idx * 3 + 2] = col.b
    kinds[idx] = kind
    idx++
  }

  // Layer 0: Flowing studio floor river from z = +4 down to z = -44
  for (let i = 0; i < floorCount; i++) {
    const x = (rand() - 0.5) * 18
    const z = 4 - rand() * 48
    const y = -3.0 + (rand() - 0.5) * 0.45
    const pick = rand()
    const col =
      pick < 0.52 ? indigo : pick < 0.78 ? white : pick < 0.9 ? gold : orange
    push(x, y, z, 0.75 + rand() * 1.4, col, 0)
  }

  // Layer 1: Concentric orbital rings at Statement (z = -7.0) and About (z = -28.0)
  for (let i = 0; i < orbitCount; i++) {
    const stationZ = i < orbitCount / 2 ? -7.0 : -28.0
    const ringBand = Math.floor(rand() * 3)
    const rad = 2.8 + ringBand * 1.65 + (rand() - 0.5) * 0.45
    const ang = rand() * Math.PI * 2
    const ox = Math.cos(ang) * rad
    const oz = Math.sin(ang) * rad
    const col = ringBand === 0 ? gold : ringBand === 1 ? indigo : white
    // Pack local Z offset into y; shader unpacks and orbits cleanly around stationZ!
    push(ox, oz, stationZ, 0.8 + rand() * 1.35, col, 1)
  }

  // Layer 2: Subtle dotted spatial perspective guide threads framing Works (z = -10 to -23)
  const railCorners: [number, number][] = [
    [-5.4, 2.7],
    [5.4, 2.7],
    [-5.4, -2.5],
    [5.4, -2.5],
    [-8.2, 0.2],
    [8.2, 0.2],
  ]
  for (let i = 0; i < railCount; i++) {
    const [rx, ry] = railCorners[i % railCorners.length]
    const z = -9.5 - (i / railCount) * 15.0
    const col = i % 7 === 0 ? gold : indigo
    push(rx, ry, z, 0.75 + (i % 5 === 0 ? 0.8 : 0.15), col, 2)
  }

  // Layer 3: Soaring Vertical Fiber-Optic Vortex Finale at Contact (z = -40.5)
  for (let i = 0; i < vortexCount; i++) {
    const pick = rand()
    const col =
      pick < 0.45 ? indigo : pick < 0.75 ? gold : pick < 0.9 ? orange : white
    push(0, 0, -40.5, 0.9 + Math.pow(rand(), 1.8) * 1.9, col, 3)
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.setAttribute('aScale', new BufferAttribute(scales, 1))
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geo.setAttribute('aColor', new BufferAttribute(colors, 3))
  geo.setAttribute('aKind', new BufferAttribute(kinds, 1))
  return geo
}

function buildBokehGeometry(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const seeds = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  const palette = [
    new Color('#f5f3ee'),
    new Color('#f5bd2a'),
    new Color('#f26322'),
    new Color('#3a61a6'),
  ]

  let seed = 8821
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967295
  }

  for (let i = 0; i < count; i++) {
    const r = 1.1 + rand() * 6.5
    const theta = rand() * Math.PI * 2
    positions[i * 3] = Math.cos(theta) * r
    positions[i * 3 + 1] = (rand() - 0.5) * 6.8
    positions[i * 3 + 2] = 5.0 - rand() * 48.0
    scales[i] = (0.7 + Math.pow(rand(), 1.9) * 2.1) * 2.4
    seeds[i] = rand()
    const c = palette[Math.floor(rand() * palette.length)]
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.setAttribute('aScale', new BufferAttribute(scales, 1))
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geo.setAttribute('aColor', new BufferAttribute(colors, 3))
  return geo
}

function StudioScene({
  active = true,
  room,
  motionRef,
  items,
  activeIndex,
  onSelectIndex,
  onOpenWork,
  onReady,
  onError,
  videoElementsRef,
}: StudioUniverseProps) {
  const { gl, scene, size, camera } = useThree()
  const monolithGroupRef = useRef<Group>(null)
  const kGroupRef = useRef<Group>(null)
  const ringARef = useRef<Mesh>(null)
  const ringBRef = useRef<Mesh>(null)
  const shardGroupRef = useRef<Group>(null)
  const backdropRef = useRef<Mesh>(null)
  const keyLightRef = useRef<PointLight>(null)
  const rimLightRef = useRef<PointLight>(null)
  const cardMeshRefs = useRef<(Mesh | null)[]>([])

  const animRef = useRef({
    currentPos: motionRef.current.carouselGoal,
    targetPos: motionRef.current.carouselGoal,
    posVel: 0,
    velocity: 0,
    pullZ: 0,
    dive: 0,
    filterFade: 0,
    directJumpRef: null as { from: number; to: number } | null,
    smoothFly: motionRef.current.flyTarget,
    flyVel: 0,
    hoverCenter: 0,
    hoveredSlot: null as number | null,
    dragStartSlot: null as number | null,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartPos: 0,
    dragMoved: 0,
    pointerX: 0,
    pointerY: 0,
    pointerVx: 0,
    pointerVy: 0,
    smoothPointerX: 0,
    smoothPointerY: 0,
    clientX: 0,
    clientY: 0,
    smoothClientX: 0,
    smoothClientY: 0,
    pointerActive: 0,
    smoothPointerActive: 0,
    cardTargetX: 0,
    cardTargetY: 0,
    cardTiltX: 0,
    cardTiltY: 0,
    lastReportedIndex: activeIndex,
    lookXCurrent: 0,
    lookYCurrent: 0,
    lookZCurrent: 0,
    fovCurrent: 40,
  })

  const activeRef = useRef(active)
  const roomRef = useRef(room)
  const itemsRef = useRef(items)
  const activeIndexRef = useRef(activeIndex)
  const onErrorRef = useRef(onError)
  const onReadyRef = useRef(onReady)
  const readySentRef = useRef(false)

  useEffect(() => {
    activeRef.current = active
    roomRef.current = room
    onErrorRef.current = onError
    onReadyRef.current = onReady
  }, [active, room, onError, onReady])

  const initializedCamRef = useRef(false)

  useLayoutEffect(() => {
    if (initializedCamRef.current) return
    initializedCamRef.current = true
    const p = motionRef.current.flyTarget
    const isNarrow = size.width < 680
    const z0 = isNarrow ? 8.35 : 6.25
    const z1 = isNarrow ? -1.4 : -2.2
    const z2 = isNarrow ? -6.2 : -9.6
    const z3 = isNarrow ? -20.6 : -21.8
    const z4 = isNarrow ? -30.5 : -31.8
    const s01 = smoothstep(0, 1, p)
    const s12 = smoothstep(1, 2, p)
    const s23 = smoothstep(2, 3, p)
    const s34 = smoothstep(3, 4, p)
    const camZ =
      z0 + (z1 - z0) * s01 + (z2 - z1) * s12 + (z3 - z2) * s23 + (z4 - z3) * s34
    const lookZ = 0 + -9.0 * s01 + -7.5 * s12 + -12.0 * s23 + -12.0 * s34
    camera.position.set(0, 0, camZ)
    camera.lookAt(0, 0, lookZ)
    if (monolithGroupRef.current) {
      monolithGroupRef.current.visible = camZ > 2.2
    }
    for (const mesh of cardMeshRefs.current) {
      if (mesh) mesh.visible = false
    }
  }, [camera, motionRef, size.width])

  useEffect(() => {
    const envRT = buildStudioEnvironment(gl)
    scene.environment = envRT.texture
    scene.fog = new FogExp2('#040508', 0.032)
    return () => {
      scene.environment = null
      scene.fog = null
      envRT.dispose()
    }
  }, [gl, scene])

  useEffect(() => {
    const prevCount = itemsRef.current.length
    itemsRef.current = items
    activeIndexRef.current = activeIndex
    const maxPos = Math.max(0, items.length - 1)
    const clampedGoal = Math.max(
      0,
      Math.min(maxPos, motionRef.current.carouselGoal),
    )
    if (prevCount !== items.length) {
      animRef.current.currentPos = clampedGoal
      animRef.current.targetPos = clampedGoal
      animRef.current.posVel = 0
      animRef.current.lastReportedIndex = clampIndex(activeIndex, items.length)
    } else if (!animRef.current.dragging) {
      animRef.current.lastReportedIndex = clampIndex(activeIndex, items.length)
    }
  }, [activeIndex, items, motionRef])

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    gl.setPixelRatio(dpr)
    gl.setSize(size.width, size.height, false)
    gl.setViewport(0, 0, size.width, size.height)
    if (camera instanceof PerspectiveCamera) {
      camera.aspect = Math.max(0.25, size.width / Math.max(1, size.height))
      camera.updateProjectionMatrix()
    }
  }, [gl, camera, size.width, size.height])

  // Dual-Material Sculpted 3D Kurt "K" Monolith
  const kGeo = useMemo(() => buildKurtLogoGeometry(), [])
  const carbonTex = useMemo(() => buildCarbonWeaveTextures(), [])
  const ringAGeo = useMemo(() => new TorusGeometry(2.14, 0.022, 18, 128), [])
  const ringBGeo = useMemo(() => new TorusGeometry(2.52, 0.012, 14, 128), [])
  const shardGeo = useMemo(() => new OctahedronGeometry(0.13, 0), [])

  const kCarbonFaceMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color('#151a27'),
        metalness: 0.56,
        roughness: 0.36,
        roughnessMap: carbonTex.roughnessMap,
        bumpMap: carbonTex.bumpMap,
        bumpScale: 0.024,
        clearcoat: 0.62,
        clearcoatRoughness: 0.24,
        sheen: 0.35,
        sheenColor: new Color('#4d73bd'),
        envMapIntensity: 1.4,
        transparent: true,
        opacity: 1,
      }),
    [carbonTex],
  )

  const kGoldBevelMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color('#ecc046'),
        metalness: 0.72,
        roughness: 0.3,
        clearcoat: 0.45,
        clearcoatRoughness: 0.28,
        emissive: new Color('#f26322'),
        emissiveIntensity: 0.08,
        envMapIntensity: 1.5,
        transparent: true,
        opacity: 1,
      }),
    [],
  )

  const kBackHaloMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color('#f26322'),
        emissive: new Color('#f26322'),
        emissiveIntensity: 0.32,
        metalness: 0.2,
        roughness: 0.35,
        transparent: true,
        opacity: 0.24,
      }),
    [],
  )

  const kMaterials = useMemo(
    () => [kCarbonFaceMat, kGoldBevelMat],
    [kCarbonFaceMat, kGoldBevelMat],
  )

  const cadmiumSatinMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color('#f5bd2a'),
        metalness: 0.54,
        roughness: 0.38,
        clearcoat: 0.3,
        envMapIntensity: 1.25,
        transparent: true,
        opacity: 1,
      }),
    [],
  )

  const amberSatinMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color('#f26322'),
        metalness: 0.42,
        roughness: 0.44,
        clearcoat: 0.25,
        envMapIntensity: 1.15,
        transparent: true,
        opacity: 1,
      }),
    [],
  )

  // Studio Silk Cyclorama Backdrop (tracks camera depth smoothly so horizon never clips)
  const { backdropGeo, backdropMat } = useMemo(() => {
    const geo = new PlaneGeometry(68, 42)
    const mat = new ShaderMaterial({
      vertexShader: horizonVert,
      fragmentShader: horizonFrag,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new Vector2(0, 0) },
        uRide: { value: 0 },
        uWorkWeight: { value: 0 },
      },
    })
    return { backdropGeo: geo, backdropMat: mat }
  }, [])

  // Studio Floor stretching across all 5 ride stations (z = +8 to z = -52)
  const { floorGeo, floorMat } = useMemo(() => {
    const geo = new PlaneGeometry(38, 64)
    const mat = new ShaderMaterial({
      vertexShader: floorVert,
      fragmentShader: floorFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
      },
    })
    return { floorGeo: geo, floorMat: mat }
  }, [])

  // 4-Layer Continuous Ride Particle Architecture + Foreground Bokeh Orbs
  const { rideGeo, rideMat, bokehGeo, bokehMat } = useMemo(() => {
    const rGeo = buildRideParticlesGeometry()
    const rMat = new ShaderMaterial({
      vertexShader: rideParticlesVert,
      fragmentShader: rideParticlesFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uFlyVel: { value: 0 },
        uPointer: { value: new Vector2(0, 0) },
      },
    })

    const bGeo = buildBokehGeometry(160)
    const bMat = new ShaderMaterial({
      vertexShader: bokehVert,
      fragmentShader: bokehFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uFlyBoost: { value: 0 },
        uPointer: { value: new Vector2(0, 0) },
      },
    })

    return { rideGeo: rGeo, rideMat: rMat, bokehGeo: bGeo, bokehMat: bMat }
  }, [])

  useEffect(() => {
    return () => {
      kGeo.dispose()
      carbonTex.roughnessMap.dispose()
      carbonTex.bumpMap.dispose()
      ringAGeo.dispose()
      ringBGeo.dispose()
      shardGeo.dispose()
      kCarbonFaceMat.dispose()
      kGoldBevelMat.dispose()
      kBackHaloMat.dispose()
      cadmiumSatinMat.dispose()
      amberSatinMat.dispose()
      backdropGeo.dispose()
      backdropMat.dispose()
      floorGeo.dispose()
      floorMat.dispose()
      rideGeo.dispose()
      rideMat.dispose()
      bokehGeo.dispose()
      bokehMat.dispose()
    }
  }, [
    kGeo,
    carbonTex,
    ringAGeo,
    ringBGeo,
    shardGeo,
    kCarbonFaceMat,
    kGoldBevelMat,
    kBackHaloMat,
    cadmiumSatinMat,
    amberSatinMat,
    backdropGeo,
    backdropMat,
    floorGeo,
    floorMat,
    rideGeo,
    rideMat,
    bokehGeo,
    bokehMat,
  ])

  const shardSeeds = useMemo(() => {
    let s = 3079
    const r = () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return s / 4294967295
    }
    return Array.from({ length: 10 }, (_, idx) => {
      const a = (idx / 10) * Math.PI * 2
      const rad = 2.32 + r() * 1.15
      return {
        x: Math.cos(a) * rad,
        y: (r() - 0.5) * 2.6,
        z: Math.sin(a) * rad - 0.3,
        scale: 0.5 + r() * 0.65,
        amber: idx % 3 === 0,
      }
    })
  }, [])

  // Crystal-Clear HD Rounded 3D Exhibition Slabs (Exact 16:9 ratio for uncropped Full HD video & collages)
  const cardW = 4.8
  const cardH = 2.7
  const cardAspect = cardW / cardH
  const cardGeo = useMemo(() => new PlaneGeometry(cardW, cardH, 28, 16), [])
  useEffect(() => () => cardGeo.dispose(), [cardGeo])

  const projectTextures = useMemo(() => {
    const loader = new TextureLoader()
    const useMipmaps = gl.capabilities.isWebGL2
    return items.map((work) => {
      const videoSrc = work.video?.localSrc
      if (videoSrc) {
        const posterSrc = work.video?.poster
        const fallbackTex = posterSrc
          ? loader.load(posterSrc)
          : buildEditorialPlate(work)
        fallbackTex.colorSpace = SRGBColorSpace
        fallbackTex.minFilter = useMipmaps
          ? LinearMipmapLinearFilter
          : LinearFilter
        fallbackTex.generateMipmaps = useMipmaps

        const entry: {
          work: Work
          texture: Texture
          fallbackTexture?: Texture
          videoEl?: HTMLVideoElement
          isVideoTex: boolean
          hasLocalVideo: boolean
          contain: boolean
          loaded: boolean
          fade: number
        } = {
          work,
          texture: fallbackTex,
          fallbackTexture: fallbackTex,
          isVideoTex: false,
          hasLocalVideo: true,
          contain: false,
          loaded: true,
          fade: 1,
        }

        return entry
      }

      const cardSrc = work.thumbnail ?? work.image
      if (cardSrc) {
        const entry: {
          work: Work
          texture: Texture
          fallbackTexture?: Texture
          videoEl?: HTMLVideoElement
          isVideoTex: boolean
          hasLocalVideo: boolean
          contain: boolean
          loaded: boolean
          fade: number
        } = {
          work,
          texture: null as unknown as Texture,
          isVideoTex: false,
          hasLocalVideo: false,
          contain: false,
          loaded: false,
          fade: 0,
        }
        const tex = loader.load(
          cardSrc,
          () => {
            entry.loaded = true
          },
          undefined,
          () => onErrorRef.current(),
        )
        tex.colorSpace = SRGBColorSpace
        tex.minFilter = useMipmaps ? LinearMipmapLinearFilter : LinearFilter
        tex.generateMipmaps = useMipmaps
        entry.texture = tex
        return entry
      }
      const plate = buildEditorialPlate(work)
      if (!useMipmaps) {
        plate.minFilter = LinearFilter
        plate.generateMipmaps = false
      }
      return {
        work,
        texture: plate,
        isVideoTex: false,
        hasLocalVideo: false,
        contain: false,
        loaded: true,
        fade: 1,
      }
    })
  }, [gl, items])

  useEffect(() => {
    return () => {
      for (const entry of projectTextures) {
        entry.texture.dispose()
        if (entry.fallbackTexture && entry.fallbackTexture !== entry.texture) {
          entry.fallbackTexture.dispose()
        }
      }
    }
  }, [projectTextures])

  const cardMaterials = useMemo(() => {
    return CARD_SLOTS.map(
      () =>
        new ShaderMaterial({
          vertexShader: cardVert,
          fragmentShader: cardFrag,
          transparent: true,
          side: DoubleSide,
          uniforms: {
            uMap: { value: null },
            uUvScale: { value: new Vector2(1, 1) },
            uBackdrop: { value: new Color('#11141c') },
            uRimSide: { value: 0 },
            uLocalPointer: { value: new Vector2(0, 0) },
            uLightUv: { value: new Vector2(0.5, 0.85) },
            uLightPower: { value: 0.35 },
            uBlendEdges: { value: 0 },
            uFocus: { value: 0 },
            uHover: { value: 0 },
            uAlpha: { value: 0 },
            uRadius: { value: 0.065 },
            uAspect: { value: new Vector2(cardAspect, 1) },
            uVelocity: { value: 0 },
            uPointer: { value: new Vector2(0.5, 0.5) },
            uIsVideo: { value: 0 },
          },
        }),
    )
  }, [cardAspect])

  useEffect(() => {
    return () => {
      for (const m of cardMaterials) m.dispose()
    }
  }, [cardMaterials])

  // Pointer parallax + Work Stage raycasted card clicks & smooth momentum drag
  useEffect(() => {
    const dom = gl.domElement
    const raycaster = new Raycaster()
    const ndc = new Vector2()

    const hitTestCards = (
      clientX: number,
      clientY: number,
    ): { slot: number; localX: number; localY: number } | null => {
      if (roomRef.current !== 'work') return null
      const rect = dom.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      const visibleMeshes = cardMeshRefs.current.filter(
        (m): m is Mesh => m !== null && m.visible,
      )
      if (visibleMeshes.length === 0) return null
      const hits = raycaster.intersectObjects(visibleMeshes, false)
      if (hits.length === 0) return null
      const slotIdx = cardMeshRefs.current.indexOf(hits[0].object as Mesh)
      if (slotIdx < 0) return null
      const uv = hits[0].uv
      const localX = uv ? Math.max(-1, Math.min(1, (uv.x - 0.5) * 2)) : 0
      const localY = uv ? Math.max(-1, Math.min(1, (uv.y - 0.5) * 2)) : 0
      return { slot: CARD_SLOTS[slotIdx], localX, localY }
    }

    const onWindowPointerMove = (event: PointerEvent) => {
      if (!activeRef.current) return
      const nx = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2
      const ny = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2
      animRef.current.pointerVx = nx - animRef.current.pointerX
      animRef.current.pointerVy = ny - animRef.current.pointerY
      animRef.current.pointerX = nx
      animRef.current.pointerY = ny
      if (animRef.current.pointerActive === 0) {
        animRef.current.smoothClientX = event.clientX
        animRef.current.smoothClientY = event.clientY
      }
      animRef.current.clientX = event.clientX
      animRef.current.clientY = event.clientY
      animRef.current.pointerActive = 1

      if (roomRef.current === 'work' && !animRef.current.dragging) {
        const overHud = Boolean(
          (event.target as Element | null)?.closest(
            '.hud-top-filters, .hud-bottom-center, .studio-hud-top, .carousel-side-arrow',
          ),
        )
        const hit = overHud ? null : hitTestCards(event.clientX, event.clientY)
        animRef.current.hoveredSlot = hit ? hit.slot : null
        if (hit && hit.slot === 0) {
          animRef.current.cardTargetX = hit.localX
          animRef.current.cardTargetY = hit.localY
        } else {
          animRef.current.cardTargetX = 0
          animRef.current.cardTargetY = 0
        }
        dom.style.cursor = hit !== null ? 'pointer' : 'grab'
      } else if (!animRef.current.dragging) {
        animRef.current.hoveredSlot = null
        animRef.current.cardTargetX = 0
        animRef.current.cardTargetY = 0
        dom.style.cursor = ''
      }
    }

    const onWindowPointerLeave = () => {
      animRef.current.pointerX = 0
      animRef.current.pointerY = 0
      animRef.current.pointerActive = 0
      animRef.current.hoveredSlot = null
      animRef.current.cardTargetX = 0
      animRef.current.cardTargetY = 0
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!activeRef.current || event.button !== 0) return
      if (roomRef.current === 'intro' && event.pointerType === 'touch') {
        onWindowPointerMove(event)
        try {
          dom.setPointerCapture(event.pointerId)
        } catch {
          // Ignore if pointer capture is unavailable
        }
        return
      }
      if (roomRef.current !== 'work') return
      animRef.current.dragging = true
      animRef.current.dragStartX = event.clientX
      animRef.current.dragStartY = event.clientY
      animRef.current.dragStartPos = animRef.current.targetPos
      animRef.current.dragMoved = 0
      animRef.current.dragStartSlot =
        hitTestCards(event.clientX, event.clientY)?.slot ?? null
      dom.style.cursor = 'grabbing'
      dom.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!animRef.current.dragging || roomRef.current !== 'work') return
      const count = itemsRef.current.length
      if (count <= 1) return
      const dx = event.clientX - animRef.current.dragStartX
      const dy = event.clientY - animRef.current.dragStartY
      if (
        event.pointerType === 'touch' &&
        window.innerWidth <= 680 &&
        Math.abs(dy) > Math.abs(dx)
      ) {
        return
      }
      animRef.current.dragMoved = Math.max(
        animRef.current.dragMoved,
        Math.hypot(dx, dy),
      )
      const stride =
        window.innerWidth <= 680
          ? Math.max(150, window.innerWidth * 0.42)
          : Math.max(240, window.innerWidth * 0.3)
      const rawNext = animRef.current.dragStartPos - dx / stride
      // Subtle rubber-band resistance at first & last project boundaries (non-infinite)
      animRef.current.targetPos = Math.max(
        -0.28,
        Math.min(count - 0.72, rawNext),
      )
    }

    const finishDrag = (event: PointerEvent) => {
      if (roomRef.current === 'intro' && event.pointerType === 'touch') {
        if (dom.hasPointerCapture(event.pointerId)) {
          dom.releasePointerCapture(event.pointerId)
        }
        onWindowPointerLeave()
        return
      }
      if (!animRef.current.dragging) return
      animRef.current.dragging = false
      const startSlot = animRef.current.dragStartSlot
      animRef.current.dragStartSlot = null
      if (dom.hasPointerCapture(event.pointerId)) {
        dom.releasePointerCapture(event.pointerId)
      }
      const count = itemsRef.current.length
      const endHit = hitTestCards(event.clientX, event.clientY)
      const endSlot = endHit?.slot ?? null
      animRef.current.hoveredSlot = endSlot
      if (endHit && endHit.slot === 0) {
        animRef.current.cardTargetX = endHit.localX
        animRef.current.cardTargetY = endHit.localY
      } else {
        animRef.current.cardTargetX = 0
        animRef.current.cardTargetY = 0
      }
      dom.style.cursor = endSlot !== null ? 'pointer' : 'grab'

      if (animRef.current.dragMoved < 9) {
        // Strictly raycast-gated: only open when clicking directly on the center card mesh,
        // or step when clicking directly on a visible flanking card mesh. Empty background clicks do nothing.
        if (startSlot === 0 && endSlot === 0) {
          const active = itemsRef.current[activeIndexRef.current]
          if (active) onOpenWork(active.slug)
        } else if (
          startSlot !== null &&
          endSlot === startSlot &&
          startSlot !== 0 &&
          count > 1
        ) {
          const baseIdx = Math.round(animRef.current.targetPos)
          const nextIdx = clampIndex(baseIdx + startSlot, count)
          animRef.current.targetPos = nextIdx
          animRef.current.lastReportedIndex = nextIdx
          onSelectIndex(nextIdx)
        }
      } else if (count > 1) {
        const startIdx = clampIndex(
          Math.round(animRef.current.dragStartPos),
          count,
        )
        let snapped = clampIndex(Math.round(animRef.current.targetPos), count)
        if (window.innerWidth <= 680 && snapped === startIdx) {
          const totalDx = event.clientX - animRef.current.dragStartX
          const totalDy = event.clientY - animRef.current.dragStartY
          if (
            Math.abs(totalDx) >= 36 &&
            Math.abs(totalDx) > Math.abs(totalDy)
          ) {
            snapped = clampIndex(startIdx + (totalDx < 0 ? 1 : -1), count)
          }
        }
        animRef.current.targetPos = snapped
        animRef.current.lastReportedIndex = snapped
        onSelectIndex(snapped)
      }
    }

    window.addEventListener('pointermove', onWindowPointerMove, {
      passive: true,
    })
    window.addEventListener('pointerleave', onWindowPointerLeave, {
      passive: true,
    })
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', finishDrag)
    dom.addEventListener('pointercancel', finishDrag)

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerleave', onWindowPointerLeave)
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', finishDrag)
      dom.removeEventListener('pointercancel', finishDrag)
    }
  }, [camera, gl, onOpenWork, onSelectIndex])

  useFrame((state, rawDelta) => {
    if (!readySentRef.current) {
      readySentRef.current = true
      onReadyRef.current()
    }

    const dt = Math.min(0.05, rawDelta)
    const elapsed = state.clock.elapsedTime
    const a = animRef.current
    const motion = motionRef.current

    if (motion.snapNow) {
      const maxPos = Math.max(0, itemsRef.current.length - 1)
      const clampedCard = Math.max(0, Math.min(maxPos, motion.carouselGoal))
      a.smoothFly = motion.flyTarget
      a.flyVel = 0
      a.currentPos = clampedCard
      a.targetPos = clampedCard
      a.posVel = 0
      a.velocity = 0
      a.pullZ = 0
      a.dive = 0
      a.filterFade = 0
      a.dragging = false
      a.directJumpRef = null
      motion.snapNow = false
      motion.snapCarouselNow = false
      motion.directJump = null
    }

    if (motion.snapCarouselNow) {
      const maxPos = Math.max(0, itemsRef.current.length - 1)
      const clampedCard = Math.max(0, Math.min(maxPos, motion.carouselGoal))
      a.currentPos = clampedCard
      a.targetPos = clampedCard
      a.posVel = 0
      a.velocity = 0
      a.pullZ = 0
      motion.snapCarouselNow = false
    }

    const targetFilterFade = motion.filterFade ?? 0
    const fadeRate = targetFilterFade > a.filterFade ? 18.0 : 10.0
    a.filterFade +=
      (targetFilterFade - a.filterFade) * (1 - Math.exp(-dt * fadeRate))
    if (Math.abs(a.filterFade - targetFilterFade) < 0.002) {
      a.filterFade = targetFilterFade
    }
    const filterAlpha = 1 - a.filterFade

    // Direct 1-hop nav jump (e.g. About -> Experience): start 0.88 stations before destination
    // so the camera flies straight into the target without traversing intermediate stations!
    if (motion.directJump && a.directJumpRef !== motion.directJump) {
      a.directJumpRef = motion.directJump
      const { from, to } = motion.directJump
      const dir = Math.sign(to - from) || 1
      const maxPos = Math.max(0, itemsRef.current.length - 1)
      const clampedCard = Math.max(0, Math.min(maxPos, motion.carouselGoal))
      a.smoothFly = to - dir * 0.88
      a.flyVel = dir * 1.4
      a.currentPos = clampedCard
      a.targetPos = clampedCard
      a.posVel = 0
      a.velocity = 0
      a.pullZ = 0
    } else if (!motion.directJump && a.directJumpRef) {
      a.directJumpRef = null
    }

    const targetDive = motion.projectDive ?? 0
    if (targetDive > 0.5) {
      a.dive = Math.min(1, a.dive + dt * 2.65)
    } else if (a.dive > 0.001) {
      a.dive = Math.max(0, a.dive - dt * 6.5)
    } else {
      a.dive = 0
    }
    const diveEase = a.dive * a.dive * (3 - 2 * a.dive)

    if (!a.dragging) {
      const maxPos = Math.max(0, itemsRef.current.length - 1)
      a.targetPos = Math.max(0, Math.min(maxPos, motion.carouselGoal))
    }

    // Analytical C¹ critically damped spring on carousel position with adaptive phase stiffness:
    // drag = 18.5 (tight finger lock), follow = 6.2 (responsive wheel scrub), glide = 4.7 (weighty coast)
    const cardOmega = a.dragging ? 18.5 : motion.wheeling ? 6.2 : 4.7
    const [nextCardPos, nextCardVel] = stepCriticallyDamped(
      a.currentPos,
      a.posVel,
      a.targetPos,
      cardOmega,
      dt,
    )
    a.currentPos = nextCardPos
    a.posVel = nextCardVel
    a.velocity += (nextCardVel - a.velocity) * (1 - Math.exp(-dt * 8.5))

    // Asymmetric velocity-coupled Z-pullback (pulls cards gently back during brisk flings, glides forward on settle)
    const targetPull = Math.min(0.75, Math.abs(a.velocity) * 0.24)
    const pullRate = targetPull > a.pullZ ? 7.5 : 2.6
    a.pullZ += (targetPull - a.pullZ) * (1 - Math.exp(-dt * pullRate))

    // Heavy viscous Skhiladze-inspired pointer inertia (~1.1s smooth luxury settle)
    const ptrLerp = 1 - Math.exp(-dt * 2.35)
    a.smoothPointerX += (a.pointerX - a.smoothPointerX) * ptrLerp
    a.smoothPointerY += (a.pointerY - a.smoothPointerY) * ptrLerp
    // Cursor light-source glides smoothly right behind the tip of the cursor
    const lightLerp = 1 - Math.exp(-dt * 5.2)
    a.smoothClientX += (a.clientX - a.smoothClientX) * lightLerp
    a.smoothClientY += (a.clientY - a.smoothClientY) * lightLerp
    a.smoothPointerActive +=
      (a.pointerActive - a.smoothPointerActive) * (1 - Math.exp(-dt * 3.4))
    a.pointerVx *= Math.exp(-dt * 10)
    a.pointerVy *= Math.exp(-dt * 10)

    // Analytical C¹ critically damped spring on the 5-station ride timeline (0..4)
    const rideOmega = motion.wheeling ? 5.6 : 4.2
    const [nextFly, nextFlyVel] = stepCriticallyDamped(
      a.smoothFly,
      a.flyVel,
      motion.flyTarget,
      rideOmega,
      dt,
    )
    a.smoothFly = nextFly
    a.flyVel = nextFlyVel
    const flyVel = nextFlyVel
    const absFlyVel = Math.abs(flyVel)

    // Independent hero card hover tilt (only when cursor is INSIDE the centered settled card; decays level during slides)
    const isNearCenterRest =
      Math.abs(a.currentPos - Math.round(a.currentPos)) < 0.14
    const isOverCenterCard =
      roomRef.current === 'work' &&
      a.hoveredSlot === 0 &&
      !a.dragging &&
      isNearCenterRest
    a.hoverCenter +=
      ((isOverCenterCard ? 1 : 0) - a.hoverCenter) * (1 - Math.exp(-dt * 2.6))
    const cardTiltEase = 1 - Math.exp(-dt * 2.15)
    a.cardTiltX +=
      ((isOverCenterCard ? a.cardTargetX : 0) - a.cardTiltX) * cardTiltEase
    a.cardTiltY +=
      ((isOverCenterCard ? a.cardTargetY : 0) - a.cardTiltY) * cardTiltEase

    const count = projectTextures.length
    const baseIndex = clampIndex(Math.round(a.currentPos), count)

    // During a direct cross-section jump, suppress intermediate 3D stations (e.g. Work cards when jumping About -> Experience)
    if (
      motion.directJump &&
      Math.abs(a.smoothFly - motion.directJump.to) < 0.04
    ) {
      motion.directJump = null
      a.directJumpRef = null
    }
    const activeJump = motion.directJump
    const allowK = !activeJump || activeJump.from === 0 || activeJump.to === 0
    const allowWork =
      !activeJump || activeJump.from === 2 || activeJump.to === 2

    const workLightWeight =
      (allowWork ? 1 : 0) *
      smoothstep(1.32, 1.9, a.smoothFly) *
      (1 - smoothstep(2.12, 2.68, a.smoothFly))

    const isNarrow = size.width < 680

    /* Continuous Optical Z-Axis Flight Through All 5 Chapters (Synced 1:1 with Critically Damped Spring):
       - Station 0 (p = 0.0, Intro):      z =  6.25 looking at z = 0 (3D K)
       - Station 1 (p = 1.0, About):      z = -2.2  looking at z = -9.0 (About Dossier)
       - Station 2 (p = 2.0, Works):      z = -9.6  looking at z = -16.5 (Centered 3D Carousel)
       - Station 3 (p = 3.0, Experience): z = -21.8 looking at z = -28.5 (ACM Progression Stage)
       - Station 4 (p = 4.0, Contact):    z = -31.8 looking at z = -40.5 (Vertical Fiber-Optic Vortex Finale) */
    const z0 = isNarrow ? 8.35 : 6.25
    const z1 = isNarrow ? -1.4 : -2.2
    const z2 = isNarrow ? -6.2 : -9.6
    const z3 = isNarrow ? -20.6 : -21.8
    const z4 = isNarrow ? -30.5 : -31.8

    const s01 = smoothstep(0, 1, a.smoothFly)
    const s12 = smoothstep(1, 2, a.smoothFly)
    const s23 = smoothstep(2, 3, a.smoothFly)
    const s34 = smoothstep(3, 4, a.smoothFly)

    // Drive camera Z & lookZ directly from the critically damped spring (zero double-lag!)
    const camZ =
      z0 +
      (z1 - z0) * s01 +
      (z2 - z1) * s12 +
      (z3 - z2) * s23 +
      (z4 - z3) * s34 -
      diveEase * 4.8
    const lookZ =
      0 + -9.0 * s01 + -7.5 * s12 + -12.0 * s23 + -12.0 * s34 - diveEase * 4.0

    // Layer 1: Heavy viscous camera parallax around the vanishing point (reveals recessed 3D flanking cards)
    const parallaxScale = 1 - diveEase
    const camX = a.smoothPointerX * 0.65 * parallaxScale
    const camY = -a.smoothPointerY * 0.3 * parallaxScale
    const lookX = a.smoothPointerX * 0.14 * parallaxScale
    const lookY = -a.smoothPointerY * 0.06 * parallaxScale

    const ptrEase = 1 - Math.exp(-dt * 3.8)
    state.camera.position.x += (camX - state.camera.position.x) * ptrEase
    state.camera.position.y += (camY - state.camera.position.y) * ptrEase
    state.camera.position.z = camZ

    a.lookXCurrent += (lookX - a.lookXCurrent) * ptrEase
    a.lookYCurrent += (lookY - a.lookYCurrent) * ptrEase
    a.lookZCurrent = lookZ
    state.camera.lookAt(a.lookXCurrent, a.lookYCurrent, a.lookZCurrent)

    // Subtle dolly-zoom FOV breathing during forward/backward ride momentum + fly-through warp on project open
    if (camera instanceof PerspectiveCamera) {
      const targetFov = 40 + Math.min(3.2, absFlyVel * 1.9) + diveEase * 10.5
      a.fovCurrent += (targetFov - a.fovCurrent) * (1 - Math.exp(-dt * 6.0))
      if (Math.abs(camera.fov - a.fovCurrent) > 0.01) {
        camera.fov = a.fovCurrent
        camera.updateProjectionMatrix()
      }
    }

    // Keep cyclorama anchored smoothly ahead of the camera throughout the entire 5-station journey
    if (backdropRef.current) {
      backdropRef.current.position.z = state.camera.position.z - 28
      backdropRef.current.position.x = state.camera.position.x
    }

    // Dynamic Studio Lights traveling smoothly along the ride
    if (keyLightRef.current) {
      keyLightRef.current.position.set(
        4.6 + a.smoothPointerX * 1.8,
        3.6 - a.smoothPointerY * 1.4,
        state.camera.position.z + 1.8,
      )
    }
    if (rimLightRef.current) {
      rimLightRef.current.position.set(
        -4.8 - a.smoothPointerX * 1.5,
        -1.4 + a.smoothPointerY * 1.2,
        state.camera.position.z - 2.4,
      )
    }

    // Update Uniforms
    backdropMat.uniforms.uTime.value = elapsed
    backdropMat.uniforms.uPointer.value.set(a.smoothPointerX, a.smoothPointerY)
    backdropMat.uniforms.uRide.value = a.smoothFly
    backdropMat.uniforms.uWorkWeight.value = workLightWeight

    floorMat.uniforms.uTime.value = elapsed

    rideMat.uniforms.uTime.value = elapsed
    rideMat.uniforms.uFlyVel.value = flyVel + diveEase * 2.4
    rideMat.uniforms.uPointer.value.set(a.smoothPointerX, a.smoothPointerY)

    bokehMat.uniforms.uTime.value = elapsed
    bokehMat.uniforms.uFlyBoost.value =
      a.velocity * 0.35 + flyVel * 1.3 + diveEase * 2.6
    bokehMat.uniforms.uPointer.value.set(a.smoothPointerX, a.smoothPointerY)

    // Bidirectional camera-distance anti-clip fade on the 3D K (z = 0):
    // Guaranteed 0% opacity whenever the camera is closer than 2.2 units, whether zooming IN or OUT!
    const kCamDist = state.camera.position.z - 0.0
    const kFade = (allowK ? 1 : 0) * smoothstep(2.2, 4.5, kCamDist)
    kCarbonFaceMat.opacity = kFade
    kGoldBevelMat.opacity = kFade
    kGoldBevelMat.emissiveIntensity = 0.08
    cadmiumSatinMat.opacity = kFade
    amberSatinMat.opacity = kFade
    kBackHaloMat.opacity = 0.24 * kFade

    // Animate Dual-Material Sculpted 3D "K" Monolith
    if (monolithGroupRef.current) {
      monolithGroupRef.current.visible = kFade > 0.015
      const introWeight = 1 - smoothstep(0, 0.65, a.smoothFly)
      monolithGroupRef.current.position.y =
        (isNarrow ? 0.54 : 0.46) * introWeight +
        Math.sin(elapsed * 0.75) * 0.055
      monolithGroupRef.current.position.z = 0
      const flyExpand = 1 + smoothstep(0, 0.7, a.smoothFly) * 0.18
      monolithGroupRef.current.scale.setScalar(
        (isNarrow ? 0.56 : 0.77) * flyExpand,
      )
    }

    if (kGroupRef.current) {
      kGroupRef.current.rotation.y =
        Math.sin(elapsed * 0.38) * 0.26 + a.smoothPointerX * 0.42
      kGroupRef.current.rotation.x =
        Math.cos(elapsed * 0.3) * 0.08 + a.smoothPointerY * 0.22
      kGroupRef.current.rotation.z = Math.sin(elapsed * 0.22) * 0.03
    }

    if (ringARef.current) {
      ringARef.current.rotation.x = 1.15 + Math.sin(elapsed * 0.28) * 0.14
      ringARef.current.rotation.y = elapsed * 0.22 + a.smoothPointerX * 0.24
    }
    if (ringBRef.current) {
      ringBRef.current.rotation.x = -0.82 + Math.cos(elapsed * 0.22) * 0.16
      ringBRef.current.rotation.y = -elapsed * 0.18 - a.smoothPointerY * 0.2
    }
    if (shardGroupRef.current) {
      shardGroupRef.current.rotation.y =
        -elapsed * 0.08 + a.smoothPointerX * 0.18
      shardGroupRef.current.rotation.x = 0
    }

    // Bounded (non-infinite) Centered 3D Work Carousel at z = -16.5
    // Separate entrance (Intro -> Work) and fly-through exit (Work -> About) so cards NEVER slump or shrink on exit!
    const frac = a.currentPos - baseIndex
    const cardCamDist = state.camera.position.z - -16.5
    const cardNearSafe = smoothstep(3.2, 6.0, cardCamDist)
    const workEnter = smoothstep(1.28, 1.92, a.smoothFly)
    const workExit = smoothstep(2.04, 2.5, a.smoothFly)
    const workPresence =
      (allowWork ? 1 : 0) * workEnter * (1 - workExit) * cardNearSafe

    // Bind WebGL flanking cards directly to the shared continuously-playing HTML5 <video> pool
    // while keeping the crisp HD video-frame poster screenshot if a video is buffering or fails to load!
    const sharedVideos = videoElementsRef?.current
    if (sharedVideos) {
      for (let i = 0; i < projectTextures.length; i++) {
        const entry = projectTextures[i]
        if (!entry.hasLocalVideo) continue
        const sharedEl = sharedVideos[entry.work.slug]
        if (sharedEl?.error) {
          if (entry.isVideoTex && entry.fallbackTexture) {
            entry.texture.dispose()
            entry.texture = entry.fallbackTexture
            entry.isVideoTex = false
          }
          continue
        }
        if (
          !entry.isVideoTex &&
          sharedEl &&
          sharedEl.readyState >= 2 &&
          sharedEl.videoWidth > 0
        ) {
          const vTex = new VideoTexture(sharedEl)
          // Keep video in raw sRGB (NoColorSpace + skip colorspace_fragment) to prevent double-gamma shadow block artifacts,
          // and enable hardware mipmaps on WebGL2 so flanking video cards blur identically to static image cards!
          const useMipmaps = gl.capabilities.isWebGL2
          vTex.colorSpace = NoColorSpace
          vTex.minFilter = useMipmaps ? LinearMipmapLinearFilter : LinearFilter
          vTex.magFilter = LinearFilter
          vTex.generateMipmaps = useMipmaps
          vTex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
          entry.texture = vTex
          entry.isVideoTex = true
        }
      }
    }

    CARD_SLOTS.forEach((slotOffset, slotIdx) => {
      const mesh = cardMeshRefs.current[slotIdx]
      const mat = cardMaterials[slotIdx]
      if (!mesh || !mat || count === 0) return

      const itemIdx = baseIndex + slotOffset
      // Non-infinite: hide any slot outside [0, count - 1]
      if (workPresence < 0.015 || itemIdx < 0 || itemIdx >= count) {
        mesh.visible = false
        return
      }

      mesh.visible = true
      const entry = projectTextures[itemIdx]
      if (entry.loaded && entry.fade < 0.999) {
        entry.fade = Math.min(
          1,
          entry.fade + (1 - entry.fade) * (1 - Math.exp(-dt * 12)),
        )
      }
      const delta = slotOffset - frac
      const absDelta = Math.abs(delta)
      // Smooth C¹ focus plateau within ±0.05 of center so lighting reaches 100% seamlessly with zero jump
      const focus = Math.max(0, 1 - Math.max(0, absDelta - 0.05) * 1.12)

      // Gently part flanking cards outward as you glide through Work -> Experience or dive into a project
      // Deep architectural Z-recession + subtle depth parallax on flanking cards
      const xStride = (isNarrow ? 3.2 : 4.55) + workExit * 1.35 + diveEase * 2.4
      const posX =
        delta * xStride - (1 - focus) * a.smoothPointerX * 0.24 * absDelta
      const posY =
        Math.sin(delta * 0.85) * 0.14 +
        (isNarrow ? 0.24 : 0.1) +
        (1 - workEnter) * -0.35 +
        (1 - focus) * a.smoothPointerY * 0.12
      const posZ =
        -16.5 -
        a.pullZ -
        absDelta * 1.95 +
        focus * (1.05 + a.hoverCenter * 0.24)

      mesh.position.set(posX, posY, posZ)
      // Layer 2: Skhiladze-accurate viscous hover tilt — hovered corner lifts TOWARD the viewer!
      const tiltFade = 1 - diveEase
      mesh.rotation.set(
        (focus * (a.cardTiltY * 0.105) +
          (1 - focus) * a.smoothPointerY * 0.03) *
          tiltFade,
        -delta * 0.34 +
          (focus * (-a.cardTiltX * 0.145) +
            (1 - focus) * a.smoothPointerX * 0.04) *
            tiltFade,
        -delta * 0.024 + focus * (a.cardTiltX * a.cardTiltY * 0.02) * tiltFade,
      )

      // Keep scale steady on fly-through exit (subtle 1 -> 1.06 parallax feel + gentle portal expansion on dive!)
      const scale =
        (isNarrow ? 0.6 : 0.84) *
        (1 - Math.min(0.22, absDelta * 0.1)) *
        (0.92 + workEnter * 0.08 + workExit * 0.06 + focus * diveEase * 0.16)
      mesh.scale.setScalar(scale)

      mat.uniforms.uMap.value = entry.texture
      fitTextureUv(
        entry.texture,
        cardAspect,
        entry.contain,
        mat.uniforms.uUvScale.value,
      )
      mat.uniforms.uBackdrop.value.set(entry.contain ? '#47494f' : '#0f121a')
      mat.uniforms.uRimSide.value = slotOffset === 0 ? 0 : Math.sign(slotOffset)
      mat.uniforms.uLocalPointer.value.set(a.cardTiltX, a.cardTiltY)
      mat.uniforms.uBlendEdges.value = entry.contain ? 1 : 0
      mat.uniforms.uFocus.value = focus
      mat.uniforms.uHover.value = focus * a.hoverCenter * tiltFade
      // Keep left, center, and right cards 100% solid physical slabs (fade only beyond outer slots or during portal/filter fade)
      const outerEdgeFade = 1 - smoothstep(1.35, 2.05, absDelta)
      const flankDiveFade = 1 - smoothstep(0.0, 0.55, diveEase)
      const centerDiveFade = 1 - smoothstep(0.54, 0.96, diveEase)
      const diveAlpha = flankDiveFade + (centerDiveFade - flankDiveFade) * focus
      mat.uniforms.uAlpha.value =
        outerEdgeFade * workPresence * entry.fade * diveAlpha * filterAlpha
      mat.uniforms.uVelocity.value = Math.max(
        -1.5,
        Math.min(1.5, a.velocity * 0.22),
      )
      mat.uniforms.uPointer.value.set(
        a.smoothPointerX * 0.5 + 0.5,
        -a.smoothPointerY * 0.5 + 0.5,
      )
      mat.uniforms.uIsVideo.value = entry.isVideoTex ? 1 : 0
    })
  })

  return (
    <group>
      {/* Balanced Architectural Studio Lighting Rig */}
      <hemisphereLight args={['#dce6f8', '#152340', 0.78]} />
      <directionalLight position={[3, 7, 6]} intensity={1.55} color="#f5f3ee" />
      <pointLight
        ref={keyLightRef}
        position={[4.6, 3.6, 5.5]}
        intensity={18}
        distance={24}
        decay={1.8}
        color="#f5bd2a"
      />
      <pointLight
        ref={rimLightRef}
        position={[-4.8, -1.4, 2.5]}
        intensity={18}
        distance={24}
        decay={1.8}
        color="#f26322"
      />

      {/* 1. Studio Silk Cyclorama Backdrop (Tracks Camera Across All 5 Stations) */}
      <mesh
        ref={backdropRef}
        position={[0, 0, -26]}
        geometry={backdropGeo}
        material={backdropMat}
      />

      {/* 2. Sleek Dark Matte Studio Floor Spanning All 5 Ride Stations */}
      <mesh
        position={[0, -3.25, -20]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={floorGeo}
        material={floorMat}
      />

      {/* 3. Continuous 4-Layer Sztanki-Inspired 3D Particle Architecture (Floor River, Orbital Rings, Spatial Work Threads & Vertical Contact Vortex) */}
      <points geometry={rideGeo} material={rideMat} />

      {/* 4. Creamy Foreground Lens Bokeh Orbs */}
      <points geometry={bokehGeo} material={bokehMat} />

      {/* 5. Station 0 (Intro): Dual-Material Sculpted 3D Kurt "K" Monolith */}
      <group ref={monolithGroupRef} position={[0, 0, 0]}>
        <group ref={kGroupRef}>
          <mesh geometry={kGeo} material={kMaterials} />
          <mesh
            position={[0, 0, -0.22]}
            scale={[1.03, 1.03, 0.35]}
            geometry={kGeo}
            material={kBackHaloMat}
          />
        </group>
        <mesh ref={ringARef} geometry={ringAGeo} material={cadmiumSatinMat} />
        <mesh ref={ringBRef} geometry={ringBGeo} material={amberSatinMat} />
        <group ref={shardGroupRef}>
          {shardSeeds.map((s, idx) => (
            <mesh
              key={idx}
              position={[s.x, s.y, s.z]}
              scale={s.scale}
              rotation={[s.x, s.y, s.z]}
              geometry={shardGeo}
              material={s.amber ? amberSatinMat : kCarbonFaceMat}
            />
          ))}
        </group>
      </group>

      {/* 7. Station 2 (Works, z = -16.5): 5 Crystal-Clear HD 3D Carousel Cards with 16-Tap Bokeh Side Blur */}
      {CARD_SLOTS.map((slotOffset, slotIdx) => (
        <mesh
          key={slotOffset}
          ref={(el) => {
            cardMeshRefs.current[slotIdx] = el
          }}
          geometry={cardGeo}
          material={cardMaterials[slotIdx]}
        />
      ))}
    </group>
  )
}

class StudioErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

const StudioUniverse = memo(function StudioUniverse(
  props: StudioUniverseProps,
) {
  const isActive = props.active !== false
  const initialCamZ =
    props.room === 'contact'
      ? -31.8
      : props.room === 'experience'
        ? -21.8
        : props.room === 'work'
          ? -9.6
          : props.room === 'about'
            ? -2.2
            : 6.25

  return (
    <StudioErrorBoundary onError={props.onError}>
      <div className="studio-webgl-host">
        <Canvas
          frameloop={isActive ? 'always' : 'never'}
          dpr={[1, 2]}
          resize={{ scroll: false, debounce: 0 }}
          camera={{
            position: [0, 0, initialCamZ],
            fov: 40,
            near: 0.1,
            far: 85,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.12,
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
              props.onError()
            })
          }}
        >
          <StudioScene {...props} />
        </Canvas>
      </div>
    </StudioErrorBoundary>
  )
})

export default StudioUniverse
