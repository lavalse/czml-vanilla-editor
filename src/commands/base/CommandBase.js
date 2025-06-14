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
 * 🔧 新增：确认状态枚举
 */
export const ConfirmationState = {
  NONE: 'none',                    // 不需要确认
  WAITING_INPUT: 'waiting_input',  // 等待用户输入
  WAITING_CONFIRM: 'waiting_confirm' // 等待确认
};

/**
 * 🔧 新增：确认方法枚举
 */
export const ConfirmationMethod = {
  ENTER_ONLY: 'enter_only',           // 只支持回车确认
  RIGHT_CLICK_ONLY: 'right_click_only', // 只支持右键确认
  BOTH: 'both'                        // 支持两种确认方式
};

/**
 * 命令处理器基类 - 增强版本，统一确认逻辑
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
    
    // 🔧 新增：统一的确认状态管理
    this.confirmationState = ConfirmationState.NONE;
    this.confirmationMethod = ConfirmationMethod.BOTH;
    this.pendingData = null; // 等待确认的数据
    this.confirmationMessage = ''; // 确认提示信息
    
    console.log(`CommandHandler 创建: ${commandName}`);
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
   * 🔧 重构：处理用户输入 - 统一处理确认逻辑
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleInput(input) {
    const trimmedInput = input.trim();
    console.log(`${this.commandName}.handleInput: "${trimmedInput}", 确认状态: ${this.confirmationState}`);
    
    // 🔧 统一确认逻辑：如果在等待确认状态
    if (this.confirmationState === ConfirmationState.WAITING_CONFIRM) {
      if (trimmedInput === '') {
        // 空输入表示确认
        console.log(`${this.commandName}: 空输入，执行回车确认`);
        return this.executeConfirmation('enter');
      } else {
        // 非空输入表示修改数据
        console.log(`${this.commandName}: 非空输入，处理确认状态下的新输入`);
        return this.handleConfirmationInput(trimmedInput);
      }
    }
    
    // 正常输入处理逻辑（委托给子类）
    return this.handleSpecificInput(trimmedInput);
  }

  /**
   * 🔧 新增：处理特定命令的输入（子类必须重写）
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleSpecificInput(input) {
    throw new Error(`${this.commandName}: 子类必须实现 handleSpecificInput 方法`);
  }

  /**
   * 🔧 新增：处理确认状态下的输入（子类可重写）
   * @param {string} input 用户输入
   * @returns {Object} 处理结果
   */
  handleConfirmationInput(input) {
    console.log(`${this.commandName}: 处理确认状态下的新输入: "${input}"`);
    
    // 默认行为：将输入作为新数据重新处理
    // 先清除确认状态，然后重新处理输入
    this.clearConfirmationState();
    return this.handleSpecificInput(input);
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
   * 🔧 新增：统一的右键确认处理
   * @returns {Object} 处理结果
   */
  handleRightClickConfirm() {
    console.log(`${this.commandName}.handleRightClickConfirm: 确认状态: ${this.confirmationState}`);
    
    if (this.confirmationState === ConfirmationState.WAITING_CONFIRM) {
      // 检查是否支持右键确认
      if (this.confirmationMethod === ConfirmationMethod.ENTER_ONLY) {
        return {
          success: false,
          message: '当前状态只支持回车确认，不支持右键确认'
        };
      }
      
      console.log(`${this.commandName}: 执行右键确认`);
      return this.executeConfirmation('right_click');
    }
    
    // 如果不在确认状态，委托给子类处理
    return this.handleSpecificRightClick();
  }

  /**
   * 🔧 新增：处理特定命令的右键点击（子类可重写）
   * @returns {Object} 处理结果
   */
  handleSpecificRightClick() {
    return {
      success: false,
      message: `${this.commandName} 命令在当前状态下不支持右键操作`
    };
  }

  /**
   * 🔧 新增：设置确认状态
   * @param {Object} config 确认配置
   */
  setConfirmationState(config) {
    this.confirmationState = config.state || ConfirmationState.WAITING_CONFIRM;
    this.confirmationMethod = config.method || ConfirmationMethod.BOTH;
    this.pendingData = config.data || null;
    this.confirmationMessage = config.message || '';
    
    console.log(`${this.commandName}: 设置确认状态 - 状态: ${this.confirmationState}, 方法: ${this.confirmationMethod}, 消息: "${this.confirmationMessage}"`);
  }

  /**
   * 🔧 新增：清除确认状态
   */
  clearConfirmationState() {
    this.confirmationState = ConfirmationState.NONE;
    this.confirmationMethod = ConfirmationMethod.BOTH;
    this.pendingData = null;
    this.confirmationMessage = '';
    
    console.log(`${this.commandName}: 清除确认状态`);
  }

  /**
   * 🔧 新增：执行确认操作
   * @param {string} method 确认方法 ('enter' | 'right_click')
   * @returns {Object} 确认结果
   */
  executeConfirmation(method) {
    console.log(`${this.commandName}: 执行确认 - 方法: ${method}, 数据: ${this.pendingData ? '有' : '无'}`);
    
    try {
      if (!this.pendingData) {
        throw new Error('没有待确认的数据');
      }
      
      // 调用子类的确认处理方法
      const result = this.onConfirm(method, this.pendingData);
      
      if (result.success) {
        // 确认成功，清除确认状态
        this.clearConfirmationState();
        console.log(`${this.commandName}: 确认成功`);
      } else {
        console.log(`${this.commandName}: 确认失败 - ${result.message}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`${this.commandName}: 确认执行异常:`, error);
      return {
        success: false,
        message: `确认失败: ${error.message}`
      };
    }
  }

  /**
   * 🔧 新增：确认处理回调（子类可重写）
   * @param {string} method 确认方法
   * @param {*} data 确认数据
   * @returns {Object} 处理结果
   */
  onConfirm(method, data) {
    console.log(`${this.commandName}.onConfirm: 方法=${method}, 使用默认确认行为`);
    
    // 默认行为：直接完成命令
    return this.finish(data);
  }

  /**
   * 🔧 增强：获取输入框占位符文本
   * @returns {string} 占位符文本
   */
  getPlaceholder() {
    // 如果在等待确认状态，显示确认提示
    if (this.confirmationState === ConfirmationState.WAITING_CONFIRM) {
      const methods = [];
      if (this.confirmationMethod === ConfirmationMethod.BOTH || 
          this.confirmationMethod === ConfirmationMethod.ENTER_ONLY) {
        methods.push('回车确认');
      }
      if (this.confirmationMethod === ConfirmationMethod.BOTH || 
          this.confirmationMethod === ConfirmationMethod.RIGHT_CLICK_ONLY) {
        methods.push('右键确认');
      }
      
      const baseMessage = this.confirmationMessage || '请确认操作';
      return `${baseMessage} (${methods.join(' 或 ')})`;
    }
    
    // 委托给子类获取特定占位符
    return this.getSpecificPlaceholder();
  }

  /**
   * 🔧 新增：获取特定命令的占位符文本（子类可重写）
   * @returns {string} 占位符文本
   */
  getSpecificPlaceholder() {
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
   * 🔧 新增：是否需要确认
   * @returns {boolean} 是否需要确认
   */
  isWaitingForConfirmation() {
    return this.confirmationState === ConfirmationState.WAITING_CONFIRM;
  }

  /**
   * 🔧 新增：获取确认方法
   * @returns {string} 确认方法
   */
  getConfirmationMethod() {
    return this.confirmationMethod;
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
    this.clearConfirmationState(); // 🔧 新增：清除确认状态
    
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
        this.clearConfirmationState(); // 🔧 新增：清除确认状态
        
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
      this.clearConfirmationState(); // 🔧 新增：清除确认状态
      
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