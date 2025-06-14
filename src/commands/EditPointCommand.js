import { Command, CommandHandler, CommandFactory, ConfirmationState, ConfirmationMethod } from './base/CommandBase.js';
import GeometryUtils from '../utils/GeometryUtils.js';

/**
 * 编辑点的具体命令（保持不变）
 */
export class EditPointCommand extends Command {
  constructor(czmlModel, pointId, oldCoordinate, newCoordinate) {
    const pointName = czmlModel.getEntityById(pointId)?.name || pointId;
    super('EditPoint', `编辑点: ${pointName}`);
    
    this.czmlModel = czmlModel;
    this.pointId = pointId;
    this.oldCoordinate = { ...oldCoordinate };
    this.newCoordinate = { ...newCoordinate };
    this.pointName = pointName;
  }

  execute() {
    try {
      if (this.executed) {
        console.warn('EditPointCommand: 命令已经执行过了');
        return false;
      }

      if (!this.isValid()) {
        throw new Error('编辑数据无效');
      }

      const pointEntity = this.czmlModel.getEntityById(this.pointId);
      if (!pointEntity) {
        throw new Error(`找不到ID为 ${this.pointId} 的点`);
      }

      pointEntity.position.cartographicDegrees = [
        this.newCoordinate.lon,
        this.newCoordinate.lat,  
        this.newCoordinate.height
      ];

      const distance = GeometryUtils.calculateDistance(this.oldCoordinate, this.newCoordinate);
      const distanceText = distance ? `${distance.toFixed(2)}m` : '未知距离';
      this.description = `编辑点: ${this.pointName} (移动 ${distanceText})`;

      this.czmlModel.notifyListeners();
      this.executed = true;
      
      console.log(`EditPointCommand executed: ${this.pointName} moved ${distanceText}`);
      return true;
      
    } catch (error) {
      console.error('EditPointCommand execution failed:', error);
      return false;
    }
  }

  undo() {
    try {
      if (!this.executed) {
        console.warn('EditPointCommand: 无法撤销，命令未执行');
        return false;
      }

      const pointEntity = this.czmlModel.getEntityById(this.pointId);
      if (!pointEntity) {
        console.error(`撤销时找不到ID为 ${this.pointId} 的点`);
        return false;
      }

      pointEntity.position.cartographicDegrees = [
        this.oldCoordinate.lon,
        this.oldCoordinate.lat,
        this.oldCoordinate.height
      ];

      this.czmlModel.notifyListeners();
      this.executed = false;
      
      console.log(`EditPointCommand undone: ${this.pointName} restored to original position`);
      return true;
      
    } catch (error) {
      console.error('EditPointCommand undo failed:', error);
      return false;
    }
  }

  isValid() {
    if (!this.pointId || typeof this.pointId !== 'string') {
      return false;
    }

    if (!GeometryUtils.validateCoordinate(this.oldCoordinate)) {
      return false;
    }

    if (!GeometryUtils.validateCoordinate(this.newCoordinate)) {
      return false;
    }

    const isSamePosition = (
      Math.abs(this.oldCoordinate.lon - this.newCoordinate.lon) < 0.000001 &&
      Math.abs(this.oldCoordinate.lat - this.newCoordinate.lat) < 0.000001 &&
      Math.abs(this.oldCoordinate.height - this.newCoordinate.height) < 0.001
    );

    if (isSamePosition) {
      return false;
    }

    return true;
  }

  getPointId() {
    return this.pointId;
  }

  getPointName() {
    return this.pointName;
  }
}

/**
 * 🔧 大幅简化：EditPoint命令处理器 - 适配统一地图交互架构
 * 不再直接管理地图交互，通过EditorController的统一架构
 */
export class EditPointCommandHandler extends CommandHandler {
  constructor(context) {
    super('EditPoint', context);
    this.targetPointId = null;
    this.targetCoordinate = null;
    this.newCoordinate = null;
    this.currentStep = 'SELECT_POINT'; // 'SELECT_POINT' | 'SELECT_POSITION'
  }

  /**
   * 开始处理命令
   */
  start() {
    this.waitingForMapClick = true;
    this.currentStep = 'SELECT_POINT';
    
    return {
      success: true,
      message: '请选择要编辑的点：点击地图上的点（已高亮显示），或输入点ID',
      needsMapClick: true,
      needsConfirm: false
    };
  }

  /**
   * 🔧 简化：处理特定命令的输入
   */
  handleSpecificInput(input) {
    console.log('EditPointCommandHandler.handleSpecificInput:', { 
      input, 
      currentStep: this.currentStep 
    });

    if (this.currentStep === 'SELECT_POINT') {
      // 选择目标点阶段 - 只处理点ID输入
      if (input.startsWith('PT_')) {
        const pointEntity = this.context.czmlModel.getEntityById(input);
        if (pointEntity) {
          return this.selectTargetPoint(input, pointEntity);
        } else {
          return { 
            success: false, 
            message: `点 '${input}' 不存在，请重新输入有效的点ID` 
          };
        }
      }
      
      return { 
        success: false, 
        message: '请点击地图上的点，或输入有效的点ID (格式: PT_xxxxxxxx)' 
      };
    } 
    else if (this.currentStep === 'SELECT_POSITION') {
      // 选择新位置阶段
      if (GeometryUtils.isCoordinateInput(input)) {
        const coord = GeometryUtils.parseCoordinate(input);
        if (coord) {
          return this.selectNewPosition(coord);
        } else {
          return { 
            success: false, 
            message: '坐标格式错误，请使用格式: lon,lat,height' 
          };
        }
      }
      
      return { 
        success: false, 
        message: '请点击地图选择新位置，或输入坐标 (lon,lat,height)' 
      };
    }

    return { success: false, message: '未知状态错误' };
  }

  /**
   * 🔧 简化：处理确认状态下的输入
   */
  handleConfirmationInput(input) {
    console.log('EditPointCommandHandler.handleConfirmationInput:', input);
    
    // 如果输入新的坐标，更新新位置
    if (GeometryUtils.isCoordinateInput(input)) {
      const inputCoord = GeometryUtils.parseCoordinate(input);
      if (inputCoord && this.newCoordinate) {
        // 比较坐标是否相近
        const lonDiff = Math.abs(inputCoord.lon - this.newCoordinate.lon);
        const latDiff = Math.abs(inputCoord.lat - this.newCoordinate.lat);
        const heightDiff = Math.abs(inputCoord.height - this.newCoordinate.height);
        
        const isSameCoordinate = (lonDiff < 0.001 && latDiff < 0.001 && heightDiff < 1.0);
        
        if (isSameCoordinate) {
          console.log('✅ 输入坐标与当前坐标相近，视为确认操作');
          return this.executeConfirmation('enter');
        } else {
          console.log('📍 输入了不同坐标，更新新位置');
          this.clearConfirmationState();
          return this.selectNewPosition(inputCoord);
        }
      } else if (inputCoord) {
        console.log('📍 输入新坐标，更新位置');
        this.clearConfirmationState();
        return this.selectNewPosition(inputCoord);
      } else {
        return { 
          success: false, 
          message: '坐标格式错误，请使用格式: lon,lat,height' 
        };
      }
    }
    
    return {
      success: false,
      message: '请按回车确认当前位置，或输入新坐标 (lon,lat,height)'
    };
  }

  /**
   * 处理地图点击
   */
  handleMapClick(coord) {
    if (!this.isWaitingForMapClick()) {
      return { success: false, message: '当前不接受地图点击' };
    }

    console.log('EditPointCommandHandler.handleMapClick:', {
      coord,
      currentStep: this.currentStep
    });

    if (this.currentStep === 'SELECT_POSITION') {
      // 选择新位置
      if (this.isWaitingForConfirmation()) {
        this.clearConfirmationState();
      }
      return this.selectNewPosition(coord);
    }

    // SELECT_POINT 状态下，地图点击由EditorController的实体选择处理
    return { success: false, message: '请点击地图上的点实体' };
  }

  /**
   * 🔧 关键方法：处理实体选择结果（由EditorController调用）
   */
  handleEntitySelection(result) {
    console.log('🎯 EditPoint收到实体选择结果:', result);
    
    if (result.success && result.entityType === 'point') {
      const pointEntity = this.context.czmlModel.getEntityById(result.entityId);
      if (pointEntity) {
        console.log('✅ 选择目标点:', result.entityId);
        return this.selectTargetPoint(result.entityId, pointEntity);
      }
    }
    
    // 处理选择错误
    if (result.error) {
      console.warn('实体选择错误:', result.message);
      return {
        success: false,
        message: result.message || '请选择正确的点实体'
      };
    }
    
    return {
      success: false,
      message: '请点击地图上的点实体'
    };
  }

  /**
   * 🔧 简化：选择目标点
   */
  selectTargetPoint(pointId, pointEntity) {
    this.targetPointId = pointId;
    
    // 提取当前坐标
    const cartographicDegrees = pointEntity.position.cartographicDegrees;
    this.targetCoordinate = {
      lon: cartographicDegrees[0],
      lat: cartographicDegrees[1], 
      height: cartographicDegrees[2]
    };

    // 切换到选择位置阶段
    this.currentStep = 'SELECT_POSITION';

    return {
      success: true,
      message: `已选择 ${pointEntity.name}，请点击地图选择新位置或输入新坐标`,
      needsMapClick: true,
      needsConfirm: false
    };
  }

  /**
   * 🔧 简化：选择新位置（设置确认状态）
   */
  selectNewPosition(newCoord) {
    if (!GeometryUtils.validateCoordinate(newCoord)) {
      return {
        success: false,
        message: '坐标无效，请重新选择'
      };
    }

    this.newCoordinate = newCoord;

    const pointName = this.context.czmlModel.getEntityById(this.targetPointId)?.name || this.targetPointId;
    const distance = GeometryUtils.calculateDistance(this.targetCoordinate, this.newCoordinate);
    const distanceText = distance ? `${distance.toFixed(2)}m` : '未知距离';

    // 🔧 设置确认状态
    this.setConfirmationState({
      state: ConfirmationState.WAITING_CONFIRM,
      method: ConfirmationMethod.BOTH,
      data: {
        pointId: this.targetPointId,
        oldCoordinate: this.targetCoordinate,
        newCoordinate: this.newCoordinate
      },
      message: `确认将 ${pointName} 移动到新位置 (移动距离: ${distanceText})`
    });

    return {
      success: true,
      message: `${pointName} 将移动到 (${newCoord.lon.toFixed(6)}, ${newCoord.lat.toFixed(6)}, ${newCoord.height}m)，移动距离: ${distanceText}`,
      coordString: `${newCoord.lon.toFixed(6)},${newCoord.lat.toFixed(6)},${newCoord.height}`,
      needsMapClick: true,
      needsConfirm: true,
      updateInput: true
    };
  }

  /**
   * 🔧 简化：确认处理回调
   */
  onConfirm(method, data) {
    console.log(`EditPointCommandHandler.onConfirm: 方法=${method}`);
    
    // 验证确认数据
    if (!data || !data.pointId || !data.oldCoordinate || !data.newCoordinate) {
      return {
        success: false,
        message: '确认数据不完整'
      };
    }

    console.log(`✅ 通过${method === 'enter' ? '回车' : '右键'}确认编辑点`);
    return this.finish(data);
  }

  /**
   * 🔧 简化：获取占位符文本
   */
  getSpecificPlaceholder() {
    if (this.currentStep === 'SELECT_POINT') {
      return '点击地图上的点（已高亮），或输入点ID (如: PT_xxxxxxxx)';
    } else if (this.currentStep === 'SELECT_POSITION') {
      const pointName = this.context.czmlModel.getEntityById(this.targetPointId)?.name || this.targetPointId;
      return `编辑 ${pointName}: 点击地图选择新位置，或输入坐标 (lon,lat,height)`;
    }
    return '输入命令参数';
  }

  /**
   * 创建EditPointCommand实例
   */
  createCommand(editData) {
    return new EditPointCommand(
      this.context.czmlModel,
      editData.pointId,
      editData.oldCoordinate,
      editData.newCoordinate
    );
  }

  /**
   * 🔧 简化：取消和完成时的清理工作
   * 不再直接操作MapView，由EditorController统一管理
   */
  onCancel() {
    console.log('EditPoint onCancel - 重置状态');
    this.resetState();
  }

  onFinish() {
    console.log('EditPoint onFinish - 重置状态');
    this.resetState();
  }

  /**
   * 重置状态
   */
  resetState() {
    this.targetPointId = null;
    this.targetCoordinate = null;
    this.newCoordinate = null;
    this.currentStep = 'SELECT_POINT';
  }
}

/**
 * EditPoint命令工厂（保持不变）
 */
export class EditPointCommandFactory extends CommandFactory {
  constructor() {
    super('EditPoint', '编辑点的位置 (选择点 → 选择新位置 → 确认)');
  }

  createHandler(context) {
    return new EditPointCommandHandler(context);
  }
}