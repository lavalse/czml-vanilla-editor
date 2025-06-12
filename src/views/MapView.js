/**
 * 地图视图类
 * 负责管理Cesium地图的显示和交互
 * 支持左键选点和右键确认
 * 新增：支持临时polyline预览
 */
class MapView {
  constructor(containerId) {
    this.containerId = containerId;
    this.viewer = null;
    this.clickHandler = null;
    this.rightClickHandler = null;
    this.tempEntity = null;
    this.tempPolylineEntity = null; // 新增：临时polyline实体
    this.tempPolylinePoints = []; // 新增：临时polyline的点
    this.onMapClickCallback = null;
    this.onRightClickConfirmCallback = null;
    
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

    // 禁用默认的右键上下文菜单
    this.viewer.cesiumWidget.canvas.oncontextmenu = function(e) {
      e.preventDefault();
      return false;
    };

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
   * 在地图上添加一条polyline
   * @param {Array} coordinates 坐标数组 [{lon, lat, height}, ...]
   * @param {Object} options 线的样式选项
   * @returns {Object} Cesium Entity
   */
  addPolylineToMap(coordinates, options = {}) {
    if (!coordinates || coordinates.length < 2) {
      console.error('Polyline至少需要2个点');
      return null;
    }

    const defaultOptions = {
      width: 3,
      color: Cesium.Color.CYAN,
      name: 'Polyline',
      clampToGround: true
    };

    const finalOptions = { ...defaultOptions, ...options };

    // 转换坐标为Cartesian3数组
    const positions = coordinates.map(coord => 
      Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height)
    );

    const entity = this.viewer.entities.add({
      polyline: {
        positions: positions,
        width: finalOptions.width,
        material: finalOptions.color,
        clampToGround: finalOptions.clampToGround
      },
      name: finalOptions.name
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
   * 启用右键确认功能
   * @param {Function} onRightClickConfirm 右键确认时的回调函数
   */
  enableRightClickConfirm(onRightClickConfirm) {
    this.onRightClickConfirmCallback = onRightClickConfirm;

    // 如果已有右键处理器，先销毁
    if (this.rightClickHandler) {
      this.rightClickHandler.destroy();
    }

    // 创建右键处理器
    this.rightClickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    this.rightClickHandler.setInputAction((click) => {
      // 阻止默认右键菜单
      click.preventDefault?.();
      
      // 调用右键确认回调
      if (this.onRightClickConfirmCallback) {
        this.onRightClickConfirmCallback();
      }

    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
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
    this.hideTemporaryPolyline(); // 新增：同时隐藏临时polyline
  }

  /**
   * 禁用右键确认功能
   */
  disableRightClickConfirm() {
    if (this.rightClickHandler) {
      this.rightClickHandler.destroy();
      this.rightClickHandler = null;
    }
    this.onRightClickConfirmCallback = null;
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
   * 更新临时polyline预览
   * @param {Array} coordinates 坐标数组 [{lon, lat, height}, ...]
   */
  updateTemporaryPolyline(coordinates) {
    // 更新临时点数组
    this.tempPolylinePoints = [...coordinates];

    // 移除之前的临时polyline
    this.hideTemporaryPolyline();

    // 如果只有1个点，显示为临时点
    if (coordinates.length === 1) {
      this.showTemporaryPoint(coordinates[0]);
      return;
    }

    // 如果有2个或更多点，显示临时polyline
    if (coordinates.length >= 2) {
      // 隐藏临时点（因为现在显示的是线）
      this.hideTemporaryPoint();

      // 转换坐标为Cartesian3数组
      const positions = coordinates.map(coord => 
        Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height)
      );

      // 创建临时polyline
      this.tempPolylineEntity = this.viewer.entities.add({
        polyline: {
          positions: positions,
          width: 4,
          material: Cesium.Color.YELLOW.withAlpha(0.8), // 半透明黄色
          clampToGround: true,
          classificationType: Cesium.ClassificationType.TERRAIN
        },
        name: `临时折线 (${coordinates.length} 点)`
      });

      // 在每个点位置添加小的预览点
      coordinates.forEach((coord, index) => {
        const pointEntity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height),
          point: {
            pixelSize: 8,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1
          },
          name: `临时点 ${index + 1}`,
          // 将这些点标记为临时polyline的一部分
          _isTemporaryPolylinePoint: true
        });
      });

      console.log(`临时polyline已更新: ${coordinates.length}个点`);
    }
  }

  /**
   * 隐藏临时polyline预览
   */
  hideTemporaryPolyline() {
    // 移除临时polyline实体
    if (this.tempPolylineEntity) {
      this.viewer.entities.remove(this.tempPolylineEntity);
      this.tempPolylineEntity = null;
    }

    // 移除所有临时polyline的点
    const entitiesToRemove = [];
    this.viewer.entities.values.forEach(entity => {
      if (entity._isTemporaryPolylinePoint) {
        entitiesToRemove.push(entity);
      }
    });
    
    entitiesToRemove.forEach(entity => {
      this.viewer.entities.remove(entity);
    });

    // 清空临时点数组
    this.tempPolylinePoints = [];

    console.log('临时polyline已隐藏');
  }

  /**
   * 获取当前临时polyline的点数
   * @returns {number} 点数
   */
  getTemporaryPolylinePointCount() {
    return this.tempPolylinePoints.length;
  }

  /**
   * 获取当前临时polyline的坐标
   * @returns {Array} 坐标数组
   */
  getTemporaryPolylineCoordinates() {
    return [...this.tempPolylinePoints];
  }

  /**
   * 清除地图上的所有实体
   */
  clearAllEntities() {
    this.viewer.entities.removeAll();
    // 重置临时状态
    this.tempEntity = null;
    this.tempPolylineEntity = null;
    this.tempPolylinePoints = [];
  }

  /**
   * 根据CZML数据更新地图显示
   * @param {Array} czmlDocument CZML文档数组
   */
  updateFromCzml(czmlDocument) {
    try {
      // 保存临时实体的引用
      const tempEntity = this.tempEntity;
      const tempPolylineEntity = this.tempPolylineEntity;
      const tempPolylinePoints = [...this.tempPolylinePoints];
      
      // 清除现有实体（但保留临时实体的信息）
      this.viewer.entities.removeAll();
      
      // 重新加载CZML数据
      if (czmlDocument && czmlDocument.length > 1) {
        // 跳过第一个document实体，只处理实际的地理实体
        for (let i = 1; i < czmlDocument.length; i++) {
          const entity = czmlDocument[i];
          
          // 处理点实体
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
          
          // 处理polyline实体
          else if (entity.polyline) {
            console.log('处理polyline实体:', JSON.stringify(entity, null, 2));
            
            if (!entity.polyline.positions) {
              console.error('Polyline实体缺少positions属性:', entity);
              continue;
            }
            
            if (!entity.polyline.positions.cartographicDegrees) {
              console.error('Polyline positions缺少cartographicDegrees属性:', entity.polyline.positions);
              continue;
            }
            
            const cartographicDegrees = entity.polyline.positions.cartographicDegrees;
            const coordinates = [];
            
            // 将平坦数组转换为坐标对象数组
            for (let j = 0; j < cartographicDegrees.length; j += 3) {
              coordinates.push({
                lon: cartographicDegrees[j],
                lat: cartographicDegrees[j + 1],
                height: cartographicDegrees[j + 2]
              });
            }
            
            console.log('转换后的polyline坐标:', coordinates);
            
            // 获取样式信息
            let color = Cesium.Color.CYAN; // 默认颜色
            let width = 3; // 默认宽度
            
            if (entity.polyline.material && 
                entity.polyline.material.solidColor && 
                entity.polyline.material.solidColor.color &&
                entity.polyline.material.solidColor.color.rgba) {
              const rgba = entity.polyline.material.solidColor.color.rgba;
              color = Cesium.Color.fromBytes(rgba[0], rgba[1], rgba[2], rgba[3]);
            }
            
            if (entity.polyline.width) {
              width = entity.polyline.width;
            }
            
            this.addPolylineToMap(coordinates, {
              name: entity.name || 'Polyline',
              color: color,
              width: width,
              clampToGround: entity.polyline.clampToGround !== false
            });
          }
        }
      }

      // 恢复临时实体（如果存在）
      if (tempEntity && tempEntity.position) {
        this.tempEntity = tempEntity;
        this.viewer.entities.add(tempEntity);
      }
      
      if (tempPolylineEntity && tempPolylineEntity.polyline) {
        this.tempPolylineEntity = tempPolylineEntity;
        this.viewer.entities.add(tempPolylineEntity);
      }
      
      // 恢复临时polyline的点
      if (tempPolylinePoints.length > 0) {
        this.tempPolylinePoints = tempPolylinePoints;
        // 重新创建临时点（因为它们可能在清除时被移除了）
        this.updateTemporaryPolyline(this.tempPolylinePoints);
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
    if (this.rightClickHandler) {
      this.rightClickHandler.destroy();
    }
    if (this.viewer) {
      this.viewer.destroy();
    }
  }
}

export default MapView;