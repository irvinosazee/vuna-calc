import { describe, it, expect } from 'vitest';
import { buildFallbackHTML } from '../../src/ui/fallback';
import { allCourses, student } from '../../src/data/journey';

describe('buildFallbackHTML', () => {
  const html = buildFallbackHTML();

  it('lists every course exactly once', () => {
    expect(html.match(/class="fb-course"/g)).toHaveLength(allCourses.length);
    expect(html).toContain('SEN101');
    expect(html).toContain('SEN490');
  });

  it('includes the student identity and all four levels', () => {
    expect(html).toContain(student.matric);
    for (const lvl of ['100 Level', '200 Level', '300 Level', '400 Level']) {
      expect(html).toContain(lvl);
    }
  });

  it('links to the calculator', () => {
    expect(html).toContain('href="./calculator/"');
  });

  it('escapes ampersands in course titles', () => {
    expect(html).toContain('Software Testing &amp; Quality Assurance');
    expect(html).not.toContain('Software Testing & Quality Assurance');
  });
});
