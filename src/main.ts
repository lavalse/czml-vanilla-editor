import { initViewer, onClickCoord } from './viewer';
import { addPointToCzml, getCzml } from './czmlManager';

const viewer = initViewer('cesiumContainer');

onClickCoord(viewer, (coord) => {
  addPointToCzml(coord);
  document.getElementById('czmlOutput')!.textContent = JSON.stringify(getCzml(), null, 2);
});

document.getElementById('exportBtn')!.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(getCzml(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'output.czml';
  a.click();
});
