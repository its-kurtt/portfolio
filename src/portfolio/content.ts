export type WorkCategory = 'web' | '3d' | 'animation'

export type PlateVariant =
  'expo' | 'cs-night' | 'elysium' | 'heartwired' | 'fit-acm' | 'revival-x'

export type WorkVideo = {
  href: string
  /** Optional local MP4/WebM path under /work/videos/ for live 3D card previews and native project playback */
  localSrc?: string
  /** Real HD video frame screenshot shown instantly while buffering, on flanking fallback, or if video fails to load */
  poster?: string
  /** Optional start timestamp (seconds) for the 3D carousel preview so longer videos open on highlights instead of slow intros */
  previewStart?: number
  /** Optional end timestamp (seconds) so carousel previews loop before black outro fades */
  previewEnd?: number
  tag: string
  headlineTop: string
  headlineAccent: string
  subline: string
  ctaLabel: string
}

export type Work = {
  slug: string
  title: string
  subtitle: string
  discipline: string
  disciplineTag: string
  categories: WorkCategory[]
  ambientTone: string
  accentColor: string
  secondaryTone: string
  period: string
  role: string
  leadMuted: string
  leadStrong: string
  summary: string
  /** Optional concise lead shown on the standalone project detail page */
  description?: string
  /** Scannable key facts rendered below the lead on the standalone project detail page */
  highlights?: string[]
  outcome: string
  tools: string[]
  isPlaceholder?: boolean
  plateVariant?: PlateVariant
  thumbnail?: string
  image?: string
  imageAlt?: string
  imageCaption?: string
  video?: WorkVideo
  external?: { href: string; label: string }
  references?: { prefix: string; label: string; href: string }[]
}

// Verified resume & supplied Facebook video works.
// Palette harmonized to Kurt's outfit: Obsidian Black, Indigo Denim, Studio White, Cadmium Yellow, Burnt Orange.
export const works: Work[] = [
  {
    slug: 'the-known-galaxy',
    title: 'The Known Galaxy',
    subtitle: 'Interactive Web Archive',
    discipline: 'Web design & front-end',
    disciplineTag: 'Web Design',
    categories: ['web'],
    ambientTone: '#1b2e4d',
    accentColor: '#f5bd2a',
    secondaryTone: '#2b4b82',
    period: 'Aug 2026 — present',
    role: 'Front-end developer & web designer',
    leadMuted: 'A sprawling community wiki',
    leadStrong: 'rebuilt as an interactive web world.',
    summary:
      'Solo-built React & TypeScript web archive reimagining the Jedi Order Notion wiki into a structured, immersive site for The Known Galaxy.',
    description:
      'Designed and built solo in React and TypeScript as a structured, interactive web archive for the Jedi Order community in the Roblox game The Known Galaxy.',
    highlights: [
      'Designed the experience from the ground up to look cohesive, neat, and easy to navigate, reimagining the original Notion wiki as a dedicated web hub rather than a dense, text-heavy page.',
    ],
    outcome: 'Interactive React archive',
    tools: ['React', 'TypeScript', 'CSS'],
    thumbnail: '/work/known-galaxy/thumbnail-collage.jpg',
    image: '/work/known-galaxy/live-home.jpg',
    imageAlt:
      'The Known Galaxy live web archive homepage with Spintir landing scene, Aurebesh subtitle, and cream typography.',
    imageCaption:
      'Landing hero — live capture from the-known-galaxy.vercel.app. Community and franchise imagery credited to respective creators.',
    external: {
      href: 'https://the-known-galaxy.vercel.app',
      label: 'Visit live site',
    },
    references: [
      {
        prefix: 'Based on',
        label: 'The Known Galaxy (Roblox)',
        href: 'https://www.roblox.com/games/4967088821/The-Known-Galaxy',
      },
      {
        prefix: 'Original Notion',
        label: 'The Jedi Order Wiki',
        href: 'https://knowngalaxy.notion.site/The-Jedi-Order-1765dd8da4174c6e8f950079b2bad00c',
      },
    ],
  },
  {
    slug: 'shards-of-the-past',
    title: 'Shards of the Past',
    subtitle: 'Sci-Fi 3D Game Assets',
    discipline: '3D game art',
    disciplineTag: '3D',
    categories: ['3d'],
    ambientTone: '#182845',
    accentColor: '#ff7a33',
    secondaryTone: '#365b9c',
    period: 'Dec 2022 — present',
    role: '3D Artist',
    leadMuted: 'Hard-surface sci-fi props',
    leadStrong: 'modeled for real-time play.',
    summary:
      'Optimized hard-surface sci-fi props, armor, weapons, and character morphs modeled in Blender for a Roblox game (kept under 10K triangles).',
    description:
      'Commissioned directly by the game’s project head, I model hard-surface sci-fi props, armor sets, weapons, equipment pods, consoles, and character morphs in Blender for the Roblox game Shards of the Past.',
    highlights: [
      'Most assets are translated directly from references provided by the project head and finished with free online material textures.',
      'Built with strict topology optimization—keeping even high-detail pieces under 10K triangles and as low-poly as possible so they run smoothly inside the Roblox engine.',
    ],
    outcome: 'Approved assets in-game',
    tools: ['Blender'],
    thumbnail: '/work/shards/thumbnail-collage.jpg',
    image: '/work/shards/render-01.jpg',
    imageAlt:
      'Tilted multi-panel showcase collage of Shards of the Past Blender 3D renders including lightsabers, glowing sci-fi containment core, power cells, and armored character morphs.',
    imageCaption:
      'Multi-render showcase collage of original Blender renders from my supplied Shards of the Past modeling archive.',
  },
  {
    slug: 'acm-heartwired',
    title: 'ACM Heartwired',
    subtitle: 'Valentine’s Event Teaser',
    discipline: '3D & animation',
    disciplineTag: '3D & Animation',
    categories: ['3d', 'animation'],
    ambientTone: '#4d1b1d',
    accentColor: '#f26322',
    secondaryTone: '#f5bd2a',
    period: 'Jan 2025',
    role: '3D Animator',
    leadMuted: '3D teaser trailer',
    leadStrong: 'for ACM’s Valentine’s event Heartwired.',
    summary:
      '3D Valentine’s event teaser for FEU Tech ACM — modeled and animated from scratch in Blender (6.2K views).',
    description:
      'Official 3D teaser trailer created for FEU Tech ACM Student Chapter’s Valentine’s event, Heartwired.',
    highlights: [
      'Built entirely in Blender, I modeled every object in the scene from scratch and animated the full sequence to bring the event’s visual theme to life.',
      'The finished teaser earned 6.2K views on Facebook.',
    ],
    outcome: '6.2K views',
    tools: ['Blender'],
    plateVariant: 'heartwired',
    imageAlt:
      '3D Blender scene from ACM Heartwired Valentine’s event teaser showing stylized red hearts and a calendar struck by an arrow.',
    video: {
      href: 'https://www.facebook.com/share/v/1CcfkV87nW/',
      localSrc: '/work/videos/acm-heartwired.mp4',
      poster: '/work/videos/posters/acm-heartwired.jpg',
      previewStart: 20.67,
      previewEnd: 54,
      tag: 'FEU TECH ACM · VALENTINE’S TEASER',
      headlineTop: 'HEART',
      headlineAccent: 'WIRED.',
      subline: 'Teaser trailer for ACM’s Valentine’s event, Heartwired.',
      ctaLabel: 'PLAY HEARTWIRED TEASER',
    },
  },
  {
    slug: 'cs-night-2026',
    title: 'CS Night 2026',
    subtitle: 'Official Event Trailer',
    discipline: '3D & animation',
    disciplineTag: '3D & Animation',
    categories: ['3d', 'animation'],
    ambientTone: '#1b2c4a',
    accentColor: '#f5bd2a',
    secondaryTone: '#f26322',
    period: 'May 2025',
    role: '3D Animator',
    leadMuted: '3D motion and pacing',
    leadStrong: 'for the official CS Night 2026 trailer.',
    summary:
      'Official 3D event trailer for CS Night 2026 by FEU Tech ACM, screened across campus (6.4K views).',
    description:
      'Official promotional trailer for CS Night 2026 presented by the FEU Tech ACM Student Chapter.',
    highlights: [
      'I handled the 3D animation in Blender, crafting an engaging teaser to build anticipation ahead of the event.',
      'The trailer was shown all throughout the campus and earned 6.4K views.',
    ],
    outcome: '6.4K views',
    tools: ['Blender'],
    plateVariant: 'cs-night',
    imageAlt:
      '3D animated scene from the official CS Night 2026 event trailer for FEU Tech ACM modeled and rendered in Blender.',
    video: {
      href: 'https://www.facebook.com/share/v/19rwB6Sa4S/',
      localSrc: '/work/videos/cs-night-2026.mp4',
      poster: '/work/videos/posters/cs-night-2026.jpg',
      previewStart: 6,
      previewEnd: 52,
      tag: 'CS NIGHT 2026 · 3D & ANIMATION',
      headlineTop: 'CS NIGHT',
      headlineAccent: '2026.',
      subline: 'Official 3D and animated event trailer for CS Night.',
      ctaLabel: 'PLAY CS NIGHT TRAILER',
    },
  },
  {
    slug: 'fit-acm-25-26',
    title: 'FIT ACM ’25–’26',
    subtitle: 'School Year Recap',
    discipline: '3D & animation',
    disciplineTag: '3D & Animation',
    categories: ['3d', 'animation'],
    ambientTone: '#172947',
    accentColor: '#f5bd2a',
    secondaryTone: '#365b9c',
    period: 'Aug 2025',
    role: '3D Animator',
    leadMuted: 'Looking back at FEU Tech ACM',
    leadStrong: 'across school year 2025–2026.',
    summary:
      'School year 2025–2026 3D retrospective for FEU Tech ACM, with scenes adapted from each event’s main poster (4.3K views).',
    description:
      'A 3D retrospective looking back at the FEU Tech ACM Student Chapter across school year 2025–2026.',
    highlights: [
      'Animated in Blender, each scene was designed around the themes of the chapter’s main posters so every milestone flows together into one cohesive recap.',
      'The video earned 4.3K views.',
    ],
    outcome: '4.3K views',
    tools: ['Blender'],
    plateVariant: 'fit-acm',
    imageAlt:
      '3D Blender retrospective scene from FIT ACM 2025–2026 school year recap inspired by the chapter’s event posters.',
    video: {
      href: 'https://www.facebook.com/share/v/1E5vHC9i6N/',
      localSrc: '/work/videos/fit-acm-25-26.mp4',
      poster: '/work/videos/posters/fit-acm-25-26.jpg',
      previewStart: 75.77,
      previewEnd: 185,
      tag: 'FEU TECH ACM · SY 2025–2026',
      headlineTop: 'FIT ACM',
      headlineAccent: '’25–’26.',
      subline:
        'Looking back at FEU Tech ACM Student Chapter during school year 2025–2026.',
      ctaLabel: 'PLAY YEAR RECAP',
    },
  },
  {
    slug: 'acm-revival-x',
    title: 'ACM Revival X',
    subtitle: 'Flagship Event Teaser',
    discipline: '3D & animation',
    disciplineTag: '3D & Animation',
    categories: ['3d', 'animation'],
    ambientTone: '#3b1d12',
    accentColor: '#ff7a33',
    secondaryTone: '#f5bd2a',
    period: 'Jan 2025',
    role: '3D Animator',
    leadMuted: '3D teaser production',
    leadStrong: 'for ACM’s flagship event, Revival X.',
    summary:
      'Cinematic 3D teaser for FEU Tech ACM’s flagship event, Revival X — modeled and animated in Blender (2.2K views).',
    description:
      'Official 3D teaser trailer for FEU Tech ACM’s flagship event, Revival X, adapted directly from the event’s main poster.',
    highlights: [
      'Working in Blender, I modeled and animated every object in the teaser with a focus on making the presentation as cinematic as possible.',
      'The teaser earned 2.2K views.',
    ],
    outcome: '2.2K views',
    tools: ['Blender'],
    plateVariant: 'revival-x',
    imageAlt:
      'Cinematic 3D Blender teaser frame from FEU Tech ACM’s flagship event Revival X.',
    video: {
      href: 'https://www.facebook.com/share/v/1A79Ufg7db/',
      localSrc: '/work/videos/revival-x.mp4',
      poster: '/work/videos/posters/acm-revival-x.jpg',
      previewStart: 13.5,
      previewEnd: 17.5,
      tag: 'FEU TECH ACM · FLAGSHIP TEASER',
      headlineTop: 'REVIVAL',
      headlineAccent: 'X.',
      subline: 'Teaser for FEU Tech ACM’s flagship event, Revival X.',
      ctaLabel: 'PLAY REVIVAL X TEASER',
    },
  },
  {
    slug: 'acm-elysium-18',
    title: 'ACM Elysium',
    subtitle: '18th Anniversary Retrospective',
    discipline: '3D & animation',
    disciplineTag: '3D & Animation',
    categories: ['3d', 'animation'],
    ambientTone: '#3c2c12',
    accentColor: '#f5bd2a',
    secondaryTone: '#2b4b82',
    period: 'Jun 2025',
    role: '3D Animator',
    leadMuted: 'Looking back at 18 years of ACM',
    leadStrong: 'leading into Elysium Night.',
    summary:
      '18th anniversary 3D retrospective for FEU Tech ACM leading into Elysium Night, animated in Blender (1.8K views).',
    description:
      'An 18th anniversary retrospective created for FEU Tech ACM leading into Elysium Night.',
    highlights: [
      'Animated in Blender, my plan was to take everyone on a journey through the past—tracing the organization from the very start of FIT ACM to the present to celebrate 18 years of the chapter.',
      'The tribute earned 1.8K views.',
    ],
    outcome: '1.8K views',
    tools: ['Blender'],
    plateVariant: 'elysium',
    imageAlt:
      '3D Blender anniversary retrospective scene from ACM Elysium celebrating 18 years of FEU Tech ACM.',
    video: {
      href: 'https://www.facebook.com/share/v/19xdASjj6q/',
      localSrc: '/work/videos/acm-elysium.mp4',
      poster: '/work/videos/posters/acm-elysium-18.jpg',
      previewStart: 60,
      previewEnd: 90,
      tag: 'FEU TECH ACM · 18 YEARS',
      headlineTop: 'ACM',
      headlineAccent: 'ELYSIUM.',
      subline:
        'Looking back at 18 years of ACM before the event of Elysium Night.',
      ctaLabel: 'PLAY ELYSIUM VIDEO',
    },
  },
]

export const lessons = [
  {
    title: 'Basic Newcomer Training',
    rank: 'Force-sensitive',
    description:
      'The Jedi Code, a temple tour, and fundamental laws for incoming members.',
    image: 'basic-newcomer',
  },
  {
    title: 'Foundations of Combat',
    rank: 'Youngling I or II',
    description:
      'Combat fundamentals and foundational lightsaber defensive sequences.',
    image: 'foundations-of-combat',
  },
  {
    title: 'Path to Knowledge',
    rank: 'Youngling I or II',
    description: 'Jedi history, philosophy, and the archives.',
    image: 'path-to-knowledge',
  },
  {
    title: 'Crystal Gathering',
    rank: 'Youngling III',
    description:
      'A guided expedition to discover, align with, and harvest a Kyber crystal.',
    image: 'crystal-gathering',
  },
  {
    title: 'Further Combat Education',
    rank: 'Youngling IV',
    description:
      'Advanced form application, battlefield adaptation, and defense against multiple opponents.',
    image: 'further-combat-education',
  },
] as const

export const decisions = [
  {
    name: 'Content',
    file: 'trainings.ts',
    title: 'One collection. Five lessons.',
    text: 'Titles, rank requirements, descriptions, and image references live in a separate data file. The card component describes presentation, rather than holding a second copy of the content.',
  },
  {
    name: 'State',
    file: 'use-training-carousel.ts',
    title: 'One index drives the view.',
    text: 'The source hook owns the active lesson and navigation. A repeated set of cards creates the original continuous track. This smaller portfolio adaptation wraps the active index across the same five lessons.',
  },
  {
    name: 'Input',
    file: 'training-navigation.tsx',
    title: 'Different inputs. Same action.',
    text: 'Previous, next, direct lesson selection, arrow keys, and touch swipes all move through the collection. Here, arrow keys are scoped to the lesson preview so they do not hijack the rest of the page.',
  },
  {
    name: 'Layout',
    file: 'training-card.tsx',
    title: 'The lesson survives the viewport.',
    text: 'The original composition has a central card and neighboring cards. This adaptation keeps one readable lesson, reflows its image and text, and keeps the same active lesson when you change preview width.',
  },
] as const
