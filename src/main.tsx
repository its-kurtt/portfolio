import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'

export function dismissBootLoader() {
  const loader = document.getElementById('boot-loader')
  if (!loader || loader.dataset.dismissed === 'true') return
  loader.dataset.dismissed = 'true'

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    loader.remove()
    return
  }

  loader.classList.add('is-exiting')
  window.setTimeout(() => {
    loader.remove()
  }, 520)
}

const App = lazy(() => import('./portfolio/Portfolio'))

// Safety net so the preloader never stalls under unexpected runtime errors
window.setTimeout(dismissBootLoader, 4500)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </React.StrictMode>,
)
