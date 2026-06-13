/** Frequency (Hz) of a note `n` semitones from A4 (440Hz). Pure. */
export function noteToFreq(semitonesFromA4: number): number {
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}
