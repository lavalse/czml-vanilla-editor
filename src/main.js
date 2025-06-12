import EditorController from './controllers/EditorController.js';

/**
 * CZML编辑器应用程序入口
 * 采用新的命令系统架构 + 撤销/重做功能
 */
class CzmlEditorApp {
  constructor() {
    this.controller = null;
    this.init();
  }

  /**
   * 初始化应用程序
   */
  init() {
    console.log('CZML编辑器启动中... (新命令系统架构)');
    
    try {
      // 等待DOM加载完成
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.initializeEditor();
        });
      } else {
        this.initializeEditor();
      }
      
    } catch (error) {
      console.error('应用程序初始化失败:', error);
    }
  }

  /**
   * 初始化编辑器
   */
  initializeEditor() {
    try {
      // 创建主控制器
      this.controller = new EditorController('cesiumContainer', 'editorPanel');
      
      // 设置全局变量供调试使用
      window.czmlEditor = {
        controller: this.controller,
        
        // 数据操作
        getCzmlData: () => this.controller.getCzmlData(),
        exportCzml: () => this.controller.exportCzml(),
        updateCzmlData: (data) => this.controller.updateCzmlData(data),
        
        // 统计信息
        getStats: () => this.controller.getStatistics(),
        
        // 命令操作
        executeCommand: (cmd) => this.controller.executeCommand(cmd),
        getCommands: () => this.controller.getAvailableCommands(),
        getInputHistory: () => this.controller.getInputHistory(),
        getCommandHistory: () => this.controller.getCommandHistory(),
        
        // 撤销/重做
        undo: () => this.controller.undo(),
        redo: () => this.controller.redo(),
        
        // 快捷操作
        addPoint: (lon, lat, height = 0) => {
          this.controller.executeCommand(`AddPoint`);
          // 等待一小段时间让命令系统准备好
          setTimeout(() => {
            this.controller.executeCommand(`${lon},${lat},${height}`);
          }, 100);
        },
        
        addPolyline: (coordinates) => {
          if (!Array.isArray(coordinates) || coordinates.length < 2) {
            console.error('addPolyline需要至少2个坐标点的数组');
            return;
          }
          this.controller.executeCommand('AddPolyline');
          // 依次添加坐标点
          coordinates.forEach((coord, index) => {
            setTimeout(() => {
              if (typeof coord === 'object' && coord.lon !== undefined && coord.lat !== undefined) {
                const height = coord.height || 0;
                this.controller.executeCommand(`${coord.lon},${coord.lat},${height}`);
              }
              // 最后一个点后自动完成
              if (index === coordinates.length - 1) {
                setTimeout(() => {
                  this.controller.executeCommand('');
                }, 50);
              }
            }, (index + 1) * 100);
          });
        },
        
        clearAll: () => this.controller.executeCommand('Clear'),
        help: () => this.controller.executeCommand('Help')
      };
      
      console.log('CZML编辑器初始化完成 (新命令系统架构)');
      console.log('调试提示: 使用 window.czmlEditor 访问编辑器实例');
      
      // 显示启动成功消息
      this.showWelcomeMessage();
      
    } catch (error) {
      console.error('编辑器初始化失败:', error);
      this.showErrorMessage('编辑器初始化失败，请刷新页面重试');
    }
  }

  /**
   * 显示欢迎消息
   */
  showWelcomeMessage() {
    console.log(`
    ================================
    🌍 CZML编辑器 v3.0 - 新命令系统
    ================================
    
    🆕 新特性:
    - 重构的命令系统架构
    - 支持撤销/重做操作 (Ctrl+Z/Ctrl+Y)
    - 命令历史查看 (Ctrl+H)
    - 更好的错误处理和调试功能
    
    使用说明:
    1. 在命令行输入 "AddPoint" 并按回车添加点
    2. 在命令行输入 "AddPolyline" 并按回车绘制折线
    3. 左键点击地图选择位置或直接输入坐标
    4. 按回车或右键确认操作
    
    可用命令:
    - AddPoint      // 添加单个点
    - AddPolyline   // 绘制折线（多点连线）
    - Clear         // 清除所有几何实体  
    - Help          // 显示帮助
    
    快捷键:
    - Enter         // 执行命令/确认操作
    - Esc           // 取消当前命令
    - ↑/↓           // 浏览输入历史
    - 左键          // 选择位置/添加点
    - 右键          // 确认操作/完成绘制
    - Ctrl+Z        // 撤销上一个操作 ⭐
    - Ctrl+Y        // 重做下一个操作 ⭐
    - Ctrl+H        // 显示命令历史 ⭐
    
    调试命令:
    - window.czmlEditor.addPoint(lon, lat, height)        // 直接添加点
    - window.czmlEditor.addPolyline([{lon,lat,height},...]) // 直接添加折线
    - window.czmlEditor.getCzmlData()                     // 获取CZML数据
    - window.czmlEditor.exportCzml()                      // 导出CZML文件
    - window.czmlEditor.getStats()                        // 获取统计信息
    - window.czmlEditor.undo()                            // 撤销操作 ⭐
    - window.czmlEditor.redo()                            // 重做操作 ⭐
    - window.czmlEditor.getCommandHistory()               // 获取命令历史 ⭐
    - window.czmlEditor.clearAll()                        // 清除所有
    - window.czmlEditor.help()                            // 显示帮助
    
    示例用法:
    // 添加一些几何实体
    window.czmlEditor.addPoint(-108, 58, 0);
    window.czmlEditor.addPolyline([
      {lon: -100, lat: 40, height: 0},
      {lon: -90, lat: 30, height: 0},
      {lon: -80, lat: 20, height: 0}
    ]);
    
    // 测试撤销/重做
    window.czmlEditor.undo();  // 撤销折线
    window.czmlEditor.undo();  // 撤销点
    window.czmlEditor.redo();  // 重做点
    window.czmlEditor.redo();  // 重做折线
    
    // 查看命令历史
    window.czmlEditor.getCommandHistory();
    
    ================================
    `);
  }

  /**
   * 显示错误消息
   */
  showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #f8d7da;
      color: #721c24;
      padding: 12px 20px;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      z-index: 9999;
      font-family: sans-serif;
      max-width: 500px;
      text-align: center;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // 5秒后自动移除
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  /**
   * 销毁应用程序
   */
  destroy() {
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    }
    
    // 清理全局变量
    if (window.czmlEditor) {
      delete window.czmlEditor;
    }
    
    console.log('CZML编辑器已关闭');
  }
}

// 创建并启动应用程序
const app = new CzmlEditorApp();

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  app.destroy();
});

// 导出供其他模块使用
export default CzmlEditorApp;