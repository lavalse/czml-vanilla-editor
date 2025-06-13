import CompactIdUtils from '../utils/CompactIdUtils.js';

class CzmlModel {
  constructor() {
    // 初始化CZML文档
    this.czmlDocument = [
      {
        id: 'document',
        name: 'CZML Editor',
        version: '1.0'
      }
    ];
    
    this.listeners = []; // 数据变化监听器
    
    console.log('CzmlModel初始化完成，使用紧凑ID系统 (PT_xxxxxxxx格式)');
  }

  /**
   * 添加监听器
   * @param {Function} listener 监听函数
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * 通知所有监听器数据已变化
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.czmlDocument));
  }

  /**
   * 生成点的ID
   * @returns {string} 点的唯一ID，格式: PT_2Kx9mP3A
   */
  generatePointId() {
    return CompactIdUtils.generatePointId();
  }

  /**
   * 生成点的名称
   * @param {string} pointId 点的ID
   * @returns {string} 点的名称，格式: Point-2Kx9mP3A
   */
  generatePointName(pointId) {
    // 提取内容部分作为简短标识
    const content = CompactIdUtils.extractContent(pointId);
    return `Point-${content}`;
  }

  /**
   * 生成polyline的ID
   * @returns {string} polyline的唯一ID，格式: PL_2Kx9mP3A
   */
  generatePolylineId() {
    return CompactIdUtils.generatePolylineId();
  }

  /**
   * 生成polyline的名称
   * @param {string} polylineId polyline的ID
   * @param {number} pointCount 点的数量
   * @returns {string} polyline的名称，格式: Polyline-2Kx9mP3A (3 pts)
   */
  generatePolylineName(polylineId, pointCount) {
    // 提取内容部分作为简短标识
    const content = CompactIdUtils.extractContent(polylineId);
    return `Polyline-${content} (${pointCount} pts)`;
  }

  /**
   * 添加点到CZML文档
   * @param {Object} coord 坐标对象 {lon, lat, height}
   * @param {Object} options 可选的样式参数
   * @returns {string} 新增点的ID
   */
  addPoint(coord, options = {}) {
    const pointId = this.generatePointId();
    const pointName = this.generatePointName(pointId);
    
    const defaultOptions = {
      color: [255, 0, 0, 255], // 红色 RGBA
      pixelSize: 10
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    const pointData = {
      id: pointId,
      name: pointName,
      position: {
        cartographicDegrees: [coord.lon, coord.lat, coord.height]
      },
      point: {
        color: { rgba: finalOptions.color },
        pixelSize: finalOptions.pixelSize
      }
    };

    this.czmlDocument.push(pointData);
    this.notifyListeners(); // 通知视图更新
    
    console.log(`添加点: ${pointName} (ID: ${pointId})`);
    return pointId;
  }

  /**
   * 添加polyline到CZML文档
   * @param {Array} coordinates 坐标数组，每个元素为 {lon, lat, height}
   * @param {Object} options 可选的样式参数
   * @returns {string} 新增polyline的ID
   */
  addPolyline(coordinates, options = {}) {
    if (!coordinates || coordinates.length < 2) {
      throw new Error('Polyline至少需要2个点');
    }

    const polylineId = this.generatePolylineId();
    const polylineName = this.generatePolylineName(polylineId, coordinates.length);
    
    // 将坐标转换为CZML格式 [lon1, lat1, height1, lon2, lat2, height2, ...]
    const cartographicDegrees = [];
    coordinates.forEach(coord => {
      cartographicDegrees.push(coord.lon, coord.lat, coord.height);
    });

    const defaultOptions = {
      width: 3,
      color: [0, 255, 255, 255], // 青色 RGBA
      clampToGround: true
    };

    const finalOptions = { ...defaultOptions, ...options };

    const polylineData = {
      id: polylineId,
      name: polylineName,
      polyline: {
        positions: {
          cartographicDegrees: cartographicDegrees
        },
        width: finalOptions.width,
        material: {
          solidColor: {
            color: {
              rgba: finalOptions.color
            }
          }
        },
        clampToGround: finalOptions.clampToGround
      }
    };

    console.log(`添加polyline: ${polylineName} (ID: ${polylineId})`);

    this.czmlDocument.push(polylineData);
    this.notifyListeners(); // 通知视图更新
    
    return polylineId;
  }

  /**
   * 获取完整的CZML文档
   * @returns {Array} CZML文档数组
   */
  getCzmlDocument() {
    return [...this.czmlDocument]; // 返回副本，防止外部修改
  }

  /**
   * 根据ID获取特定的CZML实体
   * @param {string} id 实体ID
   * @returns {Object|null} CZML实体对象
   */
  getEntityById(id) {
    return this.czmlDocument.find(entity => entity.id === id) || null;
  }

  /**
   * 获取所有点实体
   * @returns {Array} 所有点实体的数组
   */
  getAllPoints() {
    return this.czmlDocument.filter(entity => 
      entity.id.startsWith('PT_') && entity.id !== 'document'
    );
  }

  /**
   * 获取所有polyline实体
   * @returns {Array} 所有polyline实体的数组
   */
  getAllPolylines() {
    return this.czmlDocument.filter(entity => 
      entity.id.startsWith('PL_') && entity.id !== 'document'
    );
  }

  /**
   * 获取所有几何实体（点和线）
   * @returns {Array} 所有几何实体的数组
   */
  getAllGeometries() {
    return this.czmlDocument.filter(entity => 
      (entity.id.startsWith('PT_') || entity.id.startsWith('PL_')) && 
      entity.id !== 'document'
    );
  }

  /**
   * 根据ID删除实体
   * @param {string} id 要删除的实体ID
   * @returns {boolean} 是否删除成功
   */
  removeEntityById(id) {
    const index = this.czmlDocument.findIndex(entity => entity.id === id);
    if (index > 0) { // 不能删除document实体（index 0）
      const removedEntity = this.czmlDocument[index];
      this.czmlDocument.splice(index, 1);
      this.notifyListeners();
      console.log(`删除实体: ${removedEntity.name} (ID: ${id})`);
      return true;
    }
    return false;
  }

  /**
   * 清除所有点
   */
  clearAllPoints() {
    const beforeCount = this.getAllPoints().length;
    this.czmlDocument = this.czmlDocument.filter(entity => 
      !entity.id.startsWith('PT_') || entity.id === 'document'
    );
    this.notifyListeners();
    console.log(`清除了 ${beforeCount} 个点`);
  }

  /**
   * 清除所有polyline
   */
  clearAllPolylines() {
    const beforeCount = this.getAllPolylines().length;
    this.czmlDocument = this.czmlDocument.filter(entity => 
      !entity.id.startsWith('PL_') || entity.id === 'document'
    );
    this.notifyListeners();
    console.log(`清除了 ${beforeCount} 条线`);
  }

  /**
   * 清除所有几何实体（点和线）
   */
  clearAllGeometries() {
    const beforePoints = this.getAllPoints().length;
    const beforePolylines = this.getAllPolylines().length;
    
    this.czmlDocument = this.czmlDocument.filter(entity => 
      (!entity.id.startsWith('PT_') && !entity.id.startsWith('PL_')) || 
      entity.id === 'document'
    );
    this.notifyListeners();
    console.log(`清除了 ${beforePoints} 个点和 ${beforePolylines} 条线`);
  }

  /**
   * 获取实体统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const points = this.getAllPoints();
    const polylines = this.getAllPolylines();
    
    return {
      totalEntities: this.czmlDocument.length - 1, // 减去document实体
      totalPoints: points.length,
      totalPolylines: polylines.length,
      totalGeometries: points.length + polylines.length,
      documentSize: JSON.stringify(this.czmlDocument).length,
      idFormat: 'compact', // 标识使用的ID格式
      entities: {
        points: points.map(p => ({ 
          id: p.id, 
          name: p.name,
          timestamp: CompactIdUtils.extractTimestamp(p.id),
          random: CompactIdUtils.extractRandom(p.id)
        })),
        polylines: polylines.map(p => ({ 
          id: p.id, 
          name: p.name,
          timestamp: CompactIdUtils.extractTimestamp(p.id),
          random: CompactIdUtils.extractRandom(p.id)
        }))
      }
    };
  }

  /**
   * 将旧格式的ID迁移到紧凑ID格式
   * @returns {Object} 迁移结果
   */
  migrateToCompactIds() {
    let pointsUpdated = 0;
    let polylinesUpdated = 0;
    const idMapping = new Map(); // 保存旧ID到新ID的映射
    
    console.log('开始迁移到紧凑ID格式...');
    
    // 处理点实体
    this.czmlDocument.forEach(entity => {
      // 检查是否是旧格式的点ID (point-xxx 而不是 PT_xxx)
      if (entity.id.startsWith('point-') && !entity.id.startsWith('PT_')) {
        const oldId = entity.id;
        const newId = this.generatePointId();
        const newName = this.generatePointName(newId);
        
        entity.id = newId;
        entity.name = newName;
        
        idMapping.set(oldId, newId);
        pointsUpdated++;
        console.log(`迁移点ID: ${oldId} -> ${newId} (${newName})`);
      }
    });

    // 处理polyline实体
    this.czmlDocument.forEach(entity => {
      // 检查是否是旧格式的polylineID (polyline-xxx 而不是 PL_xxx)
      if (entity.id.startsWith('polyline-') && !entity.id.startsWith('PL_')) {
        const oldId = entity.id;
        const newId = this.generatePolylineId();
        const pointCount = entity.polyline?.positions?.cartographicDegrees?.length / 3 || 0;
        const newName = this.generatePolylineName(newId, pointCount);
        
        entity.id = newId;
        entity.name = newName;
        
        idMapping.set(oldId, newId);
        polylinesUpdated++;
        console.log(`迁移polylineID: ${oldId} -> ${newId} (${newName})`);
      }
    });

    if (pointsUpdated > 0 || polylinesUpdated > 0) {
      this.notifyListeners();
      console.log(`迁移完成: ${pointsUpdated} 个点, ${polylinesUpdated} 条线`);
    } else {
      console.log('没有需要迁移的实体，所有ID已是紧凑格式');
    }

    return {
      pointsUpdated,
      polylinesUpdated,
      totalUpdated: pointsUpdated + polylinesUpdated,
      idMapping: Object.fromEntries(idMapping)
    };
  }

  /**
   * 验证所有实体ID格式是否正确
   * @returns {Object} 验证结果
   */
  validateIds() {
    const points = this.getAllPoints();
    const polylines = this.getAllPolylines();
    
    let validPoints = 0;
    let invalidPoints = 0;
    let validPolylines = 0;
    let invalidPolylines = 0;
    
    const invalidEntities = [];
    
    points.forEach(point => {
      if (CompactIdUtils.isValidCompactId(point.id, 'PT')) {
        validPoints++;
      } else {
        invalidPoints++;
        invalidEntities.push({ type: 'point', id: point.id, name: point.name });
      }
    });
    
    polylines.forEach(polyline => {
      if (CompactIdUtils.isValidCompactId(polyline.id, 'PL')) {
        validPolylines++;
      } else {
        invalidPolylines++;
        invalidEntities.push({ type: 'polyline', id: polyline.id, name: polyline.name });
      }
    });
    
    const result = {
      valid: {
        points: validPoints,
        polylines: validPolylines,
        total: validPoints + validPolylines
      },
      invalid: {
        points: invalidPoints,
        polylines: invalidPolylines,
        total: invalidPoints + invalidPolylines,
        entities: invalidEntities
      },
      isAllValid: invalidPoints === 0 && invalidPolylines === 0
    };
    
    console.log('ID格式验证结果:');
    console.log(`✅ 有效: 点=${validPoints}, 线=${validPolylines}`);
    console.log(`❌ 无效: 点=${invalidPoints}, 线=${invalidPolylines}`);
    
    if (!result.isAllValid) {
      console.log('无效的实体:', invalidEntities);
    }
    
    return result;
  }
}

export default CzmlModel;