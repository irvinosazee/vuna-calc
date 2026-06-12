import { describe, it, expect } from 'vitest';
import { levels, allCourses, totalUnits, courseFamily, theme, student, introBeats } from '../../src/data/journey';

describe('journey data integrity', () => {
  it('has 4 levels, each with 2 semesters', () => {
    expect(levels.map((l) => l.level)).toEqual([100, 200, 300, 400]);
    for (const level of levels) expect(level.semesters).toHaveLength(2);
  });

  it('matches courses.txt course counts per semester', () => {
    const counts = levels.flatMap((l) => l.semesters.map((s) => s.courses.length));
    expect(counts).toEqual([12, 13, 10, 10, 8, 10, 9, 7]);
  });

  it('matches courses.txt credit-unit totals per semester', () => {
    const totals = levels.flatMap((l) =>
      l.semesters.map((s) => s.courses.reduce((sum, c) => sum + c.units, 0)),
    );
    expect(totals).toEqual([24, 24, 21, 20, 20, 21, 17, 18]);
  });

  it('has 79 unique courses totalling 165 units', () => {
    expect(allCourses).toHaveLength(79);
    expect(new Set(allCourses.map((c) => c.code)).size).toBe(79);
    expect(totalUnits).toBe(165);
  });

  it('assigns every course a themed family color', () => {
    for (const course of allCourses) {
      expect(theme.families[courseFamily(course.code)]).toMatch(/^#/);
    }
  });

  it('classifies labs, SIWES and practicum as LAB', () => {
    expect(courseFamily('SEN181')).toBe('LAB');
    expect(courseFamily('SEN482')).toBe('LAB');
    expect(courseFamily('SEN290')).toBe('LAB');
    expect(courseFamily('SEN190')).toBe('LAB');
  });

  it('routes non-lab courses to their own families', () => {
    expect(courseFamily('SEN490')).toBe('SEN');
    expect(courseFamily('GST111')).toBe('GST');
    expect(courseFamily('PHY101')).toBe('SCI');
    expect(courseFamily('STA343')).toBe('SCI');
    expect(courseFamily('MTH101')).toBe('MTH');
  });

  it('student identity is populated', () => {
    expect(student.matric).toMatch(/^VUG\/SEN\/\d{2}\/\d{4}$/);
    expect(student.name).toBeTruthy();
  });

  it('intro beats reference the student data', () => {
    expect(introBeats).toHaveLength(3);
    expect(introBeats[1].text).toContain(student.matric);
  });

  it('every course has a short about line', () => {
    for (const c of allCourses) {
      expect(c.about.length, `${c.code} about`).toBeGreaterThan(10);
      expect(c.about.length, `${c.code} about`).toBeLessThan(160);
    }
  });
});
