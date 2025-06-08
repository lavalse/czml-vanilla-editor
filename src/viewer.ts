export function initViewer(containerId: string) {
  const viewer = new Cesium.Viewer(containerId, {
    animation: false,
    timeline: false,
    shouldAnimate: true,
  });
  Cesium.Ion.defaultAccessToken = '你的TOKEN';
  return viewer;
}

export function onClickCoord(viewer: any, callback: (coord: any) => void) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((event: any) => {
    const pos = viewer.scene.pickPosition(event.position);
    if (pos) {
      const carto = Cesium.Cartographic.fromCartesian(pos);
      callback({
        lon: Cesium.Math.toDegrees(carto.longitude),
        lat: Cesium.Math.toDegrees(carto.latitude),
        height: carto.height,
      });
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
