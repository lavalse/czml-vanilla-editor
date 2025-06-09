/**
 * 地图视图类
 * 负责管理Cesium地图的显示和交互
 */
class MapView {
  constructor(containerId) {
    this.containerId = containerId;
    this.viewer = null;
    this.clickHandler = null;
    this.tempEntity = null;
    this.onMapClickCallback = null;
    
    this.init();
  }

  /**
   * 初始化地图视图
   */
  init() {
    // 设置Cesium Ion令牌
    Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

    // 创建Cesium Viewer
    this.viewer = new Cesium.Viewer(this.containerId, {
      animation: false,
      timeline: false,
      shouldAnimate: true,
    });

    console.log('地图视图初始化完成');
  }

  /**
   * 获取Cesium Viewer实例
   * @returns {Object} Cesium Viewer
   */
  getViewer() {
    return this.viewer;
  }

  /**
   * 在地图上添加一个点
   * @param {Object} coord 坐标对象 {lon, lat, height}
   * @param {Object} options 点的样式选项
   * @returns {Object} Cesium Entity
   */
  addPointToMap(coord, options = {}) {
    const defaultOptions = {
      pixelSize: 10,
      color: Cesium.Color.RED,
      name: '点'
    };

    const finalOptions = { ...defaultOptions, ...options };

    const entity = this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height),
      point: {
        pixelSize: finalOptions.pixelSize,
        color: finalOptions.color,
      },
      name: finalOptions.name,
    });

    return entity;
  }

  /**
   * 启用点击地图添加点的功能
   * @param {Function} onMapClick 点击地图时的回调函数
   */
  enableMapClickToAddPoint(onMapClick) {
    this.onMapClickCallback = onMapClick;

    // 如果已有点击处理器，先销毁
    if (this.clickHandler) {
      this.clickHandler.destroy();
    }

    // 创建新的点击处理器
    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    this.clickHandler.setInputAction((click) => {
      const cartesian = this.viewer.scene.pickPosition(click.position);
      if (!cartesian) return;

      // 转换坐标
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const coord = {
        lon: Cesium.Math.toDegrees(cartographic.longitude),
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
      };

      // 显示临时预览点
      this.showTemporaryPoint(coord);

      // 调用回调函数，让Controller处理后续逻辑
      if (this.onMapClickCallback) {
        this.onMapClickCallback(coord);
      }

    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  /**
   * 禁用地图点击功能
   */
  disableMapClick() {
    if (this.clickHandler) {
      this.clickHandler.destroy();
      this.clickHandler = null;
    }
    this.onMapClickCallback = null;
    this.hideTemporaryPoint();
  }

  /**
   * 显示临时预览点
   * @param {Object} coord 坐标对象
   */
  showTemporaryPoint(coord) {
    // 移除之前的临时点
    this.hideTemporaryPoint();

    // 添加新的临时点
    this.tempEntity = this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height),
      point: {
        pixelSize: 12,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2
      },
      name: "预览点",
    });
  }

  /**
   * 隐藏临时预览点
   */
  hideTemporaryPoint() {
    if (this.tempEntity) {
      this.viewer.entities.remove(this.tempEntity);
      this.tempEntity = null;
    }
  }

  /**
   * 清除地图上的所有实体
   */
  clearAllEntities() {
    this.viewer.entities.removeAll();
  }

  /**
   * 根据CZML数据更新地图显示
   * @param {Array} czmlDocument CZML文档数组
   */
  updateFromCzml(czmlDocument) {
    // 这是观察者模式的实现
    // 当Model数据变化时，自动更新地图显示
    try {
      // 清除现有实体（除了临时点）
      const tempEntity = this.tempEntity;
      this.viewer.entities.removeAll();
      if (tempEntity) {
        this.viewer.entities.add(tempEntity);
        this.tempEntity = tempEntity;
      }

      // 重新加载CZML数据
      if (czmlDocument && czmlDocument.length > 1) {
        // 跳过第一个document实体，只处理实际的地理实体
        for (let i = 1; i < czmlDocument.length; i++) {
          const entity = czmlDocument[i];
          if (entity.position && entity.point) {
            const coord = {
              lon: entity.position.cartographicDegrees[0],
              lat: entity.position.cartographicDegrees[1],
              height: entity.position.cartographicDegrees[2]
            };
            
            this.addPointToMap(coord, {
              name: entity.name || '点',
              color: Cesium.Color.fromBytes(
                entity.point.color.rgba[0],
                entity.point.color.rgba[1],
                entity.point.color.rgba[2],
                entity.point.color.rgba[3]
              ),
              pixelSize: entity.point.pixelSize || 10
            });
          }
        }
      }

      console.log('地图已根据CZML数据更新');
    } catch (error) {
      console.error('更新地图显示时出错:', error);
    }
  }

  /**
   * 销毁地图视图
   */
  destroy() {
    if (this.clickHandler) {
      this.clickHandler.destroy();
    }
    if (this.viewer) {
      this.viewer.destroy();
    }
  }
}

export default MapView;