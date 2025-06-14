/**
 * 地图视图类 - 最终修复版本
 * 负责管理Cesium地图的显示和交互
 * 支持左键选点和右键确认
 * 支持临时polyline预览
 * 支持实体选择功能（用于EditPoint命令）
 * 修复了右键确认的重复执行问题
 */
class MapView {
  constructor(containerId) {
    this.containerId = containerId;
    this.viewer = null;
    this.clickHandler = null;
    this.rightClickHandler = null;
    this.tempEntity = null;
    this.tempPolylineEntity = null;
    this.tempPolylinePoints = [];
    this.onMapClickCallback = null;
    this.onRightClickConfirmCallback = null;
    this.onEntityClickCallback = null;
    
    // 交互模式标记
    this.interactionMode = 'normal'; // 'normal', 'entity_selection', 'map_click'
    
    // 防重复执行标志
    this._rightClickInProgress = false;
    
    this.init();
  }

  init() {
    Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

    this.viewer = new Cesium.Viewer(this.containerId, {
      animation: false,
      timeline: false,
      shouldAnimate: true,
    });

    this.viewer.cesiumWidget.canvas.oncontextmenu = function(e) {
      e.preventDefault();
      return false;
    };

    console.log('地图视图初始化完成');
  }

  getViewer() {
    return this.viewer;
  }

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
   */
  enableMapClickToAddPoint(onMapClick) {
    this.interactionMode = 'map_click';
    this.onMapClickCallback = onMapClick;

    if (this.clickHandler) {
      this.clickHandler.destroy();
    }

    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    this.clickHandler.setInputAction((click) => {
      const cartesian = this.viewer.scene.pickPosition(click.position);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const coord = {
        lon: Cesium.Math.toDegrees(cartographic.longitude),
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
      };

      // 在map_click模式下才显示临时预览点
      if (this.interactionMode === 'map_click') {
        this.showTemporaryPoint(coord);
      }

      if (this.onMapClickCallback) {
        this.onMapClickCallback(coord);
      }

    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    console.log('✅ 地图点击模式已启用（会显示临时预览点）');
  }

  /**
   * 启用右键确认功能 - 修复版本，确保事件正确传递
   */
  enableRightClickConfirm(onRightClickConfirm) {
    this.onRightClickConfirmCallback = onRightClickConfirm;

    // 确保不会重复绑定右键事件
    if (this.rightClickHandler) {
      console.log('⚠️ 右键处理器已存在，先销毁旧的');
      this.rightClickHandler.destroy();
    }

    this.rightClickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    this.rightClickHandler.setInputAction((click) => {
      // 阻止默认右键菜单
      if (click && click.preventDefault) {
        click.preventDefault();
      }
      
      console.log('🖱️ MapView检测到右键点击');
      
      // 添加防抖机制，防止快速连续右键
      if (this._rightClickInProgress) {
        console.log('⚠️ 右键处理中，忽略重复点击');
        return;
      }

      this._rightClickInProgress = true;
      
      // 🔧 关键修复：确保回调被正确调用
      if (this.onRightClickConfirmCallback) {
        try {
          console.log('📞 调用右键确认回调');
          const result = this.onRightClickConfirmCallback();
          console.log('📞 右键确认回调结果:', result);
        } catch (error) {
          console.error('右键确认回调异常:', error);
        }
      } else {
        console.log('⚠️ 没有右键确认回调函数');
      }

      // 100ms后重置标志
      setTimeout(() => {
        this._rightClickInProgress = false;
      }, 100);

    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    console.log('✅ 右键确认已启用（带防抖机制）');
  }

  /**
   * 禁用地图点击功能
   */
  disableMapClick() {
    this.interactionMode = 'normal';
    
    if (this.clickHandler) {
      this.clickHandler.destroy();
      this.clickHandler = null;
    }
    this.onMapClickCallback = null;
    
    // 清理临时实体
    this.hideTemporaryPoint();
    this.hideTemporaryPolyline();
    
    console.log('✅ 地图点击模式已禁用');
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
    
    // 重置防重复标志
    this._rightClickInProgress = false;
    
    console.log('✅ 右键确认已禁用');
  }

  /**
   * 显示临时预览点
   */
  showTemporaryPoint(coord) {
    this.hideTemporaryPoint();

    this.tempEntity = this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height),
      point: {
        pixelSize: 12,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2
      },
      name: "预览点",
      _isTemporary: true
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
   */
  updateTemporaryPolyline(coordinates) {
    this.tempPolylinePoints = [...coordinates];
    this.hideTemporaryPolyline();

    if (coordinates.length === 1) {
      this.showTemporaryPoint(coordinates[0]);
      return;
    }

    if (coordinates.length >= 2) {
      this.hideTemporaryPoint();

      const positions = coordinates.map(coord => 
        Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height)
      );

      this.tempPolylineEntity = this.viewer.entities.add({
        polyline: {
          positions: positions,
          width: 4,
          material: Cesium.Color.YELLOW.withAlpha(0.8),
          clampToGround: true,
          classificationType: Cesium.ClassificationType.TERRAIN
        },
        name: `临时折线 (${coordinates.length} 点)`,
        _isTemporary: true
      });

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
          _isTemporaryPolylinePoint: true,
          _isTemporary: true
        });
      });

      console.log(`临时polyline已更新: ${coordinates.length}个点`);
    }
  }

  /**
   * 隐藏临时polyline预览
   */
  hideTemporaryPolyline() {
    if (this.tempPolylineEntity) {
      this.viewer.entities.remove(this.tempPolylineEntity);
      this.tempPolylineEntity = null;
    }

    const entitiesToRemove = [];
    this.viewer.entities.values.forEach(entity => {
      if (entity._isTemporaryPolylinePoint) {
        entitiesToRemove.push(entity);
      }
    });
    
    entitiesToRemove.forEach(entity => {
      this.viewer.entities.remove(entity);
    });

    this.tempPolylinePoints = [];
    console.log('临时polyline已隐藏');
  }

  getTemporaryPolylinePointCount() {
    return this.tempPolylinePoints.length;
  }

  getTemporaryPolylineCoordinates() {
    return [...this.tempPolylinePoints];
  }

  clearAllEntities() {
    this.viewer.entities.removeAll();
    this.tempEntity = null;
    this.tempPolylineEntity = null;
    this.tempPolylinePoints = [];
  }

  // =============================================
  // 实体选择功能（用于EditPoint命令）
  // =============================================

  /**
   * 启用实体选择模式（专门用于EditPoint命令）
   */
  enableEntitySelection(onEntityClick) {
    this.interactionMode = 'entity_selection';
    this.onEntityClickCallback = onEntityClick;

    // 先清理所有临时实体，避免干扰选择
    this.hideTemporaryPoint();
    this.hideTemporaryPolyline();

    if (this.clickHandler) {
      this.clickHandler.destroy();
    }

    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    this.clickHandler.setInputAction((click) => {
      console.log('🎯 实体选择模式 - 检测点击');
      
      // 使用Cesium的pick功能选择实体
      const pickedObject = this.viewer.scene.pick(click.position);
      
      if (pickedObject && pickedObject.id) {
        const entity = pickedObject.id;
        console.log('选中实体:', entity.id, '名称:', entity.name);
        
        // 过滤临时实体
        if (entity._isTemporary) {
          console.log('❌ 选中了临时实体，忽略');
          if (this.onEntityClickCallback) {
            this.onEntityClickCallback({
              success: false,
              error: 'temporary_entity',
              message: '请点击正式的点实体，不是临时预览点'
            });
          }
          return;
        }
        
        // 检查是否是点实体
        if (entity.point && entity.id.startsWith('PT_')) {
          console.log('✅ 选中了点实体:', entity.id, entity.name);
          
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
          console.log('❌ 选中了线实体:', entity.id);
          if (this.onEntityClickCallback) {
            this.onEntityClickCallback({
              success: false,
              error: 'wrong_entity_type',
              message: '请点击地图上的点（红色圆点），不是线条'
            });
          }
        } else {
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

    console.log('✅ 实体选择模式已启用（不会创建临时点）');
  }

  /**
   * 禁用实体选择模式
   */
  disableEntitySelection() {
    this.interactionMode = 'normal';
    
    if (this.clickHandler) {
      this.clickHandler.destroy();
      this.clickHandler = null;
    }
    this.onEntityClickCallback = null;
    
    console.log('✅ 实体选择模式已禁用');
  }

  /**
   * 高亮所有可选择的点（修复版本）
   */
  highlightSelectablePoints(highlight = true) {
    const entities = this.viewer.entities.values;
    let pointCount = 0;
    
    entities.forEach(entity => {
      // 只处理真实的点实体，跳过临时实体
      if (entity.point && entity.id.startsWith('PT_') && !entity._isTemporary) {
        pointCount++;
        
        if (highlight) {
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
          
          entity.point.pixelSize = entity._originalPointStyle.pixelSize * 1.3;
          entity.point.outlineWidth = 2;
          entity.point.outlineColor = Cesium.Color.YELLOW;
          
          console.log(`高亮点: ${entity.id}`);
        } else {
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
   */
  highlightSpecificPoint(entityId, highlight = true) {
    const entity = this.viewer.entities.getById(entityId);
    
    if (entity && entity.point && !entity._isTemporary) {
      if (highlight) {
        if (!entity._selectedPointStyle) {
          entity._selectedPointStyle = {
            pixelSize: entity.point.pixelSize._value || entity.point.pixelSize,
            color: entity.point.color._value || entity.point.color
          };
        }
        
        entity.point.pixelSize = entity._selectedPointStyle.pixelSize * 1.5;
        entity.point.color = Cesium.Color.YELLOW;
        entity.point.outlineWidth = 3;
        entity.point.outlineColor = Cesium.Color.ORANGE;
        
        console.log(`✅ 高亮选中点: ${entityId}`);
      } else {
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

  isValidPointEntity(entityId) {
    const entity = this.viewer.entities.getById(entityId);
    return entity && entity.point && entity.id.startsWith('PT_') && !entity._isTemporary;
  }

  /**
   * 获取所有真实点实体的信息（排除临时实体）
   */
  getAllPointEntities() {
    const entities = this.viewer.entities.values;
    const points = [];
    
    entities.forEach(entity => {
      if (entity.point && entity.id.startsWith('PT_') && !entity._isTemporary) {
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
    console.log('🧪 测试实体选择功能（修复版）...');
    
    // 先清理临时实体
    this.hideTemporaryPoint();
    this.hideTemporaryPolyline();
    
    const points = this.getAllPointEntities();
    console.log(`找到 ${points.length} 个真实点实体:`, points);
    
    if (points.length === 0) {
      console.log('⚠️ 没有找到点实体，先添加一些点进行测试');
      return;
    }
    
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
    
    console.log('现在点击地图上的点进行测试（应该不会创建临时预览点）...');
  }

  // =============================================
  // CZML数据同步方法
  // =============================================

  /**
   * 根据CZML数据更新地图显示 - 修复版本
   */
  updateFromCzml(czmlDocument) {
    try {
      console.log('🔄 开始根据CZML更新地图显示...');
      
      // 保存临时实体状态
      const tempEntityState = {
        tempEntity: this.tempEntity,
        tempPolylineEntity: this.tempPolylineEntity,
        tempPolylinePoints: [...this.tempPolylinePoints]
      };
      
      // 清除现有实体
      this.viewer.entities.removeAll();
      
      // 重新加载CZML数据
      if (czmlDocument && czmlDocument.length > 1) {
        console.log(`处理 ${czmlDocument.length - 1} 个CZML实体...`);
        
        for (let i = 1; i < czmlDocument.length; i++) {
          const czmlEntity = czmlDocument[i];
          console.log(`处理实体 ${i}: ${czmlEntity.id} (${czmlEntity.name})`);
          
          if (czmlEntity.position && czmlEntity.point) {
            this.addCzmlPointEntity(czmlEntity);
          } else if (czmlEntity.polyline) {
            this.addCzmlPolylineEntity(czmlEntity);
          }
        }
      }

      // 根据当前交互模式决定是否恢复临时实体
      if (this.interactionMode === 'map_click') {
        // 在map_click模式下恢复临时实体
        if (tempEntityState.tempEntity && tempEntityState.tempEntity.position) {
          this.tempEntity = tempEntityState.tempEntity;
          this.viewer.entities.add(tempEntityState.tempEntity);
        }
        
        if (tempEntityState.tempPolylineEntity && tempEntityState.tempPolylineEntity.polyline) {
          this.tempPolylineEntity = tempEntityState.tempPolylineEntity;
          this.viewer.entities.add(tempEntityState.tempPolylineEntity);
        }
        
        if (tempEntityState.tempPolylinePoints.length > 0) {
          this.tempPolylinePoints = tempEntityState.tempPolylinePoints;
          this.updateTemporaryPolyline(this.tempPolylinePoints);
        }
      } else {
        // 在entity_selection模式下不恢复临时实体
        console.log('🎯 实体选择模式 - 不恢复临时实体');
        this.tempEntity = null;
        this.tempPolylineEntity = null;
        this.tempPolylinePoints = [];
      }

      console.log('✅ 地图已根据CZML数据更新');
      
      const allEntities = this.viewer.entities.values;
      const ptEntities = allEntities.filter(e => e.id.startsWith('PT_') && !e._isTemporary);
      const plEntities = allEntities.filter(e => e.id.startsWith('PL_') && !e._isTemporary);
      console.log(`✅ 更新完成: ${ptEntities.length} 个真实点, ${plEntities.length} 条真实线`);
      
    } catch (error) {
      console.error('❌ 更新地图显示时出错:', error);
    }
  }

  addCzmlPointEntity(czmlEntity) {
    try {
      const coord = {
        lon: czmlEntity.position.cartographicDegrees[0],
        lat: czmlEntity.position.cartographicDegrees[1],
        height: czmlEntity.position.cartographicDegrees[2]
      };
      
      let color = Cesium.Color.RED;
      if (czmlEntity.point.color && czmlEntity.point.color.rgba) {
        const rgba = czmlEntity.point.color.rgba;
        color = Cesium.Color.fromBytes(rgba[0], rgba[1], rgba[2], rgba[3]);
      }
      
      const entity = this.viewer.entities.add({
        id: czmlEntity.id,
        name: czmlEntity.name,
        position: Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height),
        point: {
          pixelSize: czmlEntity.point.pixelSize || 10,
          color: color,
          outlineWidth: 0,
          outlineColor: Cesium.Color.BLACK
        },
        _isTemporary: false
      });
      
      console.log(`✅ 添加真实点实体: ${entity.id} (${entity.name})`);
      return entity;
      
    } catch (error) {
      console.error('❌ 添加点实体失败:', czmlEntity.id, error);
      return null;
    }
  }

  addCzmlPolylineEntity(czmlEntity) {
    try {
      console.log('处理polyline实体:', JSON.stringify(czmlEntity, null, 2));
      
      if (!czmlEntity.polyline.positions || !czmlEntity.polyline.positions.cartographicDegrees) {
        console.error('Polyline实体缺少positions数据:', czmlEntity);
        return null;
      }
      
      const cartographicDegrees = czmlEntity.polyline.positions.cartographicDegrees;
      
      const positions = [];
      for (let j = 0; j < cartographicDegrees.length; j += 3) {
        positions.push(Cesium.Cartesian3.fromDegrees(
          cartographicDegrees[j],
          cartographicDegrees[j + 1], 
          cartographicDegrees[j + 2]
        ));
      }
      
      console.log('转换后的polyline坐标数量:', positions.length);
      
      let color = Cesium.Color.CYAN;
      let width = 3;
      
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
      
      const entity = this.viewer.entities.add({
        id: czmlEntity.id,
        name: czmlEntity.name,
        polyline: {
          positions: positions,
          width: width,
          material: color,
          clampToGround: czmlEntity.polyline.clampToGround !== false
        },
        _isTemporary: false
      });
      
      console.log(`✅ 添加真实线实体: ${entity.id} (${entity.name})`);
      return entity;
      
    } catch (error) {
      console.error('❌ 添加线实体失败:', czmlEntity.id, error);
      return null;
    }
  }

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