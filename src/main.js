import EditorController from './controllers/EditorController.js';

/**
 * CZML编辑器应用程序入口
 * 采用MVC架构模式 + 命令行交互
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
    console.log('CZML编辑器启动中... (命令行模式)');
    
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
        loadCzmlData: (data) => this.controller.loadCzmlData(data),
        
        // 统计信息
        getStats: () => this.controller.getStatistics(),
        
        // 命令操作
        executeCommand: (cmd) => this.controller.executeCommand(cmd),
        getCommands: () => this.controller.getAvailableCommands(),
        getHistory: () => this.controller.getCommandHistory(),
        
        // 快捷操作
        addPoint: (lon, lat, height = 0) => {
          this.controller.executeCommand(`AddPoint`);
          // 等待一小段时间让命令系统准备好
          setTimeout(() => {
            this.controller.executeCommand(`${lon},${lat},${height}`);
          }, 100);
        },
        
        clearAll: () => this.controller.executeCommand('Clear'),
        help: () => this.controller.executeCommand('Help')
      };
      
      console.log('CZML编辑器初始化完成 (命令行模式)');
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
    🌍 CZML编辑器 v2.0 - 命令行模式
    ================================
    
    使用说明:
    1. 在命令行输入 "AddPoint" 并按回车
    2. 左键点击地图选择位置或直接输入坐标
    3. 按回车或右键确认添加点
    
    可用命令:
    - AddPoint    // 添加点
    - Clear       // 清除所有点  
    - Help        // 显示帮助
    
    快捷键:
    - Enter       // 执行命令
    - Esc         // 取消当前命令
    - ↑/↓         // 浏览命令历史
    - 左键        // 选择位置
    - 右键        // 确认操作
    
    调试命令:
    - window.czmlEditor.addPoint(lon, lat, height)  // 直接添加点
    - window.czmlEditor.getCzmlData()               // 获取CZML数据
    - window.czmlEditor.exportCzml()                // 导出CZML文件
    - window.czmlEditor.getStats()                  // 获取统计信息
    - window.czmlEditor.getCommands()               // 获取可用命令
    - window.czmlEditor.help()                      // 显示帮助
    
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