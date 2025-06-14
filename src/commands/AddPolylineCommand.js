import { Command, CommandHandler, CommandFactory, ConfirmationState, ConfirmationMethod } from './base/CommandBase.js';
import GeometryUtils from '../utils/GeometryUtils.js';

/**
 * 添加折线的具体命令 - 紧凑ID版本（保持不变）
 * 负责实际的数据操作，支持撤销
 */
export class AddPolylineCommand extends Command {
  constructor(czmlModel, coordinates) {
    super('AddPolyline', `添加折线 (${coordinates.length} 个点)`);
    
    this.czmlModel = czmlModel;
    this.coordinates = [...coordinates]; // 复制数组避免外部修改
    this.polylineId = null;
    this.polylineName = null; // 新增：保存折线名称
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

      // 使用新的addPolyline方法，它会自动生成紧凑ID
      this.polylineId = this.czmlModel.addPolyline(this.coordinates);
      
      // 获取生成的折线信息
      const polylineEntity = this.czmlModel.getEntityById(this.polylineId);
      this.polylineName = polylineEntity ? polylineEntity.name : `Polyline-${this.polylineId}`;
      
      // 更新命令描述以包含生成的折线名称
      this.description = `添加折线: ${this.polylineName}`;
      
      this.executed = true;
      
      console.log(`AddPolylineCommand executed: ${this.polylineName} (ID: ${this.polylineId}) with ${this.coordinates.length} points`);
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

      // 使用新的removeEntityById方法
      const success = this.czmlModel.removeEntityById(this.polylineId);
      
      if (success) {
        this.executed = false;
        console.log(`AddPolylineCommand undone: ${this.polylineName} (ID: ${this.polylineId})`);
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
   * 获取创建的折线名称
   * @returns {string|null} 折线名称
   */
  getPolylineName() {
    return this.polylineName;
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
 * 🔧 重构：AddPolyline命令处理器 - 使用统一确认机制
 * 负责收集用户输入（多个坐标点），然后创建AddPolylineCommand
 */
export class AddPolylineCommandHandler extends CommandHandler {
  constructor(context) {
    super('AddPolyline', context);
    this.coordinates = []; // 收集的坐标点
    this.isReadyToFinish = false; // 是否准备完成绘制
  }

  /**
   * 开始处理命令
   * @returns {Object} 初始结果
   */
  start() {
    this.waitingForMapClick = true;
    this.result = {
      success: true,
      message: '开始绘制折线：点击地图添加点 (至少需要2个点)',
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
    console.log('AddPolylineCommandHandler.handleSpecificInput:', { 
      input, 
      coordinatesLength: this.coordinates.length,
      isReadyToFinish: this.isReadyToFinish 
    });
    
    // 检查是否是坐标输入
    if (GeometryUtils.isCoordinateInput(input)) {
      const coord = GeometryUtils.parseCoordinate(input);
      if (coord) {
        return this.addCoordinatePoint(coord);
      } else {
        return { 
          success: false, 
          message: '坐标格式错误，请使用: lon,lat,height' 
        };
      }
    }
    
    // 空输入表示完成绘制（如果有足够的点）
    if (input.trim() === '') {
      if (this.coordinates.length >= 2) {
        console.log('空输入，尝试完成折线绘制');
        return this.prepareToFinish();
      } else {
        return {
          success: false,
          message: `折线至少需要2个点，当前只有${this.coordinates.length}个点`
        };
      }
    }
    
    return { 
      success: false, 
      message: `请继续点击地图添加点 (当前${this.coordinates.length}个点)，或按回车完成绘制` 
    };
  }

  /**
   * 🔧 重构：处理确认状态下的输入
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleConfirmationInput(input) {
    console.log('AddPolylineCommandHandler.handleConfirmationInput:', input);
    
    // 如果在准备完成状态，空输入表示确认完成
    if (this.isReadyToFinish && input.trim() === '') {
      console.log('✅ 确认完成折线绘制');
      return this.executeConfirmation('enter');
    }
    
    // 检查是否是新的坐标输入
    if (GeometryUtils.isCoordinateInput(input)) {
      const coord = GeometryUtils.parseCoordinate(input);
      if (coord) {
        console.log('📍 在确认状态下添加新坐标点');
        // 清除确认状态，添加新点
        this.clearConfirmationState();
        this.isReadyToFinish = false;
        return this.addCoordinatePoint(coord);
      } else {
        return { 
          success: false, 
          message: '坐标格式错误，请使用: lon,lat,height' 
        };
      }
    }
    
    return {
      success: false,
      message: '请按回车确认完成折线，或输入新坐标继续添加点'
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

    console.log('AddPolylineCommandHandler.handleMapClick:', coord);
    
    // 如果在确认状态，清除确认状态
    if (this.isWaitingForConfirmation()) {
      this.clearConfirmationState();
      this.isReadyToFinish = false;
    }
    
    return this.addCoordinatePoint(coord);
  }

  /**
   * 🔧 处理特定命令的右键点击
   * @returns {Object} 处理结果
   */
  handleSpecificRightClick() {
    console.log('AddPolylineCommandHandler.handleSpecificRightClick:', {
      coordinatesLength: this.coordinates.length,
      isReadyToFinish: this.isReadyToFinish
    });
    
    // 如果有足够的点，右键表示完成绘制
    if (this.coordinates.length >= 2) {
      console.log('右键完成折线绘制');
      return this.prepareToFinish();
    }
    
    return {
      success: false,
      message: `折线至少需要2个点，当前只有${this.coordinates.length}个点`
    };
  }

  /**
   * 🔧 新增：添加坐标点
   * @param {Object} coord 坐标对象
   * @returns {Object} 处理结果
   */
  addCoordinatePoint(coord) {
    if (!GeometryUtils.validateCoordinate(coord)) {
      return {
        success: false,
        message: '坐标无效，请重新选择'
      };
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
    
    return {
      success: true,
      message: message,
      needsMapClick: true, // 继续等待更多点击
      needsConfirm: false
    };
  }

  /**
   * 🔧 新增：准备完成绘制
   * @returns {Object} 处理结果
   */
  prepareToFinish() {
    if (this.coordinates.length < 2) {
      return {
        success: false,
        message: `折线至少需要2个点，当前只有${this.coordinates.length}个点`
      };
    }
    
    this.isReadyToFinish = true;
    
    // 🔧 设置确认状态
    this.setConfirmationState({
      state: ConfirmationState.WAITING_CONFIRM,
      method: ConfirmationMethod.BOTH,
      data: this.coordinates,
      message: `确认完成折线绘制 (${this.coordinates.length} 个点)`
    });

    const length = GeometryUtils.calculatePolylineLength(this.coordinates);
    const lengthText = length ? `总长度: ${length.toFixed(2)}m` : '';
    
    return {
      success: true,
      message: `准备完成折线绘制: ${this.coordinates.length} 个点 ${lengthText}`,
      needsMapClick: true, // 仍然可以点击地图添加更多点
      needsConfirm: true
    };
  }

  /**
   * 🔧 重构：确认处理回调
   * @param {string} method 确认方法
   * @param {*} data 确认数据
   * @returns {Object} 处理结果
   */
  onConfirm(method, data) {
    console.log(`AddPolylineCommandHandler.onConfirm: 方法=${method}, 坐标点数=${data ? data.length : 0}`);
    
    // 验证确认数据
    if (!GeometryUtils.validateCoordinates(data, 2)) {
      return {
        success: false,
        message: '确认的折线数据无效，至少需要2个有效坐标点'
      };
    }

    // 完成命令
    console.log(`✅ 通过${method === 'enter' ? '回车' : '右键'}确认完成折线绘制`);
    return this.finish(data);
  }

  /**
   * 🔧 重构：获取特定命令的占位符文本
   * @returns {string} 占位符文本
   */
  getSpecificPlaceholder() {
    const pointCount = this.coordinates.length;
    
    if (this.isReadyToFinish) {
      return `已准备完成 (${pointCount} 个点)`;
    }
    
    if (pointCount === 0) {
      return '左键点击地图开始绘制折线';
    } else if (pointCount === 1) {
      return '继续点击地图添加第2个点 (至少需要2个点)';
    } else {
      return `已有${pointCount}个点，继续添加或按回车/右键完成`;
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
    
    // 重置状态
    this.coordinates = [];
    this.isReadyToFinish = false;
  }

  /**
   * 完成时的清理工作
   */
  onFinish() {
    // 清除临时预览
    if (this.context.mapView && this.context.mapView.hideTemporaryPolyline) {
      this.context.mapView.hideTemporaryPolyline();
    }
    
    // 重置状态
    this.coordinates = [];
    this.isReadyToFinish = false;
  }
}

/**
 * AddPolyline命令工厂（保持不变）
 * 负责创建AddPolylineCommandHandler实例
 */
export class AddPolylineCommandFactory extends CommandFactory {
  constructor() {
    super('AddPolyline', '添加折线到地图 (使用紧凑ID格式)');
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