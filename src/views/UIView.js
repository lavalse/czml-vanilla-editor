/**
 * 用户界面视图类
 * 负责管理编辑器面板的UI元素和交互
 */
class UIView {
  constructor(panelId) {
    this.panelId = panelId;
    this.panel = null;
    this.listeners = {}; // 存储各种UI事件的监听器
    
    this.init();
  }

  /**
   * 初始化UI视图
   */
  init() {
    this.panel = document.getElementById(this.panelId);
    if (!this.panel) {
      console.error(`找不到ID为 ${this.panelId} 的面板元素`);
      return;
    }

    this.createInitialUI();
    console.log('UI视图初始化完成');
  }

  /**
   * 创建初始的UI界面
   */
  createInitialUI() {
    this.panel.innerHTML = `
      <div id="editor-header">
        <h3>CZML 编辑器</h3>
      </div>
      
      <div id="editor-controls">
        <button id="addPointBtn" class="btn btn-primary">添加点</button>
        <button id="clearAllBtn" class="btn btn-secondary">清除所有</button>
      </div>
      
      <div id="editor-info">
        <h4>当前状态</h4>
        <div id="status-display">就绪</div>
      </div>
      
      <div id="point-list">
        <h4>点列表</h4>
        <div id="points-container">
          <p class="no-points">暂无点</p>
        </div>
      </div>
    `;

    // 添加样式
    this.addStyles();
    
    // 绑定事件监听器
    this.bindEvents();
  }

  /**
   * 添加UI样式
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #editor-header {
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #ddd;
      }
      
      #editor-header h3 {
        margin: 0;
        color: #333;
      }
      
      #editor-controls {
        margin-bottom: 20px;
      }
      
      .btn {
        padding: 8px 16px;
        margin: 4px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .btn-primary {
        background-color: #007bff;
        color: white;
      }
      
      .btn-primary:hover {
        background-color: #0056b3;
      }
      
      .btn-secondary {
        background-color: #6c757d;
        color: white;
      }
      
      .btn-secondary:hover {
        background-color: #545b62;
      }
      
      #editor-info, #point-list {
        margin-bottom: 20px;
      }
      
      #editor-info h4, #point-list h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 16px;
      }
      
      #status-display {
        padding: 8px;
        background-color: #f8f9fa;
        border-radius: 4px;
        font-family: monospace;
      }
      
      .point-item {
        padding: 8px;
        margin: 4px 0;
        background-color: #f8f9fa;
        border-radius: 4px;
        border-left: 3px solid #007bff;
      }
      
      .point-item .point-name {
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .point-item .point-coords {
        font-size: 12px;
        color: #666;
        font-family: monospace;
      }
      
      .no-points {
        color: #999;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 绑定UI事件
   */
  bindEvents() {
    // 添加点按钮
    const addPointBtn = document.getElementById('addPointBtn');
    if (addPointBtn) {
      addPointBtn.addEventListener('click', () => {
        this.notifyListener('addPoint');
      });
    }

    // 清除所有按钮
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        if (confirm('确定要清除所有点吗？')) {
          this.notifyListener('clearAll');
        }
      });
    }
  }

  /**
   * 添加事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   */
  addListener(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  /**
   * 通知监听器
   * @param {string} eventName 事件名称
   * @param {*} data 事件数据
   */
  notifyListener(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => callback(data));
    }
  }

  /**
   * 更新状态显示
   * @param {string} status 状态文本
   */
  updateStatus(status) {
    const statusDisplay = document.getElementById('status-display');
    if (statusDisplay) {
      statusDisplay.textContent = status;
    }
  }

  /**
   * 更新点列表显示
   * @param {Array} points 点数据数组
   */
  updatePointsList(points) {
    const container = document.getElementById('points-container');
    if (!container) return;

    if (!points || points.length === 0) {
      container.innerHTML = '<p class="no-points">暂无点</p>';
      return;
    }

    let html = '';
    points.forEach((point, index) => {
      const coords = point.position.cartographicDegrees;
      html += `
        <div class="point-item">
          <div class="point-name">${point.name} #${index + 1}</div>
          <div class="point-coords">
            经度: ${coords[0].toFixed(6)}<br>
            纬度: ${coords[1].toFixed(6)}<br>
            高度: ${coords[2].toFixed(2)}m
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * 显示确认对话框
   * @param {string} message 确认消息
   * @param {Object} coord 坐标对象
   * @returns {boolean} 用户是否确认
   */
  showAddPointConfirm(message, coord) {
    const formattedCoord = `经度: ${coord.lon.toFixed(6)}\n纬度: ${coord.lat.toFixed(6)}\n高度: ${coord.height.toFixed(2)}m`;
    return confirm(`${message}\n\n${formattedCoord}`);
  }

  /**
   * 显示消息提示
   * @param {string} message 消息内容
   * @param {string} type 消息类型 ('info', 'success', 'error')
   */
  showMessage(message, type = 'info') {
    // 这里可以实现更漂亮的消息提示
    // 现在先用简单的alert
    alert(message);
  }

  /**
   * 设置按钮状态
   * @param {string} buttonId 按钮ID
   * @param {boolean} enabled 是否启用
   */
  setButtonEnabled(buttonId, enabled) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = !enabled;
    }
  }

  /**
   * 高亮添加点按钮（表示正在等待用户点击地图）
   * @param {boolean} highlight 是否高亮
   */
  highlightAddButton(highlight) {
    const button = document.getElementById('addPointBtn');
    if (button) {
      if (highlight) {
        button.style.backgroundColor = '#28a745';
        button.textContent = '点击地图添加点...';
      } else {
        button.style.backgroundColor = '#007bff';
        button.textContent = '添加点';
      }
    }
  }
}

export default UIView;