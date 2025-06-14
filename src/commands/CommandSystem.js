// 导入所有命令工厂
import { AddPointCommandFactory } from './AddPointCommand.js';
import { AddPolylineCommandFactory } from './AddPolylineCommand.js';
import { EditPointCommandFactory } from './EditPointCommand.js';
import { ClearCommandFactory, HelpCommandFactory } from './UtilityCommands.js';

/**
 * 命令历史管理器
 * 负责管理可撤销命令的历史记录
 */
class CommandHistory {
  constructor(maxHistorySize = 50) {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 添加命令到历史记录
   * @param {Command} command 命令实例
   */
  addCommand(command) {
    // 如果当前不在历史记录的末尾，删除后面的记录
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 添加新命令
    this.history.push(command);
    this.currentIndex++;

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    console.log(`命令已添加到历史记录: ${command.getName()}, 历史记录大小: ${this.history.length}`);
  }

  /**
   * 撤销上一个命令
   * @returns {boolean} 是否成功撤销
   */
  undo() {
    if (this.currentIndex < 0) {
      console.log('没有可撤销的命令');
      return false;
    }

    const command = this.history[this.currentIndex];
    const success = command.undo();
    
    if (success) {
      this.currentIndex--;
      console.log(`命令已撤销: ${command.getName()}`);
    }
    
    return success;
  }

  /**
   * 重做下一个命令
   * @returns {boolean} 是否成功重做
   */
  redo() {
    if (this.currentIndex >= this.history.length - 1) {
      console.log('没有可重做的命令');
      return false;
    }

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    const success = command.execute();
    
    if (success) {
      console.log(`命令已重做: ${command.getName()}`);
    } else {
      this.currentIndex--; // 重做失败，回退索引
    }
    
    return success;
  }

  /**
   * 获取历史记录信息
   * @returns {Object} 历史记录信息
   */
  getInfo() {
    return {
      totalCommands: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.currentIndex >= 0,
      canRedo: this.currentIndex < this.history.length - 1,
      commands: this.history.map(cmd => ({
        name: cmd.getName(),
        description: cmd.getDescription(),
        executed: cmd.executed
      }))
    };
  }

  /**
   * 清空历史记录
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
    console.log('命令历史记录已清空');
  }
}

/**
 * 重构后的命令系统核心类
 * 只负责调度和管理，不包含具体命令逻辑
 */
class CommandSystem {
  constructor() {
    this.commandFactories = new Map(); // 存储命令工厂
    this.currentHandler = null; // 当前活动的命令处理器
    this.inputHistory = []; // 用户输入历史
    this.commandHistory = new CommandHistory(); // 命令执行历史（用于撤销）
    
    this.registerBuiltinCommands();
    console.log('CommandSystem 已初始化');
  }

  /**
   * 注册内置命令
   */
  registerBuiltinCommands() {
    this.registerCommand(new AddPointCommandFactory());
    this.registerCommand(new AddPolylineCommandFactory());
    this.registerCommand(new ClearCommandFactory());
    this.registerCommand(new HelpCommandFactory());
    this.registerCommand(new EditPointCommandFactory());
    
    console.log(`已注册 ${this.commandFactories.size} 个内置命令`);
  }

  /**
   * 注册命令工厂
   * @param {CommandFactory} factory 命令工厂实例
   */
  registerCommand(factory) {
    const commandName = factory.getCommandName().toLowerCase();
    this.commandFactories.set(commandName, factory);
    console.log(`命令已注册: ${commandName}`);
  }

  /**
   * 解析并执行命令
   * @param {string} input 用户输入
   * @param {Object} context 上下文对象
   * @returns {Object} 命令执行结果
   */
  parseAndExecute(input, context) {
    const trimmed = input.trim();
    
    console.log('CommandSystem.parseAndExecute:', { 
      input: trimmed, 
      hasCurrentHandler: !!this.currentHandler,
      currentHandler: this.currentHandler?.commandName 
    });

    // 如果没有输入且没有当前处理器，返回错误
    if (!trimmed && !this.currentHandler) {
      return { success: false, message: '请输入命令' };
    }

    // 如果有当前处理器，将输入传递给它
    if (this.currentHandler && !this.currentHandler.isCompleted()) {
      console.log('传递输入给当前命令处理器:', this.currentHandler.commandName);
      
      const result = this.currentHandler.handleInput(input);
      
      console.log('命令处理器结果:', result);
      console.log('处理器是否完成:', this.currentHandler.isCompleted());
      
      // 如果处理器完成，清除当前处理器
      if (this.currentHandler.isCompleted()) {
        console.log('命令处理器已完成，清除当前处理器');
        
        // 如果成功且有命令实例，添加到历史记录
        if (result.success && result.command) {
          this.commandHistory.addCommand(result.command);
        }
        
        this.currentHandler = null;
      }
      
      return result;
    }

    // 解析新命令
    const parts = trimmed.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const factory = this.commandFactories.get(commandName);
    if (!factory) {
      return { 
        success: false, 
        message: `未知命令: ${commandName}。输入 Help 查看可用命令。` 
      };
    }

    try {
      // 添加命令注册表到上下文中（用于Help命令）
      const enhancedContext = {
        ...context,
        commandRegistry: this.commandFactories,
        commandHistory: this.commandHistory
      };

      // 创建新的命令处理器
      this.currentHandler = factory.createHandler(enhancedContext);
      
      // 记录输入历史
      if (trimmed !== this.inputHistory[this.inputHistory.length - 1]) {
        this.inputHistory.push(trimmed);
        // 限制历史记录大小
        if (this.inputHistory.length > 100) {
          this.inputHistory.shift();
        }
      }
      
      // 启动命令处理器
      const result = this.currentHandler.start();
      
      console.log('新命令处理器启动结果:', result);
      console.log('处理器是否完成:', this.currentHandler.isCompleted());
      
      // 如果处理器立即完成，清除当前处理器
      if (this.currentHandler.isCompleted()) {
        console.log('新命令处理器立即完成，清除当前处理器');
        
        // 如果成功且有命令实例，添加到历史记录
        if (result.success && result.command) {
          this.commandHistory.addCommand(result.command);
        }
        
        this.currentHandler = null;
      }

      return result;
      
    } catch (error) {
      console.error('命令执行失败:', error);
      this.currentHandler = null;
      return { 
        success: false, 
        message: '命令执行失败: ' + error.message 
      };
    }
  }

  /**
   * 取消当前命令
   * @returns {Object} 取消结果
   */
  cancelCurrentCommand() {
    if (this.currentHandler) {
      this.currentHandler.cancel();
      const result = this.currentHandler.getResult();
      this.currentHandler = null;
      return result;
    }
    return { 
      success: false, 
      message: '没有正在执行的命令' 
    };
  }

  /**
   * 处理地图点击事件
   * @param {Object} coord 坐标对象
   * @returns {Object} 处理结果
   */
  handleMapClick(coord) {
    if (this.currentHandler && this.currentHandler.isWaitingForMapClick()) {
      const result = this.currentHandler.handleMapClick(coord);
      
      console.log('地图点击处理结果:', result);
      console.log('处理器是否完成:', this.currentHandler.isCompleted());
      
      // 如果处理器完成，清除当前处理器
      if (this.currentHandler.isCompleted()) {
        console.log('地图点击后命令完成，清除当前处理器');
        
        // 如果成功且有命令实例，添加到历史记录
        if (result.success && result.command) {
          this.commandHistory.addCommand(result.command);
        }
        
        this.currentHandler = null;
      }
      
      return result;
    }
    
    return { 
      success: false, 
      message: '当前没有命令等待地图点击' 
    };
  }

  /**
   * 撤销上一个命令
   * @returns {Object} 撤销结果
   */
  undo() {
    const success = this.commandHistory.undo();
    return {
      success: success,
      message: success ? '命令已撤销' : '没有可撤销的命令'
    };
  }

  /**
   * 重做下一个命令
   * @returns {Object} 重做结果
   */
  redo() {
    const success = this.commandHistory.redo();
    return {
      success: success,
      message: success ? '命令已重做' : '没有可重做的命令'
    };
  }

  /**
   * 获取当前命令状态
   * @returns {Object} 命令状态
   */
  getCurrentCommandStatus() {
    if (!this.currentHandler) {
      return { 
        hasCommand: false, 
        placeholder: '输入命令 (例如: AddPoint, AddPolyline)',
        commandName: null,
        isWaitingForMapClick: false
      };
    }

    // 🔧 关键修复：直接使用处理器的 getPlaceholder 方法
    const placeholder = this.currentHandler.getPlaceholder();
    
    return {
      hasCommand: true,
      commandName: this.currentHandler.constructor.name,
      placeholder: placeholder, // 🔧 使用处理器生成的占位符
      isWaitingForMapClick: this.currentHandler.isWaitingForMapClick()
    };
  }

  /**
   * 获取所有可用命令
   * @returns {Array} 命令列表
   */
  getAvailableCommands() {
    return Array.from(this.commandFactories.entries()).map(([name, factory]) => ({
      name: name,
      description: factory.getDescription()
    }));
  }

  /**
   * 获取输入历史
   * @returns {Array} 输入历史记录
   */
  getInputHistory() {
    return [...this.inputHistory];
  }

  /**
   * 获取命令执行历史信息
   * @returns {Object} 历史信息
   */
  getCommandHistoryInfo() {
    return this.commandHistory.getInfo();
  }

  /**
   * 清空所有历史记录
   */
  clearHistory() {
    this.inputHistory = [];
    this.commandHistory.clear();
  }

  /**
   * 获取系统统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const historyInfo = this.commandHistory.getInfo();
    
    return {
      registeredCommands: this.commandFactories.size,
      availableCommands: Array.from(this.commandFactories.keys()),
      hasActiveCommand: !!this.currentHandler,
      activeCommand: this.currentHandler?.commandName,
      inputHistorySize: this.inputHistory.length,
      commandHistorySize: historyInfo.totalCommands,
      canUndo: historyInfo.canUndo,
      canRedo: historyInfo.canRedo
    };
  }
}

export default CommandSystem;