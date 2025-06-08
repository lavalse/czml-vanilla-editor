export function initViewer(containerId: string) {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string;

  const viewer = new Cesium.Viewer(containerId, {
    animation: false,
    timeline: false,
    shouldAnimate: true,
  });

  return viewer;
}


export function addStaticPoint(viewer: any) {
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(139.7670, 35.6814, 0), // 东京站
    point: {
      pixelSize: 10,
      color: Cesium.Color.RED,
    },
    name: "静态点"
  });
}