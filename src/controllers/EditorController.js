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
    if (!command.trim()) {
      // 空输入，检查是否有活动命令需要处理
      const commandStatus = this.commandSystem.getCurrentCommandStatus();
      if (commandStatus.hasCommand) {
        // 有活动命令时，空输入可能表示完成操作
        const context = {
          czmlModel: this.czmlModel,
          mapView: this.mapView,
          uiView: this.uiView
        };
        
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
    
    // 根据命令结果决定是否清空输入框
    this.handleInputClearance(result);
    
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
    
    // 禁用地图交互并隐藏临时点和线
    this.disableMapInteraction();
    this.mapView.hideTemporaryPoint();
    this.mapView.hideTemporaryPolyline(); // 新增：隐藏临时polyline
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
    console.log('右键确认被触发');
    
    // 检查是否有活动命令
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    if (!commandStatus.hasCommand) {
      this.uiView.addOutput('右键确认：当前没有活动命令', 'info');
      return;
    }

    console.log('当前活动命令:', commandStatus.commandName);

    // 显示右键确认的执行信息
    this.uiView.addOutput('> 右键确认完成绘制', 'command');
    
    // 执行空命令（表示完成），注意这里传递空字符串而不是空输入
    const context = {
      czmlModel: this.czmlModel,
      mapView: this.mapView,
      uiView: this.uiView
    };

    const result = this.commandSystem.parseAndExecute('', context);
    
    console.log('右键确认命令结果:', result);
    
    // 处理命令结果
    this.handleCommandResult(result);
    
    // 处理输入框清空
    this.handleInputClearance(result);
    
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
      // 对于AddPoint命令，显示临时预览点
      if (commandStatus.commandName === 'AddPointCommandHandler') {
        this.mapView.showTemporaryPoint(coord);
      }
      // 对于AddPolyline命令，MapView会自动处理临时预览
      
      // 处理命令结果
      this.handleCommandResult(result);
      
      // 强制更新输入状态，确保占位符反映当前状态
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
    
    // 调试信息
    console.log('更新命令状态:', {
      hasCommand: status.hasCommand,
      commandName: status.commandName,
      placeholder: status.placeholder
    });
    
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
    this.updatePointsList();
  }

  /**
   * 更新点列表显示
   */
  updatePointsList() {
    const points = this.czmlModel.getAllPoints();
    const polylines = this.czmlModel.getAllPolylines(); // 新增：获取polyline
    const allGeometries = this.czmlModel.getAllGeometries(); // 新增：获取所有几何实体
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

      this.uiView.addOutput('CZML数据更新成功！', 'success');
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
   * 加载CZML数据
   * @param {Array} czmlData CZML文档数组
   */
  loadCzmlData(czmlData) {
    try {
      // 清除现有数据
      this.czmlModel.clearAllGeometries(); // 更新：清除所有几何实体
      
      // 遍历CZML数据，添加实体
      if (Array.isArray(czmlData)) {
        let loadedPointCount = 0;
        let loadedPolylineCount = 0;
        
        czmlData.forEach(entity => {
          // 处理点实体
          if (entity.position && entity.point && entity.id !== 'document') {
            const coords = entity.position.cartographicDegrees;
            if (coords && coords.length >= 3) {
              this.czmlModel.addPoint({
                lon: coords[0],
                lat: coords[1],
                height: coords[2]
              });
              loadedPointCount++;
            }
          }
          // 处理polyline实体
          else if (entity.polyline && entity.polyline.positions && entity.id !== 'document') {
            const cartographicDegrees = entity.polyline.positions.cartographicDegrees;
            if (cartographicDegrees && cartographicDegrees.length >= 6) { // 至少2个点
              const coordinates = [];
              for (let i = 0; i < cartographicDegrees.length; i += 3) {
                coordinates.push({
                  lon: cartographicDegrees[i],
                  lat: cartographicDegrees[i + 1],
                  height: cartographicDegrees[i + 2]
                });
              }
              this.czmlModel.addPolyline(coordinates);
              loadedPolylineCount++;
            }
          }
        });
        
        this.uiView.addOutput(
          `CZML数据加载成功！加载了 ${loadedPointCount} 个点和 ${loadedPolylineCount} 条线`, 
          'success'
        );
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
    const polylines = this.czmlModel.getAllPolylines();
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    
    return {
      totalPoints: points.length,
      totalPolylines: polylines.length, // 新增
      totalGeometries: points.length + polylines.length, // 新增
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