/**
 * 点数据模型
 * 负责点的坐标转换和验证逻辑
 */
class PointModel {
  /**
   * 验证坐标是否有效
   * @param {Object} coord 坐标对象 {lon, lat, height}
   * @returns {boolean} 是否有效
   */
  static validateCoordinate(coord) {
    if (!coord || typeof coord !== 'object') return false;
    
    const { lon, lat, height } = coord;
    
    // 经度范围: -180 到 180
    if (typeof lon !== 'number' || lon < -180 || lon > 180) return false;
    
    // 纬度范围: -90 到 90
    if (typeof lat !== 'number' || lat < -90 || lat > 90) return false;
    
    // 高度应该是数字
    if (typeof height !== 'number' || isNaN(height)) return false;
    
    return true;
  }

  /**
   * 格式化坐标显示
   * @param {Object} coord 坐标对象
   * @returns {string} 格式化后的坐标字符串
   */
  static formatCoordinate(coord) {
    if (!this.validateCoordinate(coord)) return '无效坐标';
    
    const { lon, lat, height } = coord;
    return `经度: ${lon.toFixed(6)}, 纬度: ${lat.toFixed(6)}, 高度: ${height.toFixed(2)}m`;
  }

  /**
   * 从Cesium Cartesian3转换为地理坐标
   * @param {Object} cartesian Cesium Cartesian3对象
   * @returns {Object} 地理坐标对象 {lon, lat, height}
   */
  static cartesianToGeographic(cartesian) {
    if (!cartesian) return null;
    
    try {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      return {
        lon: Cesium.Math.toDegrees(cartographic.longitude),
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
      };
    } catch (error) {
      console.error('坐标转换失败:', error);
      return null;
    }
  }

  /**
   * 从地理坐标转换为Cesium Cartesian3
   * @param {Object} coord 地理坐标对象 {lon, lat, height}
   * @returns {Object} Cesium Cartesian3对象
   */
  static geographicToCartesian(coord) {
    if (!this.validateCoordinate(coord)) return null;
    
    try {
      return Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height);
    } catch (error) {
      console.error('坐标转换失败:', error);
      return null;
    }
  }

  /**
   * 计算两点之间的距离（简单的球面距离）
   * @param {Object} coord1 第一个点的坐标
   * @param {Object} coord2 第二个点的坐标
   * @returns {number} 距离（米）
   */
  static calculateDistance(coord1, coord2) {
    if (!this.validateCoordinate(coord1) || !this.validateCoordinate(coord2)) {
      return null;
    }

    const cartesian1 = this.geographicToCartesian(coord1);
    const cartesian2 = this.geographicToCartesian(coord2);
    
    if (!cartesian1 || !cartesian2) return null;
    
    return Cesium.Cartesian3.distance(cartesian1, cartesian2);
  }
}

export default PointModel;