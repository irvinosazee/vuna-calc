import {
  introBeats,
  levels,
  student,
  totalUnits,
  allCourses,
  theme,
  courseFamily,
  type Course,
} from '../data/journey';
import type { ChapterPosition } from '../journey/chapters';
import type { Mode } from '../rigs/types';

export interface CourseHit {
  course: Course;
  levelIdx: number;
  semIdx: number;
}

export interface OverlayHandles {
  update(progress: number, mode: Mode, pos: ChapterPosition): void;
  showCourse(hit: CourseHit): void;
  hideCourse(): void;
}

const LEGEND = [
  { color: theme.families.SEN, label: 'SEN core' },
  { color: theme.families.GST, label: 'General studies' },
  { color: theme.families.MTH, label: 'Maths & sciences' },
  { color: theme.families.LAB, label: 'Labs · SIWES' },
];

export function createOverlay(
  root: HTMLElement,
  onMode: (m: Mode) => void,
  touch: boolean,
): OverlayHandles {
  root.innerHTML = `
    <header class="hud-top">
      <div class="brand">🌳 Veritas Journey</div>
      <nav class="modes">
        <button class="mode-btn active" data-mode="journey">Journey</button>
        <button class="mode-btn" data-mode="explore">Explore</button>
        <button class="mode-btn" data-mode="walk">Walk</button>
        <a class="mode-btn calc-link" href="./calculator/">Calculator</a>
      </nav>
    </header>
    <div class="beats">
      ${introBeats
        .map((b, i) => `<section class="beat" data-beat="${i}"><h2>${b.title}</h2><p>${b.text}</p></section>`)
        .join('')}
    </div>
    <aside class="chapter-panel hidden">
      <div class="chapter-level"></div>
      <div class="chapter-sem"></div>
      <div class="chapter-meta"></div>
    </aside>
    <div class="leaf-hint hidden">🍃 each leaf is a course — click one</div>
    <div class="hud-bottom">
      <div class="legend">
        ${LEGEND.map((l) => `<span class="legend-item"><i style="background:${l.color}"></i>${l.label}</span>`).join('')}
      </div>
      <div class="level-label">Prologue</div>
      <div class="progress-track"><div class="progress-fill"></div></div>
      <div class="scroll-hint">Scroll to grow ↓</div>
    </div>
    <aside class="course-card hidden">
      <button class="card-close" aria-label="Close">×</button>
      <div class="card-code"></div>
      <h3 class="card-title"></h3>
      <p class="card-about"></p>
      <div class="card-meta"></div>
    </aside>
    <section class="finale hidden">
      <h2>The Canopy</h2>
      <p class="finale-name">${student.name} · ${student.matric}</p>
      <p class="finale-stats">${levels.length} levels · ${levels.length * 2} semesters · ${allCourses.length} courses · ${totalUnits} credit units</p>
      <div class="finale-actions">
        <button class="mode-btn" data-mode="explore">Explore the tree</button>
        <a class="mode-btn calc-link" href="./calculator/">Open the calculator</a>
      </div>
    </section>`;

  const beats = [...root.querySelectorAll<HTMLElement>('.beat')];
  const chapterPanel = root.querySelector<HTMLElement>('.chapter-panel')!;
  const chapterLevel = root.querySelector<HTMLElement>('.chapter-level')!;
  const chapterSem = root.querySelector<HTMLElement>('.chapter-sem')!;
  const chapterMeta = root.querySelector<HTMLElement>('.chapter-meta')!;
  const leafHint = root.querySelector<HTMLElement>('.leaf-hint')!;
  const fill = root.querySelector<HTMLElement>('.progress-fill')!;
  const label = root.querySelector<HTMLElement>('.level-label')!;
  const hint = root.querySelector<HTMLElement>('.scroll-hint')!;
  const finale = root.querySelector<HTMLElement>('.finale')!;
  const card = root.querySelector<HTMLElement>('.course-card')!;
  const cardCode = root.querySelector<HTMLElement>('.card-code')!;
  const cardTitle = root.querySelector<HTMLElement>('.card-title')!;
  const cardAbout = root.querySelector<HTMLElement>('.card-about')!;
  const cardMeta = root.querySelector<HTMLElement>('.card-meta')!;
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('button.mode-btn[data-mode]')];

  let pinned = false; // a clicked leaf overrides the auto ticker until closed
  let shownChapter = ''; // "levelIdx-semIdx" currently in the panel
  let tickerKey = ''; // course currently in the ticker
  let leafHintDone = false;

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => onMode(btn.dataset.mode as Mode));
  }
  card.querySelector('.card-close')!.addEventListener('click', () => {
    pinned = false;
    card.classList.add('hidden');
  });

  function renderCard(hit: CourseHit): void {
    const sem = levels[hit.levelIdx].semesters[hit.semIdx];
    cardCode.textContent = hit.course.code;
    cardCode.style.color = theme.families[courseFamily(hit.course.code)];
    cardTitle.textContent = hit.course.title;
    cardAbout.textContent = hit.course.about;
    cardMeta.textContent = `${hit.course.units} unit${hit.course.units === 1 ? '' : 's'} · ${(hit.levelIdx + 1) * 100} Level · ${sem.name} · ${sem.session}`;
    card.classList.remove('hidden');
  }

  return {
    update(progress: number, mode: Mode, pos: ChapterPosition): void {
      const journey = mode === 'journey';

      if (!journey) {
        // Reset ticker state so re-entering journey re-renders the current
        // course card and re-announces the chapter.
        tickerKey = '';
        shownChapter = '';
      }

      beats.forEach((el, i) => {
        const start = i * 0.06;
        el.classList.toggle('visible', journey && progress >= start && progress < start + 0.06);
      });

      fill.style.transform = `scaleX(${progress})`;
      hint.classList.toggle('hidden', !journey || progress > 0.03);
      finale.classList.toggle('hidden', !journey || pos.phase !== 'finale');
      for (const btn of modeButtons) btn.classList.toggle('active', btn.dataset.mode === mode);

      if (mode === 'walk') {
        label.textContent = touch
          ? 'Walk the grove — left thumb to move · right thumb to look'
          : 'Walk the grove — WASD / arrows to move · drag to look';
      } else if (mode === 'explore') {
        label.textContent = 'Free explore — drag, zoom, click a leaf';
      } else if (pos.phase === 'intro') {
        label.textContent = 'Prologue';
      } else if (pos.phase === 'finale') {
        label.textContent = 'The Canopy';
      } else {
        const sem = levels[pos.levelIdx].semesters[pos.semIdx];
        label.textContent = `${(pos.levelIdx + 1) * 100} Level · ${sem.name}`;
      }

      // Chapter panel
      const inClimb = journey && (pos.phase === 'chapter' || pos.phase === 'course');
      chapterPanel.classList.toggle('hidden', !inClimb);
      chapterPanel.classList.toggle('compact', pos.phase === 'course');
      if (inClimb) {
        const key = `${pos.levelIdx}-${pos.semIdx}`;
        if (key !== shownChapter) {
          shownChapter = key;
          const sem = levels[pos.levelIdx].semesters[pos.semIdx];
          const units = sem.courses.reduce((s, c) => s + c.units, 0);
          chapterLevel.textContent = `${(pos.levelIdx + 1) * 100} LEVEL`;
          chapterSem.textContent = `${sem.name} · ${sem.session}`;
          chapterMeta.textContent = `${sem.courses.length} courses · ${units} units`;
        }
        if (!leafHintDone) {
          leafHintDone = true;
          leafHint.classList.remove('hidden');
          setTimeout(() => leafHint.classList.add('hidden'), 6000);
        }
      }

      // Auto ticker (journey mode only, never over a pinned card)
      if (journey && !pinned) {
        if (pos.phase === 'course') {
          const key = `${pos.levelIdx}-${pos.semIdx}-${pos.courseIdx}`;
          if (key !== tickerKey) {
            tickerKey = key;
            renderCard({
              course: levels[pos.levelIdx].semesters[pos.semIdx].courses[pos.courseIdx],
              levelIdx: pos.levelIdx,
              semIdx: pos.semIdx,
            });
          }
        } else {
          tickerKey = '';
          card.classList.add('hidden');
        }
      }
    },

    showCourse(hit: CourseHit): void {
      pinned = true;
      renderCard(hit);
    },

    hideCourse(): void {
      pinned = false;
      card.classList.add('hidden');
    },
  };
}
