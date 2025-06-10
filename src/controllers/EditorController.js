import CzmlModel from '../models/CzmlModel.js';
import PointModel from '../models/PointModel.js';
import MapView from '../views/MapView.js';
import UIView from '../views/UIView.js';
import CommandSystem from '../commands/CommandSystem.js';

/**
 * 编辑器控制器
 * 协调Model和View之间的交互，处理用户操作
 * 更新为支持Rhino风格的命令行交互
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
    
    // 命令历史管理
    this.commandHistory = [];
    this.historyIndex = -1;
    
    this.init();
  }

  /**
   * 初始化控制器
   */
  init() {
    this.setupModelListeners();
    this.setupViewListeners();
    this.setupMapListeners();
    this.updateUI();
    
    // 聚焦到命令输入框
    setTimeout(() => {
      this.uiView.focusCommandInput();
    }, 100);
    
    console.log('编辑器控制器初始化完成 - 命令行模式');
  }

  /**
   * 设置Model监听器（观察者模式）
   */
  setupModelListeners() {
    // 当CZML数据变化时，自动更新地图显示
    this.czmlModel.addListener((czmlDocument) => {
      this.mapView.updateFromCzml(czmlDocument);
      this.updatePointsList();
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

    // 输入变化（用于实时更新占位符等）
    this.uiView.addListener('inputChange', (value) => {
      this.handleInputChange(value);
    });
  }

  /**
   * 设置地图监听器
   */
  setupMapListeners() {
    // 初始时不启用地图点击，只有命令需要时才启用
    // this.mapView.enableMapClickToAddPoint 会在需要时调用
  }

  /**
   * 处理命令输入
   * @param {string} command 用户输入的命令
   */
  handleCommand(command) {
    if (!command.trim()) return;

    // 显示用户输入的命令
    this.uiView.addOutput(`> ${command}`, 'command');

    // 添加到历史记录
    if (command.trim() !== this.commandHistory[this.commandHistory.length - 1]) {
      this.commandHistory.push(command.trim());
    }
    this.historyIndex = this.commandHistory.length;

    // 执行命令
    const context = {
      czmlModel: this.czmlModel,
      mapView: this.mapView,
      uiView: this.uiView
    };

    const result = this.commandSystem.parseAndExecute(command, context);
    
    // 处理命令结果
    this.handleCommandResult(result);
    
    // 更新UI状态
    this.updateCommandInputState();
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

    // 如果需要更新输入框（无论是否有坐标字符串）
    if (result.updateInput) {
      this.updateCommandInputState();
    }

    // 如果命令完成，清空输入框并禁用地图交互
    if (result.success && !result.needsMapClick && !result.needsConfirm) {
      this.uiView.updateCommandInput('');
      this.disableMapInteraction();
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
    
    // 禁用地图交互并隐藏临时点
    this.disableMapInteraction();
    this.mapView.hideTemporaryPoint();
  }

  /**
   * 处理历史命令导航
   * @param {number} direction 方向 (-1: 上一个, 1: 下一个)
   */
  handleHistoryNavigation(direction) {
    if (this.commandHistory.length === 0) return;

    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length;
      this.uiView.updateCommandInput('');
      return;
    }

    const command = this.commandHistory[this.historyIndex];
    this.uiView.updateCommandInput(command);
  }

  /**
   * 处理输入变化
   * @param {string} value 当前输入值
   */
  handleInputChange(value) {
    // 这里可以添加实时验证或提示逻辑
    // 例如：实时验证坐标格式等
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
    // 检查是否有活动命令
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    if (!commandStatus.hasCommand) {
      return;
    }

    // 获取当前输入框的值
    const currentInput = this.uiView.commandInput ? this.uiView.commandInput.value : '';
    
    if (!currentInput.trim()) {
      this.uiView.addOutput('右键确认：没有可执行的内容', 'info');
      return;
    }

    // 显示右键确认的执行信息
    this.uiView.addOutput(`> ${currentInput} (右键确认)`, 'command');
    
    // 执行命令
    const context = {
      czmlModel: this.czmlModel,
      mapView: this.mapView,
      uiView: this.uiView
    };

    const result = this.commandSystem.parseAndExecute(currentInput, context);
    
    // 处理命令结果
    this.handleCommandResult(result);
    
    // 更新UI状态
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
      // 如果没有活动命令需要地图交互，忽略点击
      return;
    }

    // 验证坐标
    if (!PointModel.validateCoordinate(coord)) {
      this.uiView.addOutput('坐标无效，请重新选择位置', 'error');
      return;
    }

    // 将点击事件传递给命令系统
    const result = this.commandSystem.handleMapClick(coord);
    
    if (result.success) {
      // 显示临时预览点（每次点击都更新预览点位置）
      this.mapView.showTemporaryPoint(coord);
      
      // 处理命令结果
      this.handleCommandResult(result);
      
      // 强制更新输入状态，确保占位符反映当前坐标
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
      this.uiView.updateCommandInput(
        this.uiView.commandInput ? this.uiView.commandInput.value : '',
        status.placeholder
      );
    } else {
      this.uiView.updateCommandInput('', '输入命令 (例如: AddPoint)');
    }
  }

  /**
   * 更新UI显示
   */
  updateUI() {
    this.updatePointsList();
  }

  /**
   * 更新点列表显示
   */
  updatePointsList() {
    const points = this.czmlModel.getAllPoints();
    this.uiView.updatePointsList(points);
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
   * 加载CZML数据
   * @param {Array} czmlData CZML文档数组
   */
  loadCzmlData(czmlData) {
    try {
      // 清除现有数据
      this.czmlModel.clearAllPoints();
      
      // 遍历CZML数据，添加点
      if (Array.isArray(czmlData)) {
        let loadedCount = 0;
        czmlData.forEach(entity => {
          if (entity.position && entity.point && entity.id !== 'document') {
            const coords = entity.position.cartographicDegrees;
            if (coords && coords.length >= 3) {
              this.czmlModel.addPoint({
                lon: coords[0],
                lat: coords[1],
                height: coords[2]
              });
              loadedCount++;
            }
          }
        });
        
        this.uiView.addOutput(`CZML数据加载成功！加载了 ${loadedCount} 个点`, 'success');
      }
      
      console.log('CZML数据加载成功');
      
    } catch (error) {
      console.error('加载CZML数据失败:', error);
      this.uiView.addOutput('加载数据失败: ' + error.message, 'error');
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息对象
   */
  getStatistics() {
    const points = this.czmlModel.getAllPoints();
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    
    return {
      totalPoints: points.length,
      czmlSize: JSON.stringify(this.getCzmlData()).length,
      hasActiveCommand: commandStatus.hasCommand,
      activeCommand: commandStatus.commandName || null,
      commandHistoryLength: this.commandHistory.length
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
   * 获取可用命令列表
   * @returns {Array} 命令列表
   */
  getAvailableCommands() {
    return this.commandSystem.getAvailableCommands();
  }

  /**
   * 获取命令历史
   * @returns {Array} 命令历史
   */
  getCommandHistory() {
    return [...this.commandHistory];
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