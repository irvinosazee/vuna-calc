import './ui/journey.css';
import { renderFallback } from './ui/fallback';
import { webglAvailable } from './ui/webgl';

const app = document.getElementById('app')!;

if (!webglAvailable()) {
  renderFallback(app);
} else {
  console.log('Veritas Journey — 3D scene arrives in Task 6/7');
}
