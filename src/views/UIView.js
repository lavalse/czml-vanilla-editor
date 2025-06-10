/**
 * 用户界面视图类
 * 负责管理编辑器面板的UI元素和交互
 * 更新为Rhino风格的命令行界面
 */
class UIView {
  constructor(panelId) {
    this.panelId = panelId;
    this.panel = null;
    this.listeners = {}; // 存储各种UI事件的监听器
    this.commandInput = null;
    this.outputArea = null;
    
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

    this.createCommandLineUI();
    console.log('命令行UI视图初始化完成');
  }

  /**
   * 创建命令行风格的UI界面
   */
  createCommandLineUI() {
    this.panel.innerHTML = `
      <div id="editor-header">
        <h3>CZML 编辑器</h3>
        <div class="version">命令行模式 v1.0</div>
      </div>
      
      <div id="command-output">
        <div class="welcome-message">
          <p>🌍 欢迎使用 CZML 编辑器</p>
          <p>输入 <code>Help</code> 查看可用命令</p>
          <p>输入 <code>AddPoint</code> 开始添加点</p>
        </div>
      </div>
      
      <div id="command-input-container">
        <span class="command-prompt">命令:</span>
        <input type="text" id="commandInput" placeholder="输入命令 (例如: AddPoint)" autocomplete="off">
      </div>
      
      <div id="point-list">
        <h4>点列表 <span id="point-count">(0)</span></h4>
        <div id="points-container">
          <p class="no-points">暂无点</p>
        </div>
      </div>
      
      <div id="quick-help">
        <h4>快捷键</h4>
        <div class="help-item"><kbd>Enter</kbd> 执行命令</div>
        <div class="help-item"><kbd>Esc</kbd> 取消当前命令</div>
        <div class="help-item"><kbd>↑/↓</kbd> 浏览历史命令</div>
        <div class="help-item"><kbd>左键</kbd> 选择位置</div>
        <div class="help-item"><kbd>右键</kbd> 确认操作</div>
      </div>
    `;

    // 添加样式
    this.addCommandLineStyles();
    
    // 绑定事件监听器
    this.bindCommandLineEvents();
    
    // 获取重要元素的引用
    this.commandInput = document.getElementById('commandInput');
    this.outputArea = document.getElementById('command-output');
  }

  /**
   * 添加命令行UI样式
   */
  addCommandLineStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #editor-header {
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #007bff;
      }
      
      #editor-header h3 {
        margin: 0 0 5px 0;
        color: #333;
      }
      
      .version {
        font-size: 12px;
        color: #666;
      }
      
      #command-output {
        background-color: #1e1e1e;
        color: #d4d4d4;
        padding: 15px;
        border-radius: 6px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.4;
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 15px;
        border: 1px solid #3c3c3c;
      }
      
      .welcome-message p {
        margin: 5px 0;
      }
      
      .welcome-message code {
        background-color: #2d2d30;
        color: #9cdcfe;
        padding: 2px 4px;
        border-radius: 3px;
      }
      
      .output-line {
        margin: 3px 0;
        word-wrap: break-word;
      }
      
      .output-success {
        color: #4ec9b0;
      }
      
      .output-error {
        color: #f44747;
      }
      
      .output-info {
        color: #569cd6;
      }
      
      .output-command {
        color: #dcdcaa;
      }
      
      #command-input-container {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        padding: 8px;
        background-color: #f8f9fa;
        border-radius: 6px;
        border: 2px solid transparent;
        transition: border-color 0.2s;
      }
      
      #command-input-container:focus-within {
        border-color: #007bff;
      }
      
      .command-prompt {
        color: #007bff;
        font-weight: bold;
        margin-right: 8px;
        min-width: 50px;
      }
      
      #commandInput {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        padding: 4px;
      }
      
      #point-list h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      #point-count {
        font-size: 12px;
        color: #666;
        font-weight: normal;
      }
      
      .point-item {
        padding: 10px;
        margin: 6px 0;
        background-color: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #007bff;
        transition: background-color 0.2s;
      }
      
      .point-item:hover {
        background-color: #e9ecef;
      }
      
      .point-item .point-name {
        font-weight: bold;
        margin-bottom: 6px;
        color: #495057;
      }
      
      .point-item .point-coords {
        font-size: 11px;
        color: #6c757d;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        line-height: 1.3;
      }
      
      .no-points {
        color: #999;
        font-style: italic;
        text-align: center;
        padding: 20px;
        margin: 0;
      }
      
      #quick-help {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #dee2e6;
      }
      
      #quick-help h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 14px;
      }
      
      .help-item {
        margin: 5px 0;
        font-size: 12px;
        color: #6c757d;
      }
      
      kbd {
        background-color: #e9ecef;
        color: #495057;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-family: monospace;
        border: 1px solid #adb5bd;
      }
      
      /* 滚动条样式 */
      #command-output::-webkit-scrollbar {
        width: 6px;
      }
      
      #command-output::-webkit-scrollbar-track {
        background: #2d2d30;
      }
      
      #command-output::-webkit-scrollbar-thumb {
        background: #424242;
        border-radius: 3px;
      }
      
      #command-output::-webkit-scrollbar-thumb:hover {
        background: #4a4a4a;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 绑定命令行UI事件
   */
  bindCommandLineEvents() {
    // 命令输入处理
    const commandInput = document.getElementById('commandInput');
    if (commandInput) {
      commandInput.addEventListener('keydown', (e) => {
        this.handleCommandInputKeydown(e);
      });
      
      commandInput.addEventListener('input', (e) => {
        this.handleCommandInputChange(e);
      });
    }
  }

  /**
   * 处理命令输入键盘事件
   * @param {KeyboardEvent} e 键盘事件
   */
  handleCommandInputKeydown(e) {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.executeCommand();
        break;
        
      case 'Escape':
        e.preventDefault();
        this.cancelCommand();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.navigateHistory(-1);
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        this.navigateHistory(1);
        break;
    }
  }

  /**
   * 处理命令输入内容变化
   * @param {Event} e 输入事件
   */
  handleCommandInputChange(e) {
    this.notifyListener('inputChange', e.target.value);
  }

  /**
   * 执行命令
   */
  executeCommand() {
    const command = this.commandInput.value;
    this.notifyListener('executeCommand', command);
  }

  /**
   * 取消命令
   */
  cancelCommand() {
    this.notifyListener('cancelCommand');
  }

  /**
   * 浏览命令历史
   * @param {number} direction 方向 (-1: 上一个, 1: 下一个)
   */
  navigateHistory(direction) {
    this.notifyListener('navigateHistory', direction);
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
   * 添加输出到命令行
   * @param {string} text 输出文本
   * @param {string} type 输出类型 ('success', 'error', 'info', 'command')
   */
  addOutput(text, type = 'info') {
    const line = document.createElement('div');
    line.className = `output-line output-${type}`;
    line.textContent = text;
    
    this.outputArea.appendChild(line);
    
    // 自动滚动到底部
    this.outputArea.scrollTop = this.outputArea.scrollHeight;
    
    // 限制输出行数，避免内存占用过多
    const lines = this.outputArea.querySelectorAll('.output-line');
    if (lines.length > 100) {
      lines[0].remove();
    }
  }

  /**
   * 清空输出区域
   */
  clearOutput() {
    const welcomeMessage = this.outputArea.querySelector('.welcome-message');
    this.outputArea.innerHTML = '';
    if (welcomeMessage) {
      this.outputArea.appendChild(welcomeMessage);
    }
  }

  /**
   * 更新命令输入框
   * @param {string} value 输入值
   * @param {string} placeholder 占位符文本
   */
  updateCommandInput(value = '', placeholder = '输入命令 (例如: AddPoint)') {
    if (this.commandInput) {
      this.commandInput.value = value;
      this.commandInput.placeholder = placeholder;
      
      // 如果有值，将光标移到末尾
      if (value && this.commandInput === document.activeElement) {
        this.commandInput.setSelectionRange(value.length, value.length);
      }
    }
  }

  /**
   * 聚焦到命令输入框
   */
  focusCommandInput() {
    if (this.commandInput) {
      this.commandInput.focus();
    }
  }

  /**
   * 更新点列表显示
   * @param {Array} points 点数据数组
   */
  updatePointsList(points) {
    const container = document.getElementById('points-container');
    const countElement = document.getElementById('point-count');
    
    if (!container || !countElement) return;

    // 更新计数
    countElement.textContent = `(${points ? points.length : 0})`;

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
   * 显示状态消息（在命令行输出中）
   * @param {string} message 消息内容
   * @param {string} type 消息类型
   */
  showMessage(message, type = 'info') {
    this.addOutput(message, type);
  }

  /**
   * 更新状态显示（已废弃，使用 showMessage 代替）
   * @param {string} status 状态文本
   */
  updateStatus(status) {
    // 为了兼容性保留，实际调用 showMessage
    this.showMessage(status, 'info');
  }

  // 以下方法为了向后兼容而保留，但在命令行模式下不再使用

  /**
   * 显示确认对话框（命令行模式下不使用）
   */
  showAddPointConfirm(message, coord) {
    // 命令行模式下不使用确认对话框
    return true;
  }

  /**
   * 设置按钮状态（命令行模式下不使用）
   */
  setButtonEnabled(buttonId, enabled) {
    // 命令行模式下没有按钮
  }

  /**
   * 高亮添加点按钮（命令行模式下不使用）
   */
  highlightAddButton(highlight) {
    // 命令行模式下没有按钮
  }
}

export default UIView;