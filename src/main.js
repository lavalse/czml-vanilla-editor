import { initViewer, enableClickToAddPoint, addPoint } from './viewer.js';

const viewer = initViewer('cesiumContainer');

const button = document.getElementById("addPointBtn");
button.addEventListener("click", () => {
  enableClickToAddPoint(viewer, (coord) => {
    addPoint(viewer, coord);
  });
});
