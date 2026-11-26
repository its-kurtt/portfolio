import { useRef, useState } from 'react'
import { decisions, lessons } from './content'
import { wrapLesson } from './routes'

export function FeatureLab() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showBuild, setShowBuild] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [decisionIndex, setDecisionIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  const lesson = lessons[activeIndex]
  const decision = decisions[decisionIndex]
  const move = (delta: number) =>
    setActiveIndex((index) => wrapLesson(index + delta, lessons.length))

  return (
    <div className={`feature-lab ${showBuild ? 'is-open' : ''}`}>
      <div className="lab-toolbar">
        <div className="segmented" aria-label="Feature view">
          <button
            type="button"
            aria-pressed={!showBuild}
            onClick={() => setShowBuild(false)}
          >
            Experience
          </button>
          <button
            type="button"
            aria-pressed={showBuild}
            onClick={() => setShowBuild(true)}
          >
            Inside the build
          </button>
        </div>
        <div className="viewport-control">
          <button
            type="button"
            aria-pressed={!narrow}
            onClick={() => setNarrow(false)}
            aria-label="Wide preview"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="12" rx="1" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </button>
          <button
            type="button"
            aria-pressed={narrow}
            onClick={() => setNarrow(true)}
            aria-label="Narrow preview"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="7" y="2" width="10" height="20" rx="2" />
              <path d="M11 18h2" />
            </svg>
          </button>
        </div>
      </div>
      <div className="lab-body">
        <div className={`preview-bay ${narrow ? 'is-narrow' : ''}`}>
          <div className="preview-ruler" aria-hidden="true">
            <span>THE KNOWN GALAXY</span>
            <span>{narrow ? 'NARROW' : 'WIDE'} VIEW</span>
          </div>
          <div
            className={`lesson-preview ${narrow ? 'narrow' : ''}`}
            role="region"
            aria-label="Interactive training carousel. Use left and right arrow keys while focused."
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault()
                move(event.key === 'ArrowRight' ? 1 : -1)
              }
            }}
            onTouchStart={(event) => {
              touchStart.current = event.touches[0].clientX
            }}
            onTouchEnd={(event) => {
              if (touchStart.current === null) return
              const distance =
                touchStart.current - event.changedTouches[0].clientX
              if (Math.abs(distance) > 50) move(distance > 0 ? 1 : -1)
              touchStart.current = null
            }}
            onTouchCancel={() => {
              touchStart.current = null
            }}
          >
            <div className="lesson-photo">
              <img
                src={`/work/known-galaxy/trainings/training_${lesson.image}.webp`}
                alt={`Archive artwork for ${lesson.title}`}
                width="760"
                height="480"
                loading="lazy"
              />
            </div>
            <div className="lesson-copy" aria-live="polite" aria-atomic="true">
              <p className="rank">Required rank: {lesson.rank}</p>
              <h3>{lesson.title}</h3>
              <p>{lesson.description}</p>
              <span className="lesson-source">
                Training archive · interactive adaptation
              </span>
            </div>
          </div>
          <div className="lesson-controls">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous lesson"
            >
              <Arrow reverse />
            </button>
            <div className="lesson-dots" aria-label="Choose a lesson">
              {lessons.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ${item.title}`}
                  aria-pressed={index === activeIndex}
                >
                  <span />
                </button>
              ))}
            </div>
            <span className="lesson-count" aria-hidden="true">
              {String(activeIndex + 1).padStart(2, '0')} / 05
            </span>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next lesson"
            >
              <Arrow />
            </button>
          </div>
        </div>
        {showBuild && (
          <aside className="build-panel" aria-label="Implementation decisions">
            <div className="decision-tabs" aria-label="Explore implementation">
              {decisions.map((item, index) => (
                <button
                  type="button"
                  key={item.name}
                  aria-pressed={index === decisionIndex}
                  onClick={() => setDecisionIndex(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <div className="component-tree" aria-label="Component structure">
              <code>Trainings</code>
              <div>
                <code className={decisionIndex === 0 ? 'selected' : ''}>
                  trainings.ts
                </code>
                <code className={decisionIndex === 1 ? 'selected' : ''}>
                  useTrainingCarousel
                </code>
                <code className={decisionIndex === 3 ? 'selected' : ''}>
                  TrainingCard
                </code>
                <code className={decisionIndex === 2 ? 'selected' : ''}>
                  TrainingNavigation
                </code>
              </div>
            </div>
            <div className="decision-copy" aria-live="polite">
              <code>{decision.file}</code>
              <h3>{decision.title}</h3>
              <p>{decision.text}</p>
            </div>
          </aside>
        )}
      </div>
      <p className="lab-note">
        Adapted from my project’s actual components and five-lesson data.
        Original archive imagery belongs to its respective creators; my
        contribution is the interface and implementation.
      </p>
    </div>
  )
}

export function Arrow({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg
      className={reverse ? 'arrow reverse' : 'arrow'}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 12h15M13 5l7 7-7 7" />
    </svg>
  )
}
