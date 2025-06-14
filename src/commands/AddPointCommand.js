import { Command, CommandHandler, CommandFactory, ConfirmationState, ConfirmationMethod } from './base/CommandBase.js';
import GeometryUtils from '../utils/GeometryUtils.js';

/**
 * 添加点的具体命令 - 紧凑ID版本（保持不变）
 * 负责实际的数据操作，支持撤销
 */
export class AddPointCommand extends Command {
  constructor(czmlModel, coordinate) {
    // 生成更有意义的描述
    const shortCoord = `${coordinate.lon.toFixed(3)}, ${coordinate.lat.toFixed(3)}`;
    super('AddPoint', `添加点 (${shortCoord})`);
    
    this.czmlModel = czmlModel;
    this.coordinate = coordinate;
    this.pointId = null;
    this.pointName = null; // 新增：保存点名称
  }

  /**
   * 执行添加点操作
   * @returns {boolean} 是否执行成功
   */
  execute() {
    try {
      if (this.executed) {
        console.warn('AddPointCommand: 命令已经执行过了');
        return false;
      }

      if (!this.isValid()) {
        throw new Error('坐标数据无效');
      }

      // 使用新的addPoint方法，它会自动生成紧凑ID
      this.pointId = this.czmlModel.addPoint(this.coordinate);
      
      // 获取生成的点信息
      const pointEntity = this.czmlModel.getEntityById(this.pointId);
      this.pointName = pointEntity ? pointEntity.name : `Point-${this.pointId}`;
      
      // 更新命令描述以包含生成的点名称
      this.description = `添加点: ${this.pointName}`;
      
      this.executed = true;
      
      console.log(`AddPointCommand executed: ${this.pointName} (ID: ${this.pointId})`);
      return true;
      
    } catch (error) {
      console.error('AddPointCommand execution failed:', error);
      return false;
    }
  }

  /**
   * 撤销添加点操作
   * @returns {boolean} 是否撤销成功
   */
  undo() {
    try {
      if (!this.executed || !this.pointId) {
        console.warn('AddPointCommand: 无法撤销，命令未执行或无效的点ID');
        return false;
      }

      // 使用新的removeEntityById方法
      const success = this.czmlModel.removeEntityById(this.pointId);
      
      if (success) {
        this.executed = false;
        console.log(`AddPointCommand undone: ${this.pointName} (ID: ${this.pointId})`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('AddPointCommand undo failed:', error);
      return false;
    }
  }

  /**
   * 验证命令是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    return GeometryUtils.validateCoordinate(this.coordinate);
  }

  /**
   * 获取创建的点ID
   * @returns {string|null} 点ID
   */
  getPointId() {
    return this.pointId;
  }

  /**
   * 获取创建的点名称
   * @returns {string|null} 点名称
   */
  getPointName() {
    return this.pointName;
  }
}

/**
 * 🔧 修复：AddPoint命令处理器 - 正确区分新输入和确认操作
 * 负责收集用户输入（坐标），然后创建AddPointCommand
 */
export class AddPointCommandHandler extends CommandHandler {
  constructor(context) {
    super('AddPoint', context);
    this.currentCoord = null; // 当前选择的坐标
  }

  /**
   * 开始处理命令
   * @returns {Object} 初始结果
   */
  start() {
    this.waitingForMapClick = true;
    this.result = {
      success: true,
      message: '请点击地图选择位置，或直接输入坐标 (lon,lat,height)',
      needsMapClick: true,
      needsConfirm: false
    };
    return this.result;
  }

  /**
   * 🔧 重构：处理特定命令的输入
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleSpecificInput(input) {
    console.log('AddPointCommandHandler.handleSpecificInput:', input);
    
    // 检查是否是坐标输入
    if (GeometryUtils.isCoordinateInput(input)) {
      const coord = GeometryUtils.parseCoordinate(input);
      if (coord) {
        return this.selectCoordinate(coord);
      } else {
        return { 
          success: false, 
          message: '坐标格式错误，请使用: lon,lat,height' 
        };
      }
    }
    
    return { 
      success: false, 
      message: '请先点击地图选择位置或输入坐标 (格式: lon,lat,height)' 
    };
  }

  /**
   * 🔧 关键修复：处理确认状态下的输入
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleConfirmationInput(input) {
  console.log('AddPointCommandHandler.handleConfirmationInput:', input);
  
  // 🔧 关键修复：检查输入的坐标是否与当前坐标相同
  if (GeometryUtils.isCoordinateInput(input)) {
    const inputCoord = GeometryUtils.parseCoordinate(input);
    if (inputCoord && this.currentCoord) {
      
      // 🔧 重要修复：使用更宽松的精度比较
      // 因为输入框中的坐标是从 coordString 格式化而来，可能有精度差异
      const lonDiff = Math.abs(inputCoord.lon - this.currentCoord.lon);
      const latDiff = Math.abs(inputCoord.lat - this.currentCoord.lat);
      const heightDiff = Math.abs(inputCoord.height - this.currentCoord.height);
      
      // 更宽松的比较阈值
      const isSameCoordinate = (
        lonDiff < 0.001 &&    // 经度差异小于0.001度
        latDiff < 0.001 &&    // 纬度差异小于0.001度
        heightDiff < 1.0      // 高度差异小于1米
      );
      
      console.log(`坐标比较详情:`, {
        inputCoord,
        currentCoord: this.currentCoord,
        lonDiff,
        latDiff, 
        heightDiff,
        isSameCoordinate
      });
      
      if (isSameCoordinate) {
        console.log('✅ 输入坐标与当前坐标相近，视为确认操作');
        return this.executeConfirmation('enter');
      } else {
        console.log('📍 输入了明显不同的坐标，更新选择');
        return this.selectCoordinate(inputCoord);
      }
    } else if (inputCoord) {
      console.log('📍 输入新坐标，更新选择');
      return this.selectCoordinate(inputCoord);
    } else {
      return { 
        success: false, 
        message: '坐标格式错误，请使用: lon,lat,height' 
      };
    }
  }
  
  // 🔧 修复：其他输入提供明确提示
  return {
    success: false,
    message: '请按回车确认当前位置，或输入新坐标 (lon,lat,height)'
  };
}

  /**
   * 处理地图点击
   * @param {Object} coord 坐标对象
   * @returns {Object} 处理结果
   */
  handleMapClick(coord) {
    if (!this.isWaitingForMapClick()) {
      return { success: false, message: '当前不接受地图点击' };
    }

    console.log('AddPointCommandHandler.handleMapClick:', coord);
    return this.selectCoordinate(coord);
  }

  /**
   * 🔧 新增：选择坐标（统一的坐标选择逻辑）
   * @param {Object} coord 坐标对象
   * @returns {Object} 处理结果
   */
  selectCoordinate(coord) {
    if (!GeometryUtils.validateCoordinate(coord)) {
      return {
        success: false,
        message: '坐标无效，请重新选择'
      };
    }

    this.currentCoord = coord;
    
    // 🔧 关键：设置确认状态
    this.setConfirmationState({
      state: ConfirmationState.WAITING_CONFIRM,
      method: ConfirmationMethod.BOTH,
      data: coord,
      message: `确认在 (${coord.lon.toFixed(6)}, ${coord.lat.toFixed(6)}, ${coord.height.toFixed(2)}m) 添加点`
    });

    // 显示临时预览点
    if (this.context.mapView && this.context.mapView.showTemporaryPoint) {
      this.context.mapView.showTemporaryPoint(coord);
    }

    return {
      success: true,
      message: `已选择位置: ${coord.lon.toFixed(6)}, ${coord.lat.toFixed(6)}, ${coord.height.toFixed(2)}m (按回车确认或右键确认)`,
      coordString: `${coord.lon.toFixed(6)},${coord.lat.toFixed(6)},${coord.height.toFixed(2)}`,
      needsConfirm: true,
      needsMapClick: true, // 仍然可以点击地图重新选择位置
      updateInput: true
    };
  }

  /**
   * 🔧 重构：确认处理回调
   * @param {string} method 确认方法
   * @param {*} data 确认数据
   * @returns {Object} 处理结果
   */
  onConfirm(method, data) {
    console.log(`AddPointCommandHandler.onConfirm: 方法=${method}, 坐标=`, data);
    
    // 验证确认数据
    if (!GeometryUtils.validateCoordinate(data)) {
      return {
        success: false,
        message: '确认的坐标无效'
      };
    }

    // 完成命令
    console.log(`✅ 通过${method === 'enter' ? '回车' : '右键'}确认添加点`);
    return this.finish(data);
  }

  /**
   * 🔧 重构：获取特定命令的占位符文本
   * @returns {string} 占位符文本
   */
  getSpecificPlaceholder() {
    if (this.currentCoord) {
      return `当前位置: (${this.currentCoord.lon.toFixed(3)}, ${this.currentCoord.lat.toFixed(3)}) - 可继续点击地图或输入新坐标`;
    }
    return '左键点击地图选择位置，或输入坐标 (lon,lat,height)';
  }

  /**
   * 创建AddPointCommand实例
   * @param {Object} coordinate 坐标数据
   * @returns {AddPointCommand} 命令实例
   */
  createCommand(coordinate) {
    return new AddPointCommand(this.context.czmlModel, coordinate);
  }

  /**
   * 取消时的清理工作
   */
  onCancel() {
    // 隐藏临时预览点
    if (this.context.mapView && this.context.mapView.hideTemporaryPoint) {
      this.context.mapView.hideTemporaryPoint();
    }
  }

  /**
   * 完成时的清理工作
   */
  onFinish() {
    // 隐藏临时预览点
    if (this.context.mapView && this.context.mapView.hideTemporaryPoint) {
      this.context.mapView.hideTemporaryPoint();
    }
  }
}

/**
 * AddPoint命令工厂（保持不变）
 * 负责创建AddPointCommandHandler实例
 */
export class AddPointCommandFactory extends CommandFactory {
  constructor() {
    super('AddPoint', '添加点到地图 (使用紧凑ID格式)');
  }

  /**
   * 创建命令处理器
   * @param {Object} context 上下文对象
   * @returns {AddPointCommandHandler} 命令处理器实例
   */
  createHandler(context) {
    return new AddPointCommandHandler(context);
  }
}