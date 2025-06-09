import EditorController from './controllers/EditorController.js';

/**
 * CZML编辑器应用程序入口
 * 采用MVC架构模式
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
    console.log('CZML编辑器启动中...');
    
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
        getCzmlData: () => this.controller.getCzmlData(),
        exportCzml: () => this.controller.exportCzml(),
        getStats: () => this.controller.getStatistics()
      };
      
      console.log('CZML编辑器初始化完成');
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
    🌍 CZML编辑器 v1.0
    ================================
    
    使用说明:
    1. 点击 "添加点" 按钮
    2. 在地图上点击选择位置
    3. 确认添加点
    
    调试命令:
    - window.czmlEditor.getCzmlData() // 获取CZML数据
    - window.czmlEditor.exportCzml()  // 导出CZML文件
    - window.czmlEditor.getStats()    // 获取统计信息
    
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