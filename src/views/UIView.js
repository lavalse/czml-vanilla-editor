/**
 * 用户界面视图类
 * 负责管理编辑器面板的UI元素和交互
 * 更新为支持状态栏的命令行界面
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
    console.log('带状态栏的命令行UI视图初始化完成');
  }

  /**
   * 创建命令行风格的UI界面（包含状态栏）
   */
  createCommandLineUI() {
    this.panel.innerHTML = `
      <div id="editor-header">
        <h3>CZML 编辑器</h3>
        <div class="version">新命令系统 v3.0</div>
      </div>
      
      <!-- 状态栏 -->
      <div id="status-bar">
        <div class="status-item">
          <span class="status-label">几何体:</span>
          <span id="geometries-count">0</span>
        </div>
        <div class="status-item">
          <span class="status-label">命令:</span>
          <span id="commands-count">0</span>
        </div>
        <div class="status-item">
          <span class="status-label">可撤销:</span>
          <span id="undo-status">否</span>
        </div>
        <div class="status-item">
          <span class="status-label">可重做:</span>
          <span id="redo-status">否</span>
        </div>
      </div>
      
      <div id="command-output">
        <div class="welcome-message">
          <p>🌍 欢迎使用 CZML 编辑器 v3.0</p>
          <p>输入 <code>Help</code> 查看可用命令</p>
          <p>使用 <code>Ctrl+Z/Y</code> 撤销/重做操作</p>
        </div>
      </div>
      
      <div id="command-input-container">
        <span class="command-prompt">命令:</span>
        <input type="text" id="commandInput" placeholder="输入命令 (例如: AddPoint, AddPolyline)" autocomplete="off">
      </div>
      
      <div id="point-list">
        <div class="tab-header">
          <button id="listViewTab" class="tab-button active" data-view="list">
            <span class="tab-icon">📋</span>
            几何体列表 <span id="point-count">(0)</span>
          </button>
          <button id="czmlViewTab" class="tab-button" data-view="czml">
            <span class="tab-icon">📄</span>
            CZML代码
          </button>
        </div>
        
        <div id="list-view" class="tab-content active">
          <div id="points-container">
            <p class="no-points">暂无几何实体</p>
          </div>
        </div>
        
        <div id="czml-view" class="tab-content">
          <div class="czml-controls">
            <button id="editJsonBtn" class="mini-btn" title="编辑CZML代码">✏️ 编辑</button>
            <button id="saveJsonBtn" class="mini-btn save-btn" title="保存修改" style="display: none;">💾 保存</button>
            <button id="cancelEditBtn" class="mini-btn cancel-btn" title="取消编辑" style="display: none;">❌ 取消</button>
            <button id="copyJsonBtn" class="mini-btn" title="复制CZML代码">📋 复制</button>
            <button id="formatJsonBtn" class="mini-btn" title="格式化JSON">🔧 格式化</button>
            <button id="exportJsonBtn" class="mini-btn" title="导出JSON文件">💾 导出</button>
          </div>
          <div id="czml-display-container">
            <pre id="czml-code-display"><code>[]</code></pre>
            <textarea id="czml-code-editor" style="display: none;">[]</textarea>
          </div>
          <div id="edit-help" style="display: none;">
            <div class="help-message">
              💡 <strong>编辑提示：</strong>
              <ul>
                <li>修改 <code>point.color.rgba</code> 可以改变点的颜色 [R, G, B, A] (0-255)</li>
                <li>修改 <code>point.pixelSize</code> 可以改变点的大小</li>
                <li>修改 <code>position.cartographicDegrees</code> 可以改变点的位置 [经度, 纬度, 高度]</li>
                <li>修改 <code>polyline.material.solidColor.color.rgba</code> 可以改变线条颜色</li>
                <li>修改 <code>polyline.width</code> 可以改变线条宽度</li>
                <li>修改 <code>name</code> 可以改变实体名称</li>
                <li>请保持JSON格式正确，否则无法保存</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div id="quick-help">
        <h4>快捷键 & 命令</h4>
        <div class="help-section">
          <div class="help-group">
            <strong>键盘快捷键:</strong>
            <div class="help-item"><kbd>Enter</kbd> 执行命令</div>
            <div class="help-item"><kbd>Esc</kbd> 取消命令</div>
            <div class="help-item"><kbd>↑/↓</kbd> 浏览历史</div>
            <div class="help-item"><kbd>Ctrl+Z</kbd> 撤销</div>
            <div class="help-item"><kbd>Ctrl+Y</kbd> 重做</div>
            <div class="help-item"><kbd>Ctrl+H</kbd> 命令历史</div>
          </div>
          <div class="help-group">
            <strong>地图交互:</strong>
            <div class="help-item"><kbd>左键</kbd> 选择位置</div>
            <div class="help-item"><kbd>右键</kbd> 确认操作</div>
          </div>
        </div>
      </div>
    `;

    // 添加样式（包含状态栏样式）
    this.addCommandLineStyles();
    
    // 绑定事件监听器
    this.bindCommandLineEvents();
    
    // 获取重要元素的引用
    this.commandInput = document.getElementById('commandInput');
    this.outputArea = document.getElementById('command-output');
  }

  /**
   * 添加命令行UI样式（包含状态栏样式）
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
      
      /* 状态栏样式 */
      #status-bar {
        display: flex;
        justify-content: space-between;
        padding: 8px 12px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border: 1px solid #dee2e6;
        border-radius: 6px;
        margin-bottom: 15px;
        font-size: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .status-label {
        color: #6c757d;
        font-weight: 500;
      }

      #geometries-count,
      #commands-count {
        font-weight: bold;
        color: #007bff;
        background-color: rgba(0, 123, 255, 0.1);
        padding: 2px 6px;
        border-radius: 12px;
        min-width: 20px;
        text-align: center;
      }

      #undo-status,
      #redo-status {
        font-weight: bold;
        color: #28a745;
        font-size: 11px;
      }

      #undo-status.disabled,
      #redo-status.disabled {
        color: #6c757d;
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
      
      #point-list {
        margin-bottom: 20px;
      }
      
      .tab-header {
        display: flex;
        border-bottom: 2px solid #dee2e6;
        margin-bottom: 15px;
      }
      
      .tab-button {
        flex: 1;
        padding: 10px 8px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 13px;
        color: #6c757d;
        transition: all 0.2s;
        border-bottom: 2px solid transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      
      .tab-button:hover {
        background-color: #f8f9fa;
        color: #495057;
      }
      
      .tab-button.active {
        color: #007bff;
        border-bottom-color: #007bff;
        font-weight: 500;
      }
      
      .tab-icon {
        font-size: 14px;
      }
      
      .tab-content {
        display: none;
      }
      
      .tab-content.active {
        display: block;
      }
      
      #point-count {
        font-size: 11px;
        color: #6c757d;
        font-weight: normal;
      }
      
      .tab-button.active #point-count {
        color: #007bff;
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
      
      .czml-controls {
        display: flex;
        gap: 6px;
        margin-bottom: 10px;
        justify-content: flex-end;
      }
      
      .mini-btn {
        padding: 4px 8px;
        font-size: 11px;
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        cursor: pointer;
        color: #495057;
        transition: all 0.2s;
      }
      
      .mini-btn:hover {
        background-color: #e9ecef;
        border-color: #adb5bd;
      }
      
      .save-btn {
        background-color: #28a745;
        color: white;
        border-color: #28a745;
      }
      
      .save-btn:hover {
        background-color: #218838;
        border-color: #1e7e34;
      }
      
      .cancel-btn {
        background-color: #dc3545;
        color: white;
        border-color: #dc3545;
      }
      
      .cancel-btn:hover {
        background-color: #c82333;
        border-color: #bd2130;
      }
      
      #czml-display-container {
        position: relative;
      }
      
      #czml-code-display {
        background-color: #1e1e1e;
        color: #d4d4d4;
        padding: 12px;
        border-radius: 6px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.4;
        max-height: 300px;
        overflow: auto;
        border: 1px solid #3c3c3c;
        margin: 0;
      }
      
      #czml-code-display code {
        background: none;
        color: inherit;
        padding: 0;
        white-space: pre;
        word-wrap: break-word;
      }
      
      /* JSON语法高亮 */
      .json-key {
        color: #9cdcfe;
      }
      
      .json-string {
        color: #ce9178;
      }
      
      .json-number {
        color: #b5cea8;
      }
      
      .json-boolean {
        color: #569cd6;
      }
      
      .json-null {
        color: #569cd6;
      }
      
      /* 滚动条样式 */
      #czml-code-display::-webkit-scrollbar {
        width: 6px;
      }
      
      #czml-code-display::-webkit-scrollbar-track {
        background: #2d2d30;
      }
      
      #czml-code-display::-webkit-scrollbar-thumb {
        background: #424242;
        border-radius: 3px;
      }
      
      #czml-code-editor {
        width: 100%;
        background-color: #1e1e1e;
        color: #d4d4d4;
        padding: 12px;
        border-radius: 6px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.4;
        max-height: 300px;
        min-height: 200px;
        border: 1px solid #3c3c3c;
        resize: vertical;
        box-sizing: border-box;
      }
      
      #czml-code-editor:focus {
        outline: none;
        border-color: #007bff;
      }
      
      #edit-help {
        margin-top: 10px;
        padding: 10px;
        background-color: #e7f3ff;
        border: 1px solid #b8daff;
        border-radius: 4px;
      }
      
      .help-message {
        font-size: 12px;
        color: #004085;
      }
      
      .help-message ul {
        margin: 8px 0 0 0;
        padding-left: 18px;
      }
      
      .help-message li {
        margin: 4px 0;
      }
      
      .help-message code {
        background-color: #f8f9fa;
        color: #e83e8c;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 11px;
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

      .help-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }

      .help-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .help-group strong {
        margin-bottom: 6px;
        color: #495057;
        font-size: 11px;
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
   * 更新状态栏
   * @param {Object} stats 统计信息
   */
  updateStatusBar(stats) {
    const geometriesCount = document.getElementById('geometries-count');
    const commandsCount = document.getElementById('commands-count');
    const undoStatus = document.getElementById('undo-status');
    const redoStatus = document.getElementById('redo-status');

    if (geometriesCount) {
      const totalGeometries = (stats.totalPoints || 0) + (stats.totalPolylines || 0);
      geometriesCount.textContent = totalGeometries;
    }

    if (commandsCount) {
      commandsCount.textContent = stats.commandHistoryLength || 0;
    }

    if (undoStatus) {
      undoStatus.textContent = stats.canUndo ? '是' : '否';
      undoStatus.className = stats.canUndo ? '' : 'disabled';
    }

    if (redoStatus) {
      redoStatus.textContent = stats.canRedo ? '是' : '否';
      redoStatus.className = stats.canRedo ? '' : 'disabled';
    }
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
    
    // Tab切换事件
    this.bindTabEvents();
    
    // CZML控制按钮事件
    this.bindCzmlControlEvents();
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
   * 绑定Tab切换事件
   */
  bindTabEvents() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const viewType = e.currentTarget.dataset.view;
        this.switchTab(viewType);
      });
    });
  }

  /**
   * 绑定CZML控制按钮事件
   */
  bindCzmlControlEvents() {
    // 编辑按钮
    const editBtn = document.getElementById('editJsonBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.enterEditMode();
      });
    }

    // 保存按钮
    const saveBtn = document.getElementById('saveJsonBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveJsonEdit();
      });
    }

    // 取消编辑按钮
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.exitEditMode();
      });
    }

    // 复制按钮
    const copyBtn = document.getElementById('copyJsonBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyJsonToClipboard();
      });
    }

    // 格式化按钮
    const formatBtn = document.getElementById('formatJsonBtn');
    if (formatBtn) {
      formatBtn.addEventListener('click', () => {
        this.formatJsonDisplay();
      });
    }

    // 导出按钮
    const exportBtn = document.getElementById('exportJsonBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.notifyListener('exportCzml');
      });
    }
  }

  /**
   * 切换Tab视图
   * @param {string} viewType 视图类型 ('list' | 'czml')
   */
  switchTab(viewType) {
    // 更新Tab按钮状态
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewType}"]`).classList.add('active');

    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${viewType}-view`).classList.add('active');

    // 如果切换到CZML视图，更新CZML显示
    if (viewType === 'czml') {
      this.notifyListener('requestCzmlUpdate');
    }
  }

  /**
   * 复制JSON到剪贴板
   */
  async copyJsonToClipboard() {
    // 检查是否在编辑模式
    const editorElement = document.getElementById('czml-code-editor');
    const isEditing = editorElement && editorElement.style.display !== 'none';
    
    let textToCopy;
    if (isEditing) {
      textToCopy = editorElement.value;
    } else {
      const codeElement = document.querySelector('#czml-code-display code');
      textToCopy = codeElement ? codeElement.textContent : '';
    }
    
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        this.showMessage('CZML代码已复制到剪贴板', 'success');
      } catch (error) {
        console.error('复制失败:', error);
        this.showMessage('复制失败，请手动选择复制', 'error');
      }
    }
  }

  /**
   * 进入编辑模式
   */
  enterEditMode() {
    const displayElement = document.getElementById('czml-code-display');
    const editorElement = document.getElementById('czml-code-editor');
    const editHelp = document.getElementById('edit-help');
    
    // 获取当前显示的JSON内容
    const codeElement = displayElement.querySelector('code');
    const currentJson = codeElement ? codeElement.textContent : '[]';
    
    // 设置编辑器内容
    editorElement.value = currentJson;
    
    // 切换显示状态
    displayElement.style.display = 'none';
    editorElement.style.display = 'block';
    editHelp.style.display = 'block';
    
    // 切换按钮状态
    document.getElementById('editJsonBtn').style.display = 'none';
    document.getElementById('saveJsonBtn').style.display = 'inline-block';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    
    // 聚焦到编辑器
    editorElement.focus();
    
    this.showMessage('进入编辑模式 - 可以直接修改CZML代码', 'info');
  }

  /**
   * 退出编辑模式
   */
  exitEditMode() {
    const displayElement = document.getElementById('czml-code-display');
    const editorElement = document.getElementById('czml-code-editor');
    const editHelp = document.getElementById('edit-help');
    
    // 切换显示状态
    displayElement.style.display = 'block';
    editorElement.style.display = 'none';
    editHelp.style.display = 'none';
    
    // 切换按钮状态
    document.getElementById('editJsonBtn').style.display = 'inline-block';
    document.getElementById('saveJsonBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    this.showMessage('已退出编辑模式', 'info');
  }

  /**
   * 保存JSON编辑
   */
  saveJsonEdit() {
    const editorElement = document.getElementById('czml-code-editor');
    const editedJson = editorElement.value;
    
    try {
      // 验证JSON格式
      const parsedJson = JSON.parse(editedJson);
      
      // 验证CZML基本结构
      if (!Array.isArray(parsedJson)) {
        throw new Error('CZML必须是一个数组');
      }
      
      if (parsedJson.length === 0 || !parsedJson[0].id || parsedJson[0].id !== 'document') {
        throw new Error('CZML数组的第一个元素必须是document包');
      }
      
      // 通知控制器更新CZML数据
      this.notifyListener('updateCzmlData', parsedJson);
      
      // 更新显示
      this.updateCzmlDisplay(editedJson);
      
      // 退出编辑模式
      this.exitEditMode();
      
      this.showMessage('CZML保存成功！地图已更新', 'success');
      
    } catch (error) {
      this.showMessage(`JSON格式错误: ${error.message}`, 'error');
      
      // 高亮显示错误的编辑器
      editorElement.style.borderColor = '#dc3545';
      setTimeout(() => {
        editorElement.style.borderColor = '#3c3c3c';
      }, 2000);
    }
  }

  formatJsonDisplay() {
    const codeElement = document.querySelector('#czml-code-display code');
    if (codeElement) {
      try {
        const jsonData = JSON.parse(codeElement.textContent);
        const formatted = JSON.stringify(jsonData, null, 2);
        this.updateCzmlDisplay(formatted);
        this.showMessage('JSON已格式化', 'success');
      } catch (error) {
        this.showMessage('JSON格式错误，无法格式化', 'error');
      }
    }
  }

  /**
   * 更新CZML代码显示
   * @param {string|Array} czmlData CZML数据
   */
  updateCzmlDisplay(czmlData) {
    const codeElement = document.querySelector('#czml-code-display code');
    if (!codeElement) return;

    let jsonString;
    if (typeof czmlData === 'string') {
      jsonString = czmlData;
    } else {
      jsonString = JSON.stringify(czmlData, null, 2);
    }

    // 应用简单的语法高亮
    const highlightedJson = this.highlightJson(jsonString);
    codeElement.innerHTML = highlightedJson;
  }

  /**
   * 简单的JSON语法高亮
   * @param {string} json JSON字符串
   * @returns {string} 高亮后的HTML
   */
  highlightJson(json) {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
        function (match) {
          let cls = 'json-number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key';
            } else {
              cls = 'json-string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
          } else if (/null/.test(match)) {
            cls = 'json-null';
          }
          return '<span class="' + cls + '">' + match + '</span>';
        });
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
  updateCommandInput(value = '', placeholder = '输入命令 (例如: AddPoint, AddPolyline)') {
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
   * 更新几何实体列表显示（点和线）
   * @param {Array} geometries 几何实体数据数组
   * @param {Array} czmlData 完整的CZML数据
   */
  updatePointsList(geometries, czmlData = null) {
    const container = document.getElementById('points-container');
    const countElement = document.getElementById('point-count');
    
    if (!container || !countElement) return;

    // 更新计数
    countElement.textContent = `(${geometries ? geometries.length : 0})`;

    // 更新几何实体列表视图
    if (!geometries || geometries.length === 0) {
      container.innerHTML = '<p class="no-points">暂无几何实体</p>';
    } else {
      let html = '';
      geometries.forEach((entity, index) => {
        // 处理点实体
        if (entity.position && entity.point) {
          const coords = entity.position.cartographicDegrees;
          html += `
            <div class="point-item">
              <div class="point-name">📍 ${entity.name} #${index + 1}</div>
              <div class="point-coords">
                经度: ${coords[0].toFixed(6)}<br>
                纬度: ${coords[1].toFixed(6)}<br>
                高度: ${coords[2].toFixed(2)}m
              </div>
            </div>
          `;
        }
        // 处理polyline实体
        else if (entity.polyline && entity.polyline.positions && entity.polyline.positions.cartographicDegrees) {
          const cartographicDegrees = entity.polyline.positions.cartographicDegrees;
          const pointCount = cartographicDegrees.length / 3;
          
          // 显示polyline的第一个和最后一个点
          const firstPoint = {
            lon: cartographicDegrees[0],
            lat: cartographicDegrees[1],
            height: cartographicDegrees[2]
          };
          const lastPoint = {
            lon: cartographicDegrees[cartographicDegrees.length - 3],
            lat: cartographicDegrees[cartographicDegrees.length - 2],
            height: cartographicDegrees[cartographicDegrees.length - 1]
          };
          
          html += `
            <div class="point-item" style="border-left-color: #00ffff;">
              <div class="point-name">📏 ${entity.name} #${index + 1}</div>
              <div class="point-coords">
                点数: ${pointCount}<br>
                起点: ${firstPoint.lon.toFixed(3)}, ${firstPoint.lat.toFixed(3)}<br>
                终点: ${lastPoint.lon.toFixed(3)}, ${lastPoint.lat.toFixed(3)}
              </div>
            </div>
          `;
        }
      });
      container.innerHTML = html;
    }

    // 更新CZML代码视图
    if (czmlData) {
      this.updateCzmlDisplay(czmlData);
    }
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