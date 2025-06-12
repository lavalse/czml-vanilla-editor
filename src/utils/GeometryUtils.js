/**
 * 几何工具类
 * 提供统一的坐标验证、转换和计算功能
 * 替代原来的PointModel，提供更全面的几何操作
 */
class GeometryUtils {
  /**
   * 验证坐标是否有效
   * @param {Object} coord 坐标对象 {lon, lat, height}
   * @returns {boolean} 是否有效
   */
  static validateCoordinate(coord) {
    if (!coord || typeof coord !== 'object') {
      return false;
    }
    
    const { lon, lat, height } = coord;
    
    // 经度范围: -180 到 180
    if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
      return false;
    }
    
    // 纬度范围: -90 到 90
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      return false;
    }
    
    // 高度应该是数字
    if (typeof height !== 'number' || isNaN(height)) {
      return false;
    }
    
    return true;
  }

  /**
   * 验证坐标数组（用于polyline等）
   * @param {Array} coordinates 坐标数组
   * @param {number} minPoints 最少点数，默认为1
   * @returns {boolean} 是否有效
   */
  static validateCoordinates(coordinates, minPoints = 1) {
    if (!Array.isArray(coordinates) || coordinates.length < minPoints) {
      return false;
    }
    
    return coordinates.every(coord => this.validateCoordinate(coord));
  }

  /**
   * 格式化坐标显示
   * @param {Object} coord 坐标对象
   * @param {number} precision 精度，默认6位小数
   * @returns {string} 格式化后的坐标字符串
   */
  static formatCoordinate(coord, precision = 6) {
    if (!this.validateCoordinate(coord)) {
      return '无效坐标';
    }
    
    const { lon, lat, height } = coord;
    return `经度: ${lon.toFixed(precision)}, 纬度: ${lat.toFixed(precision)}, 高度: ${height.toFixed(2)}m`;
  }

  /**
   * 格式化坐标为简短字符串
   * @param {Object} coord 坐标对象
   * @param {number} precision 精度，默认3位小数
   * @returns {string} 简短的坐标字符串
   */
  static formatCoordinateShort(coord, precision = 3) {
    if (!this.validateCoordinate(coord)) {
      return '无效';
    }
    
    const { lon, lat, height } = coord;
    return `${lon.toFixed(precision)}, ${lat.toFixed(precision)}, ${height.toFixed(0)}m`;
  }

  /**
   * 解析坐标字符串
   * @param {string} input 坐标字符串 "lon,lat,height"
   * @returns {Object|null} 坐标对象或null
   */
  static parseCoordinate(input) {
    try {
      const trimmed = input.trim();
      
      // 检查格式
      if (!/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/.test(trimmed)) {
        return null;
      }
      
      const parts = trimmed.split(',').map(s => parseFloat(s.trim()));
      
      if (parts.length === 3 && parts.every(p => !isNaN(p))) {
        const coord = {
          lon: parts[0],
          lat: parts[1],
          height: parts[2]
        };
        
        // 验证解析后的坐标
        return this.validateCoordinate(coord) ? coord : null;
      }
    } catch (error) {
      console.error('坐标解析失败:', error);
    }
    
    return null;
  }

  /**
   * 检查输入是否为坐标格式
   * @param {string} input 输入字符串
   * @returns {boolean} 是否为坐标格式
   */
  static isCoordinateInput(input) {
    return /^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/.test(input.trim());
  }

  /**
   * 从Cesium Cartesian3转换为地理坐标
   * @param {Object} cartesian Cesium Cartesian3对象
   * @returns {Object|null} 地理坐标对象 {lon, lat, height}
   */
  static cartesianToGeographic(cartesian) {
    if (!cartesian || !window.Cesium) {
      return null;
    }
    
    try {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const coord = {
        lon: Cesium.Math.toDegrees(cartographic.longitude),
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
      };
      
      return this.validateCoordinate(coord) ? coord : null;
    } catch (error) {
      console.error('坐标转换失败:', error);
      return null;
    }
  }

  /**
   * 从地理坐标转换为Cesium Cartesian3
   * @param {Object} coord 地理坐标对象 {lon, lat, height}
   * @returns {Object|null} Cesium Cartesian3对象
   */
  static geographicToCartesian(coord) {
    if (!this.validateCoordinate(coord) || !window.Cesium) {
      return null;
    }
    
    try {
      return Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.height);
    } catch (error) {
      console.error('坐标转换失败:', error);
      return null;
    }
  }

  /**
   * 计算两点之间的距离
   * @param {Object} coord1 第一个点的坐标
   * @param {Object} coord2 第二个点的坐标
   * @returns {number|null} 距离（米），失败返回null
   */
  static calculateDistance(coord1, coord2) {
    if (!this.validateCoordinate(coord1) || !this.validateCoordinate(coord2)) {
      return null;
    }

    const cartesian1 = this.geographicToCartesian(coord1);
    const cartesian2 = this.geographicToCartesian(coord2);
    
    if (!cartesian1 || !cartesian2 || !window.Cesium) {
      return null;
    }
    
    try {
      return Cesium.Cartesian3.distance(cartesian1, cartesian2);
    } catch (error) {
      console.error('距离计算失败:', error);
      return null;
    }
  }

  /**
   * 计算polyline的总长度
   * @param {Array} coordinates 坐标数组
   * @returns {number|null} 总长度（米），失败返回null
   */
  static calculatePolylineLength(coordinates) {
    if (!this.validateCoordinates(coordinates, 2)) {
      return null;
    }
    
    let totalDistance = 0;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const distance = this.calculateDistance(coordinates[i], coordinates[i + 1]);
      if (distance === null) {
        return null;
      }
      totalDistance += distance;
    }
    
    return totalDistance;
  }

  /**
   * 获取坐标数组的边界框
   * @param {Array} coordinates 坐标数组
   * @returns {Object|null} 边界框 {minLon, maxLon, minLat, maxLat, minHeight, maxHeight}
   */
  static getBoundingBox(coordinates) {
    if (!this.validateCoordinates(coordinates, 1)) {
      return null;
    }
    
    const bounds = {
      minLon: coordinates[0].lon,
      maxLon: coordinates[0].lon,
      minLat: coordinates[0].lat,
      maxLat: coordinates[0].lat,
      minHeight: coordinates[0].height,
      maxHeight: coordinates[0].height
    };
    
    coordinates.forEach(coord => {
      bounds.minLon = Math.min(bounds.minLon, coord.lon);
      bounds.maxLon = Math.max(bounds.maxLon, coord.lon);
      bounds.minLat = Math.min(bounds.minLat, coord.lat);
      bounds.maxLat = Math.max(bounds.maxLat, coord.lat);
      bounds.minHeight = Math.min(bounds.minHeight, coord.height);
      bounds.maxHeight = Math.max(bounds.maxHeight, coord.height);
    });
    
    return bounds;
  }

  /**
   * 获取坐标数组的中心点
   * @param {Array} coordinates 坐标数组
   * @returns {Object|null} 中心点坐标
   */
  static getCenterPoint(coordinates) {
    if (!this.validateCoordinates(coordinates, 1)) {
      return null;
    }
    
    const bounds = this.getBoundingBox(coordinates);
    if (!bounds) {
      return null;
    }
    
    return {
      lon: (bounds.minLon + bounds.maxLon) / 2,
      lat: (bounds.minLat + bounds.maxLat) / 2,
      height: (bounds.minHeight + bounds.maxHeight) / 2
    };
  }

  /**
   * 生成随机坐标（用于测试）
   * @param {Object} bounds 边界 {minLon, maxLon, minLat, maxLat, minHeight, maxHeight}
   * @returns {Object} 随机坐标
   */
  static generateRandomCoordinate(bounds = {
    minLon: -180, maxLon: 180,
    minLat: -90, maxLat: 90,
    minHeight: 0, maxHeight: 10000
  }) {
    return {
      lon: Math.random() * (bounds.maxLon - bounds.minLon) + bounds.minLon,
      lat: Math.random() * (bounds.maxLat - bounds.minLat) + bounds.minLat,
      height: Math.random() * (bounds.maxHeight - bounds.minHeight) + bounds.minHeight
    };
  }
}

export default GeometryUtils;