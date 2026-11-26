import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { MouseEvent } from 'react'
import { works } from './content'
import type { Work, WorkVideo } from './content'
import { Arrow } from './FeatureLab'
import { pathForSection, resolveRoute, sectionFromLocation } from './routes'
import { ProtectedImageCanvas, SkeletonImage } from './SkeletonMedia'
import { ShowcasePlate, StudioHome, StudioTopHeader } from './StudioHome'
import type { StudioRoom } from './StudioUniverse'
import './portfolio.css'

function formatVideoTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const total = Math.floor(sec)
  const mins = Math.floor(total / 60)
  const rem = total % 60
  return `${mins}:${rem.toString().padStart(2, '0')}`
}

function VideoShowcase({ title, video }: { title: string; video: WorkVideo }) {
  const [loaded, setLoaded] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [nativeReady, setNativeReady] = useState(false)
  const [nativeFailed, setNativeFailed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const embedSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.href)}&show_text=false&width=500`

  const drawFrame = useCallback(() => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c || v.readyState < 2 || v.videoWidth <= 0 || v.videoHeight <= 0)
      return
    if (c.width !== v.videoWidth || c.height !== v.videoHeight) {
      c.width = v.videoWidth
      c.height = v.videoHeight
    }
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.drawImage(v, 0, 0, c.width, c.height)
    }
  }, [])

  useEffect(() => {
    if (!video.localSrc || nativeFailed) return

    // Detached in-memory <video> decoder (never mounted in the DOM) so browsers like Opera GX
    // can never inject floating Video Pop-out or Video Skip overlays onto the page!
    const v = document.createElement('video')
    v.src = video.localSrc
    v.loop = true
    v.playsInline = true
    v.preload = 'auto'
    v.disablePictureInPicture = true
    v.disableRemotePlayback = true
    videoRef.current = v

    let active = true
    let rvfcId: number | null = null
    let rafId = 0

    const syncDuration = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) {
        setDuration(v.duration)
      }
    }

    const onLoadedMetadata = () => syncDuration()
    const onDurationChange = () => syncDuration()
    const onReadyFrame = () => {
      syncDuration()
      if (v.videoWidth > 0) {
        setNativeReady(true)
        drawFrame()
      }
    }
    const onSeeked = () => drawFrame()
    const onPlay = () => {
      setHasStarted(true)
      setIsPlaying(true)
    }
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime)
      syncDuration()
      if (v.readyState >= 2 && v.videoWidth > 0) {
        setNativeReady(true)
        drawFrame()
      }
    }
    const onError = () => setNativeFailed(true)

    v.addEventListener('loadedmetadata', onLoadedMetadata)
    v.addEventListener('durationchange', onDurationChange)
    v.addEventListener('loadeddata', onReadyFrame)
    v.addEventListener('canplay', onReadyFrame)
    v.addEventListener('seeked', onSeeked)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('error', onError)

    const supportsRvfc =
      'requestVideoFrameCallback' in HTMLVideoElement.prototype

    const onVideoFrame = () => {
      if (!active) return
      drawFrame()
      if (supportsRvfc) {
        rvfcId = (
          v as HTMLVideoElement & {
            requestVideoFrameCallback: (cb: () => void) => number
          }
        ).requestVideoFrameCallback(onVideoFrame)
      }
    }

    const onRaf = () => {
      if (!active) return
      if (!v.paused && !v.ended) {
        drawFrame()
      }
      rafId = window.requestAnimationFrame(onRaf)
    }

    if (supportsRvfc) {
      rvfcId = (
        v as HTMLVideoElement & {
          requestVideoFrameCallback: (cb: () => void) => number
        }
      ).requestVideoFrameCallback(onVideoFrame)
    } else {
      rafId = window.requestAnimationFrame(onRaf)
    }

    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === viewportRef.current)
    }
    document.addEventListener('fullscreenchange', onFsChange)

    return () => {
      active = false
      document.removeEventListener('fullscreenchange', onFsChange)
      v.removeEventListener('loadedmetadata', onLoadedMetadata)
      v.removeEventListener('durationchange', onDurationChange)
      v.removeEventListener('loadeddata', onReadyFrame)
      v.removeEventListener('canplay', onReadyFrame)
      v.removeEventListener('seeked', onSeeked)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('error', onError)
      if (
        rvfcId !== null &&
        'cancelVideoFrameCallback' in HTMLVideoElement.prototype
      ) {
        ;(
          v as HTMLVideoElement & {
            cancelVideoFrameCallback: (id: number) => void
          }
        ).cancelVideoFrameCallback(rvfcId)
      }
      if (rafId) window.cancelAnimationFrame(rafId)
      v.pause()
      v.removeAttribute('src')
      v.load()
      if (videoRef.current === v) videoRef.current = null
    }
  }, [video.localSrc, nativeFailed, drawFrame])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused || v.ended) {
      v.muted = isMuted
      setHasStarted(true)
      void v.play().catch(() => {})
    } else {
      v.pause()
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setIsMuted(v.muted)
  }, [])

  const handleSeek = useCallback(
    (nextTime: number) => {
      const v = videoRef.current
      if (!v || !Number.isFinite(nextTime)) return
      v.currentTime = nextTime
      setCurrentTime(nextTime)
      drawFrame()
    },
    [drawFrame],
  )

  const toggleFullscreen = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    if (document.fullscreenElement === el) {
      void document.exitFullscreen().catch(() => {})
    } else {
      void el.requestFullscreen?.().catch(() => {})
    }
  }, [])

  if (video.localSrc && !nativeFailed) {
    const seekPct =
      duration > 0
        ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
        : 0

    return (
      <div className="trailer-native-card">
        <div
          ref={viewportRef}
          className={`trailer-native-viewport ${nativeReady ? 'is-ready' : ''} ${!isPlaying ? 'is-paused' : ''}`}
        >
          {video.poster && (
            <ProtectedImageCanvas
              src={video.poster}
              alt=""
              className="trailer-poster-bg"
            />
          )}
          {!nativeReady && !video.poster && (
            <div
              className="trailer-skeleton-overlay"
              role="status"
              aria-label="Loading video"
            >
              <span className="trailer-skeleton-badge">LOADING VIDEO…</span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="trailer-canvas"
            role="img"
            aria-label={`${title} video showcase by Kurt`}
            onClick={togglePlay}
            onDoubleClick={toggleFullscreen}
          />

          {!isPlaying && (
            <button
              type="button"
              className={`trailer-play-prompt ${hasStarted ? 'is-compact' : ''}`}
              onClick={togglePlay}
              aria-label={hasStarted ? 'Resume video' : 'Play with sound'}
            >
              <span className="trailer-play-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                </svg>
              </span>
              {!hasStarted && (
                <span className="trailer-play-label">Play with sound</span>
              )}
            </button>
          )}

          <div className="trailer-controls" aria-label="Video controls">
            <button
              type="button"
              className="trailer-ctrl-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 5.5v13l11-6.5-11-6.5Z" />
                </svg>
              )}
            </button>

            <input
              type="range"
              className="trailer-seek"
              aria-label="Seek video"
              min={0}
              max={duration || 100}
              step={0.05}
              value={Math.min(currentTime, duration || 100)}
              style={{ '--seek-pct': `${seekPct}%` } as React.CSSProperties}
              onChange={(e) => handleSeek(Number(e.target.value))}
            />

            <span className="trailer-time" aria-live="off">
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>

            <button
              type="button"
              className="trailer-ctrl-btn"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                  <path
                    d="m16 9 5 6M21 9l-5 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                  <path
                    d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="trailer-ctrl-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="trailer-native-footer">
          <a
            href={video.href}
            target="_blank"
            rel="noopener noreferrer"
            className="trailer-fb-btn"
          >
            <span>VISIT ON FACEBOOK</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="trailer-stage">
      {loaded ? (
        <>
          <div
            className={`trailer-embed-shell ${iframeReady ? 'is-ready' : ''}`}
          >
            {!iframeReady && (
              <div
                className="trailer-skeleton-overlay"
                role="status"
                aria-label="Loading video player"
              >
                <span className="trailer-skeleton-badge">
                  LOADING VIDEO PLAYER…
                </span>
              </div>
            )}
            <iframe
              title={`${title} video showcase by Kurt`}
              src={embedSrc}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              onLoad={() => setIframeReady(true)}
            />
          </div>
          <a href={video.href} target="_blank" rel="noopener noreferrer">
            Trouble playing? Watch on Facebook ↗
          </a>
        </>
      ) : (
        <>
          <span className="trailer-tag">{video.tag}</span>
          <strong>
            {video.headlineTop} <em>{video.headlineAccent}</em>
          </strong>
          <p>{video.subline}</p>
          <button type="button" onClick={() => setLoaded(true)}>
            {video.ctaLabel}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 5 11 7-11 7Z" />
            </svg>
          </button>
          <small>
            Loads video from Facebook. Or{' '}
            <a href={video.href} target="_blank" rel="noopener noreferrer">
              watch directly ↗
            </a>
            .
          </small>
        </>
      )}
    </div>
  )
}

type GalleryShot = {
  src: string
  alt: string
}

const knownGalaxyDesktopShots: GalleryShot[] = [
  {
    src: '/work/known-galaxy/live-home.jpg',
    alt: 'The Known Galaxy desktop homepage',
  },
  {
    src: '/work/known-galaxy/live-nav-desktop.jpg',
    alt: 'The Known Galaxy desktop 4-column mega-menu navigation',
  },
  {
    src: '/work/known-galaxy/live-councils.jpg',
    alt: 'The Known Galaxy Jedi Councils directory',
  },
  {
    src: '/work/known-galaxy/live-council-knowledge.jpg',
    alt: 'Council of First Knowledge hero section',
  },
  {
    src: '/work/known-galaxy/live-council-mission.jpg',
    alt: 'Council of First Knowledge Mission and Vision section',
  },
  {
    src: '/work/known-galaxy/live-council-specializations.jpg',
    alt: 'Council of First Knowledge Specializations interactive showcase',
  },
  {
    src: '/work/known-galaxy/live-council-organizations.jpg',
    alt: 'Council of First Knowledge Organizations and Divisions section',
  },
  {
    src: '/work/known-galaxy/live-council-leadership.jpg',
    alt: 'Council of First Knowledge Senior and Minor Councilors leadership directory',
  },
  {
    src: '/work/known-galaxy/live-trainings.jpg',
    alt: 'The Known Galaxy Jedi Trainings 3-card carousel',
  },
  {
    src: '/work/known-galaxy/live-trials.jpg',
    alt: 'The Known Galaxy Trials progression page',
  },
  {
    src: '/work/known-galaxy/live-holonet.jpg',
    alt: 'The Known Galaxy Holonet community feed',
  },
  {
    src: '/work/known-galaxy/live-holonet-transmission.jpg',
    alt: 'Holonet Arrival on Spintir transmission hero and opening',
  },
  {
    src: '/work/known-galaxy/live-spintir-article.jpg',
    alt: 'Holonet Arrival on Spintir transmission record and full article body',
  },
  {
    src: '/work/known-galaxy/live-spintir-footer.jpg',
    alt: 'Holonet Arrival on Spintir closing section and archive site footer',
  },
]

type ShardsBentoShot = GalleryShot & {
  bentoClass: string
  toneClass: 'tone-cover' | 'tone-black' | 'tone-clay'
}

const shardsBentoShots: ShardsBentoShot[] = [
  // Band 1: Rock-armored creature (front & back)
  {
    src: '/work/shards/render-01.jpg',
    alt: 'Rock-armored creature 3D model front render',
    bentoClass: 'span-6',
    toneClass: 'tone-black',
  },
  {
    src: '/work/shards/render-02.jpg',
    alt: 'Rock-armored creature 3D model back render',
    bentoClass: 'span-6',
    toneClass: 'tone-black',
  },
  // Band 2 & 3: Crimson-visor dark armor (renders + clay turnaround)
  {
    src: '/work/shards/render-03.jpg',
    alt: 'Black crimson-visor armored character morph front render',
    bentoClass: 'span-6',
    toneClass: 'tone-cover',
  },
  {
    src: '/work/shards/render-04.jpg',
    alt: 'Black crimson-visor armored character morph back render with cloak',
    bentoClass: 'span-6',
    toneClass: 'tone-cover',
  },
  {
    src: '/work/shards/render-05.jpg',
    alt: 'Black crimson-visor armored character morph close-up bust render',
    bentoClass: 'span-6',
    toneClass: 'tone-cover',
  },
  {
    src: '/work/shards/render-06.jpg',
    alt: 'Hard-surface sci-fi armor clay sculpt front view',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-07.jpg',
    alt: 'Hard-surface sci-fi armor clay sculpt back view',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  // Band 4: Ornate pauldron armor clay + Gold-plated samurai armor
  {
    src: '/work/shards/render-08.jpg',
    alt: 'Ornate pauldron and chestplate armor clay sculpt front view',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-09.jpg',
    alt: 'Ornate pauldron and cloak armor clay sculpt back view',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-10.jpg',
    alt: 'Gold-plated armored character morph front render',
    bentoClass: 'span-3',
    toneClass: 'tone-black',
  },
  {
    src: '/work/shards/render-11.jpg',
    alt: 'Gold-plated armored character morph back render',
    bentoClass: 'span-3',
    toneClass: 'tone-black',
  },
  // Band 5: Back harness clay, wall pod, and stacked green/orange energy rails
  {
    src: '/work/shards/render-12.jpg',
    alt: 'Sci-fi back harness and twin canister clay sculpt',
    bentoClass: 'slot-b5-left',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-13.jpg',
    alt: 'Wall-mounted gray sci-fi equipment pod with glowing green bars',
    bentoClass: 'slot-b5-mid',
    toneClass: 'tone-cover',
  },
  {
    src: '/work/shards/render-14.jpg',
    alt: 'Closed hard-surface sci-fi energy rail prop with luminous green cells',
    bentoClass: 'slot-b5-top',
    toneClass: 'tone-black',
  },
  {
    src: '/work/shards/render-15.jpg',
    alt: 'Opened hard-surface sci-fi energy rail prop revealing glowing orange coils',
    bentoClass: 'slot-b5-bot',
    toneClass: 'tone-black',
  },
  // Band 6: Dual power cells + Blue hex containment core
  {
    src: '/work/shards/render-16.jpg',
    alt: 'Dual green and red illuminated sci-fi power cells on reflective dark floor',
    bentoClass: 'span-6',
    toneClass: 'tone-cover',
  },
  {
    src: '/work/shards/render-17.jpg',
    alt: 'Hexagonal blue glowing sci-fi containment core 3D model',
    bentoClass: 'span-6',
    toneClass: 'tone-cover',
  },
  // Band 7: Command chair turnaround + White clay armor & hood
  {
    src: '/work/shards/render-18.jpg',
    alt: 'Hard-surface sci-fi command chair clay sculpt front view',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-19.jpg',
    alt: 'Hard-surface sci-fi command chair clay sculpt rear angle',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-20.jpg',
    alt: 'White clay paneled sci-fi armor suit sculpt against black',
    bentoClass: 'span-3',
    toneClass: 'tone-black',
  },
  {
    src: '/work/shards/render-21.jpg',
    alt: 'White clay hooded visor helmet close-up sculpt against black',
    bentoClass: 'span-3',
    toneClass: 'tone-black',
  },
  // Band 8: Lightsabers + Forearm shield
  {
    src: '/work/shards/render-22.jpg',
    alt: 'White and gold metallic lightsaber hilt rendered over dark water',
    bentoClass: 'span-4',
    toneClass: 'tone-cover',
  },
  {
    src: '/work/shards/render-23.jpg',
    alt: 'Angular hard-surface forearm shield clay sculpt on character rig',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-24.jpg',
    alt: 'Double-bladed gold-accented lightsaber ignited over dark water',
    bentoClass: 'span-5',
    toneClass: 'tone-cover',
  },
  // Band 9: Tall weapons + Blaster + Terminal kiosk
  {
    src: '/work/shards/render-25.jpg',
    alt: 'Ornate double-headed battleaxe 3D weapon render',
    bentoClass: 'span-2',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-26.jpg',
    alt: 'Gold-hilted fantasy broadsword 3D weapon render',
    bentoClass: 'span-2',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-27.jpg',
    alt: 'Hard-surface sci-fi blaster pistol clay sculpt',
    bentoClass: 'span-5',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-28.jpg',
    alt: 'Standing sci-fi terminal kiosk clay sculpt',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  // Band 10: Wall console turnaround + Tactical datapad turnaround
  {
    src: '/work/shards/render-29.jpg',
    alt: 'Wall-mounted sci-fi control console clay sculpt side angle',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-30.jpg',
    alt: 'Wall-mounted sci-fi control console clay sculpt front view',
    bentoClass: 'span-3',
    toneClass: 'tone-clay',
  },
  {
    src: '/work/shards/render-31.jpg',
    alt: 'Sci-fi handheld tactical datapad 3D model front render',
    bentoClass: 'span-3',
    toneClass: 'tone-black',
  },
  {
    src: '/work/shards/render-32.jpg',
    alt: 'Sci-fi handheld tactical datapad 3D model back render',
    bentoClass: 'span-3',
    toneClass: 'tone-black',
  },
]

type LightboxPhase = 'entering' | 'open' | 'closing'

type LightboxRect = {
  left: number
  top: number
  width: number
  height: number
}

type LightboxState = {
  items: GalleryShot[]
  index: number
  sourceKind: 'kg' | 'shards'
  phase: LightboxPhase
  fromRect: LightboxRect | null
}

function measureRect(el: Element | null): LightboxRect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return null
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

function computeFlipTransform(from: LightboxRect, to: LightboxRect): string {
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  const scale = Math.max(0.18, Math.min(1, from.width / Math.max(1, to.width)))
  return `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`
}

/* Crystal-Clear HD Project Showcase Viewer (Clean Overview + Compact Interactive Gallery) */
function ProjectShowcase({
  work,
  exiting = false,
}: {
  work: Work
  exiting?: boolean
}) {
  const [kgIndex, setKgIndex] = useState(0)
  const [lightboxState, setLightboxState] = useState<LightboxState | null>(null)
  const lightboxImgRef = useRef<HTMLCanvasElement>(null)
  const kgActiveImgRef = useRef<HTMLCanvasElement>(null)
  const shardsImgRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const closeTimerRef = useRef<number | null>(null)

  const getSourceImg = useCallback(
    (kind: 'kg' | 'shards', index: number): HTMLCanvasElement | null => {
      if (kind === 'kg') return kgActiveImgRef.current
      return shardsImgRefs.current[index] ?? null
    },
    [],
  )

  const openLightbox = useCallback(
    (
      items: GalleryShot[],
      index: number,
      sourceKind: 'kg' | 'shards',
      sourceEl: HTMLCanvasElement | null,
    ) => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const fromRect = reduced ? null : measureRect(sourceEl)
      setLightboxState({
        items,
        index,
        sourceKind,
        phase: reduced ? 'open' : 'entering',
        fromRect,
      })
    },
    [],
  )

  const stepLightbox = useCallback(
    (delta: number) => {
      if (
        !lightboxState ||
        lightboxState.phase === 'closing' ||
        lightboxState.items.length <= 1
      ) {
        return
      }
      const nextIndex =
        (lightboxState.index + delta + lightboxState.items.length) %
        lightboxState.items.length
      if (lightboxState.sourceKind === 'kg') {
        setKgIndex(nextIndex)
      }
      setLightboxState((prev) => (prev ? { ...prev, index: nextIndex } : null))
    },
    [lightboxState],
  )

  const closeLightbox = useCallback(() => {
    if (!lightboxState || lightboxState.phase === 'closing') return
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduced) {
      setLightboxState(null)
      return
    }
    setLightboxState((prev) => (prev ? { ...prev, phase: 'closing' } : null))
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      setLightboxState(null)
    }, 320)
  }, [lightboxState])

  useLayoutEffect(() => {
    if (!lightboxState) return
    const imgEl = lightboxImgRef.current

    if (lightboxState.phase === 'entering') {
      if (!imgEl) {
        const raf = window.requestAnimationFrame(() => {
          setLightboxState((prev) =>
            prev && prev.phase === 'entering'
              ? { ...prev, phase: 'open' }
              : prev,
          )
        })
        return () => window.cancelAnimationFrame(raf)
      }

      const toRect = measureRect(imgEl)
      const startTransform =
        lightboxState.fromRect && toRect
          ? computeFlipTransform(lightboxState.fromRect, toRect)
          : 'translate3d(0, 22px, 0) scale(0.86)'

      imgEl.style.transition = 'none'
      imgEl.style.transform = startTransform
      imgEl.style.opacity = lightboxState.fromRect && toRect ? '0.82' : '0'
      void imgEl.offsetWidth

      const raf = window.requestAnimationFrame(() => {
        imgEl.style.transition = ''
        imgEl.style.transform = 'translate3d(0, 0, 0) scale(1)'
        imgEl.style.opacity = '1'
        setLightboxState((prev) =>
          prev && prev.phase === 'entering' ? { ...prev, phase: 'open' } : prev,
        )
      })

      return () => window.cancelAnimationFrame(raf)
    }

    if (lightboxState.phase === 'closing' && imgEl) {
      const targetEl = getSourceImg(
        lightboxState.sourceKind,
        lightboxState.index,
      )
      const currentRect = measureRect(imgEl)
      const targetRect = measureRect(targetEl)
      const inViewport =
        targetRect !== null &&
        targetRect.top + targetRect.height > 0 &&
        targetRect.top < window.innerHeight
      imgEl.style.transition = ''
      imgEl.style.transform =
        currentRect && inViewport
          ? computeFlipTransform(targetRect, currentRect)
          : 'translate3d(0, 20px, 0) scale(0.86)'
      imgEl.style.opacity = '0'
    }
  }, [lightboxState, getSourceImg])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!lightboxState) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox()
      } else if (event.key === 'ArrowRight') {
        stepLightbox(1)
      } else if (event.key === 'ArrowLeft') {
        stepLightbox(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxState, closeLightbox, stepLightbox])

  const safeKgIdx = Math.max(
    0,
    Math.min(knownGalaxyDesktopShots.length - 1, kgIndex),
  )
  const currentKgShot =
    knownGalaxyDesktopShots[safeKgIdx] ?? knownGalaxyDesktopShots[0]

  const activeLightboxShot = lightboxState
    ? lightboxState.items[lightboxState.index]
    : null

  return (
    <article
      className={`project-exhibition ${exiting ? 'is-exiting' : ''}`}
      style={
        {
          '--key-accent': work.accentColor,
          '--rim-accent': work.secondaryTone,
        } as React.CSSProperties
      }
    >
      <div className="project-atmosphere" aria-hidden="true" />

      <div className="project-inner">
        <div className="project-bar-top">
          <a href="/projects" data-route className="project-back-btn">
            <Arrow reverse />
            <span>ALL PROJECTS</span>
          </a>
        </div>

        <header className="project-overview-header">
          <div className="project-header-main">
            <div className="project-meta-pills">
              <span className="project-discipline-pill">
                {work.disciplineTag.toUpperCase()}
              </span>
              <span className="project-period-pill">{work.period}</span>
            </div>

            <h1>{work.title}</h1>
            <p className="project-summary-lead">
              {work.description ?? work.summary}
            </p>
            {work.highlights && work.highlights.length > 0 && (
              <ul className="project-summary-highlights">
                {work.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {work.references && work.references.length > 0 && (
              <div className="project-reference-links">
                {work.references.map((ref) => (
                  <a
                    key={ref.href}
                    href={ref.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-ref-pill"
                  >
                    <span>{ref.prefix}:</span>
                    <strong>{ref.label}</strong>
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="project-header-strip">
            <div className="project-strip-item">
              <span className="strip-label">ROLE</span>
              <span className="strip-value">{work.role}</span>
            </div>
            {work.tools.length > 0 && (
              <div className="project-strip-item">
                <span className="strip-label">STACK</span>
                <div className="project-tool-pills">
                  {work.tools.map((tool) => (
                    <span key={tool}>{tool}</span>
                  ))}
                </div>
              </div>
            )}
            {work.external && (
              <a
                href={work.external.href}
                target="_blank"
                rel="noopener noreferrer"
                className="project-live-cta"
              >
                <span>{work.external.label.toUpperCase()}</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </header>

        <section className="project-media-stage" aria-label="Project gallery">
          {work.slug === 'the-known-galaxy' ? (
            <div className="kg-carousel-showcase">
              <div className="kg-showcase-bar">
                <div>
                  <span className="gallery-section-label">
                    SITE SCREENSHOTS
                  </span>
                  <p className="kg-showcase-note">
                    Selected captures from the live website — click any view to
                    expand.
                  </p>
                </div>
              </div>

              <div className="kg-stage-viewport">
                <button
                  type="button"
                  className="kg-nav-arrow is-prev"
                  aria-label="Previous screenshot"
                  onClick={() =>
                    setKgIndex(
                      (prev) =>
                        (prev - 1 + knownGalaxyDesktopShots.length) %
                        knownGalaxyDesktopShots.length,
                    )
                  }
                >
                  <Arrow reverse />
                </button>

                <button
                  type="button"
                  key={currentKgShot.src}
                  className="kg-active-slide"
                  aria-label={`Expand ${currentKgShot.alt}`}
                  onClick={() =>
                    openLightbox(
                      knownGalaxyDesktopShots,
                      safeKgIdx,
                      'kg',
                      kgActiveImgRef.current,
                    )
                  }
                >
                  <SkeletonImage
                    ref={kgActiveImgRef}
                    wrapperClassName="kg-slide-media"
                    src={currentKgShot.src}
                    alt={currentKgShot.alt}
                    fetchPriority="high"
                  />
                </button>

                <button
                  type="button"
                  className="kg-nav-arrow is-next"
                  aria-label="Next screenshot"
                  onClick={() =>
                    setKgIndex(
                      (prev) => (prev + 1) % knownGalaxyDesktopShots.length,
                    )
                  }
                >
                  <Arrow />
                </button>
              </div>

              <div
                className="kg-thumb-strip"
                role="tablist"
                aria-label="Select screenshot"
              >
                {knownGalaxyDesktopShots.map((shot, idx) => (
                  <button
                    key={shot.src}
                    type="button"
                    role="tab"
                    aria-selected={idx === safeKgIdx}
                    aria-label={shot.alt}
                    className={`kg-thumb-btn ${idx === safeKgIdx ? 'is-active' : ''}`}
                    onClick={() => setKgIndex(idx)}
                  >
                    <SkeletonImage
                      wrapperClassName="kg-thumb-media"
                      src={shot.src}
                      alt=""
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : work.slug === 'shards-of-the-past' ? (
            <div className="shards-bento-showcase">
              <div className="kg-showcase-bar">
                <div>
                  <span className="gallery-section-label">
                    3D MODELING GALLERY
                  </span>
                  <p className="kg-showcase-note">
                    32 Blender renders from the Shards of the Past archive —
                    click any piece to expand.
                  </p>
                </div>
              </div>

              <div className="shards-bento-grid">
                {shardsBentoShots.map((shot, idx) => (
                  <button
                    key={shot.src}
                    type="button"
                    className={`shards-bento-tile ${shot.bentoClass} ${shot.toneClass}`}
                    aria-label={`Expand ${shot.alt}`}
                    onClick={() =>
                      openLightbox(
                        shardsBentoShots,
                        idx,
                        'shards',
                        shardsImgRefs.current[idx] ?? null,
                      )
                    }
                  >
                    <SkeletonImage
                      ref={(el) => {
                        shardsImgRefs.current[idx] = el
                      }}
                      wrapperClassName="shards-tile-media"
                      src={shot.src}
                      alt={shot.alt}
                      loading={idx < 4 ? 'eager' : 'lazy'}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : work.video ? (
            <div className="showcase-frame">
              <VideoShowcase
                key={work.slug}
                title={work.title}
                video={work.video}
              />
            </div>
          ) : (
            <div className="showcase-frame">
              <div className="showcase-editorial-stage">
                <ShowcasePlate work={work} />
              </div>
            </div>
          )}
        </section>
      </div>

      {activeLightboxShot && lightboxState && (
        <div
          className={`project-lightbox-backdrop is-${lightboxState.phase}`}
          role="dialog"
          aria-modal="true"
          aria-label={activeLightboxShot.alt}
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="project-lightbox-close"
            aria-label="Close image preview"
            onClick={(event) => {
              event.stopPropagation()
              closeLightbox()
            }}
          >
            ✕
          </button>

          {lightboxState.items.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav-arrow is-prev"
                aria-label="Previous image"
                onClick={(event) => {
                  event.stopPropagation()
                  stepLightbox(-1)
                }}
              >
                <Arrow reverse />
              </button>
              <button
                type="button"
                className="lightbox-nav-arrow is-next"
                aria-label="Next image"
                onClick={(event) => {
                  event.stopPropagation()
                  stepLightbox(1)
                }}
              >
                <Arrow />
              </button>
            </>
          )}

          <ProtectedImageCanvas
            ref={lightboxImgRef}
            src={activeLightboxShot.src}
            alt={activeLightboxShot.alt}
            className="lightbox-zoom-img"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </article>
  )
}

const LAST_WORK_STORAGE_KEY = 'kurt_portfolio_last_work_slug'

function readSavedWorkSlug(): string | undefined {
  try {
    return window.sessionStorage.getItem(LAST_WORK_STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export default function Portfolio() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const [lastWorkSlug, setLastWorkSlug] = useState<string | undefined>(() =>
    readSavedWorkSlug(),
  )
  const [homeRoom, setHomeRoom] = useState<StudioRoom>(() =>
    sectionFromLocation(window.location.pathname, window.location.hash),
  )
  const mainRef = useRef<HTMLElement>(null)
  const homeJumpRef = useRef<
    ((room: StudioRoom, instant?: boolean) => void) | null
  >(null)
  const route = resolveRoute(pathname)
  const isHome = route.kind === 'home'
  const [homeMounted, setHomeMounted] = useState(() => isHome)
  const [exitingProject, setExitingProject] = useState(false)
  const exitTimerRef = useRef<number | null>(null)
  const work =
    route.kind === 'work'
      ? works.find((item) => item.slug === route.slug)
      : undefined

  useEffect(() => {
    const loader = document.getElementById('boot-loader')
    if (!loader || loader.dataset.dismissed === 'true') return
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const dismiss = () => {
      if (loader.dataset.dismissed === 'true') return
      loader.dataset.dismissed = 'true'
      if (reduced) {
        loader.remove()
        return
      }
      loader.classList.add('is-exiting')
      window.setTimeout(() => loader.remove(), 520)
    }
    if (reduced) {
      dismiss()
      return
    }
    // Let fonts & first studio frame paint cleanly before lifting the preloader curtain
    const minHold = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(dismiss)
      })
    }, 520)
    return () => window.clearTimeout(minHold)
  }, [])

  useEffect(() => {
    if (isHome) return
    for (const item of works) {
      const src = item.thumbnail ?? item.image
      if (src) {
        const preload = new Image()
        preload.src = src
      }
    }
  }, [isHome])

  useEffect(() => {
    if (work) {
      setLastWorkSlug(work.slug)
      try {
        window.sessionStorage.setItem(LAST_WORK_STORAGE_KEY, work.slug)
      } catch {
        // Ignore storage restrictions
      }
    }
  }, [work])

  const registerHomeJump = useCallback(
    (fn: ((room: StudioRoom, instant?: boolean) => void) | null) => {
      homeJumpRef.current = fn
    },
    [],
  )

  const performRouteChange = useCallback((destination: URL) => {
    window.history.replaceState(
      { ...window.history.state, scrollY: window.scrollY },
      '',
      window.location.href,
    )
    const nextRoute = resolveRoute(destination.pathname)
    const canonicalPath =
      nextRoute.kind === 'home'
        ? pathForSection(
            sectionFromLocation(destination.pathname, destination.hash),
          )
        : destination.pathname

    if (
      canonicalPath === window.location.pathname &&
      !window.location.hash &&
      nextRoute.kind === 'home'
    ) {
      homeJumpRef.current?.(nextRoute.section, false)
      return
    }

    window.history.pushState({ scrollY: 0 }, '', canonicalPath)

    if (nextRoute.kind === 'home') {
      const targetRoom = sectionFromLocation(
        destination.pathname,
        destination.hash,
      )
      setHomeMounted(true)
      setHomeRoom(targetRoom)
      homeJumpRef.current?.(targetRoom, true)
    }

    setPathname(canonicalPath)
    window.scrollTo({ top: 0, behavior: 'instant' })
    requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const requestRouteChange = useCallback(
    (destination: URL) => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (isHome || !work || reduced) {
        performRouteChange(destination)
        return
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
      }
      setExitingProject(true)
      exitTimerRef.current = window.setTimeout(() => {
        exitTimerRef.current = null
        setExitingProject(false)
        performRouteChange(destination)
      }, 310)
    },
    [isHome, performRouteChange, work],
  )

  const handleHeaderSelectRoom = useCallback(
    (targetRoom: StudioRoom) => {
      const nextPath = pathForSection(targetRoom)
      if (isHome) {
        homeJumpRef.current?.(targetRoom, false)
        setPathname(nextPath)
        return
      }
      requestRouteChange(new URL(nextPath, window.location.origin))
    },
    [isHome, requestRouteChange],
  )

  const openWorkSlug = useCallback(
    (slug: string) => {
      setLastWorkSlug(slug)
      try {
        window.sessionStorage.setItem(LAST_WORK_STORAGE_KEY, slug)
      } catch {
        // Ignore storage restrictions
      }
      performRouteChange(new URL(`/projects/${slug}`, window.location.origin))
    },
    [performRouteChange],
  )

  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const pop = () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
        exitTimerRef.current = null
      }
      setExitingProject(false)
      const nextPath = window.location.pathname
      const nextRoute = resolveRoute(nextPath)
      if (nextRoute.kind === 'home') {
        const targetRoom = sectionFromLocation(
          window.location.pathname,
          window.location.hash,
        )
        setHomeMounted(true)
        setHomeRoom(targetRoom)
        homeJumpRef.current?.(targetRoom, true)
      }
      setPathname(nextPath)
      requestAnimationFrame(() => {
        const saved = window.history.state?.scrollY
        if (nextRoute.kind === 'home') {
          window.scrollTo({ top: 0, behavior: 'instant' })
        } else if (typeof saved === 'number') {
          window.scrollTo({ top: saved, behavior: 'instant' })
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' })
        }
      })
    }
    window.addEventListener('popstate', pop)
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
      }
      window.removeEventListener('popstate', pop)
      window.history.scrollRestoration = previous
    }
  }, [])

  useEffect(() => {
    document.title = work
      ? `${work.title} — Kurt`
      : route.kind === 'home'
        ? 'Kurt — Portfolio'
        : 'Page not found — Kurt'
  }, [work, route.kind])

  function navigate(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      'a[data-route]',
    )
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return
    const destination = new URL(anchor.href)
    if (destination.origin !== window.location.origin) return
    event.preventDefault()
    requestRouteChange(destination)
  }

  function blockMediaCopy(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element | null
    if (
      target?.closest(
        'img, canvas, .skeleton-media, .cert-modal-media, .about-photo-card, .project-lightbox-backdrop, .kg-stage-viewport, .shards-bento-tile, .trailer-native-viewport',
      )
    ) {
      event.preventDefault()
    }
  }

  function blockMediaDrag(event: React.DragEvent<HTMLDivElement>) {
    const target = event.target as Element | null
    if (target?.closest('img, canvas, .skeleton-media')) {
      event.preventDefault()
    }
  }

  return (
    <div
      onClick={navigate}
      onContextMenu={blockMediaCopy}
      onDragStart={blockMediaDrag}
      className="portfolio-root"
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Persistent Unified Header — Never animates, fades, or shifts across route changes */}
      <StudioTopHeader
        currentRoom={isHome ? homeRoom : 'work'}
        onSelectRoom={handleHeaderSelectRoom}
      />

      <main id="main" ref={mainRef} tabIndex={-1}>
        {homeMounted && (
          <StudioHome
            active={isHome}
            onOpenWork={openWorkSlug}
            initialWorkSlug={lastWorkSlug}
            onRoomChange={setHomeRoom}
            onRegisterJump={registerHomeJump}
          />
        )}

        {!isHome &&
          (work ? (
            <ProjectShowcase
              key={work.slug}
              work={work}
              exiting={exitingProject}
            />
          ) : (
            <section className="missing-page">
              <a className="project-back-btn" href="/projects" data-route>
                <Arrow reverse /> BACK TO PROJECTS
              </a>
              <h1>Page not found.</h1>
              <p>That address does not match a project in this portfolio.</p>
            </section>
          ))}
      </main>
    </div>
  )
}
