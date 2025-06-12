import { Command, CommandHandler, CommandFactory } from './base/CommandBase.js';
import GeometryUtils from '../utils/GeometryUtils.js';

/**
 * 添加折线的具体命令
 * 负责实际的数据操作，支持撤销
 */
export class AddPolylineCommand extends Command {
  constructor(czmlModel, coordinates) {
    super('AddPolyline', `添加折线 (${coordinates.length} 个点)`);
    
    this.czmlModel = czmlModel;
    this.coordinates = [...coordinates]; // 复制数组避免外部修改
    this.polylineId = null;
  }

  /**
   * 执行添加折线操作
   * @returns {boolean} 是否执行成功
   */
  execute() {
    try {
      if (this.executed) {
        console.warn('AddPolylineCommand: 命令已经执行过了');
        return false;
      }

      if (!this.isValid()) {
        throw new Error('折线数据无效');
      }

      this.polylineId = this.czmlModel.addPolyline(this.coordinates);
      this.executed = true;
      
      console.log(`AddPolylineCommand executed: ${this.polylineId} with ${this.coordinates.length} points`);
      return true;
      
    } catch (error) {
      console.error('AddPolylineCommand execution failed:', error);
      return false;
    }
  }

  /**
   * 撤销添加折线操作
   * @returns {boolean} 是否撤销成功
   */
  undo() {
    try {
      if (!this.executed || !this.polylineId) {
        console.warn('AddPolylineCommand: 无法撤销，命令未执行或无效的折线ID');
        return false;
      }

      // 从CZML文档中移除折线
      const czmlDoc = this.czmlModel.czmlDocument;
      const index = czmlDoc.findIndex(entity => entity.id === this.polylineId);
      
      if (index > 0) {
        czmlDoc.splice(index, 1);
        this.czmlModel.notifyListeners();
        this.executed = false;
        
        console.log(`AddPolylineCommand undone: ${this.polylineId}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('AddPolylineCommand undo failed:', error);
      return false;
    }
  }

  /**
   * 验证命令是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    return GeometryUtils.validateCoordinates(this.coordinates, 2);
  }

  /**
   * 获取创建的折线ID
   * @returns {string|null} 折线ID
   */
  getPolylineId() {
    return this.polylineId;
  }

  /**
   * 获取坐标数组
   * @returns {Array} 坐标数组的副本
   */
  getCoordinates() {
    return [...this.coordinates];
  }
}

/**
 * AddPolyline命令处理器
 * 负责收集用户输入（多个坐标点），然后创建AddPolylineCommand
 */
export class AddPolylineCommandHandler extends CommandHandler {
  constructor(context) {
    super('AddPolyline', context);
    this.coordinates = []; // 收集的坐标点
  }

  /**
   * 开始处理命令
   * @returns {Object} 初始结果
   */
  start() {
    this.waitingForMapClick = true;
    this.result = {
      success: true,
      message: '开始绘制折线：点击地图添加点 (至少需要2个点，按回车或右键完成)',
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
    
    console.log('AddPolylineCommandHandler.handleInput:', { input: trimmed, coordinatesLength: this.coordinates.length });
    
    // 检查是否是坐标输入
    if (GeometryUtils.isCoordinateInput(trimmed)) {
      const coord = GeometryUtils.parseCoordinate(trimmed);
      if (coord) {
        return this.addCoordinatePoint(coord);
      } else {
        return { 
          success: false, 
          message: '坐标格式错误，请使用: lon,lat,height' 
        };
      }
    }
    
    // 空输入表示完成绘制
    if (trimmed === '' || input === '') {
      console.log('空输入，尝试完成绘制');
      return this.finishPolyline();
    }
    
    return { 
      success: false, 
      message: `请继续点击地图添加点 (当前${this.coordinates.length}个点)，或按回车完成绘制` 
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

    // 添加坐标点
    this.coordinates.push(coord);
    
    // 更新临时预览
    if (this.context.mapView && this.context.mapView.updateTemporaryPolyline) {
      this.context.mapView.updateTemporaryPolyline(this.coordinates);
    }
    
    const pointCount = this.coordinates.length;
    let message = `已添加第${pointCount}个点: ${coord.lon.toFixed(6)}, ${coord.lat.toFixed(6)}, ${coord.height.toFixed(2)}m`;
    
    if (pointCount === 1) {
      message += ' (继续点击添加点，至少需要2个点)';
    } else if (pointCount >= 2) {
      message += ' (可按回车或右键完成，或继续添加点)';
    }
    
    // 生成当前坐标列表字符串
    const coordStrings = this.coordinates.map(c => 
      `${c.lon.toFixed(6)},${c.lat.toFixed(6)},${c.height.toFixed(2)}`
    );
    
    return {
      success: true,
      message: message,
      coordString: coordStrings.join('; '), // 多个坐标用分号分隔
      needsConfirm: pointCount >= 2,
      updateInput: true,
      needsMapClick: true // 继续等待更多点击
    };
  }

  /**
   * 通过坐标输入添加点
   * @param {Object} coord 坐标对象
   * @returns {Object} 处理结果
   */
  addCoordinatePoint(coord) {
    this.coordinates.push(coord);
    
    // 更新临时预览
    if (this.context.mapView && this.context.mapView.updateTemporaryPolyline) {
      this.context.mapView.updateTemporaryPolyline(this.coordinates);
    }
    
    const pointCount = this.coordinates.length;
    let message = `通过坐标添加第${pointCount}个点`;
    
    if (pointCount >= 2) {
      message += ' (可按回车完成，或继续添加点)';
    }
    
    return {
      success: true,
      message: message,
      needsMapClick: true, // 继续等待点击
      needsConfirm: pointCount >= 2
    };
  }

  /**
   * 完成折线绘制
   * @returns {Object} 处理结果
   */
  finishPolyline() {
    console.log('finishPolyline被调用，当前坐标数量:', this.coordinates.length);
    
    if (this.coordinates.length < 2) {
      return {
        success: false,
        message: `折线至少需要2个点，当前只有${this.coordinates.length}个点`
      };
    }
    
    return this.finish(this.coordinates);
  }

  /**
   * 获取占位符文本
   * @returns {string} 占位符文本
   */
  getPlaceholder() {
    const pointCount = this.coordinates.length;
    
    if (pointCount === 0) {
      return '左键点击地图开始绘制折线';
    } else if (pointCount === 1) {
      return '继续点击地图添加第2个点 (至少需要2个点)';
    } else {
      return `已有${pointCount}个点，按回车完成或继续添加点`;
    }
  }

  /**
   * 创建AddPolylineCommand实例
   * @param {Array} coordinates 坐标数组
   * @returns {AddPolylineCommand} 命令实例
   */
  createCommand(coordinates) {
    return new AddPolylineCommand(this.context.czmlModel, coordinates);
  }

  /**
   * 取消时的清理工作
   */
  onCancel() {
    // 清除临时预览
    if (this.context.mapView && this.context.mapView.hideTemporaryPolyline) {
      this.context.mapView.hideTemporaryPolyline();
    }
  }

  /**
   * 完成时的清理工作
   */
  onFinish() {
    // 清除临时预览
    if (this.context.mapView && this.context.mapView.hideTemporaryPolyline) {
      this.context.mapView.hideTemporaryPolyline();
    }
  }
}

/**
 * AddPolyline命令工厂
 * 负责创建AddPolylineCommandHandler实例
 */
export class AddPolylineCommandFactory extends CommandFactory {
  constructor() {
    super('AddPolyline', '添加折线到地图');
  }

  /**
   * 创建命令处理器
   * @param {Object} context 上下文对象
   * @returns {AddPolylineCommandHandler} 命令处理器实例
   */
  createHandler(context) {
    return new AddPolylineCommandHandler(context);
  }
}