import { describe, it, expect } from 'vitest';
import { noteToFreq } from '../../src/audio/notes';
import { photoFilename } from '../../src/ui/photo';

describe('noteToFreq', () => {
  it('A4 (0) is 440Hz', () => expect(noteToFreq(0)).toBeCloseTo(440));
  it('one octave up doubles', () => expect(noteToFreq(12)).toBeCloseTo(880));
  it('one octave down halves', () => expect(noteToFreq(-12)).toBeCloseTo(220));
  it('a fifth up (~7 semitones)', () => expect(noteToFreq(7)).toBeCloseTo(659.255, 2));
});

describe('photoFilename', () => {
  it('formats a zero-padded timestamped png name', () => {
    expect(photoFilename(new Date(2026, 5, 13, 3, 7, 9))).toBe('veritas-journey-2026-06-13-030709.png');
  });
  it('pads double-digit parts', () => {
    expect(photoFilename(new Date(2026, 10, 21, 14, 30, 45))).toBe('veritas-journey-2026-11-21-143045.png');
  });
});
