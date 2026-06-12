import { introBeats, levels, student, totalUnits, allCourses, type Course } from '../data/journey';
import type { Mode } from '../rigs/types';

export interface CourseHit {
  course: Course;
  levelIdx: number;
  semIdx: number;
}

export interface OverlayHandles {
  update(progress: number, mode: Mode): void;
  showCourse(hit: CourseHit): void;
  hideCourse(): void;
}

export function levelLabel(progress: number): string {
  if (progress < 0.06) return 'Prologue';
  if (progress >= 0.93) return 'The Canopy';
  const idx = Math.min(3, Math.floor((progress - 0.06) / ((0.93 - 0.06) / 4)));
  return `${(idx + 1) * 100} Level`;
}

export function createOverlay(root: HTMLElement, onMode: (m: Mode) => void): OverlayHandles {
  root.innerHTML = `
    <header class="hud-top">
      <div class="brand">🌳 Veritas Journey</div>
      <nav class="modes">
        <button class="mode-btn active" data-mode="journey">Journey</button>
        <button class="mode-btn" data-mode="explore">Explore</button>
        <button class="mode-btn" data-mode="walk" disabled title="Coming soon">Walk</button>
        <a class="mode-btn calc-link" href="./calculator/">Calculator</a>
      </nav>
    </header>
    <div class="beats">
      ${introBeats
        .map((b, i) => `<section class="beat" data-beat="${i}"><h2>${b.title}</h2><p>${b.text}</p></section>`)
        .join('')}
    </div>
    <div class="hud-bottom">
      <div class="level-label">Prologue</div>
      <div class="progress-track"><div class="progress-fill"></div></div>
      <div class="scroll-hint">Scroll to grow ↓</div>
    </div>
    <aside class="course-card hidden">
      <button class="card-close" aria-label="Close">×</button>
      <div class="card-code"></div>
      <h3 class="card-title"></h3>
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
  const fill = root.querySelector<HTMLElement>('.progress-fill')!;
  const label = root.querySelector<HTMLElement>('.level-label')!;
  const hint = root.querySelector<HTMLElement>('.scroll-hint')!;
  const finale = root.querySelector<HTMLElement>('.finale')!;
  const card = root.querySelector<HTMLElement>('.course-card')!;
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('button.mode-btn[data-mode]')];

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => {
      if (!btn.disabled) onMode(btn.dataset.mode as Mode);
    });
  }
  card.querySelector('.card-close')!.addEventListener('click', () => card.classList.add('hidden'));

  return {
    update(progress: number, mode: Mode): void {
      const exploring = mode === 'explore';
      beats.forEach((el, i) => {
        const start = i * 0.06;
        el.classList.toggle('visible', !exploring && progress >= start && progress < start + 0.06);
      });
      fill.style.transform = `scaleX(${progress})`;
      label.textContent = exploring ? 'Free explore — drag, zoom, click a leaf' : levelLabel(progress);
      hint.classList.toggle('hidden', exploring || progress > 0.03);
      finale.classList.toggle('hidden', exploring || progress < 0.93);
      for (const btn of modeButtons) btn.classList.toggle('active', btn.dataset.mode === mode);
    },
    showCourse({ course, levelIdx, semIdx }: CourseHit): void {
      const sem = levels[levelIdx].semesters[semIdx];
      card.querySelector('.card-code')!.textContent = course.code;
      card.querySelector('.card-title')!.textContent = course.title;
      card.querySelector('.card-meta')!.textContent =
        `${course.units} unit${course.units === 1 ? '' : 's'} · ${(levelIdx + 1) * 100} Level · ${sem.name} · ${sem.session}`;
      card.classList.remove('hidden');
    },
    hideCourse(): void {
      card.classList.add('hidden');
    },
  };
}
