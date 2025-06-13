import { Command, CommandHandler, CommandFactory } from './base/CommandBase.js';

/**
 * 清除所有几何实体的命令 - 紧凑ID版本
 */
export class ClearCommand extends Command {
  constructor(czmlModel) {
    super('Clear', '清除所有几何实体');
    
    this.czmlModel = czmlModel;
    this.backupEntities = null; // 用于撤销，保存完整的实体信息
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

      // 获取详细的备份信息
      const stats = this.czmlModel.getStatistics();
      this.backupEntities = {
        points: [...this.czmlModel.getAllPoints()],
        polylines: [...this.czmlModel.getAllPolylines()],
        count: stats.totalGeometries
      };
      
      // 清除所有几何实体
      this.czmlModel.clearAllGeometries();
      this.executed = true;
      
      console.log(`ClearCommand executed: cleared ${this.backupEntities.count} entities`);
      console.log(`- Points: ${this.backupEntities.points.length}`);
      console.log(`- Polylines: ${this.backupEntities.polylines.length}`);
      
      // 更新命令描述
      this.description = `清除了 ${this.backupEntities.count} 个几何实体`;
      
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
      if (!this.executed || !this.backupEntities) {
        console.warn('ClearCommand: 无法撤销，命令未执行或无备份数据');
        return false;
      }

      // 恢复所有备份的实体
      [...this.backupEntities.points, ...this.backupEntities.polylines].forEach(entity => {
        this.czmlModel.czmlDocument.push(entity);
      });
      
      this.czmlModel.notifyListeners();
      this.executed = false;
      
      console.log(`ClearCommand undone: restored ${this.backupEntities.count} entities`);
      console.log(`- Points: ${this.backupEntities.points.length}`);
      console.log(`- Polylines: ${this.backupEntities.polylines.length}`);
      
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

  /**
   * 获取清除的实体数量
   * @returns {number} 清除的实体数量
   */
  getClearedCount() {
    return this.backupEntities ? this.backupEntities.count : 0;
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
    let helpText = '🌍 CZML编辑器 v3.0 - 紧凑ID系统\n\n';
    helpText += '可用命令:\n';
    
    if (this.commandRegistry) {
      this.commandRegistry.forEach((factory, name) => {
        helpText += `  ${name}: ${factory.getDescription()}\n`;
      });
    }
    
    helpText += '\n新特性:\n';
    helpText += '✨ 紧凑ID格式: PT_xxxxxxxx (点), PL_xxxxxxxx (线)\n';
    helpText += '✨ 智能命名: Point-xxxxxxxx, Polyline-xxxxxxxx (N pts)\n';
    helpText += '✨ 节省空间: ID长度减少69%\n';
    helpText += '✨ 完全唯一: 基于时间戳+随机数\n';
    
    helpText += '\n快捷键:\n';
    helpText += '• Enter: 执行命令/确认操作\n';
    helpText += '• Esc: 取消当前命令\n';
    helpText += '• ↑/↓: 浏览输入历史\n';
    helpText += '• 左键: 选择位置/添加点\n';
    helpText += '• 右键: 确认操作/完成绘制\n';
    helpText += '• Ctrl+Z: 撤销上一个操作\n';
    helpText += '• Ctrl+Y: 重做下一个操作\n';
    helpText += '• Ctrl+H: 显示命令历史\n';
    
    helpText += '\n调试命令:\n';
    helpText += '• window.czmlEditor.getStats() - 获取统计信息\n';
    helpText += '• window.czmlEditor.getCzmlData() - 获取CZML数据\n';
    helpText += '• window.czmlEditor.controller.czmlModel.validateIds() - 验证ID格式\n';
    helpText += '• window.czmlEditor.controller.czmlModel.migrateToCompactIds() - 迁移旧数据\n';
    
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
    super('Help', '显示帮助信息和紧凑ID系统说明');
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

/**
 * 数据迁移命令 - 新增
 * 将旧格式ID迁移到紧凑ID格式
 */
export class MigrateCommand extends Command {
  constructor(czmlModel) {
    super('Migrate', '迁移到紧凑ID格式');
    
    this.czmlModel = czmlModel;
    this.migrationResult = null;
  }

  /**
   * 执行迁移操作
   * @returns {boolean} 是否执行成功
   */
  execute() {
    try {
      if (this.executed) {
        console.warn('MigrateCommand: 命令已经执行过了');
        return false;
      }

      // 执行迁移
      this.migrationResult = this.czmlModel.migrateToCompactIds();
      this.executed = true;
      
      const { totalUpdated, pointsUpdated, polylinesUpdated } = this.migrationResult;
      
      if (totalUpdated > 0) {
        this.description = `迁移完成: ${pointsUpdated} 个点, ${polylinesUpdated} 条线`;
        console.log(`MigrateCommand executed: ${this.description}`);
      } else {
        this.description = '没有需要迁移的数据';
        console.log('MigrateCommand executed: 所有数据已是紧凑格式');
      }
      
      return true;
      
    } catch (error) {
      console.error('MigrateCommand execution failed:', error);
      return false;
    }
  }

  /**
   * 撤销迁移操作（这个操作不支持撤销）
   * @returns {boolean} 总是返回false
   */
  undo() {
    console.warn('MigrateCommand: 迁移操作不支持撤销');
    return false;
  }

  /**
   * 验证命令是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    return this.czmlModel !== null;
  }

  /**
   * 获取迁移结果
   * @returns {Object|null} 迁移结果
   */
  getMigrationResult() {
    return this.migrationResult;
  }
}

/**
 * Migrate命令处理器
 * 立即执行迁移操作
 */
export class MigrateCommandHandler extends CommandHandler {
  constructor(context) {
    super('Migrate', context);
  }

  /**
   * 开始处理命令（立即执行）
   * @returns {Object} 执行结果
   */
  start() {
    // 立即执行迁移
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
   * 创建MigrateCommand实例
   * @param {*} data 数据（不使用）
   * @returns {MigrateCommand} 命令实例
   */
  createCommand(data) {
    return new MigrateCommand(this.context.czmlModel);
  }
}

/**
 * Migrate命令工厂
 */
export class MigrateCommandFactory extends CommandFactory {
  constructor() {
    super('Migrate', '将现有数据迁移到紧凑ID格式');
  }

  /**
   * 创建命令处理器
   * @param {Object} context 上下文对象
   * @returns {MigrateCommandHandler} 命令处理器实例
   */
  createHandler(context) {
    return new MigrateCommandHandler(context);
  }
}