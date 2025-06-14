import { Command, CommandHandler, CommandFactory } from './base/CommandBase.js';
import GeometryUtils from '../utils/GeometryUtils.js';

/**
 * 编辑点的具体命令 - 改进版本（保持原有Command类不变）
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
      console.log(`  从: (${this.oldCoordinate.lon.toFixed(6)}, ${this.oldCoordinate.lat.toFixed(6)}, ${this.oldCoordinate.height})`);
      console.log(`  到: (${this.newCoordinate.lon.toFixed(6)}, ${this.newCoordinate.lat.toFixed(6)}, ${this.newCoordinate.height})`);
      
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
      console.log(`  恢复到: (${this.oldCoordinate.lon.toFixed(6)}, ${this.oldCoordinate.lat.toFixed(6)}, ${this.oldCoordinate.height})`);
      
      return true;
      
    } catch (error) {
      console.error('EditPointCommand undo failed:', error);
      return false;
    }
  }

  isValid() {
    if (!this.pointId || typeof this.pointId !== 'string') {
      console.error('EditPointCommand: 无效的点ID');
      return false;
    }

    if (!GeometryUtils.validateCoordinate(this.oldCoordinate)) {
      console.error('EditPointCommand: 无效的原坐标');
      return false;
    }

    if (!GeometryUtils.validateCoordinate(this.newCoordinate)) {
      console.error('EditPointCommand: 无效的新坐标');
      return false;
    }

    const isSamePosition = (
      Math.abs(this.oldCoordinate.lon - this.newCoordinate.lon) < 0.000001 &&
      Math.abs(this.oldCoordinate.lat - this.newCoordinate.lat) < 0.000001 &&
      Math.abs(this.oldCoordinate.height - this.newCoordinate.height) < 0.001
    );

    if (isSamePosition) {
      console.warn('EditPointCommand: 新位置与原位置相同');
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

  getMoveDistance() {
    return GeometryUtils.calculateDistance(this.oldCoordinate, this.newCoordinate);
  }

  getOldCoordinate() {
    return { ...this.oldCoordinate };
  }

  getNewCoordinate() {
    return { ...this.newCoordinate };
  }
}

/**
 * EditPoint命令处理器 - 改进版本（添加确认步骤）
 * 状态流程：WAITING_FOR_TARGET → WAITING_FOR_POSITION → WAITING_FOR_CONFIRM
 */
export class EditPointCommandHandler extends CommandHandler {
  constructor(context) {
    super('EditPoint', context);
    this.targetPointId = null;      // 选中的目标点ID
    this.targetCoordinate = null;   // 目标点的当前坐标
    this.newCoordinate = null;      // 新的坐标（待确认）
    this.state = 'WAITING_FOR_TARGET'; // 状态：WAITING_FOR_TARGET, WAITING_FOR_POSITION, WAITING_FOR_CONFIRM
  }

  /**
   * 开始处理命令 - 启用实体选择模式
   * @returns {Object} 初始结果
   */
  start() {
    this.waitingForMapClick = true;
    this.state = 'WAITING_FOR_TARGET';
    
    // 启用实体选择模式
    if (this.context.mapView.enableEntitySelection) {
      this.context.mapView.enableEntitySelection((result) => {
        this.handleEntitySelection(result);
      });
      
      // 高亮所有可选择的点
      if (this.context.mapView.highlightSelectablePoints) {
        this.context.mapView.highlightSelectablePoints(true);
      }
    }
    
    this.result = {
      success: true,
      message: '请选择要编辑的点：点击地图上的点（已高亮显示），或输入点ID',
      needsMapClick: true,
      needsConfirm: false
    };
    return this.result;
  }

  /**
   * 处理实体选择结果 - 新增方法
   * @param {Object} result 实体选择结果
   */
  handleEntitySelection(result) {
    console.log('EditPoint收到实体选择结果:', result);
    
    if (result.success && result.entityType === 'point') {
      // 成功选择了点实体
      const pointEntity = this.context.czmlModel.getEntityById(result.entityId);
      if (pointEntity) {
        console.log('选择目标点:', result.entityId);
        
        // 清除可选择点的高亮
        if (this.context.mapView.highlightSelectablePoints) {
          this.context.mapView.highlightSelectablePoints(false);
        }
        
        // 高亮选中的点
        if (this.context.mapView.highlightSpecificPoint) {
          this.context.mapView.highlightSpecificPoint(result.entityId, true);
        }
        
        // 选择目标点并切换状态
        this.selectTargetPointFromEntity(result.entityId, pointEntity);
        
        // 切换到普通地图点击模式（选择新位置）
        this.context.mapView.disableEntitySelection();
        this.context.mapView.enableMapClickToAddPoint((coord) => {
          this.handlePositionClick(coord);
        });
        
        // 启用右键确认
        this.context.mapView.enableRightClickConfirm(() => {
          this.handleRightClickConfirm();
        });
      }
    } else {
      // 处理选择错误 - 更新UI消息
      if (result.error) {
        console.warn('实体选择错误:', result.message);
        // 这里我们需要通知UI显示错误消息
        // 由于当前架构限制，我们在控制台显示并继续等待正确的选择
      }
    }
  }

  /**
   * 处理用户输入
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleInput(input) {
    const trimmed = input.trim();
    
    console.log('EditPointCommandHandler.handleInput:', { 
      input: trimmed, 
      state: this.state,
      targetPointId: this.targetPointId 
    });

    if (this.state === 'WAITING_FOR_TARGET') {
      return this.handleTargetInput(trimmed);
    } else if (this.state === 'WAITING_FOR_POSITION') {
      return this.handlePositionInput(trimmed);
    } else if (this.state === 'WAITING_FOR_CONFIRM') {
      return this.handleConfirmInput(trimmed);
    }

    return { success: false, message: '未知状态错误' };
  }

  /**
   * 处理目标点输入
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleTargetInput(input) {
    // 检查是否是点ID输入
    if (input.startsWith('PT_')) {
      const pointEntity = this.context.czmlModel.getEntityById(input);
      if (pointEntity) {
        // 清除高亮效果
        if (this.context.mapView.highlightSelectablePoints) {
          this.context.mapView.highlightSelectablePoints(false);
        }
        
        // 禁用实体选择模式
        this.context.mapView.disableEntitySelection();
        
        // 选择目标点
        const result = this.selectTargetPointFromEntity(input, pointEntity);
        
        // 高亮选中的点
        if (this.context.mapView.highlightSpecificPoint) {
          this.context.mapView.highlightSpecificPoint(input, true);
        }
        
        // 切换到普通地图点击模式
        this.context.mapView.enableMapClickToAddPoint((coord) => {
          this.handlePositionClick(coord);
        });
        
        // 启用右键确认
        this.context.mapView.enableRightClickConfirm(() => {
          this.handleRightClickConfirm();
        });
        
        return result;
      } else {
        return { 
          success: false, 
          message: `点 '${input}' 不存在，请重新输入有效的点ID` 
        };
      }
    }

    if (input === '') {
      return { 
        success: false, 
        message: '请点击地图上的点，或输入有效的点ID' 
      };
    }

    return { 
      success: false, 
      message: `'${input}' 不是有效的点ID，点ID格式为: PT_xxxxxxxx` 
    };
  }

  /**
   * 处理新位置输入
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handlePositionInput(input) {
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

    if (input === '' && this.newCoordinate) {
      return this.confirmPosition();
    }

    if (input === '') {
      return { 
        success: false, 
        message: '请点击地图选择新位置，或输入新坐标' 
      };
    }

    return { 
      success: false, 
      message: '请点击地图选择新位置，或输入坐标 (lon,lat,height)' 
    };
  }

  /**
   * 处理确认输入
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleConfirmInput(input) {
    const trimmed = input.trim();

    // 如果输入新的坐标，更新位置
    if (GeometryUtils.isCoordinateInput(trimmed)) {
      const coord = GeometryUtils.parseCoordinate(trimmed);
      if (coord) {
        return this.selectNewPosition(coord);
      } else {
        return { 
          success: false, 
          message: '坐标格式错误，请使用格式: lon,lat,height' 
        };
      }
    }

    // 空输入表示确认当前位置
    if (trimmed === '') {
      return this.finishEdit();
    }

    return { 
      success: false, 
      message: '按回车确认当前位置，或输入新坐标修改位置' 
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

    // WAITING_FOR_TARGET状态下，地图点击由实体选择处理器处理
    // 这里只处理选择新位置的情况
    if (this.state === 'WAITING_FOR_POSITION') {
      return this.handlePositionClick(coord);
    } else if (this.state === 'WAITING_FOR_CONFIRM') {
      return this.handlePositionClick(coord); // 确认状态下点击地图相当于重新选择位置
    }

    // WAITING_FOR_TARGET状态下不应该到达这里（由实体选择处理）
    return { success: false, message: '请点击地图上的点实体' };
  }

  /**
   * 处理位置点击
   * @param {Object} coord 点击的坐标
   * @returns {Object} 处理结果
   */
  handlePositionClick(coord) {
    return this.selectNewPosition(coord);
  }

  /**
   * 处理右键确认 - 新增方法
   * @returns {Object} 处理结果
   */
  handleRightClickConfirm() {
    console.log('EditPoint右键确认:', this.state);
    
    if (this.state === 'WAITING_FOR_CONFIRM' && this.newCoordinate) {
      return this.finishEdit();
    } else if (this.state === 'WAITING_FOR_POSITION') {
      return { 
        success: false, 
        message: '请先选择新位置，然后右键确认' 
      };
    }
    
    return { 
      success: false, 
      message: '右键确认无效' 
    };
  }

  /**
   * 从实体选择目标点 - 新方法
   * @param {string} pointId 点ID
   * @param {Object} pointEntity 点实体
   * @returns {Object} 处理结果
   */
  selectTargetPointFromEntity(pointId, pointEntity) {
    this.targetPointId = pointId;
    
    // 提取当前坐标
    const cartographicDegrees = pointEntity.position.cartographicDegrees;
    this.targetCoordinate = {
      lon: cartographicDegrees[0],
      lat: cartographicDegrees[1], 
      height: cartographicDegrees[2]
    };

    // 切换到等待新位置状态
    this.state = 'WAITING_FOR_POSITION';

    return {
      success: true,
      message: `已选择 ${pointEntity.name} (当前位置: ${this.targetCoordinate.lon.toFixed(6)}, ${this.targetCoordinate.lat.toFixed(6)}, ${this.targetCoordinate.height}m)，请选择新位置`,
      coordString: pointId,
      needsMapClick: true,
      needsConfirm: false,
      updateInput: true
    };
  }

  /**
   * 选择新位置（进入确认状态）
   * @param {Object} newCoord 新坐标
   * @returns {Object} 处理结果
   */
  selectNewPosition(newCoord) {
    this.newCoordinate = newCoord;
    this.state = 'WAITING_FOR_CONFIRM'; // 进入确认状态

    const pointName = this.context.czmlModel.getEntityById(this.targetPointId)?.name || this.targetPointId;
    const distance = GeometryUtils.calculateDistance(this.targetCoordinate, this.newCoordinate);
    const distanceText = distance ? `${distance.toFixed(2)}m` : '未知距离';

    return {
      success: true,
      message: `${pointName} 将移动到 (${newCoord.lon.toFixed(6)}, ${newCoord.lat.toFixed(6)}, ${newCoord.height}m)，移动距离: ${distanceText} (按回车确认或右键确认)`,
      coordString: `${newCoord.lon.toFixed(6)},${newCoord.lat.toFixed(6)},${newCoord.height}`,
      needsMapClick: true, // 仍然可以点击地图重新选择位置
      needsConfirm: true,  // 需要确认
      updateInput: true
    };
  }

  /**
   * 确认位置（从等待确认状态）
   * @returns {Object} 处理结果
   */
  confirmPosition() {
    return this.finishEdit();
  }

  /**
   * 完成编辑
   * @returns {Object} 处理结果
   */
  finishEdit() {
    const editData = {
      pointId: this.targetPointId,
      oldCoordinate: this.targetCoordinate,
      newCoordinate: this.newCoordinate
    };

    return this.finish(editData);
  }

  /**
   * 获取占位符文本
   * @returns {string} 占位符文本
   */
  getPlaceholder() {
    if (this.state === 'WAITING_FOR_TARGET') {
      return '点击地图上的点（已高亮），或输入点ID (如: PT_xxxxxxxx)';
    } else if (this.state === 'WAITING_FOR_POSITION') {
      const pointName = this.context.czmlModel.getEntityById(this.targetPointId)?.name || this.targetPointId;
      return `编辑 ${pointName}: 点击地图选择新位置，或输入坐标 (lon,lat,height)`;
    } else if (this.state === 'WAITING_FOR_CONFIRM') {
      const pointName = this.context.czmlModel.getEntityById(this.targetPointId)?.name || this.targetPointId;
      return `按回车确认 ${pointName} 的新位置，或点击地图/输入坐标重新选择`;
    }
    return '输入命令参数';
  }

  /**
   * 创建EditPointCommand实例
   * @param {Object} editData 编辑数据
   * @returns {EditPointCommand} 命令实例
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
   * 取消时的清理工作
   */
  onCancel() {
    console.log('EditPoint onCancel - 清理资源');
    
    // 清理视觉效果
    if (this.context.mapView.highlightSelectablePoints) {
      this.context.mapView.highlightSelectablePoints(false);
    }
    
    if (this.targetPointId && this.context.mapView.highlightSpecificPoint) {
      this.context.mapView.highlightSpecificPoint(this.targetPointId, false);
    }
    
    // 禁用实体选择
    if (this.context.mapView.disableEntitySelection) {
      this.context.mapView.disableEntitySelection();
    }
    
    // 禁用地图交互
    this.context.mapView.disableMapClick();
    this.context.mapView.disableRightClickConfirm();
    
    // 重置状态
    this.targetPointId = null;
    this.targetCoordinate = null;
    this.newCoordinate = null;
    this.state = 'WAITING_FOR_TARGET';
  }

  /**
   * 完成时的清理工作
   */
  onFinish() {
    console.log('EditPoint onFinish - 清理资源');
    
    // 清理视觉效果
    if (this.context.mapView.highlightSelectablePoints) {
      this.context.mapView.highlightSelectablePoints(false);
    }
    
    if (this.targetPointId && this.context.mapView.highlightSpecificPoint) {
      this.context.mapView.highlightSpecificPoint(this.targetPointId, false);
    }
    
    // 禁用实体选择
    if (this.context.mapView.disableEntitySelection) {
      this.context.mapView.disableEntitySelection();
    }
    
    // 禁用地图交互
    this.context.mapView.disableMapClick();
    this.context.mapView.disableRightClickConfirm();
    
    // 重置状态
    this.targetPointId = null;
    this.targetCoordinate = null;
    this.newCoordinate = null;
    this.state = 'WAITING_FOR_TARGET';
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