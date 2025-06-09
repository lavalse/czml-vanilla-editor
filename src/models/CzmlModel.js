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
   * 清除所有点
   */
  clearAllPoints() {
    this.czmlDocument = this.czmlDocument.filter(entity => !entity.id.startsWith('point-'));
    this.notifyListeners();
  }
}

export default CzmlModel;