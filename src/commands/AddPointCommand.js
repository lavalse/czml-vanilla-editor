import { Command, CommandHandler, CommandFactory } from './base/CommandBase.js';
import GeometryUtils from '../utils/GeometryUtils.js';

/**
 * 添加点的具体命令 - 紧凑ID版本
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
 * AddPoint命令处理器
 * 负责收集用户输入（坐标），然后创建AddPointCommand
 */
export class AddPointCommandHandler extends CommandHandler {
  constructor(context) {
    super('AddPoint', context);
    this.currentCoord = null;
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
   * 处理用户输入
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleInput(input) {
    const trimmed = input.trim();
    
    console.log('AddPointCommandHandler.handleInput:', trimmed);
    
    // 检查是否是坐标输入
    if (GeometryUtils.isCoordinateInput(trimmed)) {
      const coord = GeometryUtils.parseCoordinate(trimmed);
      if (coord) {
        return this.finish(coord);
      } else {
        return { 
          success: false, 
          message: '坐标格式错误，请使用: lon,lat,height' 
        };
      }
    }
    
    // 如果有当前坐标，空输入表示确认
    if (this.currentCoord && trimmed === '') {
      return this.finish(this.currentCoord);
    }
    
    return { 
      success: false, 
      message: '请先点击地图选择位置或输入坐标' 
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

    this.currentCoord = coord;
    
    return {
      success: true,
      message: `已选择位置: ${coord.lon.toFixed(6)}, ${coord.lat.toFixed(6)}, ${coord.height.toFixed(2)}m (按回车确认或右键确认)`,
      coordString: `${coord.lon.toFixed(6)},${coord.lat.toFixed(6)},${coord.height.toFixed(2)}`,
      needsConfirm: true,
      updateInput: true,
      needsMapClick: true // 仍然可以继续点击更新位置
    };
  }

  /**
   * 获取占位符文本
   * @returns {string} 占位符文本
   */
  getPlaceholder() {
    if (this.currentCoord) {
      return `按回车确认位置 (${this.currentCoord.lon.toFixed(3)}, ${this.currentCoord.lat.toFixed(3)})，或点击地图重新选择`;
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
 * AddPoint命令工厂
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