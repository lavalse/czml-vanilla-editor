import CzmlModel from '../models/CzmlModel.js';
import GeometryUtils from '../utils/GeometryUtils.js';
import MapView from '../views/MapView.js';
import UIView from '../views/UIView.js';
import CommandSystem from '../commands/CommandSystem.js';

/**
 * 地图交互模式枚举
 */
const MapInteractionMode = {
  NONE: 'none',                    // 无交互
  ADD_POINT: 'add_point',         // 添加点模式（点击创建点）
  ADD_POLYLINE: 'add_polyline',   // 添加折线模式（点击添加点到折线）
  SELECT_ENTITY: 'select_entity', // 选择实体模式（点击选择现有实体）
  EDIT_POINT: 'edit_point'        // 编辑点模式（先选择实体，再选择新位置）
};

/**
 * 编辑器控制器 - 最终统一地图交互架构版本
 * 核心改进：统一管理所有地图交互模式，解决模式冲突问题
 */
class EditorController {
  constructor(mapContainerId, uiPanelId) {
    this.czmlModel = new CzmlModel();
    this.mapView = new MapView(mapContainerId);
    this.uiView = new UIView(uiPanelId);
    this.commandSystem = new CommandSystem();
    
    this.inputHistory = [];
    this.historyIndex = -1;
    
    // 🔧 新增：地图交互状态管理
    this.currentMapMode = MapInteractionMode.NONE;
    this.mapInteractionCallbacks = {
      onMapClick: null,
      onEntitySelect: null,
      onRightClick: null
    };
    
    this.init();
  }

  init() {
    this.setupModelListeners();
    this.setupViewListeners();
    this.setupKeyboardShortcuts();
    this.updateUI();
    
    setTimeout(() => {
      this.uiView.focusCommandInput();
    }, 100);
    
    console.log('编辑器控制器初始化完成 - 最终统一地图交互架构版本');
    this.showSystemInfo();
  }

  showSystemInfo() {
    const stats = this.commandSystem.getStatistics();
    console.log('命令系统统计:', stats);
    
    this.uiView.addOutput(`系统已就绪！已注册 ${stats.registeredCommands} 个命令`, 'success');
    this.uiView.addOutput(`可用命令: ${stats.availableCommands.join(', ')}`, 'info');
    this.uiView.addOutput(`输入 Help 查看详细帮助`, 'info');
  }

  setupModelListeners() {
    this.czmlModel.addListener((czmlDocument) => {
      this.mapView.updateFromCzml(czmlDocument);
      this.updateGeometryList();
    });
  }

  setupViewListeners() {
    this.uiView.addListener('executeCommand', (command) => {
      this.handleCommand(command);
    });

    this.uiView.addListener('cancelCommand', () => {
      this.handleCancelCommand();
    });

    this.uiView.addListener('navigateHistory', (direction) => {
      this.handleHistoryNavigation(direction);
    });

    this.uiView.addListener('inputChange', (value) => {
      this.handleInputChange(value);
    });

    this.uiView.addListener('requestCzmlUpdate', () => {
      this.updateCzmlDisplay();
    });

    this.uiView.addListener('exportCzml', () => {
      this.exportCzml();
    });

    this.uiView.addListener('updateCzmlData', (czmlData) => {
      this.updateCzmlData(czmlData);
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.handleUndo();
      }
      else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.handleRedo();
      }
      else if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        this.showCommandHistory();
      }
    });
  }

  /**
   * 🔧 核心方法：统一更新UI状态
   * 所有状态更新都通过这个方法，避免分散管理
   */
  updateUIState() {
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    
    console.log('🔄 统一更新UI状态:', {
      hasCommand: commandStatus.hasCommand,
      commandName: commandStatus.commandName,
      placeholder: commandStatus.placeholder
    });

    if (commandStatus.hasCommand) {
      // 有活动命令：使用命令提供的占位符，保持当前输入
      const currentInput = this.uiView.commandInput ? this.uiView.commandInput.value : '';
      this.uiView.updateCommandInput(currentInput, commandStatus.placeholder);
    } else {
      // 无活动命令：清空输入框，显示默认占位符
      this.uiView.updateCommandInput('', '输入命令 (例如: AddPoint, AddPolyline)');
    }
    
    // 更新状态栏
    this.updateStatusBar();
  }

  /**
   * 🔧 简化版本：处理命令输入 - 每次处理后统一更新UI
   */
  handleCommand(command) {
    const trimmedCommand = command ? command.trim() : '';
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    
    console.log('🎯 EditorController.handleCommand:', {
      input: `"${command}"`,
      trimmed: `"${trimmedCommand}"`,
      hasActiveCommand: commandStatus.hasCommand,
      commandName: commandStatus.commandName
    });

    // 统一处理：如果有活动命令，直接传递给命令系统
    if (commandStatus.hasCommand) {
      console.log('✅ 有活动命令，传递给命令系统处理');
      
      const context = this.createContext();
      const result = this.commandSystem.parseAndExecute(command, context);
      
      this.handleCommandResult(result);
      this.updateUIState(); // 🔧 统一更新UI状态
      return;
    }

    // 空输入且没有活动命令 - 忽略
    if (!trimmedCommand) {
      console.log('🚫 空输入且无活动命令，忽略');
      return;
    }

    // 非空输入 - 启动新命令
    console.log('📝 启动新命令:', trimmedCommand);
    this.uiView.addOutput(`> ${command}`, 'command');

    // 添加到输入历史
    if (trimmedCommand !== this.inputHistory[this.inputHistory.length - 1]) {
      this.inputHistory.push(trimmedCommand);
      if (this.inputHistory.length > 50) {
        this.inputHistory.shift();
      }
    }
    this.historyIndex = this.inputHistory.length;

    // 执行新命令
    const context = this.createContext();
    const result = this.commandSystem.parseAndExecute(command, context);
    
    this.handleCommandResult(result);
    this.updateUIState(); // 🔧 统一更新UI状态
  }

  createContext() {
    return {
      czmlModel: this.czmlModel,
      mapView: this.mapView,
      uiView: this.uiView,
      editorController: this
    };
  }

  /**
   * 🔧 大幅简化：处理命令结果 - 只管理消息和地图交互
   */
  handleCommandResult(result) {
    if (result.message) {
      const messageType = result.success ? 'success' : 'error';
      this.uiView.addOutput(result.message, messageType);
    }

    console.log('🎯 处理命令结果:', result);

    // 🔧 简化：只管理地图交互，不管理输入框（由updateUIState统一管理）
    if (result.needsMapClick) {
      console.log('🗺️ 启用地图交互模式');
      this.enableMapInteraction();
    } else if (result.success && (!result.needsConfirm || result.command)) {
      console.log('🔒 命令完成或不需要确认：禁用地图交互');
      this.disableMapInteraction();
    }

    // 🔧 移除：不再在这里管理输入框状态
  }

  /**
   * 🔧 简化版本：处理取消命令
   */
  handleCancelCommand() {
    const result = this.commandSystem.cancelCurrentCommand();
    
    if (result.message) {
      this.uiView.addOutput(result.message, result.success ? 'info' : 'error');
    }
    
    this.disableAllMapInteractions();
    this.updateUIState(); // 🔧 统一更新UI状态
  }

  handleUndo() {
    const result = this.commandSystem.undo();
    this.uiView.addOutput(result.message, result.success ? 'success' : 'info');
    
    if (result.success) {
      console.log('撤销操作成功');
    }
  }

  handleRedo() {
    const result = this.commandSystem.redo();
    this.uiView.addOutput(result.message, result.success ? 'success' : 'info');
    
    if (result.success) {
      console.log('重做操作成功');
    }
  }

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

  handleInputChange(value) {
    // 可以添加实时验证或提示逻辑
  }

  // =====================================
  // 🔧 统一地图交互管理方法
  // =====================================

  /**
   * 🔧 核心方法：统一设置地图交互模式
   * @param {string} mode 交互模式
   * @param {Object} callbacks 回调函数
   */
  setMapInteractionMode(mode, callbacks = {}) {
    console.log(`🗺️ 设置地图交互模式: ${this.currentMapMode} → ${mode}`);
    
    // 先清理当前模式
    this.clearMapInteractionMode();
    
    this.currentMapMode = mode;
    this.mapInteractionCallbacks = {
      onMapClick: callbacks.onMapClick || null,
      onEntitySelect: callbacks.onEntitySelect || null,
      onRightClick: callbacks.onRightClick || null
    };
    
    // 根据模式启用相应的地图交互
    switch (mode) {
      case MapInteractionMode.ADD_POINT:
      case MapInteractionMode.ADD_POLYLINE:
        this.enablePointCreationMode();
        break;
        
      case MapInteractionMode.SELECT_ENTITY:
        this.enableEntitySelectionMode();
        break;
        
      case MapInteractionMode.EDIT_POINT:
        this.enableEditPointMode();
        break;
        
      case MapInteractionMode.NONE:
      default:
        // 已经清理，无需额外操作
        break;
    }
  }

  /**
   * 🔧 清理地图交互模式
   */
  clearMapInteractionMode() {
    console.log(`🔒 清理地图交互模式: ${this.currentMapMode}`);
    
    // 禁用所有地图交互
    this.mapView.disableMapClick();
    this.mapView.disableRightClickConfirm();
    this.mapView.disableEntitySelection();
    
    // 清理临时UI效果
    this.mapView.hideTemporaryPoint();
    this.mapView.hideTemporaryPolyline();
    this.mapView.highlightSelectablePoints(false);
    
    this.currentMapMode = MapInteractionMode.NONE;
    this.mapInteractionCallbacks = {
      onMapClick: null,
      onEntitySelect: null, 
      onRightClick: null
    };
  }

  /**
   * 🔧 启用点创建模式（AddPoint, AddPolyline）
   */
  enablePointCreationMode() {
    console.log('🔵 启用点创建模式');
    
    this.mapView.enableMapClickToAddPoint((coord) => {
      if (this.mapInteractionCallbacks.onMapClick) {
        this.mapInteractionCallbacks.onMapClick(coord);
      }
    });
    
    this.mapView.enableRightClickConfirm(() => {
      if (this.mapInteractionCallbacks.onRightClick) {
        this.mapInteractionCallbacks.onRightClick();
      } else {
        this.handleRightClickConfirm();
      }
    });
  }

  /**
   * 🔧 启用实体选择模式（EditPoint的第一阶段）
   */
  enableEntitySelectionMode() {
    console.log('🟡 启用实体选择模式');
    
    // 高亮可选择的点
    this.mapView.highlightSelectablePoints(true);
    
    this.mapView.enableEntitySelection((result) => {
      if (this.mapInteractionCallbacks.onEntitySelect) {
        this.mapInteractionCallbacks.onEntitySelect(result);
      }
    });
  }

  /**
   * 🔧 启用编辑点模式（EditPoint的第二阶段）
   */
  enableEditPointMode() {
    console.log('🟠 启用编辑点模式');
    
    this.mapView.enableMapClickToAddPoint((coord) => {
      if (this.mapInteractionCallbacks.onMapClick) {
        this.mapInteractionCallbacks.onMapClick(coord);
      }
    });
    
    this.mapView.enableRightClickConfirm(() => {
      if (this.mapInteractionCallbacks.onRightClick) {
        this.mapInteractionCallbacks.onRightClick();
      } else {
        this.handleRightClickConfirm();
      }
    });
  }

  /**
   * 🔧 替换：enableMapInteraction 方法 - 使用统一地图交互架构
   */
  enableMapInteraction() {
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    
    if (!commandStatus.hasCommand) {
      console.log('⚠️ 没有活动命令，不启用地图交互');
      return;
    }

    const handler = this.commandSystem.currentHandler;
    console.log(`🎯 为命令 ${handler.constructor.name} 启用地图交互`);
    
    // 🔧 根据命令类型和状态设置不同的交互模式
    if (handler.constructor.name === 'AddPointCommandHandler') {
      this.setMapInteractionMode(MapInteractionMode.ADD_POINT, {
        onMapClick: (coord) => this.handleMapClick(coord),
        onRightClick: () => this.handleRightClickConfirm()
      });
    } 
    else if (handler.constructor.name === 'AddPolylineCommandHandler') {
      this.setMapInteractionMode(MapInteractionMode.ADD_POLYLINE, {
        onMapClick: (coord) => this.handleMapClick(coord),
        onRightClick: () => this.handleRightClickConfirm()
      });
    }
    else if (handler.constructor.name === 'EditPointCommandHandler') {
      // 🔧 关键：EditPoint根据当前步骤决定模式
      if (handler.currentStep === 'SELECT_POINT') {
        console.log('🎯 EditPoint第一阶段：启用实体选择模式');
        this.setMapInteractionMode(MapInteractionMode.SELECT_ENTITY, {
          onEntitySelect: (result) => {
            console.log('🎯 实体选择回调被调用:', result);
            // 直接调用处理器的实体选择方法
            const handlerResult = handler.handleEntitySelection(result);
            if (handlerResult && handlerResult.success) {
              // 处理成功，更新命令结果
              this.handleCommandResult(handlerResult);
            }
            // 更新UI状态
            this.updateUIState();
            
            // 🔧 关键：如果进入第二阶段，切换地图交互模式
            if (handler.currentStep === 'SELECT_POSITION') {
              console.log('🎯 EditPoint进入第二阶段：切换到编辑点模式');
              this.setMapInteractionMode(MapInteractionMode.EDIT_POINT, {
                onMapClick: (coord) => this.handleMapClick(coord),
                onRightClick: () => this.handleRightClickConfirm()
              });
            }
          }
        });
      } else if (handler.currentStep === 'SELECT_POSITION') {
        console.log('🎯 EditPoint第二阶段：启用编辑点模式');
        this.setMapInteractionMode(MapInteractionMode.EDIT_POINT, {
          onMapClick: (coord) => this.handleMapClick(coord),
          onRightClick: () => this.handleRightClickConfirm()
        });
      }
    }
    else {
      // 默认模式：点创建模式
      console.log('🎯 使用默认的点创建模式');
      this.setMapInteractionMode(MapInteractionMode.ADD_POINT, {
        onMapClick: (coord) => this.handleMapClick(coord),
        onRightClick: () => this.handleRightClickConfirm()
      });
    }
  }

  /**
   * 🔧 替换：disableMapInteraction 方法 - 使用统一地图交互架构
   */
  disableMapInteraction() {
    console.log('🔒 禁用地图交互');
    this.setMapInteractionMode(MapInteractionMode.NONE);
  }

  /**
   * 🔧 替换：disableAllMapInteractions 方法 - 使用统一地图交互架构
   */
  disableAllMapInteractions() {
    console.log('🔒 禁用所有地图交互模式');
    this.setMapInteractionMode(MapInteractionMode.NONE);
  }

  /**
   * 🔧 统一方案：右键确认通过模拟回车实现
   * 这样所有确认都走同一个通道
   */
  handleRightClickConfirm() {
    console.log('🖱️ 控制器收到右键确认 - 转换为回车确认');
    
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    if (!commandStatus.hasCommand) {
      console.log('❌ 没有活动命令，忽略右键');
      return;
    }

    // 🔧 核心改进：右键确认 = 模拟空输入（回车确认）
    console.log('📞 右键确认转换为空输入处理');
    this.handleCommand(''); // 🔧 关键：统一通过 handleCommand 处理
  }

  /**
   * 🔧 简化版本：处理地图点击事件 - 统一更新UI
   */
  handleMapClick(coord) {
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    
    console.log('🗺️ 控制器收到地图点击:', {
      commandName: commandStatus.commandName,
      hasCommand: commandStatus.hasCommand,
      isWaitingForMapClick: commandStatus.isWaitingForMapClick,
      coord: coord
    });

    if (!commandStatus.hasCommand || !commandStatus.isWaitingForMapClick) {
      console.log('🚫 忽略地图点击：无活动命令或命令不需要地图交互');
      return;
    }

    if (!GeometryUtils.validateCoordinate(coord)) {
      this.uiView.addOutput('坐标无效，请重新选择位置', 'error');
      return;
    }

    console.log('📍 处理地图点击，命令:', commandStatus.commandName);

    const result = this.commandSystem.handleMapClick(coord);
    console.log('🎯 命令系统处理地图点击结果:', result);
    
    if (result.success) {
      this.handleCommandResult(result);
      this.updateUIState(); // 🔧 统一更新UI状态
    } else {
      this.uiView.addOutput(result.message || '地图点击处理失败', 'error');
    }
  }

  updateUI() {
    this.updateGeometryList();
    this.updateUIState(); // 🔧 使用统一的UI状态更新
  }

  updateStatusBar() {
    const stats = this.getStatistics();
    if (this.uiView.updateStatusBar) {
      this.uiView.updateStatusBar(stats);
    }
  }

  updateGeometryList() {
    const points = this.czmlModel.getAllPoints();
    const polylines = this.czmlModel.getAllPolylines();
    const allGeometries = this.czmlModel.getAllGeometries();
    const czmlData = this.czmlModel.getCzmlDocument();
    
    this.uiView.updatePointsList(allGeometries, czmlData);
  }

  updateCzmlData(czmlData) {
    try {
      if (!Array.isArray(czmlData) || czmlData.length === 0) {
        throw new Error('CZML数据必须是非空数组');
      }

      if (!czmlData[0].id || czmlData[0].id !== 'document') {
        throw new Error('CZML数组的第一个元素必须是document包');
      }

      this.commandSystem.clearHistory();

      this.czmlModel.czmlDocument = [...czmlData];
      
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

  getCzmlData() {
    return this.czmlModel.getCzmlDocument();
  }

  exportCzml() {
    try {
      const czmlData = this.getCzmlData();
      const jsonString = JSON.stringify(czmlData, null, 2);
      
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

  getStatistics() {
    const points = this.czmlModel.getAllPoints();
    const polylines = this.czmlModel.getAllPolylines();
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    const commandStats = this.commandSystem.getStatistics();
    const historyInfo = this.commandSystem.getCommandHistoryInfo();
    
    return {
      totalPoints: points.length,
      totalPolylines: polylines.length,
      totalGeometries: points.length + polylines.length,
      czmlSize: JSON.stringify(this.getCzmlData()).length,
      
      registeredCommands: commandStats.registeredCommands,
      hasActiveCommand: commandStatus.hasCommand,
      activeCommand: commandStatus.commandName || null,
      
      inputHistoryLength: this.inputHistory.length,
      commandHistoryLength: historyInfo.totalCommands,
      canUndo: historyInfo.canUndo,
      canRedo: historyInfo.canRedo
    };
  }

  executeCommand(command) {
    this.handleCommand(command);
  }

  undo() {
    this.handleUndo();
  }

  redo() {
    this.handleRedo();
  }

  getAvailableCommands() {
    return this.commandSystem.getAvailableCommands();
  }

  getInputHistory() {
    return [...this.inputHistory];
  }

  getCommandHistory() {
    return this.commandSystem.getCommandHistoryInfo();
  }

  destroy() {
    this.mapView.destroy();
    console.log('编辑器控制器已销毁');
  }
}

export default EditorController;