import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  pathForSection,
  resolveRoute,
  sectionFromLocation,
  wrapLesson,
} from '../src/portfolio/routes.ts'
import { works, lessons } from '../src/portfolio/content.ts'

test('each advertised project and section can be opened as a clean standalone route', () => {
  for (const work of works) {
    assert.deepEqual(resolveRoute(`/projects/${work.slug}`), {
      kind: 'work',
      slug: work.slug,
    })
    assert.deepEqual(resolveRoute(`/projects/${work.slug}/`), {
      kind: 'work',
      slug: work.slug,
    })
    assert.ok(work.role && work.outcome)
  }
  assert.equal(new Set(works.map((work) => work.slug)).size, works.length)
  assert.deepEqual(resolveRoute('/'), { kind: 'home', section: 'intro' })
  assert.deepEqual(resolveRoute('/about'), { kind: 'home', section: 'about' })
  assert.deepEqual(resolveRoute('/projects'), { kind: 'home', section: 'work' })
  assert.deepEqual(resolveRoute('/experience'), {
    kind: 'home',
    section: 'experience',
  })
  assert.deepEqual(resolveRoute('/contact'), {
    kind: 'home',
    section: 'contact',
  })
  assert.equal(pathForSection('about'), '/about')
  assert.equal(pathForSection('work'), '/projects')
  assert.equal(pathForSection('experience'), '/experience')
  assert.equal(pathForSection('contact'), '/contact')
  assert.equal(sectionFromLocation('/projects'), 'work')
  assert.equal(sectionFromLocation('/', '#projects'), 'work')
})

test('unsupported nested routes and encoded paths do not masquerade as project pages', () => {
  for (const path of [
    '/projects/a/b',
    '/projects/%2f',
    '/prototype',
    '/unknown',
  ])
    assert.deepEqual(resolveRoute(path), { kind: 'missing' })
})

test('repeated previous/next actions remain in the real five-lesson collection', () => {
  assert.equal(wrapLesson(-1, lessons.length), 4)
  assert.equal(wrapLesson(lessons.length, lessons.length), 0)
  let index = 0
  for (let move = 0; move < 53; move++)
    index = wrapLesson(index - 1, lessons.length)
  assert.equal(lessons[index].title, 'Path to Knowledge')
})
