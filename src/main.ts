import { initViewer, addStaticPoint } from './viewer';


const viewer = initViewer('cesiumContainer');

const button = document.getElementById("addPointBtn")!;
button.addEventListener("click", () => {
  addStaticPoint(viewer);
});