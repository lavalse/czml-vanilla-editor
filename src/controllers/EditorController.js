import CzmlModel from '../models/CzmlModel.js';
import GeometryUtils from '../utils/GeometryUtils.js';
import MapView from '../views/MapView.js';
import UIView from '../views/UIView.js';
import CommandSystem from '../commands/CommandSystem.js';

/**
 * 编辑器控制器
 * 协调Model和View之间的交互，处理用户操作
 * 支持新的命令系统架构和撤销/重做功能
 */
class EditorController {
  constructor(mapContainerId, uiPanelId) {
    // 初始化Model
    this.czmlModel = new CzmlModel();
    
    // 初始化View
    this.mapView = new MapView(mapContainerId);
    this.uiView = new UIView(uiPanelId);
    
    // 初始化命令系统
    this.commandSystem = new CommandSystem();
    
    // 用户输入历史管理（用于界面历史导航）
    this.inputHistory = [];
    this.historyIndex = -1;
    
    this.init();
  }

  /**
   * 初始化控制器
   */
  init() {
    this.setupModelListeners();
    this.setupViewListeners();
    this.setupKeyboardShortcuts();
    this.updateUI();
    
    // 聚焦到命令输入框
    setTimeout(() => {
      this.uiView.focusCommandInput();
    }, 100);
    
    console.log('编辑器控制器初始化完成 - 新命令系统架构');
    this.showSystemInfo();
  }

  /**
   * 显示系统信息
   */
  showSystemInfo() {
    const stats = this.commandSystem.getStatistics();
    console.log('命令系统统计:', stats);
    
    this.uiView.addOutput(`系统已就绪！已注册 ${stats.registeredCommands} 个命令`, 'success');
    this.uiView.addOutput(`可用命令: ${stats.availableCommands.join(', ')}`, 'info');
    this.uiView.addOutput(`输入 Help 查看详细帮助`, 'info');
  }

  /**
   * 设置Model监听器（观察者模式）
   */
  setupModelListeners() {
    // 当CZML数据变化时，自动更新地图显示
    this.czmlModel.addListener((czmlDocument) => {
      this.mapView.updateFromCzml(czmlDocument);
      this.updateGeometryList();
    });
  }

  /**
   * 设置View监听器
   */
  setupViewListeners() {
    // 命令执行
    this.uiView.addListener('executeCommand', (command) => {
      this.handleCommand(command);
    });

    // 取消命令
    this.uiView.addListener('cancelCommand', () => {
      this.handleCancelCommand();
    });

    // 历史导航
    this.uiView.addListener('navigateHistory', (direction) => {
      this.handleHistoryNavigation(direction);
    });

    // 输入变化
    this.uiView.addListener('inputChange', (value) => {
      this.handleInputChange(value);
    });

    // CZML更新请求
    this.uiView.addListener('requestCzmlUpdate', () => {
      this.updateCzmlDisplay();
    });

    // 导出CZML
    this.uiView.addListener('exportCzml', () => {
      this.exportCzml();
    });

    // 更新CZML数据
    this.uiView.addListener('updateCzmlData', (czmlData) => {
      this.updateCzmlData(czmlData);
    });
  }

  /**
   * 设置键盘快捷键
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Z: 撤销
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.handleUndo();
      }
      // Ctrl+Y 或 Ctrl+Shift+Z: 重做
      else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.handleRedo();
      }
      // Ctrl+H: 显示命令历史
      else if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        this.showCommandHistory();
      }
    });
  }

  /**
   * 处理命令输入
   * @param {string} command 用户输入的命令
   */
  handleCommand(command) {
    // 处理空输入
    if (!command.trim()) {
      const commandStatus = this.commandSystem.getCurrentCommandStatus();
      if (commandStatus.hasCommand) {
        // 有活动命令时，空输入传递给命令系统
        const context = this.createContext();
        const result = this.commandSystem.parseAndExecute('', context);
        this.handleCommandResult(result);
        this.handleInputClearance(result);
        this.updateCommandInputState();
      }
      return;
    }

    // 显示用户输入的命令
    this.uiView.addOutput(`> ${command}`, 'command');

    // 添加到历史记录
    if (command.trim() !== this.inputHistory[this.inputHistory.length - 1]) {
      this.inputHistory.push(command.trim());
      // 限制历史记录大小
      if (this.inputHistory.length > 50) {
        this.inputHistory.shift();
      }
    }
    this.historyIndex = this.inputHistory.length;

    // 执行命令
    const context = this.createContext();
    const result = this.commandSystem.parseAndExecute(command, context);
    
    // 处理命令结果
    this.handleCommandResult(result);
    this.handleInputClearance(result);
    this.updateCommandInputState();
    this.updateStatusBar(); // 更新状态栏
  }

  /**
   * 创建命令执行上下文
   * @returns {Object} 上下文对象
   */
  createContext() {
    return {
      czmlModel: this.czmlModel,
      mapView: this.mapView,
      uiView: this.uiView,
      editorController: this
    };
  }

  /**
   * 处理命令结果
   * @param {Object} result 命令执行结果
   */
  handleCommandResult(result) {
    if (result.message) {
      const messageType = result.success ? 'success' : 'error';
      this.uiView.addOutput(result.message, messageType);
    }

    // 根据命令结果控制地图交互
    if (result.needsMapClick) {
      this.enableMapInteraction();
    } else if (result.success && !result.needsConfirm) {
      this.disableMapInteraction();
    }

    // 如果命令返回了坐标字符串，更新输入框
    if (result.coordString) {
      this.uiView.updateCommandInput(result.coordString);
    }

    // 如果需要更新输入框
    if (result.updateInput) {
      this.updateCommandInputState();
    }
  }

  /**
   * 处理输入框清空逻辑
   * @param {Object} result 命令执行结果
   */
  handleInputClearance(result) {
    // 如果命令立即完成（不需要进一步交互），清空输入框
    if (result.success && !result.needsMapClick && !result.needsConfirm) {
      this.uiView.updateCommandInput('', '输入命令 (例如: AddPoint, AddPolyline)');
      this.disableMapInteraction();
      return;
    }

    // 如果命令开始等待地图点击，清空输入框但保持命令状态
    if (result.success && result.needsMapClick && !result.coordString) {
      this.uiView.updateCommandInput('');
      return;
    }

    // 如果命令失败，清空输入框并重置为初始状态
    if (!result.success) {
      this.uiView.updateCommandInput('', '输入命令 (例如: AddPoint, AddPolyline)');
      return;
    }
  }

  /**
   * 处理取消命令
   */
  handleCancelCommand() {
    const result = this.commandSystem.cancelCurrentCommand();
    
    if (result.message) {
      this.uiView.addOutput(result.message, result.success ? 'info' : 'error');
    }
    
    // 清空输入框并重置状态
    this.uiView.updateCommandInput('');
    this.updateCommandInputState();
    
    // 禁用地图交互并隐藏临时预览
    this.disableMapInteraction();
    this.mapView.hideTemporaryPoint();
    this.mapView.hideTemporaryPolyline();
  }

  /**
   * 处理撤销操作
   */
  handleUndo() {
    const result = this.commandSystem.undo();
    this.uiView.addOutput(result.message, result.success ? 'success' : 'info');
    
    if (result.success) {
      console.log('撤销操作成功');
    }
  }

  /**
   * 处理重做操作
   */
  handleRedo() {
    const result = this.commandSystem.redo();
    this.uiView.addOutput(result.message, result.success ? 'success' : 'info');
    
    if (result.success) {
      console.log('重做操作成功');
    }
  }

  /**
   * 显示命令历史
   */
  showCommandHistory() {
    const historyInfo = this.commandSystem.getCommandHistoryInfo();
    
    if (historyInfo.totalCommands === 0) {
      this.uiView.addOutput('命令历史为空', 'info');
      return;
    }
    
    let historyText = `命令历史 (${historyInfo.totalCommands} 个命令):\n`;
    historyInfo.commands.forEach((cmd, index) => {
      const marker = index <= historyInfo.currentIndex ? '✓' : '○';
      historyText += `  ${marker} ${cmd.name}: ${cmd.description}\n`;
    });
    
    historyText += `\n可撤销: ${historyInfo.canUndo ? '是' : '否'}`;
    historyText += `\n可重做: ${historyInfo.canRedo ? '是' : '否'}`;
    
    this.uiView.addOutput(historyText, 'info');
  }

  /**
   * 处理历史命令导航
   * @param {number} direction 方向 (-1: 上一个, 1: 下一个)
   */
  handleHistoryNavigation(direction) {
    if (this.inputHistory.length === 0) return;

    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.inputHistory.length) {
      this.historyIndex = this.inputHistory.length;
      this.uiView.updateCommandInput('');
      return;
    }

    const command = this.inputHistory[this.historyIndex];
    this.uiView.updateCommandInput(command);
  }

  /**
   * 处理输入变化
   * @param {string} value 当前输入值
   */
  handleInputChange(value) {
    // 这里可以添加实时验证或提示逻辑
  }

  /**
   * 启用地图交互
   */
  enableMapInteraction() {
    this.mapView.enableMapClickToAddPoint((coord) => {
      this.handleMapClick(coord);
    });
    
    // 启用右键确认功能
    this.mapView.enableRightClickConfirm(() => {
      this.handleRightClickConfirm();
    });
    
    console.log('地图交互已启用（左键选点，右键确认）');
  }

  /**
   * 禁用地图交互
   */
  disableMapInteraction() {
    this.mapView.disableMapClick();
    this.mapView.disableRightClickConfirm();
    console.log('地图交互已禁用');
  }

  /**
   * 处理右键确认
   */
  handleRightClickConfirm() {
    console.log('右键确认被触发');
    
    // 检查是否有活动命令
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    if (!commandStatus.hasCommand) {
      this.uiView.addOutput('右键确认：当前没有活动命令', 'info');
      return;
    }

    // 显示右键确认的执行信息
    this.uiView.addOutput('> 右键确认完成操作', 'command');
    
    // 执行空命令（表示确认）
    const context = this.createContext();
    const result = this.commandSystem.parseAndExecute('', context);
    
    console.log('右键确认命令结果:', result);
    
    // 处理命令结果
    this.handleCommandResult(result);
    this.handleInputClearance(result);
    this.updateCommandInputState();
  }

  /**
   * 处理地图点击事件
   * @param {Object} coord 点击位置的坐标
   */
  handleMapClick(coord) {
    // 只有当前有命令且命令需要地图交互时才处理点击
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    if (!commandStatus.hasCommand || !commandStatus.isWaitingForMapClick) {
      return;
    }

    // 验证坐标
    if (!GeometryUtils.validateCoordinate(coord)) {
      this.uiView.addOutput('坐标无效，请重新选择位置', 'error');
      return;
    }

    // 将点击事件传递给命令系统
    const result = this.commandSystem.handleMapClick(coord);
    
    if (result.success) {
      // 对于AddPoint命令，显示临时预览点
      if (commandStatus.commandName === 'AddPointCommandHandler') {
        this.mapView.showTemporaryPoint(coord);
      }
      // 对于AddPolyline命令，MapView会自动处理临时预览
      
      // 处理命令结果
      this.handleCommandResult(result);
      
      // 强制更新输入状态
      this.updateCommandInputState();
    } else {
      this.uiView.addOutput(result.message || '地图点击处理失败', 'error');
    }
  }

  /**
   * 更新命令输入状态
   */
  updateCommandInputState() {
    const status = this.commandSystem.getCurrentCommandStatus();
    
    if (status.hasCommand) {
      // 有活动命令时，使用命令提供的占位符
      this.uiView.updateCommandInput(
        this.uiView.commandInput ? this.uiView.commandInput.value : '',
        status.placeholder
      );
    } else {
      // 没有活动命令时，显示默认占位符
      this.uiView.updateCommandInput(
        this.uiView.commandInput ? this.uiView.commandInput.value : '', 
        '输入命令 (例如: AddPoint, AddPolyline)'
      );
    }
  }

  /**
   * 更新UI显示
   */
  updateUI() {
    this.updateGeometryList();
    this.updateStatusBar();
  }

  /**
   * 更新状态栏
   */
  updateStatusBar() {
    const stats = this.getStatistics();
    if (this.uiView.updateStatusBar) {
      this.uiView.updateStatusBar(stats);
    }
  }

  /**
   * 更新几何实体列表显示
   */
  updateGeometryList() {
    const points = this.czmlModel.getAllPoints();
    const polylines = this.czmlModel.getAllPolylines();
    const allGeometries = this.czmlModel.getAllGeometries();
    const czmlData = this.czmlModel.getCzmlDocument();
    
    // 更新显示，传入所有几何实体
    this.uiView.updatePointsList(allGeometries, czmlData);
  }

  /**
   * 更新CZML数据
   * @param {Array} czmlData 新的CZML数据
   */
  updateCzmlData(czmlData) {
    try {
      // 验证CZML数据结构
      if (!Array.isArray(czmlData) || czmlData.length === 0) {
        throw new Error('CZML数据必须是非空数组');
      }

      // 验证document包
      if (!czmlData[0].id || czmlData[0].id !== 'document') {
        throw new Error('CZML数组的第一个元素必须是document包');
      }

      // 清空命令历史（因为数据被外部修改）
      this.commandSystem.clearHistory();

      // 直接替换模型中的CZML文档
      this.czmlModel.czmlDocument = [...czmlData];
      
      // 重置ID计数器，基于现有数据
      let maxPointId = 0;
      let maxPolylineId = 0;
      
      czmlData.forEach(entity => {
        if (entity.id && entity.id.startsWith('point-')) {
          const idNum = parseInt(entity.id.replace('point-', ''));
          if (!isNaN(idNum) && idNum > maxPointId) {
            maxPointId = idNum;
          }
        } else if (entity.id && entity.id.startsWith('polyline-')) {
          const idNum = parseInt(entity.id.replace('polyline-', ''));
          if (!isNaN(idNum) && idNum > maxPolylineId) {
            maxPolylineId = idNum;
          }
        }
      });
      
      this.czmlModel.idCounter = maxPointId + 1;
      this.czmlModel.polylineIdCounter = maxPolylineId + 1;

      // 通知监听器数据已变化
      this.czmlModel.notifyListeners();

      this.uiView.addOutput('CZML数据更新成功！命令历史已重置', 'success');
      console.log('CZML数据已更新:', czmlData);

    } catch (error) {
      console.error('更新CZML数据失败:', error);
      this.uiView.addOutput(`更新失败: ${error.message}`, 'error');
    }
  }

  updateCzmlDisplay() {
    const czmlData = this.czmlModel.getCzmlDocument();
    this.uiView.updateCzmlDisplay(czmlData);
  }

  /**
   * 获取当前CZML数据（供外部使用）
   * @returns {Array} CZML文档
   */
  getCzmlData() {
    return this.czmlModel.getCzmlDocument();
  }

  /**
   * 导出CZML文件
   */
  exportCzml() {
    try {
      const czmlData = this.getCzmlData();
      const jsonString = JSON.stringify(czmlData, null, 2);
      
      // 创建下载链接
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'editor-output.czml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      this.uiView.addOutput('CZML文件导出成功！', 'success');
      console.log('CZML导出成功');
      
    } catch (error) {
      console.error('导出CZML失败:', error);
      this.uiView.addOutput('导出失败: ' + error.message, 'error');
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息对象
   */
  getStatistics() {
    const points = this.czmlModel.getAllPoints();
    const polylines = this.czmlModel.getAllPolylines();
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    const commandStats = this.commandSystem.getStatistics();
    const historyInfo = this.commandSystem.getCommandHistoryInfo();
    
    return {
      // 几何数据统计
      totalPoints: points.length,
      totalPolylines: polylines.length,
      totalGeometries: points.length + polylines.length,
      czmlSize: JSON.stringify(this.getCzmlData()).length,
      
      // 命令系统统计
      registeredCommands: commandStats.registeredCommands,
      hasActiveCommand: commandStatus.hasCommand,
      activeCommand: commandStatus.commandName || null,
      
      // 历史统计
      inputHistoryLength: this.inputHistory.length,
      commandHistoryLength: historyInfo.totalCommands,
      canUndo: historyInfo.canUndo,
      canRedo: historyInfo.canRedo
    };
  }

  /**
   * 执行命令（编程接口）
   * @param {string} command 要执行的命令
   */
  executeCommand(command) {
    this.handleCommand(command);
  }

  /**
   * 撤销操作（编程接口）
   */
  undo() {
    this.handleUndo();
  }

  /**
   * 重做操作（编程接口）
   */
  redo() {
    this.handleRedo();
  }

  /**
   * 获取可用命令列表
   * @returns {Array} 命令列表
   */
  getAvailableCommands() {
    return this.commandSystem.getAvailableCommands();
  }

  /**
   * 获取输入历史
   * @returns {Array} 输入历史
   */
  getInputHistory() {
    return [...this.inputHistory];
  }

  /**
   * 获取命令执行历史
   * @returns {Object} 命令历史信息
   */
  getCommandHistory() {
    return this.commandSystem.getCommandHistoryInfo();
  }

  /**
   * 销毁控制器，清理资源
   */
  destroy() {
    this.mapView.destroy();
    console.log('编辑器控制器已销毁');
  }
}

export default EditorController;