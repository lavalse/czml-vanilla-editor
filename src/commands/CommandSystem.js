/**
 * 命令系统核心类
 * 实现Rhino风格的命令行交互
 */
class CommandSystem {
  constructor() {
    this.commands = new Map();
    this.currentCommand = null;
    this.commandHistory = [];
    this.listeners = [];
    
    this.registerBuiltinCommands();
  }

  /**
   * 注册内置命令
   */
  registerBuiltinCommands() {
    this.registerCommand('AddPoint', {
      description: '添加点到地图',
      execute: (args, context) => {
        return new AddPointCommandHandler(args, context);
      }
    });

    this.registerCommand('Clear', {
      description: '清除所有点',
      execute: (args, context) => {
        return new ClearCommandHandler(args, context);
      }
    });

    this.registerCommand('Help', {
      description: '显示帮助信息',
      execute: (args, context) => {
        return new HelpCommandHandler(args, context, this.commands);
      }
    });
  }

  /**
   * 注册命令
   * @param {string} name 命令名称
   * @param {Object} command 命令对象
   */
  registerCommand(name, command) {
    this.commands.set(name.toLowerCase(), command);
  }

  /**
   * 解析并执行命令
   * @param {string} input 用户输入
   * @param {Object} context 上下文对象
   * @returns {Object} 命令执行结果
   */
  parseAndExecute(input, context) {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return { success: false, message: '请输入命令' };
    }

    // 如果当前有正在执行的命令，将输入传递给它
    if (this.currentCommand && !this.currentCommand.isCompleted()) {
      return this.currentCommand.handleInput(input, context);
    }

    // 解析新命令
    const parts = trimmed.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (!command) {
      return { 
        success: false, 
        message: `未知命令: ${commandName}。输入 Help 查看可用命令。` 
      };
    }

    try {
      this.currentCommand = command.execute(args, context);
      this.commandHistory.push(trimmed);
      
      // 如果命令立即完成，清除当前命令
      if (this.currentCommand.isCompleted()) {
        const result = this.currentCommand.getResult();
        this.currentCommand = null;
        return result;
      }

      return this.currentCommand.getResult();
      
    } catch (error) {
      console.error('命令执行失败:', error);
      return { success: false, message: '命令执行失败: ' + error.message };
    }
  }

  /**
   * 取消当前命令
   */
  cancelCurrentCommand() {
    if (this.currentCommand) {
      this.currentCommand.cancel();
      const result = this.currentCommand.getResult();
      this.currentCommand = null;
      return result;
    }
    return { success: false, message: '没有正在执行的命令' };
  }

  /**
   * 获取当前命令状态
   */
  getCurrentCommandStatus() {
    if (!this.currentCommand) {
      return { hasCommand: false, placeholder: '输入命令 (例如: AddPoint)' };
    }

    return {
      hasCommand: true,
      commandName: this.currentCommand.constructor.name,
      placeholder: this.currentCommand.getPlaceholder(),
      isWaitingForMapClick: this.currentCommand.isWaitingForMapClick()
    };
  }

  /**
   * 处理地图点击事件
   * @param {Object} coord 坐标对象
   */
  handleMapClick(coord) {
    if (this.currentCommand && this.currentCommand.isWaitingForMapClick()) {
      return this.currentCommand.handleMapClick(coord);
    }
    return { success: false, message: '当前没有命令等待地图点击' };
  }

  /**
   * 获取命令历史
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * 获取所有可用命令
   */
  getAvailableCommands() {
    return Array.from(this.commands.entries()).map(([name, cmd]) => ({
      name: name,
      description: cmd.description
    }));
  }
}

/**
 * 命令处理器基类
 */
class CommandHandler {
  constructor(args, context) {
    this.args = args;
    this.context = context;
    this.completed = false;
    this.cancelled = false;
    this.result = null;
    this.waitingForMapClick = false;
  }

  /**
   * 处理用户输入
   * @param {string} input 用户输入
   * @param {Object} context 上下文
   */
  handleInput(input, context) {
    throw new Error('子类必须实现 handleInput 方法');
  }

  /**
   * 处理地图点击
   * @param {Object} coord 坐标
   */
  handleMapClick(coord) {
    return { success: false, message: '此命令不支持地图点击' };
  }

  /**
   * 获取输入框占位符文本
   */
  getPlaceholder() {
    return '输入参数或按ESC取消';
  }

  /**
   * 是否正在等待地图点击
   */
  isWaitingForMapClick() {
    return this.waitingForMapClick;
  }

  /**
   * 命令是否已完成
   */
  isCompleted() {
    return this.completed || this.cancelled;
  }

  /**
   * 获取命令结果
   */
  getResult() {
    return this.result || { success: false, message: '命令未完成' };
  }

  /**
   * 取消命令
   */
  cancel() {
    this.cancelled = true;
    this.waitingForMapClick = false;  // 取消时停止等待地图点击
    this.result = { 
      success: true, 
      message: '命令已取消',
      needsMapClick: false  // 确保不再需要地图交互
    };
  }
}

/**
 * AddPoint命令处理器
 */
class AddPointCommandHandler extends CommandHandler {
  constructor(args, context) {
    super(args, context);
    this.currentCoord = null;
    this.waitingForMapClick = true;
    
    this.result = {
      success: true,
      message: '请点击地图选择位置，或直接输入坐标 (lon,lat,height)',
      needsMapClick: true
    };
  }

  handleInput(input, context) {
    const trimmed = input.trim();
    
    // 检查是否是坐标输入
    if (this.isCoordinateInput(trimmed)) {
      const coord = this.parseCoordinate(trimmed);
      if (coord) {
        return this.executeAddPoint(coord, context);
      } else {
        return { success: false, message: '坐标格式错误，请使用: lon,lat,height' };
      }
    }
    
    // 如果有当前坐标，回车确认
    if (this.currentCoord) {
      return this.executeAddPoint(this.currentCoord, context);
    }
    
    return { success: false, message: '请先点击地图选择位置或输入坐标' };
  }

  handleMapClick(coord) {
    this.currentCoord = coord;
    // 保持等待状态，允许用户继续点击更新位置
    this.waitingForMapClick = true;
    
    return {
      success: true,
      message: `已选择位置: ${coord.lon.toFixed(6)}, ${coord.lat.toFixed(6)}, ${coord.height.toFixed(2)}m (可继续点击更新位置或按回车确认)`,
      coordString: `${coord.lon.toFixed(6)},${coord.lat.toFixed(6)},${coord.height.toFixed(2)}`,
      needsConfirm: true,
      updateInput: true  // 新增标记，表示需要更新输入框
    };
  }

  executeAddPoint(coord, context) {
    try {
      const pointId = context.czmlModel.addPoint(coord);
      this.completed = true;
      this.waitingForMapClick = false;  // 完成后停止等待地图点击
      this.result = {
        success: true,
        message: `点添加成功: ${pointId}`,
        pointId: pointId,
        needsMapClick: false  // 命令完成，不再需要地图交互
      };
      return this.result;
    } catch (error) {
      this.completed = true;
      this.waitingForMapClick = false;
      this.result = {
        success: false,
        message: `添加点失败: ${error.message}`,
        needsMapClick: false
      };
      return this.result;
    }
  }

  getPlaceholder() {
    if (this.currentCoord) {
      return `按回车或右键确认位置 (${this.currentCoord.lon.toFixed(3)}, ${this.currentCoord.lat.toFixed(3)})，或左键重新选择`;
    }
    return '左键点击地图选择位置，或输入坐标 (lon,lat,height)';
  }

  isCoordinateInput(input) {
    return /^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/.test(input);
  }

  parseCoordinate(input) {
    try {
      const parts = input.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 3 && parts.every(p => !isNaN(p))) {
        return {
          lon: parts[0],
          lat: parts[1],
          height: parts[2]
        };
      }
    } catch (error) {
      console.error('坐标解析失败:', error);
    }
    return null;
  }
}

/**
 * Clear命令处理器
 */
class ClearCommandHandler extends CommandHandler {
  constructor(args, context) {
    super(args, context);
    
    try {
      context.czmlModel.clearAllPoints();
      this.completed = true;
      this.result = {
        success: true,
        message: '所有点已清除'
      };
    } catch (error) {
      this.completed = true;
      this.result = {
        success: false,
        message: `清除失败: ${error.message}`
      };
    }
  }

  handleInput(input, context) {
    return this.result;
  }
}

/**
 * Help命令处理器
 */
class HelpCommandHandler extends CommandHandler {
  constructor(args, context, commands) {
    super(args, context);
    
    let helpText = '可用命令:\n';
    commands.forEach((cmd, name) => {
      helpText += `  ${name}: ${cmd.description}\n`;
    });
    
    this.completed = true;
    this.result = {
      success: true,
      message: helpText
    };
  }

  handleInput(input, context) {
    return this.result;
  }
}

export default CommandSystem;