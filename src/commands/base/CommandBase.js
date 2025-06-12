/**
 * 命令基类
 * 表示一个可执行、可撤销的操作
 * 这是实际修改数据的命令，支持撤销/重做
 */
export class Command {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.executed = false;
    this.timestamp = Date.now();
  }

  /**
   * 执行命令
   * @returns {boolean} 是否执行成功
   */
  execute() {
    throw new Error('子类必须实现 execute 方法');
  }

  /**
   * 撤销命令
   * @returns {boolean} 是否撤销成功
   */
  undo() {
    throw new Error('子类必须实现 undo 方法');
  }

  /**
   * 重做命令
   * @returns {boolean} 是否重做成功
   */
  redo() {
    if (this.executed) {
      console.warn('命令已经执行，无需重做');
      return false;
    }
    return this.execute();
  }

  /**
   * 验证命令是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    return true;
  }

  /**
   * 获取命令描述
   * @returns {string} 命令描述
   */
  getDescription() {
    return this.description;
  }

  /**
   * 获取命令名称
   * @returns {string} 命令名称
   */
  getName() {
    return this.name;
  }
}

/**
 * 命令处理器基类
 * 处理用户交互，收集参数，最终创建并执行Command
 * 这是交互式的处理器，负责用户界面交互
 */
export class CommandHandler {
  constructor(commandName, context) {
    this.commandName = commandName;
    this.context = context;
    this.completed = false;
    this.cancelled = false;
    this.result = null;
    this.waitingForMapClick = false;
    this.collectingData = true; // 是否正在收集数据
  }

  /**
   * 开始处理命令（初始化）
   * @returns {Object} 初始结果
   */
  start() {
    this.result = {
      success: true,
      message: `开始执行 ${this.commandName} 命令`,
      needsMapClick: false,
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
    throw new Error('子类必须实现 handleInput 方法');
  }

  /**
   * 处理地图点击
   * @param {Object} coord 坐标对象 {lon, lat, height}
   * @returns {Object} 处理结果
   */
  handleMapClick(coord) {
    return { 
      success: false, 
      message: `${this.commandName} 命令不支持地图点击` 
    };
  }

  /**
   * 获取输入框占位符文本
   * @returns {string} 占位符文本
   */
  getPlaceholder() {
    return '输入参数或按ESC取消';
  }

  /**
   * 是否正在等待地图点击
   * @returns {boolean} 是否等待地图点击
   */
  isWaitingForMapClick() {
    return this.waitingForMapClick;
  }

  /**
   * 命令是否已完成
   * @returns {boolean} 是否已完成
   */
  isCompleted() {
    return this.completed || this.cancelled;
  }

  /**
   * 获取命令结果
   * @returns {Object} 命令结果
   */
  getResult() {
    return this.result || { success: false, message: '命令未完成' };
  }

  /**
   * 取消命令
   */
  cancel() {
    this.cancelled = true;
    this.waitingForMapClick = false;
    this.collectingData = false;
    this.result = { 
      success: true, 
      message: `${this.commandName} 命令已取消`,
      needsMapClick: false,
      needsConfirm: false
    };
    this.onCancel();
  }

  /**
   * 完成命令处理，创建并执行实际的Command
   * @param {*} data 收集到的数据
   * @returns {Object} 执行结果
   */
  finish(data) {
    try {
      const command = this.createCommand(data);
      if (!command || !command.isValid()) {
        throw new Error('创建的命令无效');
      }

      const success = command.execute();
      if (success) {
        // 将命令添加到撤销历史（如果有撤销系统的话）
        this.addToHistory(command);
        
        this.completed = true;
        this.collectingData = false;
        this.waitingForMapClick = false;
        
        this.result = {
          success: true,
          message: `${this.commandName} 执行成功: ${command.getDescription()}`,
          command: command,
          needsMapClick: false,
          needsConfirm: false
        };
      } else {
        throw new Error('命令执行失败');
      }
    } catch (error) {
      this.completed = true;
      this.collectingData = false;
      this.waitingForMapClick = false;
      
      this.result = {
        success: false,
        message: `${this.commandName} 执行失败: ${error.message}`,
        needsMapClick: false,
        needsConfirm: false
      };
    }
    
    this.onFinish();
    return this.result;
  }

  /**
   * 创建具体的Command实例（子类实现）
   * @param {*} data 收集到的数据
   * @returns {Command} Command实例
   */
  createCommand(data) {
    throw new Error('子类必须实现 createCommand 方法');
  }

  /**
   * 将命令添加到历史记录
   * @param {Command} command 命令实例
   */
  addToHistory(command) {
    // 这里可以连接到撤销/重做系统
    if (this.context.commandHistory) {
      this.context.commandHistory.addCommand(command);
    }
  }

  /**
   * 取消时的清理工作（子类可重写）
   */
  onCancel() {
    // 子类可以重写此方法进行特定的清理工作
  }

  /**
   * 完成时的清理工作（子类可重写）
   */
  onFinish() {
    // 子类可以重写此方法进行特定的清理工作
  }

  /**
   * 验证坐标格式
   * @param {string} input 输入字符串
   * @returns {boolean} 是否为坐标格式
   */
  isCoordinateInput(input) {
    return /^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/.test(input.trim());
  }

  /**
   * 解析坐标字符串
   * @param {string} input 坐标字符串 "lon,lat,height"
   * @returns {Object|null} 坐标对象或null
   */
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
 * 命令工厂基类
 * 负责创建CommandHandler实例
 */
export class CommandFactory {
  constructor(commandName, description) {
    this.commandName = commandName;
    this.description = description;
  }

  /**
   * 创建命令处理器
   * @param {Object} context 上下文对象
   * @returns {CommandHandler} 命令处理器实例
   */
  createHandler(context) {
    throw new Error('子类必须实现 createHandler 方法');
  }

  /**
   * 获取命令名称
   * @returns {string} 命令名称
   */
  getCommandName() {
    return this.commandName;
  }

  /**
   * 获取命令描述
   * @returns {string} 命令描述
   */
  getDescription() {
    return this.description;
  }
}