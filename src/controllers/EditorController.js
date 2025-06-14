import CzmlModel from '../models/CzmlModel.js';
import GeometryUtils from '../utils/GeometryUtils.js';
import MapView from '../views/MapView.js';
import UIView from '../views/UIView.js';
import CommandSystem from '../commands/CommandSystem.js';

/**
 * 编辑器控制器 - 修复EditPoint实体选择问题
 * 核心修复：区分不同命令的地图交互需求
 */
class EditorController {
  constructor(mapContainerId, uiPanelId) {
    this.czmlModel = new CzmlModel();
    this.mapView = new MapView(mapContainerId);
    this.uiView = new UIView(uiPanelId);
    this.commandSystem = new CommandSystem();
    
    this.inputHistory = [];
    this.historyIndex = -1;
    
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
    
    console.log('编辑器控制器初始化完成 - 修复EditPoint版本');
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
   * 处理命令输入 - 修复版本，正确处理空输入和确认操作
   */
  handleCommand(command) {
    // 🔧 修复：区分真正的空输入和确认操作
    const isEmptyInput = !command || command.trim() === '';
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    
    console.log('🎯 handleCommand调用:', {
      input: `"${command}"`,
      isEmptyInput,
      hasActiveCommand: commandStatus.hasCommand,
      commandName: commandStatus.commandName
    });
    
    if (isEmptyInput && commandStatus.hasCommand) {
      // 空输入且有活动命令 - 这是确认操作
      console.log('✅ 空输入确认操作');
      const context = this.createContext();
      const result = this.commandSystem.parseAndExecute('', context);
      this.handleCommandResult(result);
      this.handleInputClearance(result);
      this.updateCommandInputState();
      this.updateStatusBar();
      return;
    }

    if (isEmptyInput && !commandStatus.hasCommand) {
      // 空输入且没有活动命令 - 忽略
      console.log('🚫 空输入且无活动命令，忽略');
      return;
    }

    // 非空输入 - 正常处理
    this.uiView.addOutput(`> ${command}`, 'command');

    if (command.trim() !== this.inputHistory[this.inputHistory.length - 1]) {
      this.inputHistory.push(command.trim());
      if (this.inputHistory.length > 50) {
        this.inputHistory.shift();
      }
    }
    this.historyIndex = this.inputHistory.length;

    const context = this.createContext();
    const result = this.commandSystem.parseAndExecute(command, context);
    
    this.handleCommandResult(result);
    this.handleInputClearance(result);
    this.updateCommandInputState();
    this.updateStatusBar();
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
   * 处理命令结果 - 修复版本，确保EditPoint的右键确认正确设置
   */
  handleCommandResult(result) {
    if (result.message) {
      const messageType = result.success ? 'success' : 'error';
      this.uiView.addOutput(result.message, messageType);
    }

    // 根据具体命令类型来决定地图交互方式
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    const currentCommand = commandStatus.commandName;

    console.log('🎯 处理命令结果:', {
      currentCommand,
      needsMapClick: result.needsMapClick,
      needsConfirm: result.needsConfirm,
      success: result.success,
      coordString: result.coordString,
      updateInput: result.updateInput
    });

    if (result.needsMapClick) {
      // 根据不同的命令启用不同的地图交互模式
      if (currentCommand === 'EditPointCommandHandler') {
        console.log('🎯 EditPoint命令：设置地图交互');
        // 🔧 修复：为EditPoint命令正确设置右键确认，使用箭头函数绑定this
        this.mapView.enableRightClickConfirm(() => {
          console.log('🖱️ 控制器收到EditPoint右键确认');
          
          // 🔧 修复：直接在这里处理EditPoint右键确认逻辑
          const commandStatus = this.commandSystem.getCurrentCommandStatus();
          if (!commandStatus.hasCommand || commandStatus.commandName !== 'EditPointCommandHandler') {
            console.log('❌ 不是EditPoint命令，忽略');
            return;
          }

          const currentHandler = this.commandSystem.currentHandler;
          if (!currentHandler) {
            console.log('❌ 没有当前处理器');
            return;
          }

          try {
            console.log('📞 调用EditPoint处理器的右键确认方法');
            const result = currentHandler.handleRightClickConfirm();
            
            console.log('📞 EditPoint右键确认结果:', result);
            
            if (result && result.success) {
              // 处理成功的结果
              this.handleCommandResult(result);
              this.updateCommandInputState();
              
              // 如果命令完成，清理状态
              if (currentHandler.completed) {
                console.log('✅ EditPoint命令通过右键确认完成');
                this.disableAllMapInteractions();
              }
            } else if (result && result.message) {
              // 🔧 修复：显示错误或提示消息
              const messageType = result.success ? 'info' : 'error';  
              this.uiView.addOutput(result.message, messageType);
            } else if (!result) {
              // 🔧 修复：处理undefined返回值的情况
              console.log('⚠️ EditPoint右键确认返回undefined');
              this.uiView.addOutput('右键确认无效，请检查当前状态', 'error');
            }
          } catch (error) {
            console.error('❌ EditPoint右键确认异常:', error);
            this.uiView.addOutput('右键确认失败: ' + error.message, 'error');
          }
        });
      } else {
        console.log('🗺️ 其他命令：启用标准地图点击模式');
        this.enableMapInteraction();
      }
    } else if (result.success && !result.needsConfirm) {
      console.log('🔒 命令完成：禁用地图交互');
      this.disableMapInteraction();
    }

    // 优先处理coordString更新输入框
    if (result.coordString) {
      console.log('📝 更新输入框内容:', result.coordString);
      this.uiView.updateCommandInput(result.coordString);
    }

    // updateInput标志也要更新输入框状态
    if (result.updateInput) {
      this.updateCommandInputState();
    }
  }

  handleInputClearance(result) {
    if (result.success && !result.needsMapClick && !result.needsConfirm) {
      this.uiView.updateCommandInput('', '输入命令 (例如: AddPoint, AddPolyline)');
      this.disableMapInteraction();
      return;
    }

    if (result.success && result.needsMapClick && !result.coordString) {
      this.uiView.updateCommandInput('');
      return;
    }

    if (!result.success) {
      this.uiView.updateCommandInput('', '输入命令 (例如: AddPoint, AddPolyline)');
      return;
    }
  }

  /**
   * 处理取消命令 - 增强版本
   */
  handleCancelCommand() {
    const result = this.commandSystem.cancelCurrentCommand();
    
    if (result.message) {
      this.uiView.addOutput(result.message, result.success ? 'info' : 'error');
    }
    
    this.uiView.updateCommandInput('');
    this.updateCommandInputState();
    
    // 🔧 修复：彻底禁用所有地图交互模式
    this.disableAllMapInteractions();
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

  /**
   * 启用地图交互 - 修复版本（仅用于AddPoint, AddPolyline等命令）
   */
  enableMapInteraction() {
    console.log('🗺️ 启用标准地图点击交互（创建点/线）');
    
    this.mapView.enableMapClickToAddPoint((coord) => {
      this.handleMapClick(coord);
    });
    
    this.mapView.enableRightClickConfirm(() => {
      this.handleRightClickConfirm();
    });
    
    console.log('✅ 标准地图交互已启用（左键选点，右键确认）');
  }

  /**
   * 禁用地图交互 - 标准版本
   */
  disableMapInteraction() {
    console.log('🔒 禁用标准地图交互');
    this.mapView.disableMapClick();
    this.mapView.disableRightClickConfirm();
  }

  /**
   * 禁用所有地图交互 - 新增方法，用于彻底清理
   */
  disableAllMapInteractions() {
    console.log('🔒 禁用所有地图交互模式');
    
    // 禁用标准地图点击
    this.mapView.disableMapClick();
    this.mapView.disableRightClickConfirm();
    
    // 禁用实体选择模式
    this.mapView.disableEntitySelection();
    
    // 清理所有临时预览
    this.mapView.hideTemporaryPoint();
    this.mapView.hideTemporaryPolyline();
    
    // 清理高亮效果
    this.mapView.highlightSelectablePoints(false);
    
    console.log('✅ 所有地图交互已禁用');
  }

  handleRightClickConfirm() {
    console.log('右键确认被触发');
    
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    if (!commandStatus.hasCommand) {
      this.uiView.addOutput('右键确认：当前没有活动命令', 'info');
      return;
    }

    this.uiView.addOutput('> 右键确认完成操作', 'command');
    
    const context = this.createContext();
    const result = this.commandSystem.parseAndExecute('', context);
    
    console.log('右键确认命令结果:', result);
    
    this.handleCommandResult(result);
    this.handleInputClearance(result);
    this.updateCommandInputState();
  }

  /**
   * 处理地图点击事件 - 修复版本，支持EditPoint命令的位置选择
   */
  handleMapClick(coord) {
    const commandStatus = this.commandSystem.getCurrentCommandStatus();
    
    console.log('🗺️ 控制器收到地图点击:', {
      commandName: commandStatus.commandName,
      hasCommand: commandStatus.hasCommand,
      isWaitingForMapClick: commandStatus.isWaitingForMapClick,
      coord: coord
    });

    // 只有当前有命令且命令需要地图交互时才处理点击
    if (!commandStatus.hasCommand || !commandStatus.isWaitingForMapClick) {
      console.log('🚫 忽略地图点击：无活动命令或命令不需要地图交互');
      return;
    }

    if (!GeometryUtils.validateCoordinate(coord)) {
      this.uiView.addOutput('坐标无效，请重新选择位置', 'error');
      return;
    }

    console.log('📍 处理地图点击，命令:', commandStatus.commandName);

    // 将点击事件传递给命令系统处理
    const result = this.commandSystem.handleMapClick(coord);
    
    console.log('🎯 命令系统处理地图点击结果:', result);
    
    if (result.success) {
      // 🔧 修复：对于AddPoint命令才显示临时预览点
      // EditPoint命令不需要临时预览点，因为它有自己的交互逻辑
      if (commandStatus.commandName === 'AddPointCommandHandler') {
        this.mapView.showTemporaryPoint(coord);
      }
      
      // 🔧 关键修复：确保所有成功的地图点击结果都正确处理
      this.handleCommandResult(result);
      this.updateCommandInputState();
    } else {
      this.uiView.addOutput(result.message || '地图点击处理失败', 'error');
    }
  }

  /**
   * 更新命令输入状态 - 增强版本，提供统一的确认提示
   */
  updateCommandInputState() {
    const status = this.commandSystem.getCurrentCommandStatus();
    
    if (status.hasCommand) {
      let placeholder = status.placeholder;
      
      // 🔧 修复：为所有需要确认的状态添加统一的确认提示
      if (placeholder && !placeholder.includes('按回车') && !placeholder.includes('右键')) {
        if (status.placeholder.includes('确认') || status.placeholder.includes('完成')) {
          placeholder += ' (回车确认 或 地图右键确认)';
        }
      }
      
      this.uiView.updateCommandInput(
        this.uiView.commandInput ? this.uiView.commandInput.value : '',
        placeholder
      );
    } else {
      this.uiView.updateCommandInput(
        this.uiView.commandInput ? this.uiView.commandInput.value : '', 
        '输入命令 (例如: AddPoint, AddPolyline)'
      );
    }
  }

  updateUI() {
    this.updateGeometryList();
    this.updateStatusBar();
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