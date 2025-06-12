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
    
    this.idCounter = 1;
    this.polylineIdCounter = 1; // 新增：polyline ID计数器
    this.listeners = []; // 数据变化监听器
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
   * 添加点到CZML文档
   * @param {Object} coord 坐标对象 {lon, lat, height}
   * @returns {string} 新增点的ID
   */
  addPoint(coord) {
    const pointId = `point-${this.idCounter++}`;
    
    const pointData = {
      id: pointId,
      name: 'Point',
      position: {
        cartographicDegrees: [coord.lon, coord.lat, coord.height]
      },
      point: {
        color: { rgba: [255, 0, 0, 255] },
        pixelSize: 10
      }
    };

    this.czmlDocument.push(pointData);
    this.notifyListeners(); // 通知视图更新
    
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

    const polylineId = `polyline-${this.polylineIdCounter++}`;
    
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
      name: `Polyline (${coordinates.length} points)`,
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

    console.log('创建polyline数据:', JSON.stringify(polylineData, null, 2));

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
    return this.czmlDocument.filter(entity => entity.id.startsWith('point-'));
  }

  /**
   * 获取所有polyline实体
   * @returns {Array} 所有polyline实体的数组
   */
  getAllPolylines() {
    return this.czmlDocument.filter(entity => entity.id.startsWith('polyline-'));
  }

  /**
   * 获取所有几何实体（点和线）
   * @returns {Array} 所有几何实体的数组
   */
  getAllGeometries() {
    return this.czmlDocument.filter(entity => 
      entity.id.startsWith('point-') || entity.id.startsWith('polyline-')
    );
  }

  /**
   * 清除所有点
   */
  clearAllPoints() {
    this.czmlDocument = this.czmlDocument.filter(entity => !entity.id.startsWith('point-'));
    this.notifyListeners();
  }

  /**
   * 清除所有polyline
   */
  clearAllPolylines() {
    this.czmlDocument = this.czmlDocument.filter(entity => !entity.id.startsWith('polyline-'));
    this.notifyListeners();
  }

  /**
   * 清除所有几何实体（点和线）
   */
  clearAllGeometries() {
    this.czmlDocument = this.czmlDocument.filter(entity => 
      !entity.id.startsWith('point-') && !entity.id.startsWith('polyline-')
    );
    this.notifyListeners();
  }
}

export default CzmlModel;