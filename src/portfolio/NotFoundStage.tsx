import { useEffect, useRef, useState } from 'react'
import { Arrow } from './FeatureLab'

const DIGIT_4 = ['10010', '10010', '10010', '11111', '00010', '00010', '00010']

const DIGIT_0 = ['01110', '10001', '10001', '10001', '10001', '10001', '01110']

const PATTERN_404 = DIGIT_4.map((row, idx) => `${row}00${DIGIT_0[idx]}00${row}`)

const ROW_COLORS = [
  '#f5f3ee',
  '#f8e6b4',
  '#f5bd2a',
  '#f5bd2a',
  '#f49326',
  '#f26322',
  '#f26322',
]

type Brick = {
  col: number
  row: number
  x: number
  y: number
  w: number
  h: number
  alive: boolean
  color: string
}

type Spark = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vrot: number
  life: number
  maxLife: number
  color: string
}

type TrailPoint = { x: number; y: number }

export function NotFoundStage() {
  const cardRef = useRef<HTMLDivElement>(null)
  const arenaCanvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [phase, setPhase] = useState<'ready' | 'playing' | 'cleared' | 'lost'>(
    'ready',
  )
  const controlsRef = useRef<{
    launch: () => void
    movePaddleToRatio: (ratio: number) => void
  } | null>(null)

  // Signature Skhiladze viscous 3D card tilt + quadrant planar sheen & 1px edge catch
  useEffect(() => {
    const cardEl = cardRef.current
    if (!cardEl) return
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduced) return

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
    let targetSheenX = 50
    let targetSheenY = 50
    let smoothSheenX = 50
    let smoothSheenY = 50

    const onPointerMove = (event: PointerEvent) => {
      const vw = Math.max(1, window.innerWidth)
      const vh = Math.max(1, window.innerHeight)
      targetCamX = (event.clientX / vw - 0.5) * 2
      targetCamY = (event.clientY / vh - 0.5) * 2

      const rect = cardEl.getBoundingClientRect()
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
        targetSheenX = ((event.clientX - rect.left) / rect.width) * 100
        targetSheenY = ((event.clientY - rect.top) / rect.height) * 100
      } else {
        targetHover = 0
        targetHoverX = 0
        targetHoverY = 0
      }
    }

    const onPointerLeave = () => {
      targetCamX = 0
      targetCamY = 0
      targetHover = 0
      targetHoverX = 0
      targetHoverY = 0
    }

    let rafId = 0
    let lastTime = performance.now()
    const startTime = lastTime

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now
      const t = (now - startTime) / 1000

      if (window.innerWidth <= 820) {
        cardEl.style.transform = ''
        cardEl.style.removeProperty('--card-hover')
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

      const sheenEase = 1 - Math.exp(-dt * 3.8)
      smoothSheenX += (targetSheenX - smoothSheenX) * sheenEase
      smoothSheenY += (targetSheenY - smoothSheenY) * sheenEase

      const floatY = Math.sin(t * 0.85) * 4.0
      const floatZ = 10 + Math.cos(t * 0.65) * 4.0 + smoothHover * 14
      const rotY = -smoothHoverX * 4.4 + Math.sin(t * 0.48) * 0.32
      const rotX = smoothHoverY * 3.2 + Math.cos(t * 0.56) * 0.22
      const rotZ = -smoothHoverX * smoothHoverY * 0.32

      cardEl.style.transform = `perspective(1450px) translate3d(${(-smoothCamX * 10).toFixed(2)}px, ${(floatY - smoothCamY * 6.5).toFixed(2)}px, ${floatZ.toFixed(2)}px) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`
      cardEl.style.setProperty('--hover-x', `${smoothSheenX.toFixed(1)}%`)
      cardEl.style.setProperty('--hover-y', `${smoothSheenY.toFixed(1)}%`)
      cardEl.style.setProperty('--card-hover', smoothHover.toFixed(3))

      rafId = window.requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave, { passive: true })
    rafId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      cardEl.style.transform = ''
      cardEl.style.removeProperty('--card-hover')
    }
  }, [])

  // Playable "404 Breaker" canvas stage
  useEffect(() => {
    const canvas = arenaCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let w = 620
    let h = 340
    let dpr = Math.min(2, window.devicePixelRatio || 1)

    const cols = PATTERN_404[0].length
    const rows = PATTERN_404.length
    let bricks: Brick[] = []
    const sparks: Spark[] = []
    const trail: TrailPoint[] = []

    let paddleW = 96
    let paddleH = 10
    let paddleX = w * 0.5
    let targetPaddleX = w * 0.5
    let paddleY = h - 26

    let ballR = 6.5
    let ballX = paddleX
    let ballY = paddleY - paddleH / 2 - ballR - 2
    let ballVx = 0
    let ballVy = 0
    let ballSpeed = 300

    let gamePhase: 'ready' | 'playing' | 'cleared' | 'lost' = 'ready'
    let localScore = 0
    let localBest = 0
    let shake = 0
    let keyLeft = false
    let keyRight = false

    const layoutBricks = (preserveAlive: boolean) => {
      const aliveMap = new Map<string, boolean>()
      if (preserveAlive) {
        for (const b of bricks) aliveMap.set(`${b.col},${b.row}`, b.alive)
      }
      const padX = Math.max(20, w * 0.085)
      const topY = Math.max(36, h * 0.14)
      const gap = Math.max(3, Math.round(w * 0.008))
      const availW = w - padX * 2
      const availH = h * 0.48
      const cell = Math.min(
        (availW - gap * (cols - 1)) / cols,
        (availH - gap * (rows - 1)) / rows,
      )
      const totalW = cell * cols + gap * (cols - 1)
      const startX = (w - totalW) * 0.5

      const next: Brick[] = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (PATTERN_404[r][c] !== '1') continue
          const key = `${c},${r}`
          next.push({
            col: c,
            row: r,
            x: startX + c * (cell + gap),
            y: topY + r * (cell + gap),
            w: cell,
            h: cell,
            alive: preserveAlive ? (aliveMap.get(key) ?? true) : true,
            color: ROW_COLORS[r] ?? '#f5bd2a',
          })
        }
      }
      bricks = next
    }

    const resetBallToPaddle = () => {
      ballX = paddleX
      ballY = paddleY - paddleH / 2 - ballR - 3
      ballVx = 0
      ballVy = 0
      trail.length = 0
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width < 10 || rect.height < 10) return
      const prevW = w
      w = rect.width
      h = rect.height
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      paddleW = Math.max(68, Math.min(110, w * 0.175))
      paddleH = Math.max(8, Math.min(10, h * 0.03))
      paddleY = h - Math.max(22, h * 0.08)
      ballR = Math.max(5.5, Math.min(7, w * 0.012))
      ballSpeed = Math.max(255, Math.min(360, w * 0.54))

      const ratio = prevW > 0 ? paddleX / prevW : 0.5
      paddleX = Math.max(
        paddleW * 0.5 + 8,
        Math.min(w - paddleW * 0.5 - 8, ratio * w),
      )
      targetPaddleX = paddleX

      layoutBricks(bricks.length > 0 && gamePhase === 'playing')
      if (gamePhase !== 'playing') {
        resetBallToPaddle()
      }
    }

    const spawnSparks = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 55 + Math.random() * 175
        const maxLife = 0.35 + Math.random() * 0.35
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          size: 2 + Math.random() * 3,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 10,
          life: maxLife,
          maxLife,
          color,
        })
      }
    }

    const launch = () => {
      if (gamePhase === 'playing') return
      if (gamePhase === 'cleared' || gamePhase === 'lost') {
        layoutBricks(false)
        localScore = 0
        setScore(0)
      }
      gamePhase = 'playing'
      setPhase('playing')
      const launchAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.52
      ballVx = Math.cos(launchAngle) * ballSpeed
      ballVy = Math.sin(launchAngle) * ballSpeed
    }

    const movePaddleToRatio = (ratio: number) => {
      const clamped = Math.max(0, Math.min(1, ratio))
      targetPaddleX = Math.max(
        paddleW * 0.5 + 8,
        Math.min(w - paddleW * 0.5 - 8, clamped * w),
      )
    }

    controlsRef.current = { launch, movePaddleToRatio }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        keyLeft = true
      } else if (
        event.key === 'ArrowRight' ||
        event.key === 'd' ||
        event.key === 'D'
      ) {
        keyRight = true
      } else if (
        (event.key === ' ' || event.key === 'Enter') &&
        document.activeElement?.tagName !== 'A'
      ) {
        if (gamePhase !== 'playing') {
          event.preventDefault()
          launch()
        }
      }
    }

    const onKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        keyLeft = false
      } else if (
        event.key === 'ArrowRight' ||
        event.key === 'd' ||
        event.key === 'D'
      ) {
        keyRight = false
      }
    }

    resize()
    layoutBricks(false)
    resetBallToPaddle()

    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const drawRoundedRect = (
      x: number,
      y: number,
      rw: number,
      rh: number,
      r: number,
    ) => {
      const radius = Math.min(r, rw * 0.5, rh * 0.5)
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + rw - radius, y)
      ctx.quadraticCurveTo(x + rw, y, x + rw, y + radius)
      ctx.lineTo(x + rw, y + rh - radius)
      ctx.quadraticCurveTo(x + rw, y + rh, x + rw - radius, y + rh)
      ctx.lineTo(x + radius, y + rh)
      ctx.quadraticCurveTo(x, y + rh, x, y + rh - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
    }

    let rafId = 0
    let lastTime = performance.now()
    const startTime = lastTime

    const renderFrame = (now: number) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000)
      lastTime = now
      const t = (now - startTime) / 1000

      const keySpeed = w * 0.85
      if (keyLeft) targetPaddleX -= keySpeed * dt
      if (keyRight) targetPaddleX += keySpeed * dt
      targetPaddleX = Math.max(
        paddleW * 0.5 + 8,
        Math.min(w - paddleW * 0.5 - 8, targetPaddleX),
      )
      paddleX += (targetPaddleX - paddleX) * (1 - Math.exp(-dt * 24))

      shake *= Math.exp(-dt * 18)

      if (gamePhase === 'playing') {
        ballX += ballVx * dt
        ballY += ballVy * dt

        if (ballX - ballR < 6) {
          ballX = 6 + ballR
          ballVx = Math.abs(ballVx)
          spawnSparks(ballX, ballY, '#f5f3ee', 4)
        } else if (ballX + ballR > w - 6) {
          ballX = w - 6 - ballR
          ballVx = -Math.abs(ballVx)
          spawnSparks(ballX, ballY, '#f5f3ee', 4)
        }
        if (ballY - ballR < 6) {
          ballY = 6 + ballR
          ballVy = Math.abs(ballVy)
          spawnSparks(ballX, ballY, '#f5f3ee', 4)
        }

        const padLeft = paddleX - paddleW * 0.5
        const padRight = paddleX + paddleW * 0.5
        const padTop = paddleY - paddleH * 0.5
        if (
          ballVy > 0 &&
          ballY + ballR >= padTop &&
          ballY - ballR <= paddleY + paddleH * 0.5 &&
          ballX + ballR >= padLeft &&
          ballX - ballR <= padRight
        ) {
          const hitOffset = Math.max(
            -1,
            Math.min(1, (ballX - paddleX) / (paddleW * 0.5)),
          )
          const bounceAngle = -Math.PI * 0.5 + hitOffset * 1.05
          const nextSpeed = Math.min(
            ballSpeed * 1.38,
            Math.hypot(ballVx, ballVy) * 1.015,
          )
          ballVx = Math.cos(bounceAngle) * nextSpeed
          ballVy = Math.sin(bounceAngle) * nextSpeed
          ballY = padTop - ballR - 1
          spawnSparks(ballX, padTop, '#f5bd2a', 6)
        }

        let remaining = 0
        let hitBrick = false
        for (const b of bricks) {
          if (!b.alive) continue
          remaining++
          if (hitBrick) continue
          const nearestX = Math.max(b.x, Math.min(ballX, b.x + b.w))
          const nearestY = Math.max(b.y, Math.min(ballY, b.y + b.h))
          const dx = ballX - nearestX
          const dy = ballY - nearestY
          if (dx * dx + dy * dy <= ballR * ballR) {
            b.alive = false
            remaining--
            hitBrick = true
            shake = 1
            if (Math.abs(dx) > Math.abs(dy)) {
              ballVx = -ballVx
            } else {
              ballVy = -ballVy
            }
            spawnSparks(b.x + b.w * 0.5, b.y + b.h * 0.5, b.color, 11)
            localScore += 10
            setScore(localScore)
            if (localScore > localBest) {
              localBest = localScore
              setBest(localBest)
            }
          }
        }

        if (remaining === 0) {
          gamePhase = 'cleared'
          setPhase('cleared')
          spawnSparks(w * 0.5, h * 0.4, '#f5bd2a', 26)
          spawnSparks(w * 0.5, h * 0.4, '#f26322', 18)
          resetBallToPaddle()
        } else if (ballY - ballR > h + 14) {
          gamePhase = 'lost'
          setPhase('lost')
          resetBallToPaddle()
        }

        trail.push({ x: ballX, y: ballY })
        if (trail.length > 10) trail.shift()
      } else {
        ballX = paddleX
        ballY = paddleY - paddleH * 0.5 - ballR - 3 + Math.sin(t * 4) * 1.6
      }

      ctx.clearRect(0, 0, w, h)
      ctx.save()
      if (shake > 0.02) {
        ctx.translate(
          (Math.random() - 0.5) * shake * 4,
          (Math.random() - 0.5) * shake * 4,
        )
      }

      const gridStep = Math.max(24, Math.round(w / 18))
      ctx.strokeStyle = 'rgba(245, 243, 238, 0.045)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      for (let gx = gridStep; gx < w; gx += gridStep) {
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, h)
      }
      for (let gy = gridStep; gy < h; gy += gridStep) {
        ctx.moveTo(0, gy)
        ctx.lineTo(w, gy)
      }
      ctx.stroke()
      ctx.setLineDash([])

      for (const b of bricks) {
        if (!b.alive) continue
        ctx.save()
        ctx.shadowColor = b.color
        ctx.shadowBlur = 8
        ctx.fillStyle = b.color
        drawRoundedRect(b.x, b.y, b.w, b.h, Math.max(3, b.w * 0.22))
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
        drawRoundedRect(
          b.x + 1.5,
          b.y + 1.5,
          b.w - 3,
          Math.max(2, b.h * 0.24),
          2,
        )
        ctx.fill()
        ctx.restore()
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life -= dt
        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }
        s.vx *= Math.exp(-dt * 2.8)
        s.vy = s.vy * Math.exp(-dt * 2.8) + 220 * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.rot += s.vrot * dt
        ctx.save()
        ctx.globalAlpha = Math.max(0, s.life / s.maxLife)
        ctx.translate(s.x, s.y)
        ctx.rotate(s.rot)
        ctx.fillStyle = s.color
        ctx.fillRect(-s.size * 0.5, -s.size * 0.5, s.size, s.size)
        ctx.restore()
      }

      for (let i = 0; i < trail.length; i++) {
        const tp = trail[i]
        const ratio = (i + 1) / trail.length
        ctx.beginPath()
        ctx.fillStyle = `rgba(245, 189, 42, ${(ratio * 0.28).toFixed(3)})`
        ctx.arc(tp.x, tp.y, ballR * (0.45 + ratio * 0.45), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.save()
      ctx.shadowColor = 'rgba(245, 189, 42, 0.55)'
      ctx.shadowBlur = 14
      const padGrad = ctx.createLinearGradient(
        paddleX - paddleW * 0.5,
        paddleY,
        paddleX + paddleW * 0.5,
        paddleY,
      )
      padGrad.addColorStop(0, '#f26322')
      padGrad.addColorStop(0.5, '#f5bd2a')
      padGrad.addColorStop(1, '#f26322')
      ctx.fillStyle = padGrad
      drawRoundedRect(
        paddleX - paddleW * 0.5,
        paddleY - paddleH * 0.5,
        paddleW,
        paddleH,
        999,
      )
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.shadowColor = '#f5bd2a'
      ctx.shadowBlur = 14
      ctx.fillStyle = '#f5f3ee'
      ctx.beginPath()
      ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      ctx.restore()

      if (!reduced) {
        rafId = window.requestAnimationFrame(renderFrame)
      }
    }

    if (reduced) {
      renderFrame(performance.now())
    } else {
      rafId = window.requestAnimationFrame(renderFrame)
    }

    return () => {
      controlsRef.current = null
      ro.disconnect()
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handleArenaPointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    controlsRef.current?.movePaddleToRatio(
      (event.clientX - rect.left) / rect.width,
    )
  }

  const handleArenaPointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width > 0) {
      controlsRef.current?.movePaddleToRatio(
        (event.clientX - rect.left) / rect.width,
      )
    }
    controlsRef.current?.launch()
  }

  return (
    <section className="missing-page" aria-labelledby="not-found-title">
      <div ref={cardRef} className="missing-card">
        <div className="missing-arena-wrap">
          <div className="missing-arena-hud" aria-live="polite">
            <span>
              SCORE <strong>{String(score).padStart(3, '0')}</strong>
            </span>
            <span>
              BEST <strong>{String(best).padStart(3, '0')}</strong>
            </span>
          </div>

          <canvas
            ref={arenaCanvasRef}
            className="missing-arena-canvas"
            role="img"
            aria-label="Interactive 404 brick-breaker mini-game. Tap or click to launch the orb and move your cursor or finger to steer the paddle."
            onPointerMove={handleArenaPointerMove}
            onPointerDown={handleArenaPointerDown}
          />

          {phase !== 'playing' && (
            <span className="missing-arena-prompt" aria-hidden="true">
              {phase === 'cleared'
                ? '404 SMASHED! TAP TO PLAY AGAIN'
                : phase === 'lost'
                  ? 'OOPS — TAP TO RELAUNCH'
                  : 'TAP OR CLICK TO SMASH THE 404'}
            </span>
          )}
        </div>

        <h1 id="not-found-title">Houston, we have a problem.</h1>
        <p>
          This page drifted out of orbit and vanished into deep space. Smash the
          404 while you&apos;re floating here, or fly back to base.
        </p>

        <div className="missing-actions">
          <a className="missing-primary-btn" href="/" data-route>
            <Arrow reverse />
            <span>BACK TO INTRO</span>
          </a>
        </div>
      </div>
    </section>
  )
}
