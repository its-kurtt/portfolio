import { readFileSync, existsSync } from 'node:fs'
import { works } from '../src/portfolio/content.ts'
import { resolveRoute } from '../src/portfolio/routes.ts'

const manifest = JSON.parse(
  readFileSync(
    new URL('../public/work/manifest.json', import.meta.url),
    'utf8',
  ),
)
const problems = []
for (const work of works) {
  const entry = manifest[work.slug]
  if (work.image && !work.imageCaption)
    problems.push(
      `${work.title}: add a media caption with individual contribution credit`,
    )
  if (
    !entry?.contribution ||
    entry.route !== `/work/${work.slug}` ||
    resolveRoute(entry.route).kind !== 'work'
  )
    problems.push(`${work.title}: contribution or destination missing`)
  if (
    !entry?.media?.length ||
    !['verified-local', 'verified-remote'].includes(entry.status)
  )
    problems.push(`${work.title}: genuine selected media still required`)
  for (const media of entry?.media ?? []) {
    if (
      media.startsWith('/') &&
      !existsSync(new URL(`../public${media}`, import.meta.url))
    )
      problems.push(`${work.title}: missing ${media}`)
    if (media.startsWith('https:') && !entry.verifiedOn)
      problems.push(`${work.title}: external media verification date missing`)
  }
}
const reviewPath = new URL('../release-review.local.json', import.meta.url)
let review = { participants: [], technical: {} }
if (existsSync(reviewPath))
  review = JSON.parse(readFileSync(reviewPath, 'utf8'))
const completed = review.participants.filter(
  (person) =>
    person.unfamiliarWithSite === true &&
    Number.isFinite(person.seconds) &&
    person.seconds > 0 &&
    person.seconds <= 30 &&
    typeof person.id === 'string' &&
    person.id.trim() &&
    person.primaryRole &&
    person.projectAndContribution &&
    person.foundContact &&
    person.signatureExplanation &&
    person.observedOn,
)
if (new Set(completed.map((person) => person.id)).size < 3)
  problems.push(
    'Three actual unfamiliar people must complete the 30-second scan and explain the signature interaction',
  )
if (!(
  review.technical?.mobilePerformance >= 90 &&
  review.technical?.accessibility >= 95 &&
  Number.isFinite(review.technical?.lcpSeconds) &&
  review.technical.lcpSeconds > 0 &&
  review.technical.lcpSeconds <= 2.5 &&
  review.technical?.reportPath &&
  existsSync(new URL(`../${review.technical.reportPath}`, import.meta.url))
))
  problems.push(
    'Record a current mobile performance report: performance ≥90, accessibility ≥95, LCP ≤2.5s',
  )
if (problems.length) {
  console.error(
    `Launch held:\n${problems.map((problem) => `- ${problem}`).join('\n')}`,
  )
  process.exitCode = 1
} else
  console.log(
    'Local launch gates passed. Publication still requires an explicit deployment request.',
  )
