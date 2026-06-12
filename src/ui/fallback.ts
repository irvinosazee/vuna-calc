import { levels, student, totalUnits, allCourses } from '../data/journey';

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
      <h3>${sem.name} · ${sem.session}</h3>
      <ul>
        ${sem.courses
          .map(
            (c) =>
              `<li class="fb-course"><code>${c.code}</code> ${c.title} <em>(${c.units} units)</em></li>`,
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
    <p>${student.name} · ${student.matric} · ${student.programme}</p>
    <p>Your browser does not support WebGL, so here is the journey as a list —
       ${allCourses.length} courses, ${totalUnits} credit units across 4 levels.</p>
    <p><a href="./calculator/">Open the calculator →</a></p>
    ${sections}
  </div>`;
}

export function renderFallback(root: HTMLElement): void {
  document.body.classList.add('no-webgl');
  root.innerHTML = buildFallbackHTML();
}
