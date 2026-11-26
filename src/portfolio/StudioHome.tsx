import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { KeyboardEvent } from 'react'
import { works } from './content'
import type { Work, WorkCategory } from './content'
import { Arrow } from './FeatureLab'
import { pathForSection, sectionFromLocation } from './routes'
import { SkeletonImage } from './SkeletonMedia'
import type { StudioMotionGoal, StudioRoom } from './StudioUniverse'
import './studio.css'

const StudioUniverse = lazy(() => import('./StudioUniverse'))

type FilterKey = 'all' | WorkCategory

const filterOptions: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ALL PROJECTS' },
  { key: 'web', label: 'WEB DESIGN' },
  { key: '3d', label: '3D' },
  { key: 'animation', label: 'ANIMATION' },
]

type ExperienceRole = {
  id: string
  role: string
  period: string
  highlights: string[]
}

type ExperienceOrg = {
  id: string
  org: string
  span: string
  roles: ExperienceRole[]
}

// Scalable organization-grouped experience data: add new internships/roles as additional ExperienceOrg entries.
const experienceGroups: ExperienceOrg[] = [
  {
    id: 'feu-tech-acm',
    org: 'FEU Tech ACM Student Chapter',
    span: '2024 — 2026',
    roles: [
      {
        id: 'director',
        role: 'Director for Creatives',
        period: 'Jan 2026 – Jul 2026',
        highlights: [
          'Maintained branding across 7 events, reviewing team output and producing 2D & 3D materials.',
          'Mentored two incoming creative leaders for succession and knowledge transfer.',
        ],
      },
      {
        id: 'co-director',
        role: 'Co-Director for Creatives',
        period: 'Aug 2025 – Jan 2026',
        highlights: [
          'Directed branding across 4 events with the Creatives Committee and marketing.',
          'Event Head for Boot Up!, welcoming 300+ new ACM members.',
        ],
      },
      {
        id: 'junior-officer',
        role: 'Junior Officer for Creatives',
        period: 'Sep 2024 – Jul 2025',
        highlights: [
          'Supported 6 events with 2D graphics and 3D animations in Canva, Photoshop, and Blender.',
          'Led a small sub-team to deliver timely visuals across 3 chapter events.',
        ],
      },
    ],
  },
]

type Certification = {
  title: string
  meta: string
  image: string
  alt: string
}

const certifications: Certification[] = [
  {
    title: 'PMI Project Management Ready',
    meta: 'Project Management Institute · Mar 2026',
    image: '/certificates/PMI_Project_Management_Ready.jpg',
    alt: 'PMI Project Management Ready certificate awarded to Kurt',
  },
  {
    title: 'IT Specialist – Python',
    meta: 'Certiport · Jul 2025',
    image: '/certificates/IT_Specialist_Python.jpg',
    alt: 'Certiport IT Specialist in Python certificate awarded to Kurt',
  },
]

const techStackGroups = [
  {
    label: 'Front-end',
    items: ['React', 'TypeScript', 'JavaScript', 'HTML / CSS', 'Figma'],
  },
  {
    label: '3D & Design',
    items: ['Blender', 'Photoshop', 'Canva'],
  },
  {
    label: 'Other',
    items: ['Python', 'Java', 'C++', 'Lua', 'Node.js', 'MongoDB'],
  },
]

function progressForRoom(r: StudioRoom): number {
  if (r === 'about') return 1
  if (r === 'work') return 2
  if (r === 'experience') return 3
  if (r === 'contact') return 4
  return 0
}

export function formatManilaTime(date: Date) {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return 'UTC+8'
  }
}

export function StudioTopHeader({
  currentRoom,
  onSelectRoom,
}: {
  currentRoom: StudioRoom
  onSelectRoom?: (room: StudioRoom) => void
}) {
  const [clock, setClock] = useState(() => formatManilaTime(new Date()))

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(formatManilaTime(new Date()))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const navItems: { room: StudioRoom; path: string; label: string }[] = [
    { room: 'intro', path: '/', label: 'INTRO' },
    { room: 'about', path: '/about', label: 'ABOUT' },
    { room: 'work', path: '/projects', label: 'PROJECTS' },
    { room: 'experience', path: '/experience', label: 'EXPERIENCE' },
    { room: 'contact', path: '/contact', label: 'CONTACT' },
  ]

  return (
    <header className="studio-hud-top">
      <a
        href="/"
        data-route={onSelectRoom ? undefined : true}
        className="studio-identity"
        aria-label="Kurt, intro"
        onClick={
          onSelectRoom
            ? (e) => {
                e.preventDefault()
                onSelectRoom('intro')
              }
            : undefined
        }
      >
        <img src="/brand/kurt-logo.png" width="26" height="30" alt="" />
        <span className="identity-meta">
          <strong>KURT</strong>
          <small>MANILA · {clock} PHT</small>
        </span>
      </a>

      <nav className="studio-capsule-nav" aria-label="Main navigation">
        {navItems.map((item, idx) => (
          <span key={item.room} className="capsule-nav-slot">
            {idx > 0 && <span className="capsule-rule" aria-hidden="true" />}
            <a
              href={item.path}
              data-route={onSelectRoom ? undefined : true}
              className={currentRoom === item.room ? 'is-current' : ''}
              onClick={
                onSelectRoom
                  ? (e) => {
                      e.preventDefault()
                      onSelectRoom(item.room)
                    }
                  : undefined
              }
            >
              {item.label}
            </a>
          </span>
        ))}
      </nav>
    </header>
  )
}

export function ShowcasePlate({ work }: { work: Work }) {
  const src = work.thumbnail ?? work.image
  if (src) {
    return (
      <img
        src={src}
        alt={work.imageAlt ?? work.title}
        width="1200"
        height="800"
        loading="lazy"
      />
    )
  }
  if (work.video?.localSrc) {
    return (
      <video
        src={work.video.localSrc}
        poster={work.video.poster}
        aria-label={`${work.title} video preview`}
        muted
        loop
        playsInline
        autoPlay
        disablePictureInPicture
        disableRemotePlayback
        preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    )
  }
  if (work.video) {
    return (
      <div
        className={`studio-plate plate-${work.plateVariant ?? 'expo'}`}
        aria-label={`${work.title} showcase visual`}
      >
        <span>{work.video.tag}</span>
        <strong>
          {work.video.headlineTop}
          <br />
          <em>{work.video.headlineAccent}</em>
        </strong>
        <span>{work.disciplineTag.toUpperCase()} · VIDEO SHOWCASE</span>
      </div>
    )
  }
  return (
    <div
      className="studio-plate plate-expo"
      aria-label={`${work.title} showcase visual`}
    >
      <span>{work.disciplineTag.toUpperCase()}</span>
      <strong>{work.title}</strong>
      <span>{work.period}</span>
    </div>
  )
}

export function StudioHome({
  active = true,
  onOpenWork,
  initialWorkSlug,
  onRoomChange,
  onRegisterJump,
}: {
  active?: boolean
  onOpenWork?: (slug: string) => void
  initialWorkSlug?: string
  onRoomChange?: (room: StudioRoom) => void
  onRegisterJump?: (
    fn: ((room: StudioRoom, instant?: boolean) => void) | null,
  ) => void
}) {
  const initialWorkIdx = useMemo(() => {
    if (!initialWorkSlug) return 0
    const found = works.findIndex((item) => item.slug === initialWorkSlug)
    return found >= 0 ? found : 0
  }, [initialWorkSlug])

  const [room, setRoom] = useState<StudioRoom>(() =>
    sectionFromLocation(window.location.pathname, window.location.hash),
  )
  const [filter, setFilter] = useState<FilterKey>('all')
  const [visualFilter, setVisualFilter] = useState<FilterKey>('all')
  const filterBarRef = useRef<HTMLDivElement>(null)
  const filterBtnRefs = useRef<
    Partial<Record<FilterKey, HTMLButtonElement | null>>
  >({})
  const filterTimerRef = useRef<number | null>(null)
  const [filterPill, setFilterPill] = useState<{
    left: number
    width: number
    ready: boolean
  }>({ left: 0, width: 0, ready: false })
  const [activeIndex, setActiveIndex] = useState<number>(() => initialWorkIdx)
  const [allowWebGL, setAllowWebGL] = useState(true)
  const [webglReady, setWebglReady] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [experienceIndex, setExperienceIndex] = useState<number>(0)
  const [activeCert, setActiveCert] = useState<Certification | null>(null)
  const [certClosing, setCertClosing] = useState(false)
  const certCloseTimerRef = useRef<number | null>(null)

  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacyClosing, setPrivacyClosing] = useState(false)
  const privacyCloseTimerRef = useRef<number | null>(null)
  const privacyOpenRef = useRef(false)
  useEffect(() => {
    privacyOpenRef.current = privacyOpen
  }, [privacyOpen])

  const openPrivacy = useCallback(() => {
    if (privacyCloseTimerRef.current !== null) {
      window.clearTimeout(privacyCloseTimerRef.current)
      privacyCloseTimerRef.current = null
    }
    setPrivacyClosing(false)
    setPrivacyOpen(true)
  }, [])

  const closePrivacy = useCallback(() => {
    if (!privacyOpenRef.current) return
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduced) {
      setPrivacyClosing(false)
      setPrivacyOpen(false)
      return
    }
    if (privacyCloseTimerRef.current !== null) return
    setPrivacyClosing(true)
    privacyCloseTimerRef.current = window.setTimeout(() => {
      privacyCloseTimerRef.current = null
      setPrivacyClosing(false)
      setPrivacyOpen(false)
    }, 220)
  }, [])

  const activeCertRef = useRef<Certification | null>(null)
  useEffect(() => {
    activeCertRef.current = activeCert
  }, [activeCert])

  const openCert = useCallback((cert: Certification) => {
    if (certCloseTimerRef.current !== null) {
      window.clearTimeout(certCloseTimerRef.current)
      certCloseTimerRef.current = null
    }
    setCertClosing(false)
    setActiveCert(cert)
  }, [])

  const closeCert = useCallback(() => {
    if (!activeCertRef.current) return
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduced) {
      setCertClosing(false)
      setActiveCert(null)
      return
    }
    if (certCloseTimerRef.current !== null) return
    setCertClosing(true)
    certCloseTimerRef.current = window.setTimeout(() => {
      certCloseTimerRef.current = null
      setCertClosing(false)
      setActiveCert(null)
    }, 220)
  }, [])

  useEffect(() => {
    return () => {
      if (certCloseTimerRef.current !== null) {
        window.clearTimeout(certCloseTimerRef.current)
      }
      if (privacyCloseTimerRef.current !== null) {
        window.clearTimeout(privacyCloseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    onRoomChange?.(room)
  }, [room, onRoomChange])

  const safeExpIndex = Math.max(
    0,
    Math.min(experienceGroups.length - 1, experienceIndex),
  )

  // High-frequency motion target read directly inside WebGL useFrame (ZERO React re-renders per wheel tick!)
  const motionRef = useRef<StudioMotionGoal>({
    flyTarget: progressForRoom(
      sectionFromLocation(window.location.pathname, window.location.hash),
    ),
    carouselGoal: initialWorkIdx,
    wheeling: false,
  })
  const touchStartYRef = useRef<number | null>(null)
  const worksCountRef = useRef(works.length)
  const activeIndexRef = useRef(initialWorkIdx)
  const aboutGridRef = useRef<HTMLDivElement>(null)
  const experienceCardRef = useRef<HTMLDivElement>(null)
  const contactCardRef = useRef<HTMLDivElement>(null)
  const videoElementsRef = useRef<Record<string, HTMLVideoElement | null>>({})
  const videoInitializedRef = useRef<Record<string, boolean>>({})
  const videoFailedRef = useRef<Record<string, boolean>>({})
  const [videoWaveTwoReady, setVideoWaveTwoReady] = useState(false)
  // Unified continuous Piven-Ilya-style 5-chapter timeline:
  // Stop 0 = Intro, Stop 1 = About, Stops 2..(worksCount+1) = Works 01..N,
  // Stop (worksCount+2) = Experience, Stop (worksCount+3) = Contact
  const timelineRef = useRef({
    goal:
      room === 'intro'
        ? 0
        : room === 'about'
          ? 1
          : room === 'work'
            ? 2 + initialWorkIdx
            : room === 'experience'
              ? works.length + 2
              : works.length + 3,
    wheeling: false,
    wheelFrom: 0,
    wheelSum: 0,
    settleTimer: 0,
  })

  const filteredWorks = useMemo(
    () =>
      filter === 'all'
        ? works
        : works.filter((item) => item.categories.includes(filter)),
    [filter],
  )

  const safeIndex =
    filteredWorks.length > 0
      ? Math.max(0, Math.min(filteredWorks.length - 1, activeIndex))
      : 0
  const activeWork = filteredWorks[safeIndex] ?? works[0]

  useEffect(() => {
    worksCountRef.current = filteredWorks.length
  }, [filteredWorks.length])

  useEffect(() => {
    activeIndexRef.current = safeIndex
  }, [safeIndex])

  const videoWorks = useMemo(
    () => works.filter((item) => Boolean(item.video?.localSrc)),
    [],
  )

  const ensurePreviewStart = useCallback(
    (slug: string, v: HTMLVideoElement, startAt: number) => {
      if (startAt <= 0 || videoInitializedRef.current[slug]) return
      if (v.readyState < 1 || !Number.isFinite(v.duration)) return
      const target = Math.min(startAt, Math.max(0, v.duration - 2))
      if (target <= 0) {
        videoInitializedRef.current[slug] = true
        return
      }
      if (v.currentTime >= target - 1.5) {
        videoInitializedRef.current[slug] = true
        return
      }
      if (!v.seeking) {
        try {
          v.currentTime = target
        } catch {
          // Wait for loadeddata/canplay if media range is not yet seekable
        }
      }
    },
    [],
  )

  // Stagger second wave of background video streams by 200ms so all 6 MP4s don't contend for HTTP/1.1's 6-socket pool
  useEffect(() => {
    if (!active || !allowWebGL || videoWaveTwoReady) return
    const timer = window.setTimeout(() => setVideoWaveTwoReady(true), 200)
    return () => window.clearTimeout(timer)
  }, [active, allowWebGL, videoWaveTwoReady])

  // Keep all carousel preview videos playing continuously in the background (never resetting to 0:00)
  // and guarantee cached/fast-loading videos also jump to their mid-point previewStart!
  useEffect(() => {
    const els = videoElementsRef.current
    for (const item of videoWorks) {
      const v = els[item.slug]
      if (!v || videoFailedRef.current[item.slug]) continue
      const startAt = item.video?.previewStart ?? 0
      ensurePreviewStart(item.slug, v, startAt)
      if (active && allowWebGL) {
        if (v.paused && v.getAttribute('src')) {
          void v.play().catch(() => {})
        }
      } else if (!v.paused) {
        v.pause()
      }
    }
  }, [active, allowWebGL, videoWorks, videoWaveTwoReady, ensurePreviewStart])

  const handleWebglReady = useCallback(() => {
    setWebglReady(true)
  }, [])

  const handleWebglError = useCallback(() => {
    setWebglFailed(true)
    setWebglReady(false)
  }, [])

  // Maps any continuous timeline position g (0 .. count + 3) into smooth 3D ride + bounded carousel + active room
  // Mutates motionRef directly so wheeling triggers ZERO React re-renders unless the active room/card actually changes!
  const applyTimelineGoal = useCallback(
    (rawGoal: number, syncHash: boolean) => {
      const count = Math.max(1, worksCountRef.current)
      const maxStop = count + 3
      const g = Math.max(0, Math.min(maxStop, rawGoal))
      timelineRef.current.goal = g

      let ride: number
      let cardPos: number
      if (g <= 2) {
        ride = g
        cardPos = 0
      } else if (g <= count + 1) {
        ride = 2
        cardPos = g - 2
      } else {
        ride = 2 + (g - (count + 1))
        cardPos = count - 1
      }

      motionRef.current.flyTarget = ride
      motionRef.current.carouselGoal = cardPos

      const nearestStop = Math.round(g)
      let nextRoom: StudioRoom
      let nextIdx: number
      if (nearestStop <= 0) {
        nextRoom = 'intro'
        nextIdx = 0
      } else if (nearestStop === 1) {
        nextRoom = 'about'
        nextIdx = 0
      } else if (nearestStop <= count + 1) {
        nextRoom = 'work'
        nextIdx = nearestStop - 2
      } else if (nearestStop === count + 2) {
        nextRoom = 'experience'
        nextIdx = count - 1
      } else {
        nextRoom = 'contact'
        nextIdx = count - 1
      }

      setRoom((prev) => (prev === nextRoom ? prev : nextRoom))
      setActiveIndex((prev) => (prev === nextIdx ? prev : nextIdx))

      if (syncHash) {
        const nextUrl = pathForSection(nextRoom)
        if (window.location.pathname + window.location.hash !== nextUrl) {
          window.history.replaceState(window.history.state, '', nextUrl)
        }
      }
    },
    [],
  )

  const goRoom = useCallback(
    (next: StudioRoom, instant = false) => {
      const count = Math.max(1, worksCountRef.current)
      const preservedIdx = Math.max(
        0,
        Math.min(count - 1, activeIndexRef.current),
      )
      const stop =
        next === 'intro'
          ? 0
          : next === 'about'
            ? 1
            : next === 'work'
              ? 2 + preservedIdx
              : next === 'experience'
                ? count + 2
                : count + 3
      const fromRide = motionRef.current.flyTarget
      const toRide =
        next === 'intro'
          ? 0
          : next === 'about'
            ? 1
            : next === 'work'
              ? 2
              : next === 'experience'
                ? 3
                : 4
      timelineRef.current.wheeling = false
      motionRef.current.wheeling = false
      if (instant) {
        motionRef.current.snapNow = true
        motionRef.current.directJump = null
      } else if (Math.abs(toRide - fromRide) > 1.05) {
        // Direct 1-hop fly-through straight from current section to destination (skips intermediate stations)
        motionRef.current.directJump = { from: fromRide, to: toRide }
      } else {
        motionRef.current.directJump = null
      }
      applyTimelineGoal(stop, !instant)
    },
    [applyTimelineGoal],
  )

  useEffect(() => {
    onRegisterJump?.(goRoom)
    return () => onRegisterJump?.(null)
  }, [goRoom, onRegisterJump])

  const selectProjectIndex = useCallback(
    (idx: number) => {
      const count = Math.max(1, worksCountRef.current)
      const clamped = Math.max(0, Math.min(count - 1, idx))
      timelineRef.current.wheeling = false
      motionRef.current.wheeling = false
      motionRef.current.directJump = null
      applyTimelineGoal(2 + clamped, true)
    },
    [applyTimelineGoal],
  )

  const [divingWork, setDivingWork] = useState(false)
  const diveTimerRef = useRef<number | null>(null)
  const divingWorkRef = useRef(false)

  useEffect(() => {
    if (!active) {
      if (diveTimerRef.current !== null) {
        window.clearTimeout(diveTimerRef.current)
        diveTimerRef.current = null
      }
      divingWorkRef.current = false
      setDivingWork(false)
      if (motionRef.current.projectDive) {
        motionRef.current.projectDive = 0
        motionRef.current.snapNow = true
      }
    }
  }, [active])

  useEffect(() => {
    return () => {
      if (diveTimerRef.current !== null) {
        window.clearTimeout(diveTimerRef.current)
      }
    }
  }, [])

  const handleOpenWork = useCallback(
    (slug: string) => {
      const navigateNow = () => {
        if (onOpenWork) {
          onOpenWork(slug)
          return
        }
        window.location.assign(`/projects/${slug}`)
      }

      if (!allowWebGL || webglFailed || room !== 'work') {
        navigateNow()
        return
      }
      if (divingWorkRef.current) return
      divingWorkRef.current = true
      setDivingWork(true)
      motionRef.current.projectDive = 1
      diveTimerRef.current = window.setTimeout(() => {
        diveTimerRef.current = null
        navigateNow()
      }, 380)
    },
    [allowWebGL, onOpenWork, room, webglFailed],
  )

  useEffect(() => {
    if (!active) return
    const onHash = () => {
      const next = sectionFromLocation(
        window.location.pathname,
        window.location.hash,
      )
      goRoom(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [active, goRoom])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setAllowWebGL(!media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  // Unified Skhiladze-accurate viscous 3D card tilt + hover-only quadrant planar sheen & 1px edge catch
  // applied consistently across About, Experience & Contact cards (hovered corner lifts TOWARD the viewer!)
  useEffect(() => {
    const aboutEl = aboutGridRef.current
    const expEl = experienceCardRef.current
    const contactEl = contactCardRef.current
    const activeEl =
      room === 'about'
        ? aboutEl
        : room === 'experience'
          ? expEl
          : room === 'contact'
            ? contactEl
            : null

    const clearCards = (root: HTMLElement | null) => {
      if (!root) return
      root.style.transform = ''
      root.style.removeProperty('--card-hover')
      for (const sub of root.querySelectorAll<HTMLElement>(
        '.about-photo-card, .about-glass-content, .experience-glass-stage',
      )) {
        sub.style.removeProperty('--card-hover')
      }
    }

    for (const el of [aboutEl, expEl, contactEl]) {
      if (el && el !== activeEl) clearCards(el)
    }

    if (!active || !activeEl || !allowWebGL) {
      clearCards(activeEl)
      return
    }

    const subCards = Array.from(
      activeEl.querySelectorAll<HTMLElement>(
        '.about-photo-card, .about-glass-content, .experience-glass-stage',
      ),
    )
    const sheenTargets = subCards.length > 0 ? subCards : [activeEl]
    const subState = sheenTargets.map(() => ({
      targetHover: 0,
      targetX: 50,
      targetY: 50,
      smoothHover: 0,
      smoothX: 50,
      smoothY: 50,
    }))

    let rafId = 0
    let targetCamX = 0
    let targetCamY = 0
    let smoothCamX = 0
    let smoothCamY = 0

    let targetHover = 0
    let targetHoverX = 0
    let targetHoverY = 0
    let smoothHover = 0
    let smoothHoverX = 0
    let smoothHoverY = 0

    let lastTime = performance.now()
    const startTime = lastTime

    const onPointerMove = (event: PointerEvent) => {
      targetCamX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2
      targetCamY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2

      const rect = activeEl.getBoundingClientRect()
      const inside =
        rect.width > 0 &&
        rect.height > 0 &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      if (inside) {
        targetHover = 1
        targetHoverX = Math.max(
          -1,
          Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2),
        )
        targetHoverY = Math.max(
          -1,
          Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2),
        )
      } else {
        targetHover = 0
        targetHoverX = 0
        targetHoverY = 0
      }

      for (let i = 0; i < sheenTargets.length; i++) {
        const el = sheenTargets[i]
        const st = subState[i]
        const r = el.getBoundingClientRect()
        const over =
          r.width > 0 &&
          r.height > 0 &&
          event.clientX >= r.left &&
          event.clientX <= r.right &&
          event.clientY >= r.top &&
          event.clientY <= r.bottom
        if (over) {
          st.targetHover = 1
          st.targetX = ((event.clientX - r.left) / r.width) * 100
          st.targetY = ((event.clientY - r.top) / r.height) * 100
        } else {
          st.targetHover = 0
        }
      }
    }

    const onPointerLeave = () => {
      targetCamX = 0
      targetCamY = 0
      targetHover = 0
      targetHoverX = 0
      targetHoverY = 0
      for (const st of subState) st.targetHover = 0
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now
      const t = (now - startTime) / 1000

      if (window.innerWidth <= 820) {
        clearCards(activeEl)
        rafId = window.requestAnimationFrame(tick)
        return
      }

      const camEase = 1 - Math.exp(-dt * 2.35)
      smoothCamX += (targetCamX - smoothCamX) * camEase
      smoothCamY += (targetCamY - smoothCamY) * camEase

      const hoverEase = 1 - Math.exp(-dt * 2.15)
      smoothHover += (targetHover - smoothHover) * (1 - Math.exp(-dt * 2.6))
      smoothHoverX += (targetHoverX - smoothHoverX) * hoverEase
      smoothHoverY += (targetHoverY - smoothHoverY) * hoverEase

      const floatY = Math.sin(t * 0.85) * 4.2
      const floatZ = 10 + Math.cos(t * 0.65) * 4.5 + smoothHover * 14
      // Skhiladze tilt direction: hovered corner lifts TOWARD the viewer!
      const rotY = -smoothHoverX * 4.8 + Math.sin(t * 0.48) * 0.35
      const rotX = smoothHoverY * 3.4 + Math.cos(t * 0.56) * 0.25
      const rotZ = -smoothHoverX * smoothHoverY * 0.35

      activeEl.style.transform = `perspective(1450px) translate3d(${(-smoothCamX * 10).toFixed(2)}px, ${(floatY - smoothCamY * 6.5).toFixed(2)}px, ${floatZ.toFixed(2)}px) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`

      const sheenPosEase = 1 - Math.exp(-dt * 3.8)
      const sheenHoverEase = 1 - Math.exp(-dt * 2.8)
      for (let i = 0; i < sheenTargets.length; i++) {
        const el = sheenTargets[i]
        const st = subState[i]
        st.smoothHover += (st.targetHover - st.smoothHover) * sheenHoverEase
        st.smoothX += (st.targetX - st.smoothX) * sheenPosEase
        st.smoothY += (st.targetY - st.smoothY) * sheenPosEase
        el.style.setProperty('--hover-x', `${st.smoothX.toFixed(1)}%`)
        el.style.setProperty('--hover-y', `${st.smoothY.toFixed(1)}%`)
        el.style.setProperty('--card-hover', st.smoothHover.toFixed(3))
      }

      rafId = window.requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave, { passive: true })
    rafId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      clearCards(activeEl)
    }
  }, [active, room, allowWebGL])

  // PIVEN-ILYA-INSPIRED CONTINUOUS WHEEL SCRUB + 150ms SETTLE-SNAP (60px INTENT THRESHOLD):
  // - Never blocks or stalls your scroll wheel! Every notch immediately scrubs the 3D spring goal.
  // - 1 single notch (~100px >= 60px threshold) cleanly settles +1 stop (1 section or 1 project).
  // - Regular steady scrolling (~420px) scrubs smoothly across 1 stop so you always see Statement/About/Contact.
  // - Fast scrolling (840px+) naturally scrubs across 2+ stops so fast scrolls CAN skip ahead smoothly!
  useEffect(() => {
    if (!active) return
    const tl = timelineRef.current

    const settleWheel = () => {
      tl.wheeling = false
      motionRef.current.wheeling = false
      const count = Math.max(1, worksCountRef.current)
      const maxStop = count + 3
      let target = Math.round(tl.goal)
      // Single-notch intent rule (pivenilya.com threshold = 60px):
      // if a gentle single notch didn't cross 0.5 yet, advance by ±1 stop cleanly
      if (target === tl.wheelFrom && Math.abs(tl.wheelSum) >= 60) {
        target = tl.wheelFrom + Math.sign(tl.wheelSum)
      }
      target = Math.max(0, Math.min(maxStop, target))
      tl.wheelSum = 0
      applyTimelineGoal(target, true)
    }

    const onWheel = (event: WheelEvent) => {
      if (activeCertRef.current || privacyOpenRef.current) return
      const scroller = (event.target as Element | null)?.closest(
        '.experience-scroll-list, .spatial-scroll-overlay',
      )
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 4) {
        const atTop = scroller.scrollTop <= 2
        const atBottom =
          scroller.scrollTop + scroller.clientHeight >=
          scroller.scrollHeight - 2
        if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)) {
          return
        }
      }

      event.preventDefault()

      // Normalize deltaMode (0 = px, 1 = lines, 2 = pages) and axis
      const raw =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY
      const mult =
        event.deltaMode === 1
          ? 40
          : event.deltaMode === 2
            ? window.innerHeight
            : 1
      const deltaPx = raw * mult
      if (Math.abs(deltaPx) < 0.5) return

      if (!tl.wheeling) {
        tl.wheeling = true
        tl.wheelFrom = Math.round(tl.goal)
        tl.wheelSum = 0
        motionRef.current.wheeling = true
        motionRef.current.directJump = null
      }

      tl.wheelSum += deltaPx
      // Pitch = 440px per stop (matches pivenilya.com's ~412px pitch so regular scrolling is
      // silky & never blows past sections, while fast flings 880px+ smoothly skip 2+ stops!)
      const pitch = 440
      applyTimelineGoal(tl.goal + deltaPx / pitch, false)

      window.clearTimeout(tl.settleTimer)
      tl.settleTimer = window.setTimeout(settleWheel, 155)
    }

    const onTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartYRef.current === null) return
      const scroller = (event.target as Element | null)?.closest(
        '.spatial-scroll-overlay',
      )
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 4) {
        touchStartYRef.current = null
        return
      }
      const endY = event.changedTouches[0]?.clientY ?? touchStartYRef.current
      const dy = touchStartYRef.current - endY
      touchStartYRef.current = null
      if (dy > 48) applyTimelineGoal(Math.round(tl.goal) + 1, true)
      else if (dy < -48) applyTimelineGoal(Math.round(tl.goal) - 1, true)
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && privacyOpenRef.current) {
        event.preventDefault()
        closePrivacy()
        return
      }
      if (event.key === 'Escape' && activeCertRef.current) {
        event.preventDefault()
        closeCert()
        return
      }
      if (activeCertRef.current || privacyOpenRef.current) return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        applyTimelineGoal(Math.round(tl.goal) + 1, true)
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        applyTimelineGoal(Math.round(tl.goal) - 1, true)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(tl.settleTimer)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [active, applyTimelineGoal, closeCert, closePrivacy])

  const handleStageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (safeIndex < filteredWorks.length - 1)
        selectProjectIndex(safeIndex + 1)
      else goRoom('experience')
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (safeIndex > 0) selectProjectIndex(safeIndex - 1)
      else goRoom('about')
    } else if (event.key === 'Enter') {
      event.preventDefault()
      handleOpenWork(activeWork.slug)
    }
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('kurtdeslate.dev@gmail.com')
      setCopiedEmail(true)
      window.setTimeout(() => setCopiedEmail(false), 2200)
    } catch {
      window.location.href = 'mailto:kurtdeslate.dev@gmail.com'
    }
  }

  const showLiveWebGL = allowWebGL && !webglFailed

  const measureFilterPill = useCallback((key: FilterKey) => {
    const bar = filterBarRef.current
    const btn = filterBtnRefs.current[key]
    if (!bar || !btn) return
    setFilterPill({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
      ready: true,
    })
  }, [])

  useEffect(() => {
    measureFilterPill(visualFilter)
    const onResize = () => measureFilterPill(visualFilter)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [visualFilter, room, measureFilterPill])

  useEffect(() => {
    return () => {
      if (filterTimerRef.current !== null) {
        window.clearTimeout(filterTimerRef.current)
      }
    }
  }, [])

  const handleSelectFilter = useCallback(
    (key: FilterKey) => {
      setVisualFilter(key)
      const applyNow = () => {
        setFilter(key)
        const nextCount =
          key === 'all'
            ? works.length
            : works.filter((w) => w.categories.includes(key)).length
        worksCountRef.current = nextCount
        motionRef.current.snapCarouselNow = true
        applyTimelineGoal(2, true)
      }

      if (key === filter) return

      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (!showLiveWebGL || reduced) {
        applyNow()
        return
      }

      if (filterTimerRef.current !== null) {
        window.clearTimeout(filterTimerRef.current)
      }
      motionRef.current.filterFade = 1
      filterTimerRef.current = window.setTimeout(() => {
        filterTimerRef.current = null
        applyNow()
        window.requestAnimationFrame(() => {
          motionRef.current.filterFade = 0
        })
      }, 130)
    },
    [applyTimelineGoal, filter, showLiveWebGL],
  )

  // Detached in-memory HTML5 <video> decoder pool feeding WebGL VideoTextures (never mounted in the DOM,
  // so Opera GX and other browsers can never inject Video Pop-out or Video Skip overlays on load or refresh!)
  const activeRef = useRef(active)
  activeRef.current = active
  const allowWebGLRef = useRef(allowWebGL)
  allowWebGLRef.current = allowWebGL

  useEffect(() => {
    if (!showLiveWebGL) return
    const cleanups: (() => void)[] = []

    for (const item of videoWorks) {
      const src = item.video?.localSrc
      if (!src) continue
      const startAt = item.video?.previewStart ?? 0
      const endAt = item.video?.previewEnd ?? 0

      const v = document.createElement('video')
      v.muted = true
      v.playsInline = true
      v.autoplay = true
      v.disablePictureInPicture = true
      v.disableRemotePlayback = true
      v.preload = 'none'

      const handleReady = () => {
        if (videoFailedRef.current[item.slug]) return
        ensurePreviewStart(item.slug, v, startAt)
        if (activeRef.current && allowWebGLRef.current && v.paused) {
          void v.play().catch(() => {})
        }
      }

      const handleTimeUpdate = () => {
        if (videoFailedRef.current[item.slug]) return
        if (!videoInitializedRef.current[item.slug]) {
          ensurePreviewStart(item.slug, v, startAt)
          return
        }
        if (endAt > startAt + 1 && !v.seeking && v.currentTime >= endAt) {
          v.currentTime = startAt
        }
      }

      const handleError = () => {
        videoFailedRef.current[item.slug] = true
      }

      const handleEnded = () => {
        if (videoFailedRef.current[item.slug]) return
        const loopTarget =
          startAt > 0 && Number.isFinite(v.duration) && v.duration > startAt + 2
            ? startAt
            : 0
        v.currentTime = loopTarget
        if (activeRef.current && allowWebGLRef.current) {
          void v.play().catch(() => {})
        }
      }

      v.addEventListener('loadedmetadata', handleReady)
      v.addEventListener('loadeddata', handleReady)
      v.addEventListener('canplay', handleReady)
      v.addEventListener('seeked', handleReady)
      v.addEventListener('playing', handleReady)
      v.addEventListener('timeupdate', handleTimeUpdate)
      v.addEventListener('error', handleError)
      v.addEventListener('ended', handleEnded)

      videoElementsRef.current[item.slug] = v

      cleanups.push(() => {
        v.removeEventListener('loadedmetadata', handleReady)
        v.removeEventListener('loadeddata', handleReady)
        v.removeEventListener('canplay', handleReady)
        v.removeEventListener('seeked', handleReady)
        v.removeEventListener('playing', handleReady)
        v.removeEventListener('timeupdate', handleTimeUpdate)
        v.removeEventListener('error', handleError)
        v.removeEventListener('ended', handleEnded)
        v.pause()
        v.removeAttribute('src')
        v.load()
        if (videoElementsRef.current[item.slug] === v) {
          videoElementsRef.current[item.slug] = null
        }
      })
    }

    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }, [showLiveWebGL, videoWorks, ensurePreviewStart])

  useEffect(() => {
    if (!showLiveWebGL) return
    videoWorks.forEach((item, vIdx) => {
      const src = item.video?.localSrc
      const v = videoElementsRef.current[item.slug]
      if (!src || !v) return
      const isPriority =
        vIdx < 3 || item.slug === activeWork.slug || videoWaveTwoReady
      if (!isPriority || v.dataset.srcLoaded === '1') return
      const startAt = item.video?.previewStart ?? 0
      v.preload = 'auto'
      v.src = startAt > 0 ? `${src}#t=${startAt}` : src
      v.dataset.srcLoaded = '1'
      if (active && allowWebGL) {
        void v.play().catch(() => {})
      }
    })
  }, [
    showLiveWebGL,
    videoWorks,
    activeWork.slug,
    videoWaveTwoReady,
    active,
    allowWebGL,
  ])

  return (
    <div
      className={`studio-shell room-${room} ${showLiveWebGL ? 'is-webgl-live' : ''} ${divingWork ? 'is-diving' : ''} ${active ? '' : 'is-parked'}`}
      aria-hidden={!active}
      style={
        {
          '--key-accent': activeWork.accentColor,
          '--rim-accent': activeWork.secondaryTone,
        } as React.CSSProperties
      }
    >
      {/* Wardrobe Studio Volumetric Lighting Backdrop (Obsidian + Raw Indigo + Burnt Orange + Cadmium Yellow) */}
      <div className="studio-light-backdrop" aria-hidden="true">
        <span className="studio-glow glow-orange" />
        <span className="studio-glow glow-yellow" />
        <span className="studio-glow glow-indigo" />
      </div>

      {/* Continuous Full-Viewport PBR 3D Universe (No Scanlines, Crystal-Clear HD) */}
      {showLiveWebGL && (
        <Suspense fallback={null}>
          <StudioUniverse
            active={active}
            room={room}
            motionRef={motionRef}
            items={filteredWorks}
            activeIndex={safeIndex}
            onSelectIndex={selectProjectIndex}
            onOpenWork={handleOpenWork}
            onReady={handleWebglReady}
            onError={handleWebglError}
            videoElementsRef={videoElementsRef}
          />
        </Suspense>
      )}

      {/* Subtle Cinema Film Optics (Fine Optical Grain + Edge Vignette — Zero Scanlines) */}
      <div className="studio-cinema-optics" aria-hidden="true" />

      {/* ====================================================================
          ACT 1: MONUMENTAL 3D LOGO ARRIVAL
          Sculpted 3D Beveled "K" Monolith floating in front of edge-to-edge
          "KURT" typography — scroll or click to fly smoothly through the K.
         ==================================================================== */}
      <section
        id="intro"
        className={`hud-layer hud-intro ${room === 'intro' ? 'is-active' : 'is-flown'}`}
        aria-labelledby="intro-arrival-label"
        aria-hidden={room !== 'intro'}
      >
        {/* Fallback Emblem (Shown only if WebGL disabled / reduced motion) */}
        <div className="intro-emblem-fallback" aria-hidden={showLiveWebGL}>
          <img src="/brand/kurt-logo.png" width="140" height="160" alt="" />
        </div>

        {/* Clean Minimal Bottom Arrival Prompt with Monumental "KURT" Name */}
        <div className="intro-arrival-footer">
          <h1 id="intro-arrival-label" className="intro-hero-name">
            KURT
          </h1>
          <p className="intro-role-kicker">
            3D ARTIST · FRONT-END DEVELOPER · WEB DESIGNER
          </p>

          <div className="intro-cta-cluster">
            <a
              href="/about"
              className="studio-primary-btn"
              onClick={(e) => {
                e.preventDefault()
                goRoom('about')
              }}
            >
              <span>ENTER STUDIO</span>
              <Arrow />
            </a>
          </div>

          <span className="intro-scroll-hint" aria-hidden="true">
            SCROLL TO FLY THROUGH ↓
          </span>
        </div>
      </section>

      {/* ====================================================================
          ROOM 1: WORK — Centered 3D Exhibition Carousel (Top Filters, Side Arrows, Centered Bottom HUD)
         ==================================================================== */}
      <section
        id="projects"
        className={`hud-layer hud-work ${room === 'work' ? 'is-active' : room === 'intro' || room === 'about' ? 'is-away' : 'is-flown'}`}
        aria-label="Selected projects showcase"
        aria-hidden={room !== 'work'}
      >
        <div
          className="work-stage-interaction-zone"
          tabIndex={room === 'work' ? 0 : -1}
          role="region"
          aria-label="Interactive 3D projects showcase. Drag, scroll, or use left and right arrow keys to browse projects; click center card or press Enter to open."
          onKeyDown={handleStageKeyDown}
        >
          {!showLiveWebGL && (
            <div className="work-dom-fallback">
              {filteredWorks.map((item, idx) => {
                const count = filteredWorks.length
                let delta = idx - safeIndex
                if (count >= 3) {
                  if (delta > count / 2) delta -= count
                  if (delta < -count / 2) delta += count
                }
                const cls =
                  delta === 0
                    ? 'is-center'
                    : delta === -1
                      ? 'is-left'
                      : delta === 1
                        ? 'is-right'
                        : 'is-off'
                return (
                  <div
                    key={item.slug}
                    className={`fallback-work-card ${cls}`}
                    onClick={() => {
                      if (idx === safeIndex) handleOpenWork(item.slug)
                      else setActiveIndex(idx)
                    }}
                  >
                    <ShowcasePlate work={item} />
                  </div>
                )
              })}
            </div>
          )}

          {showLiveWebGL && !webglReady && (
            <div
              className="work-stage-skeleton"
              role="status"
              aria-label="Loading 3D works showcase"
            >
              <span
                className="work-skeleton-ghost is-left"
                aria-hidden="true"
              />
              <span className="work-skeleton-hero" aria-hidden="true" />
              <span
                className="work-skeleton-ghost is-right"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Centered Top Discipline Filter Bar */}
        <div
          ref={filterBarRef}
          className="hud-top-filters"
          role="group"
          aria-label="Filter projects by discipline"
        >
          {filterPill.ready && (
            <span
              className="filter-active-pill"
              aria-hidden="true"
              style={{
                width: `${filterPill.width}px`,
                transform: `translate3d(${filterPill.left}px, 0, 0)`,
              }}
            />
          )}
          {filterOptions.map((opt) => {
            const key = opt.key
            const count =
              key === 'all'
                ? works.length
                : works.filter((w) => w.categories.includes(key)).length
            return (
              <button
                key={key}
                ref={(el) => {
                  filterBtnRefs.current[key] = el
                }}
                type="button"
                aria-pressed={visualFilter === key}
                onClick={() => handleSelectFilter(key)}
              >
                <span>{opt.label}</span>
                <small>{String(count).padStart(2, '0')}</small>
              </button>
            )
          })}
        </div>

        {/* Left & Right Carousel Navigation Arrows (Bounded, Non-Infinite) */}
        {filteredWorks.length > 1 && (
          <>
            <button
              type="button"
              className="carousel-side-arrow is-prev"
              aria-label="Previous project"
              disabled={safeIndex <= 0}
              onClick={() => selectProjectIndex(safeIndex - 1)}
            >
              <Arrow reverse />
            </button>
            <button
              type="button"
              className="carousel-side-arrow is-next"
              aria-label="Next project"
              disabled={safeIndex >= filteredWorks.length - 1}
              onClick={() => selectProjectIndex(safeIndex + 1)}
            >
              <Arrow />
            </button>
          </>
        )}

        {/* Centered Bottom Active Project Telemetry HUD */}
        <div className="hud-bottom-center" aria-live="polite">
          <div key={activeWork.slug} className="telemetry-copy">
            <div className="telemetry-index">
              <span className="telemetry-tag">
                {activeWork.disciplineTag.toUpperCase()}
              </span>
            </div>
            <h2>{activeWork.title}</h2>
            <p>{activeWork.summary}</p>
          </div>

          <a
            href={`/projects/${activeWork.slug}`}
            data-route
            className="studio-primary-btn is-compact"
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return
              }
              event.preventDefault()
              handleOpenWork(activeWork.slug)
            }}
          >
            <span>VIEW PROJECT</span>
            <Arrow />
          </a>
        </div>
      </section>

      {/* ====================================================================
          ROOM 2: EXPERIENCE — Simple Organization Carousel
         ==================================================================== */}
      <section
        id="experience"
        className={`hud-layer hud-experience ${room === 'experience' ? 'is-active' : room === 'contact' ? 'is-flown' : 'is-away'}`}
        aria-labelledby="experience-spatial-title"
        aria-hidden={room !== 'experience'}
      >
        <div className="spatial-scroll-overlay">
          <div ref={experienceCardRef} className="experience-carousel-stage">
            <h2
              id="experience-spatial-title"
              className="experience-section-heading"
            >
              My Experience
            </h2>
            {experienceGroups.length > 1 && (
              <>
                <button
                  type="button"
                  className="carousel-side-arrow is-prev experience-carousel-arrow"
                  aria-label="Previous organization"
                  disabled={safeExpIndex <= 0}
                  onClick={() =>
                    setExperienceIndex((prev) => Math.max(0, prev - 1))
                  }
                >
                  <Arrow reverse />
                </button>
                <button
                  type="button"
                  className="carousel-side-arrow is-next experience-carousel-arrow"
                  aria-label="Next organization"
                  disabled={safeExpIndex >= experienceGroups.length - 1}
                  onClick={() =>
                    setExperienceIndex((prev) =>
                      Math.min(experienceGroups.length - 1, prev + 1),
                    )
                  }
                >
                  <Arrow />
                </button>
              </>
            )}

            <div className="experience-carousel-viewport">
              {experienceGroups.map((org, orgIdx) => {
                const offset = orgIdx - safeExpIndex
                const isCurrentOrg = offset === 0
                return (
                  <div
                    key={org.id}
                    className={`experience-glass-stage ${isCurrentOrg ? 'is-current' : 'is-side'}`}
                    style={{
                      transform: `translate3d(${offset * 108}%, 0, ${-Math.abs(offset) * 120}px) scale(${isCurrentOrg ? 1 : 0.9})`,
                      opacity:
                        Math.abs(offset) > 1 ? 0 : isCurrentOrg ? 1 : 0.32,
                      pointerEvents: isCurrentOrg ? 'auto' : 'none',
                    }}
                    aria-hidden={!isCurrentOrg}
                  >
                    <div className="experience-stage-header">
                      <h3>{org.org}</h3>
                      <span className="experience-span-badge">{org.span}</span>
                    </div>

                    <div className="experience-scroll-list">
                      <ol className="experience-vertical-timeline">
                        {org.roles.map((exp, idx) => (
                          <li key={exp.id} className="timeline-item">
                            <div className="timeline-marker" aria-hidden="true">
                              <span className="timeline-dot" />
                              {idx < org.roles.length - 1 && (
                                <span className="timeline-stem" />
                              )}
                            </div>
                            <div className="timeline-card is-static">
                              <div className="timeline-card-head">
                                <h3>{exp.role}</h3>
                                <span className="experience-period">
                                  {exp.period}
                                </span>
                              </div>
                              <ul className="timeline-bullets">
                                {exp.highlights.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )
              })}
            </div>

            {experienceGroups.length > 1 && (
              <div
                className="experience-carousel-dots"
                role="tablist"
                aria-label="Organizations"
              >
                {experienceGroups.map((org, idx) => (
                  <button
                    key={org.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === safeExpIndex}
                    className={idx === safeExpIndex ? 'is-active' : ''}
                    onClick={() => setExperienceIndex(idx)}
                  >
                    {org.org}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ====================================================================
          ROOM 3: ABOUT — Attached Crisp Studio Portrait + Smoked Glass Dossier
         ==================================================================== */}
      <section
        id="about"
        className={`hud-layer hud-about ${room === 'about' ? 'is-active' : room === 'intro' ? 'is-away' : 'is-flown'}`}
        aria-labelledby="about-spatial-title"
        aria-hidden={room !== 'about'}
      >
        <div className="spatial-scroll-overlay">
          <div ref={aboutGridRef} className="about-glass-grid">
            <div className="about-photo-card">
              <SkeletonImage
                wrapperClassName="about-photo-media"
                src="/portrait/kurt-attached.jpg"
                width="686"
                height="1024"
                loading="lazy"
                alt="Kurt seated in orange sunglasses and yellow sneakers"
              />
            </div>

            <div className="about-glass-content">
              <div className="about-header-band">
                <div className="about-header-row">
                  <h2 id="about-spatial-title">
                    Hi, I’m <span className="about-greeting-accent">Kurt!</span>
                  </h2>
                  <span className="about-location-badge">
                    Based in Metro Manila, Philippines
                  </span>
                </div>
                <p className="about-role-line">
                  3D Artist · Front-end Developer · Web Designer
                </p>
                <p className="about-lead-copy">
                  4th year Computer Science student building React web
                  interfaces and Blender game assets. Former FEU Tech ACM
                  Creatives Director leading event branding and creative teams.
                </p>
              </div>

              <div className="about-bento-lower">
                <div className="about-bento-panel about-stack-panel">
                  <h3 className="about-section-label">TECH STACK</h3>
                  <div className="about-stack-groups" aria-label="Tech stack">
                    {techStackGroups.map((group) => (
                      <div key={group.label} className="stack-group-row">
                        <span className="stack-group-label">{group.label}</span>
                        <div className="about-tools-wrap">
                          {group.items.map((tool) => (
                            <span key={tool} className="tool-glass-chip">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="about-bento-panel about-certs-panel">
                  <h3 className="about-section-label">CERTIFICATIONS</h3>
                  <ul className="about-cert-list">
                    {certifications.map((cert) => (
                      <li key={cert.title}>
                        <button
                          type="button"
                          className="about-cert-btn"
                          onClick={() => openCert(cert)}
                        >
                          <span className="cert-btn-title">
                            <strong>{cert.title}</strong>
                            <span className="cert-btn-arrow" aria-hidden="true">
                              ↗
                            </span>
                          </span>
                          <span className="cert-btn-meta">{cert.meta}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          ROOM 4: CONTACT — Floating Dark-Glass Console Over 3D K Sculpture
         ==================================================================== */}
      <section
        id="contact"
        className={`hud-layer hud-contact ${room === 'contact' ? 'is-active' : 'is-away'}`}
        aria-labelledby="contact-spatial-title"
        aria-hidden={room !== 'contact'}
      >
        <div className="spatial-scroll-overlay">
          <div ref={contactCardRef} className="contact-glass-console">
            <div className="contact-console-left">
              <h2 id="contact-spatial-title">Say hello!</h2>
              <p>
                Always happy to chat about 3D projects, front-end
                collaborations, creative ideas, or just to say hi.
              </p>

              <div className="contact-email-glass">
                <a href="mailto:kurtdeslate.dev@gmail.com">
                  kurtdeslate.dev@gmail.com
                </a>
                <button type="button" onClick={handleCopyEmail}>
                  {copiedEmail ? 'COPIED' : 'COPY'}
                </button>
              </div>

              <div className="contact-social-row">
                <a
                  href="https://www.linkedin.com/in/kurt-deslate"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LINKEDIN ↗
                </a>
                <a
                  href="https://github.com/its-kurtt"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GITHUB ↗
                </a>
              </div>

              <div className="contact-privacy-footer">
                <button
                  type="button"
                  className="contact-privacy-link"
                  onClick={openPrivacy}
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeCert && (
        <div
          className={`cert-modal-backdrop ${certClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-modal-title"
          onClick={closeCert}
        >
          <div
            className="cert-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cert-modal-header">
              <div>
                <span className="about-section-label">CERTIFICATION</span>
                <h3 id="cert-modal-title">{activeCert.title}</h3>
                <p>{activeCert.meta}</p>
              </div>
              <button
                type="button"
                className="cert-modal-close"
                aria-label="Close certificate preview"
                onClick={closeCert}
              >
                ✕
              </button>
            </div>
            <div className="cert-modal-media">
              <SkeletonImage
                wrapperClassName="cert-modal-img-wrap"
                src={activeCert.image}
                alt={activeCert.alt}
              />
            </div>
          </div>
        </div>
      )}

      {privacyOpen && (
        <div
          className={`cert-modal-backdrop ${privacyClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
          onClick={closePrivacy}
        >
          <div
            className="cert-modal-card privacy-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cert-modal-header">
              <div>
                <span className="about-section-label">LEGAL</span>
                <h3 id="privacy-modal-title">Privacy Policy</h3>
                <p>Effective Date: November 2026</p>
              </div>
              <button
                type="button"
                className="cert-modal-close"
                aria-label="Close privacy policy"
                onClick={closePrivacy}
              >
                ✕
              </button>
            </div>
            <div className="privacy-modal-body">
              <p>
                This Privacy Policy explains how this portfolio website operated
                by Kurt handles information when you visit or interact with the
                site.
              </p>

              <section className="privacy-section">
                <h4>1. Information We Collect</h4>
                <p>
                  This website does not collect, store, sell, or share
                  personally identifiable information. No user accounts,
                  analytics trackers, or advertising cookies are used.
                </p>
              </section>

              <section className="privacy-section">
                <h4>2. Local Browser Storage</h4>
                <p>
                  To support smooth navigation across pages, this site may use
                  your browser&apos;s temporary session storage. This data
                  remains on your device, is never transmitted to any server,
                  and is automatically cleared when you close your browser tab.
                </p>
              </section>

              <section className="privacy-section">
                <h4>3. Third-Party Links &amp; Hosting</h4>
                <p>
                  This site contains links to external websites (including
                  LinkedIn, GitHub, Facebook, Roblox, and live project demos).
                  Once you leave this site, your interactions are governed by
                  the privacy policies of those respective services. Standard
                  hosting infrastructure may temporarily process technical
                  request logs (such as IP address and browser user agent) for
                  security and delivery.
                </p>
              </section>

              <section className="privacy-section">
                <h4>4. Direct Communications</h4>
                <p>
                  If you choose to send an email to{' '}
                  <a href="mailto:kurtdeslate.dev@gmail.com">
                    kurtdeslate.dev@gmail.com
                  </a>
                  , any information you provide is used solely to respond to
                  your message and is never shared with third parties.
                </p>
              </section>

              <section className="privacy-section">
                <h4>5. Updates &amp; Contact</h4>
                <p>
                  This policy may be updated if the site&apos;s functionality
                  changes. For any privacy-related questions, please contact{' '}
                  <a href="mailto:kurtdeslate.dev@gmail.com">
                    kurtdeslate.dev@gmail.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
