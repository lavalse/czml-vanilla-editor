import { Command, CommandHandler, CommandFactory } from './base/CommandBase.js';

/**
 * 清除所有几何实体的命令
 */
export class ClearCommand extends Command {
  constructor(czmlModel) {
    super('Clear', '清除所有几何实体');
    
    this.czmlModel = czmlModel;
    this.backupData = null; // 用于撤销
  }

  /**
   * 执行清除操作
   * @returns {boolean} 是否执行成功
   */
  execute() {
    try {
      if (this.executed) {
        console.warn('ClearCommand: 命令已经执行过了');
        return false;
      }

      // 备份当前数据用于撤销
      this.backupData = this.czmlModel.getAllGeometries();
      
      // 清除所有几何实体
      this.czmlModel.clearAllGeometries();
      this.executed = true;
      
      console.log(`ClearCommand executed: cleared ${this.backupData.length} entities`);
      return true;
      
    } catch (error) {
      console.error('ClearCommand execution failed:', error);
      return false;
    }
  }

  /**
   * 撤销清除操作
   * @returns {boolean} 是否撤销成功
   */
  undo() {
    try {
      if (!this.executed || !this.backupData) {
        console.warn('ClearCommand: 无法撤销，命令未执行或无备份数据');
        return false;
      }

      // 恢复备份的数据
      this.backupData.forEach(entity => {
        this.czmlModel.czmlDocument.push(entity);
      });
      
      this.czmlModel.notifyListeners();
      this.executed = false;
      
      console.log(`ClearCommand undone: restored ${this.backupData.length} entities`);
      return true;
      
    } catch (error) {
      console.error('ClearCommand undo failed:', error);
      return false;
    }
  }

  /**
   * 验证命令是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    return this.czmlModel !== null;
  }
}

/**
 * Clear命令处理器
 * 立即执行清除操作，无需用户交互
 */
export class ClearCommandHandler extends CommandHandler {
  constructor(context) {
    super('Clear', context);
  }

  /**
   * 开始处理命令（立即执行）
   * @returns {Object} 执行结果
   */
  start() {
    // 清除临时预览
    if (this.context.mapView) {
      this.context.mapView.hideTemporaryPoint();
      this.context.mapView.hideTemporaryPolyline();
    }
    
    // 立即执行清除
    return this.finish(null);
  }

  /**
   * 处理用户输入（不需要）
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleInput(input) {
    return this.getResult();
  }

  /**
   * 创建ClearCommand实例
   * @param {*} data 数据（不使用）
   * @returns {ClearCommand} 命令实例
   */
  createCommand(data) {
    return new ClearCommand(this.context.czmlModel);
  }
}

/**
 * Clear命令工厂
 */
export class ClearCommandFactory extends CommandFactory {
  constructor() {
    super('Clear', '清除所有几何实体（点和线）');
  }

  /**
   * 创建命令处理器
   * @param {Object} context 上下文对象
   * @returns {ClearCommandHandler} 命令处理器实例
   */
  createHandler(context) {
    return new ClearCommandHandler(context);
  }
}

/**
 * Help命令处理器
 * 显示帮助信息，无需Command（因为不修改数据）
 */
export class HelpCommandHandler extends CommandHandler {
  constructor(context, commandRegistry) {
    super('Help', context);
    this.commandRegistry = commandRegistry;
  }

  /**
   * 开始处理命令（立即显示帮助）
   * @returns {Object} 执行结果
   */
  start() {
    let helpText = '可用命令:\n';
    
    if (this.commandRegistry) {
      this.commandRegistry.forEach((factory, name) => {
        helpText += `  ${name}: ${factory.getDescription()}\n`;
      });
    }
    
    this.completed = true;
    this.result = {
      success: true,
      message: helpText,
      needsMapClick: false,
      needsConfirm: false
    };
    
    return this.result;
  }

  /**
   * 处理用户输入（不需要）
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleInput(input) {
    return this.getResult();
  }

  /**
   * 不需要创建Command（因为Help不修改数据）
   * @param {*} data 数据
   * @returns {null} 不创建命令
   */
  createCommand(data) {
    return null;
  }
}

/**
 * Help命令工厂
 */
export class HelpCommandFactory extends CommandFactory {
  constructor() {
    super('Help', '显示帮助信息');
  }

  /**
   * 创建命令处理器
   * @param {Object} context 上下文对象
   * @returns {HelpCommandHandler} 命令处理器实例
   */
  createHandler(context) {
    // Help命令需要访问命令注册表
    return new HelpCommandHandler(context, context.commandRegistry);
  }
}