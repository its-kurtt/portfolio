export type StudioRouteSection =
  'intro' | 'about' | 'work' | 'experience' | 'contact'

export function sectionFromLocation(
  pathname: string,
  hash = '',
): StudioRouteSection {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/about') return 'about'
  if (path === '/projects' || path === '/work') return 'work'
  if (path === '/experience') return 'experience'
  if (path === '/contact') return 'contact'
  const cleanHash = hash.replace(/^#/, '').toLowerCase()
  if (cleanHash === 'about') return 'about'
  if (
    cleanHash === 'projects' ||
    cleanHash === 'work' ||
    cleanHash === 'portfolio'
  )
    return 'work'
  if (cleanHash === 'experience' || cleanHash === 'acm') return 'experience'
  if (cleanHash === 'contact' || cleanHash === 'contacts') return 'contact'
  return 'intro'
}

export function pathForSection(section: StudioRouteSection): string {
  if (section === 'about') return '/about'
  if (section === 'work') return '/projects'
  if (section === 'experience') return '/experience'
  if (section === 'contact') return '/contact'
  return '/'
}

export function resolveRoute(
  pathname: string,
):
  | { kind: 'home'; section: StudioRouteSection }
  | { kind: 'work'; slug: string }
  | { kind: 'privacy' }
  | { kind: 'missing' } {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { kind: 'home', section: 'intro' }
  if (path === '/about') return { kind: 'home', section: 'about' }
  if (path === '/projects' || path === '/work')
    return { kind: 'home', section: 'work' }
  if (path === '/experience') return { kind: 'home', section: 'experience' }
  if (path === '/contact') return { kind: 'home', section: 'contact' }
  if (path === '/privacy' || path === '/privacy-policy')
    return { kind: 'privacy' }
  const match = /^\/(?:projects|work)\/([a-z0-9-]+)$/.exec(path)
  return match ? { kind: 'work', slug: match[1] } : { kind: 'missing' }
}

export function wrapLesson(index: number, length: number): number {
  return length > 0 ? ((index % length) + length) % length : 0
}
