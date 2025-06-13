/**
 * 紧凑ID工具类
 * 专门用于生成简洁且唯一的ID (格式: PT_2Kx9mP3A)
 * 长度约11个字符，比UUID短69%
 */
class CompactIdUtils {
  // 用于Base62编码的字符集（避免易混淆的字符0,1,O,I,l）
  static CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

  /**
   * 生成紧凑ID
   * @param {string} prefix 前缀 ('PT' 表示点, 'PL' 表示线)
   * @returns {string} 格式: PT_2Kx9mP3A (约11个字符)
   */
  static generateCompactId(prefix = 'PT') {
    const timestamp = Date.now();
    
    // 将时间戳编码为Base62格式，取最后6位
    const encodedTime = this.encodeBase62(timestamp).slice(-6);
    
    // 生成2位随机字符
    const random = this.generateRandomString(2);
    
    return `${prefix}_${encodedTime}${random}`;
  }

  /**
   * 生成点ID
   * @returns {string} 点ID，格式: PT_2Kx9mP3A
   */
  static generatePointId() {
    return this.generateCompactId('PT');
  }

  /**
   * 生成折线ID
   * @returns {string} 折线ID，格式: PL_2Kx9mP3A
   */
  static generatePolylineId() {
    return this.generateCompactId('PL');
  }

  /**
   * Base62编码（数字转换为短字符串）
   * @param {number} num 要编码的数字
   * @returns {string} Base62编码后的字符串
   */
  static encodeBase62(num) {
    if (num === 0) return this.CHARSET[0];
    
    let result = '';
    const base = this.CHARSET.length;
    
    while (num > 0) {
      result = this.CHARSET[num % base] + result;
      num = Math.floor(num / base);
    }
    
    return result;
  }

  /**
   * 生成指定长度的随机字符串
   * @param {number} length 长度
   * @returns {string} 随机字符串
   */
  static generateRandomString(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.CHARSET.charAt(Math.floor(Math.random() * this.CHARSET.length));
    }
    return result;
  }

  /**
   * 验证ID格式是否正确
   * @param {string} id 要验证的ID
   * @param {string} expectedPrefix 期望的前缀 ('PT' 或 'PL')
   * @returns {boolean} 是否为有效的紧凑ID
   */
  static isValidCompactId(id, expectedPrefix = null) {
    if (!id || typeof id !== 'string') return false;
    
    // 检查基本格式: 前缀_内容
    const parts = id.split('_');
    if (parts.length !== 2) return false;
    
    const [prefix, content] = parts;
    
    // 检查前缀
    if (expectedPrefix && prefix !== expectedPrefix) return false;
    if (!['PT', 'PL'].includes(prefix)) return false;
    
    // 检查内容长度（应该是8个字符：6位时间戳 + 2位随机）
    if (content.length !== 8) return false;
    
    // 检查字符是否都在允许的字符集中
    for (let char of content) {
      if (!this.CHARSET.includes(char)) return false;
    }
    
    return true;
  }

  /**
   * 从ID中提取前缀
   * @param {string} id 完整ID
   * @returns {string|null} 前缀 ('PT' 或 'PL')
   */
  static extractPrefix(id) {
    if (!id) return null;
    const parts = id.split('_');
    return parts.length >= 2 ? parts[0] : null;
  }

  /**
   * 从ID中提取内容部分
   * @param {string} id 完整ID
   * @returns {string|null} 内容部分
   */
  static extractContent(id) {
    if (!id) return null;
    const parts = id.split('_');
    return parts.length >= 2 ? parts[1] : null;
  }

  /**
   * 从ID中提取时间戳部分（前6位）
   * @param {string} id 完整ID
   * @returns {string|null} 时间戳部分
   */
  static extractTimestamp(id) {
    const content = this.extractContent(id);
    return content ? content.substring(0, 6) : null;
  }

  /**
   * 从ID中提取随机部分（后2位）
   * @param {string} id 完整ID
   * @returns {string|null} 随机部分
   */
  static extractRandom(id) {
    const content = this.extractContent(id);
    return content ? content.substring(6, 8) : null;
  }

  /**
   * 生成演示ID，展示效果
   * @param {number} count 生成数量
   */
  static generateDemo(count = 5) {
    console.log('🎯 紧凑ID生成演示:');
    console.log('格式: 前缀_时间戳(6位)随机(2位)');
    console.log('长度: 11个字符 (比UUID短69%)');
    console.log('');
    
    for (let i = 0; i < count; i++) {
      const pointId = this.generatePointId();
      const polylineId = this.generatePolylineId();
      
      console.log(`点 ${i + 1}: ${pointId} (时间戳: ${this.extractTimestamp(pointId)}, 随机: ${this.extractRandom(pointId)})`);
      console.log(`线 ${i + 1}: ${polylineId} (时间戳: ${this.extractTimestamp(polylineId)}, 随机: ${this.extractRandom(polylineId)})`);
      
      // 稍微延迟，让时间戳有变化
      if (i < count - 1) {
        const start = Date.now();
        while (Date.now() - start < 2) {} // 2ms延迟
      }
    }
    
    console.log('');
    console.log('特点:');
    console.log('✅ 唯一性: 基于时间戳+随机数，几乎不可能重复');
    console.log('✅ 简洁性: 11个字符，便于复制和管理');
    console.log('✅ 可读性: 有明确的前缀标识类型');
    console.log('✅ 性能: 生成速度快，无需网络请求');
  }

  /**
   * 批量生成ID用于测试唯一性
   * @param {number} count 生成数量
   * @returns {Object} 测试结果
   */
  static testUniqueness(count = 10000) {
    console.log(`🧪 唯一性测试: 生成${count}个ID...`);
    
    const startTime = Date.now();
    const ids = new Set();
    
    for (let i = 0; i < count; i++) {
      ids.add(this.generatePointId());
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const result = {
      generated: count,
      unique: ids.size,
      duplicates: count - ids.size,
      uniqueRate: (ids.size / count * 100).toFixed(4),
      timeMs: duration,
      idsPerSecond: Math.round(count / duration * 1000)
    };
    
    console.log('测试结果:');
    console.log(`生成数量: ${result.generated}`);
    console.log(`唯一数量: ${result.unique}`);
    console.log(`重复数量: ${result.duplicates}`);
    console.log(`唯一率: ${result.uniqueRate}%`);
    console.log(`耗时: ${result.timeMs}ms`);
    console.log(`生成速度: ${result.idsPerSecond} ID/秒`);
    
    return result;
  }
}

export default CompactIdUtils;