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

    this.registerCommand('AddPolyline', {
      description: '添加折线到地图',
      execute: (args, context) => {
        return new AddPolylineCommandHandler(args, context);
      }
    });

    this.registerCommand('Clear', {
      description: '清除所有几何实体（点和线）',
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
    
    console.log('CommandSystem.parseAndExecute:', { input, trimmed, hasCurrentCommand: !!this.currentCommand });
    
    if (!trimmed && !this.currentCommand) {
      return { success: false, message: '请输入命令' };
    }

    // 如果当前有正在执行的命令，将输入传递给它
    if (this.currentCommand && !this.currentCommand.isCompleted()) {
      console.log('传递输入给当前命令:', this.currentCommand.constructor.name);
      const result = this.currentCommand.handleInput(input, context);
      
      console.log('命令处理结果:', result);
      console.log('命令是否完成:', this.currentCommand.isCompleted());
      
      // 检查命令是否完成，如果完成则清除当前命令
      if (this.currentCommand.isCompleted()) {
        console.log('命令已完成，清除当前命令');
        this.currentCommand = null;
      }
      
      return result;
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
      
      // 获取初始结果
      const result = this.currentCommand.getResult();
      
      console.log('新命令初始结果:', result);
      console.log('新命令是否完成:', this.currentCommand.isCompleted());
      
      // 如果命令立即完成，清除当前命令
      if (this.currentCommand.isCompleted()) {
        console.log('新命令立即完成，清除当前命令');
        this.currentCommand = null;
      }

      return result;
      
    } catch (error) {
      console.error('命令执行失败:', error);
      this.currentCommand = null;
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
      return { hasCommand: false, placeholder: '输入命令 (例如: AddPoint, AddPolyline)' };
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
      const result = this.currentCommand.handleMapClick(coord);
      
      // 检查命令是否完成，如果完成则清除当前命令
      if (this.currentCommand.isCompleted()) {
        this.currentCommand = null;
      }
      
      return result;
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
    this.waitingForMapClick = false;
    this.result = { 
      success: true, 
      message: '命令已取消',
      needsMapClick: false
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
    this.waitingForMapClick = true;
    
    return {
      success: true,
      message: `已选择位置: ${coord.lon.toFixed(6)}, ${coord.lat.toFixed(6)}, ${coord.height.toFixed(2)}m (可继续点击更新位置或按回车确认)`,
      coordString: `${coord.lon.toFixed(6)},${coord.lat.toFixed(6)},${coord.height.toFixed(2)}`,
      needsConfirm: true,
      updateInput: true
    };
  }

  executeAddPoint(coord, context) {
    try {
      const pointId = context.czmlModel.addPoint(coord);
      this.completed = true;
      this.waitingForMapClick = false;
      this.result = {
        success: true,
        message: `点添加成功: ${pointId}`,
        pointId: pointId,
        needsMapClick: false
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
 * AddPolyline命令处理器
 * 支持多点连续输入和临时预览
 */
class AddPolylineCommandHandler extends CommandHandler {
  constructor(args, context) {
    super(args, context);
    this.coordinates = []; // 收集的坐标点
    this.waitingForMapClick = true;
    
    this.result = {
      success: true,
      message: '开始绘制折线：点击地图添加点 (至少需要2个点，按回车或右键完成)',
      needsMapClick: true
    };
  }

  handleInput(input, context) {
    const trimmed = input.trim();
    
    console.log('AddPolylineCommandHandler.handleInput:', { input, trimmed, coordinatesLength: this.coordinates.length });
    
    // 检查是否是坐标输入
    if (this.isCoordinateInput(trimmed)) {
      const coord = this.parseCoordinate(trimmed);
      if (coord) {
        return this.addCoordinatePoint(coord, context);
      } else {
        return { success: false, message: '坐标格式错误，请使用: lon,lat,height' };
      }
    }
    
    // 空输入表示完成绘制
    if (trimmed === '' || input === '') {
      console.log('空输入，尝试完成绘制');
      return this.finishPolyline(context);
    }
    
    return { 
      success: false, 
      message: `请继续点击地图添加点 (当前${this.coordinates.length}个点)，或按回车完成绘制` 
    };
  }

  handleMapClick(coord) {
    // 添加坐标点
    this.coordinates.push(coord);
    
    // 更新临时预览（通过mapView显示）
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

  addCoordinatePoint(coord, context) {
    this.coordinates.push(coord);
    
    // 更新临时预览
    if (context.mapView && context.mapView.updateTemporaryPolyline) {
      context.mapView.updateTemporaryPolyline(this.coordinates);
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

  finishPolyline(context) {
    console.log('finishPolyline被调用，当前坐标数量:', this.coordinates.length);
    
    if (this.coordinates.length < 2) {
      return {
        success: false,
        message: `折线至少需要2个点，当前只有${this.coordinates.length}个点`
      };
    }
    
    try {
      const polylineId = context.czmlModel.addPolyline(this.coordinates);
      
      // 清除临时预览
      if (context.mapView && context.mapView.hideTemporaryPolyline) {
        context.mapView.hideTemporaryPolyline();
      }
      
      this.completed = true;
      this.waitingForMapClick = false;
      this.result = {
        success: true,
        message: `折线创建成功: ${polylineId} (${this.coordinates.length}个点)`,
        polylineId: polylineId,
        needsMapClick: false,
        needsConfirm: false
      };
      
      console.log('折线创建成功:', this.result);
      return this.result;
      
    } catch (error) {
      console.error('创建折线失败:', error);
      this.completed = true;
      this.waitingForMapClick = false;
      this.result = {
        success: false,
        message: `创建折线失败: ${error.message}`,
        needsMapClick: false,
        needsConfirm: false
      };
      return this.result;
    }
  }

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

  cancel() {
    // 清除临时预览
    if (this.context.mapView && this.context.mapView.hideTemporaryPolyline) {
      this.context.mapView.hideTemporaryPolyline();
    }
    
    // 调用父类取消方法
    super.cancel();
    
    this.result.message = `折线绘制已取消 (已收集${this.coordinates.length}个点)`;
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
      // 清除所有几何实体（点和线）
      context.czmlModel.clearAllGeometries();
      
      // 清除地图上的临时预览
      if (context.mapView) {
        context.mapView.hideTemporaryPoint();
        context.mapView.hideTemporaryPolyline();
      }
      
      this.completed = true;
      this.result = {
        success: true,
        message: '所有几何实体已清除（点和线）'
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