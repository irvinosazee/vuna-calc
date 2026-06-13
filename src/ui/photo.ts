import type * as THREE from 'three';

/** Clean, timestamped download name for a captured scene photo. Pure. */
export function photoFilename(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `veritas-journey-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
}

/**
 * Capture the WebGL canvas (the 3D scene only — the DOM overlay is never part
 * of the canvas, so the photo is inherently clean) and download it as a PNG.
 * The renderer must be created with `preserveDrawingBuffer: true` so the last
 * rendered frame is still readable here.
 */
export function capturePhoto(renderer: THREE.WebGLRenderer, onSaved: () => void): void {
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = photoFilename(new Date());
    a.click();
    URL.revokeObjectURL(url);
    onSaved();
  }, 'image/png');
}
