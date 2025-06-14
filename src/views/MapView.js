/**
 * 地图视图类 - 完整版本
 * 负责管理Cesium地图的显示和交互
 * 支持左键选点和右键确认
 * 支持临时polyline预览
 * 新增：支持实体选择功能（用于EditPoint命令）
 */
class MapView {
  constructor(containerId) {
    this.containerId = containerId;
    this.viewer = null;
    this.clickHandler = null;
    this.rightClickHandler = null;
    this.tempEntity = null;
    this.tempPolylineEntity = null; // 临时polyline实体
    this.tempPolylinePoints = []; // 临时polyline的点
    this.onMapClickCallback = null;
    this.onRightClickConfirmCallback = null;
    this.onEntityClickCallback = null; // 新增：实体点击回调
    
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
    this.hideTemporaryPolyline();
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

  // =============================================
  // 新增：实体选择功能（用于EditPoint命令）
  // =============================================

  /**
   * 启用实体选择模式（专门用于EditPoint命令）
   * 用户点击地图时会尝试选择CZML实体而不是获取坐标
   * @param {Function} onEntityClick 实体被点击时的回调函数
   */
  enableEntitySelection(onEntityClick) {
    this.onEntityClickCallback = onEntityClick;

    // 如果已有点击处理器，先销毁
    if (this.clickHandler) {
      this.clickHandler.destroy();
    }

    // 创建新的点击处理器，专门用于实体选择
    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    this.clickHandler.setInputAction((click) => {
      console.log('实体选择模式 - 检测点击');
      
      // 使用Cesium的pick功能直接选择实体
      const pickedObject = this.viewer.scene.pick(click.position);
      
      if (pickedObject && pickedObject.id) {
        const entity = pickedObject.id;
        console.log('选中实体:', entity.id, '类型:', entity.constructor.name);
        
        // 检查是否是点实体（有point属性且ID以PT_开头）
        if (entity.point && entity.id.startsWith('PT_')) {
          console.log('✅ 选中了点实体:', entity.id, entity.name);
          
          // 调用回调函数，传递实体信息
          if (this.onEntityClickCallback) {
            this.onEntityClickCallback({
              success: true,
              entityId: entity.id,
              entityName: entity.name,
              entityType: 'point',
              entity: entity
            });
          }
        } else if (entity.polyline && entity.id.startsWith('PL_')) {
          // 选中了线实体
          console.log('❌ 选中了线实体:', entity.id);
          if (this.onEntityClickCallback) {
            this.onEntityClickCallback({
              success: false,
              error: 'wrong_entity_type',
              message: '请点击地图上的点（红色圆点），不是线条'
            });
          }
        } else {
          // 选中了其他类型的实体
          console.log('❌ 选中了其他实体:', entity.id);
          if (this.onEntityClickCallback) {
            this.onEntityClickCallback({
              success: false,
              error: 'not_a_point',
              message: '请点击地图上的点（红色圆点）'
            });
          }
        }
      } else {
        // 没有选中任何实体
        console.log('❌ 点击了空白区域');
        if (this.onEntityClickCallback) {
          this.onEntityClickCallback({
            success: false,
            error: 'no_entity',
            message: '请点击地图上的点，或输入点ID'
          });
        }
      }

    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    console.log('✅ 实体选择模式已启用');
  }

  /**
   * 禁用实体选择模式
   */
  disableEntitySelection() {
    if (this.clickHandler) {
      this.clickHandler.destroy();
      this.clickHandler = null;
    }
    this.onEntityClickCallback = null;
    console.log('✅ 实体选择模式已禁用');
  }

  /**
   * 高亮所有可选择的点（视觉提示）
   * @param {boolean} highlight 是否高亮
   */
  highlightSelectablePoints(highlight = true) {
    const entities = this.viewer.entities.values;
    let pointCount = 0;
    
    entities.forEach(entity => {
      if (entity.point && entity.id.startsWith('PT_')) {
        pointCount++;
        
        if (highlight) {
          // 保存原始样式（如果还没保存）
          if (!entity._originalPointStyle) {
            entity._originalPointStyle = {
              pixelSize: entity.point.pixelSize._value || entity.point.pixelSize,
              color: entity.point.color._value || entity.point.color,
              outlineWidth: entity.point.outlineWidth ? 
                (entity.point.outlineWidth._value || entity.point.outlineWidth) : 0,
              outlineColor: entity.point.outlineColor ? 
                (entity.point.outlineColor._value || entity.point.outlineColor) : Cesium.Color.BLACK
            };
          }
          
          // 应用高亮样式
          entity.point.pixelSize = entity._originalPointStyle.pixelSize * 1.3;
          entity.point.outlineWidth = 2;
          entity.point.outlineColor = Cesium.Color.YELLOW;
          
          console.log(`高亮点: ${entity.id}`);
        } else {
          // 恢复原始样式
          if (entity._originalPointStyle) {
            entity.point.pixelSize = entity._originalPointStyle.pixelSize;
            entity.point.outlineWidth = entity._originalPointStyle.outlineWidth;
            entity.point.outlineColor = entity._originalPointStyle.outlineColor;
            delete entity._originalPointStyle;
            
            console.log(`恢复点样式: ${entity.id}`);
          }
        }
      }
    });
    
    if (highlight) {
      console.log(`✅ 已高亮 ${pointCount} 个可选择的点`);
    } else {
      console.log(`✅ 已恢复 ${pointCount} 个点的原始样式`);
    }
  }

  /**
   * 高亮特定的点（选中状态）
   * @param {string} entityId 要高亮的实体ID
   * @param {boolean} highlight 是否高亮
   */
  highlightSpecificPoint(entityId, highlight = true) {
    const entity = this.viewer.entities.getById(entityId);
    
    if (entity && entity.point) {
      if (highlight) {
        // 保存原始样式（如果还没保存）
        if (!entity._selectedPointStyle) {
          entity._selectedPointStyle = {
            pixelSize: entity.point.pixelSize._value || entity.point.pixelSize,
            color: entity.point.color._value || entity.point.color
          };
        }
        
        // 应用选中样式（黄色+放大）
        entity.point.pixelSize = entity._selectedPointStyle.pixelSize * 1.5;
        entity.point.color = Cesium.Color.YELLOW;
        entity.point.outlineWidth = 3;
        entity.point.outlineColor = Cesium.Color.ORANGE;
        
        console.log(`✅ 高亮选中点: ${entityId}`);
      } else {
        // 恢复原始样式
        if (entity._selectedPointStyle) {
          entity.point.pixelSize = entity._selectedPointStyle.pixelSize;
          entity.point.color = entity._selectedPointStyle.color;
          entity.point.outlineWidth = 0;
          delete entity._selectedPointStyle;
          
          console.log(`✅ 恢复选中点样式: ${entityId}`);
        }
      }
    } else {
      console.warn(`⚠️ 找不到要高亮的点: ${entityId}`);
    }
  }

  /**
   * 检查指定实体是否存在且为点类型
   * @param {string} entityId 实体ID
   * @returns {boolean} 是否为有效的点实体
   */
  isValidPointEntity(entityId) {
    const entity = this.viewer.entities.getById(entityId);
    return entity && entity.point && entity.id.startsWith('PT_');
  }

  /**
   * 获取所有点实体的信息
   * @returns {Array} 点实体信息数组
   */
  getAllPointEntities() {
    const entities = this.viewer.entities.values;
    const points = [];
    
    entities.forEach(entity => {
      if (entity.point && entity.id.startsWith('PT_')) {
        points.push({
          id: entity.id,
          name: entity.name,
          position: entity.position
        });
      }
    });
    
    return points;
  }

  /**
   * 测试实体选择功能
   */
  testEntitySelection() {
    console.log('🧪 测试实体选择功能...');
    
    const points = this.getAllPointEntities();
    console.log(`找到 ${points.length} 个点实体:`, points);
    
    // 测试高亮功能
    this.highlightSelectablePoints(true);
    
    setTimeout(() => {
      console.log('恢复原始样式...');
      this.highlightSelectablePoints(false);
    }, 3000);
    
    // 测试实体选择
    this.enableEntitySelection((result) => {
      console.log('实体选择测试结果:', result);
      this.disableEntitySelection();
    });
    
    console.log('点击地图上的点进行测试...');
  }

  // =============================================
  // 修复后的CZML数据同步方法
  // =============================================

  /**
   * 根据CZML数据更新地图显示 - 修复版本
   * @param {Array} czmlDocument CZML文档数组
   */
  updateFromCzml(czmlDocument) {
    try {
      console.log('🔄 开始根据CZML更新地图显示...');
      
      // 保存临时实体的引用
      const tempEntity = this.tempEntity;
      const tempPolylineEntity = this.tempPolylineEntity;
      const tempPolylinePoints = [...this.tempPolylinePoints];
      
      // 清除现有实体（但保留临时实体的信息）
      this.viewer.entities.removeAll();
      
      // 重新加载CZML数据
      if (czmlDocument && czmlDocument.length > 1) {
        console.log(`处理 ${czmlDocument.length - 1} 个CZML实体...`);
        
        // 跳过第一个document实体，只处理实际的地理实体
        for (let i = 1; i < czmlDocument.length; i++) {
          const czmlEntity = czmlDocument[i];
          console.log(`处理实体 ${i}: ${czmlEntity.id} (${czmlEntity.name})`);
          
          // 处理点实体
          if (czmlEntity.position && czmlEntity.point) {
            this.addCzmlPointEntity(czmlEntity);
          }
          // 处理polyline实体
          else if (czmlEntity.polyline) {
            this.addCzmlPolylineEntity(czmlEntity);
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
        this.updateTemporaryPolyline(this.tempPolylinePoints);
      }

      console.log('✅ 地图已根据CZML数据更新');
      
      // 验证更新结果
      const allEntities = this.viewer.entities.values;
      const ptEntities = allEntities.filter(e => e.id.startsWith('PT_'));
      const plEntities = allEntities.filter(e => e.id.startsWith('PL_'));
      console.log(`✅ 更新完成: ${ptEntities.length} 个点, ${plEntities.length} 条线`);
      
    } catch (error) {
      console.error('❌ 更新地图显示时出错:', error);
    }
  }

  /**
   * 添加CZML点实体到地图（保持原始ID）- 新方法
   * @param {Object} czmlEntity CZML点实体数据
   */
  addCzmlPointEntity(czmlEntity) {
    try {
      const coord = {
        lon: czmlEntity.position.cartographicDegrees[0],
        lat: czmlEntity.position.cartographicDegrees[1],
        height: czmlEntity.position.cartographicDegrees[2]
      };
      
      // 提取颜色信息
      let color = Cesium.Color.RED; // 默认颜色
      if (czmlEntity.point.color && czmlEntity.point.color.rgba) {
        const rgba = czmlEntity.point.color.rgba;
        color = Cesium.Color.fromBytes(rgba[0], rgba[1], rgba[2], rgba[3]);
      }
      
      // 直接创建Cesium实体，保持原始ID
      const entity = this.viewer.entities.add({
        id: czmlEntity.id, // 保持CZML中的原始ID
        name: czmlEntity.name,
        position: Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height),
        point: {
          pixelSize: czmlEntity.point.pixelSize || 10,
          color: color,
          outlineWidth: 0,
          outlineColor: Cesium.Color.BLACK
        }
      });
      
      console.log(`✅ 添加点实体: ${entity.id} (${entity.name})`);
      return entity;
      
    } catch (error) {
      console.error('❌ 添加点实体失败:', czmlEntity.id, error);
      return null;
    }
  }

  /**
   * 添加CZML线实体到地图（保持原始ID）- 新方法
   * @param {Object} czmlEntity CZML线实体数据
   */
  addCzmlPolylineEntity(czmlEntity) {
    try {
      console.log('处理polyline实体:', JSON.stringify(czmlEntity, null, 2));
      
      if (!czmlEntity.polyline.positions || !czmlEntity.polyline.positions.cartographicDegrees) {
        console.error('Polyline实体缺少positions数据:', czmlEntity);
        return null;
      }
      
      const cartographicDegrees = czmlEntity.polyline.positions.cartographicDegrees;
      
      // 转换坐标为Cartesian3数组
      const positions = [];
      for (let j = 0; j < cartographicDegrees.length; j += 3) {
        positions.push(Cesium.Cartesian3.fromDegrees(
          cartographicDegrees[j],
          cartographicDegrees[j + 1], 
          cartographicDegrees[j + 2]
        ));
      }
      
      console.log('转换后的polyline坐标数量:', positions.length);
      
      // 获取样式信息
      let color = Cesium.Color.CYAN; // 默认颜色
      let width = 3; // 默认宽度
      
      if (czmlEntity.polyline.material && 
          czmlEntity.polyline.material.solidColor && 
          czmlEntity.polyline.material.solidColor.color &&
          czmlEntity.polyline.material.solidColor.color.rgba) {
        const rgba = czmlEntity.polyline.material.solidColor.color.rgba;
        color = Cesium.Color.fromBytes(rgba[0], rgba[1], rgba[2], rgba[3]);
      }
      
      if (czmlEntity.polyline.width) {
        width = czmlEntity.polyline.width;
      }
      
      // 直接创建Cesium实体，保持原始ID
      const entity = this.viewer.entities.add({
        id: czmlEntity.id, // 保持CZML中的原始ID
        name: czmlEntity.name,
        polyline: {
          positions: positions,
          width: width,
          material: color,
          clampToGround: czmlEntity.polyline.clampToGround !== false
        }
      });
      
      console.log(`✅ 添加线实体: ${entity.id} (${entity.name})`);
      return entity;
      
    } catch (error) {
      console.error('❌ 添加线实体失败:', czmlEntity.id, error);
      return null;
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