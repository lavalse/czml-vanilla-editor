export function initViewer(containerId) {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

  const viewer = new Cesium.Viewer(containerId, {
    animation: false,
    timeline: false,
    shouldAnimate: true,
  });

  return viewer;
}

export function addStaticPoint(viewer) {
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(139.7670, 35.6814, 0),
    point: {
      pixelSize: 10,
      color: Cesium.Color.RED,
    },
    name: "静态点",
  });
}

// --- 新增交互添加点逻辑 ---
let clickHandler = null;
let tempEntity = null;

export function enableClickToAddPoint(viewer, onConfirm) {
  if (clickHandler) {
    clickHandler.destroy();
  }

  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

  clickHandler.setInputAction((click) => {
    const cartesian = viewer.scene.pickPosition(click.position);
    if (!cartesian) return;

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const height = cartographic.height;

    // 显示临时点
    if (tempEntity) viewer.entities.remove(tempEntity);
    tempEntity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      point: {
        pixelSize: 10,
        color: Cesium.Color.YELLOW,
      },
      name: "临时点",
    });

    if (confirm(`是否添加点？\n经度: ${lon.toFixed(6)}\n纬度: ${lat.toFixed(6)}\n高度: ${height.toFixed(2)}`)) {
      if (tempEntity) {
        viewer.entities.remove(tempEntity);
        tempEntity = null;
      }
      onConfirm({ lon, lat, height });
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

export function addPoint(viewer, coord) {
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height),
    point: {
      pixelSize: 10,
      color: Cesium.Color.RED,
    },
    name: "确认后的点",
  });
}
