import { levels, student, totalUnits, allCourses } from '../data/journey';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Pure HTML builder so the fallback is unit-testable without a DOM. */
export function buildFallbackHTML(): string {
  const sections = levels
    .map(
      (level) => `
    <section class="fb-level">
      <h2>${level.level} Level</h2>
      ${level.semesters
        .map(
          (sem) => `
      <h3>${esc(sem.name)} · ${esc(sem.session)}</h3>
      <ul role="list">
        ${sem.courses
          .map(
            (c) =>
              `<li class="fb-course"><code>${esc(c.code)}</code> ${esc(c.title)} <em>(${c.units} units)</em></li>`,
          )
          .join('\n        ')}
      </ul>`,
        )
        .join('')}
    </section>`,
    )
    .join('');

  return `
  <div class="fallback">
    <h1>Veritas Journey</h1>
    <p>${esc(student.name)} · ${esc(student.matric)} · ${esc(student.programme)}</p>
    <p>Your browser does not support WebGL, so here is the journey as a list —
       ${allCourses.length} courses, ${totalUnits} credit units across 4 levels.</p>
    <p><a href="./calculator/">Open the calculator →</a></p>
    ${sections}
  </div>`;
}

export function renderFallback(root: HTMLElement): void {
  // Side-effect: adds 'no-webgl' to <body> so the scroll spacer is hidden (see journey.css).
  document.body.classList.add('no-webgl');
  root.innerHTML = buildFallbackHTML();
}
