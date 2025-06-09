import CzmlModel from '../models/CzmlModel.js';
import PointModel from '../models/PointModel.js';
import MapView from '../views/MapView.js';
import UIView from '../views/UIView.js';

/**
 * 编辑器控制器
 * 协调Model和View之间的交互，处理用户操作
 */
class EditorController {
  constructor(mapContainerId, uiPanelId) {
    // 初始化Model
    this.czmlModel = new CzmlModel();
    
    // 初始化View
    this.mapView = new MapView(mapContainerId);
    this.uiView = new UIView(uiPanelId);
    
    // 当前状态
    this.isAddingPoint = false;
    
    this.init();
  }

  /**
   * 初始化控制器
   */
  init() {
    this.setupModelListeners();
    this.setupViewListeners();
    this.updateUI();
    
    console.log('编辑器控制器初始化完成');
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
    // UI按钮事件监听
    this.uiView.addListener('addPoint', () => {
      this.handleAddPointRequest();
    });

    this.uiView.addListener('clearAll', () => {
      this.handleClearAllPoints();
    });
  }

  /**
   * 处理添加点请求
   */
  handleAddPointRequest() {
    if (this.isAddingPoint) {
      // 如果正在添加点，则取消
      this.cancelAddPoint();
    } else {
      // 开始添加点流程
      this.startAddPoint();
    }
  }

  /**
   * 开始添加点流程
   */
  startAddPoint() {
    this.isAddingPoint = true;
    
    // 更新UI状态
    this.uiView.updateStatus('请点击地图选择位置...');
    this.uiView.highlightAddButton(true);
    
    // 启用地图点击功能
    this.mapView.enableMapClickToAddPoint((coord) => {
      this.handleMapClick(coord);
    });

    console.log('开始添加点流程');
  }

  /**
   * 取消添加点
   */
  cancelAddPoint() {
    this.isAddingPoint = false;
    
    // 恢复UI状态
    this.uiView.updateStatus('就绪');
    this.uiView.highlightAddButton(false);
    
    // 禁用地图点击功能
    this.mapView.disableMapClick();
    
    console.log('取消添加点');
  }

  /**
   * 处理地图点击事件
   * @param {Object} coord 点击位置的坐标
   */
  handleMapClick(coord) {
    // 验证坐标
    if (!PointModel.validateCoordinate(coord)) {
      this.uiView.showMessage('坐标无效，请重新选择位置', 'error');
      return;
    }

    // 显示确认对话框
    const confirmed = this.uiView.showAddPointConfirm('是否在此位置添加点？', coord);
    
    if (confirmed) {
      this.confirmAddPoint(coord);
    } else {
      // 用户取消，但保持添加模式
      this.mapView.hideTemporaryPoint();
    }
  }

  /**
   * 确认添加点
   * @param {Object} coord 坐标对象
   */
  confirmAddPoint(coord) {
    try {
      // 添加到Model（这会自动触发View更新）
      const pointId = this.czmlModel.addPoint(coord);
      
      // 更新状态
      this.uiView.updateStatus(`已添加点: ${pointId}`);
      this.uiView.showMessage('点添加成功！', 'success');
      
      // 结束添加流程
      this.cancelAddPoint();
      
      console.log(`点添加成功: ${pointId}`, coord);
      
    } catch (error) {
      console.error('添加点失败:', error);
      this.uiView.showMessage('添加点失败，请重试', 'error');
    }
  }

  /**
   * 处理清除所有点
   */
  handleClearAllPoints() {
    try {
      this.czmlModel.clearAllPoints();
      this.uiView.updateStatus('已清除所有点');
      this.uiView.showMessage('所有点已清除', 'success');
      
      console.log('所有点已清除');
      
    } catch (error) {
      console.error('清除点失败:', error);
      this.uiView.showMessage('清除失败，请重试', 'error');
    }
  }

  /**
   * 更新UI显示
   */
  updateUI() {
    this.updatePointsList();
    this.updateStatus();
  }

  /**
   * 更新点列表显示
   */
  updatePointsList() {
    const points = this.czmlModel.getAllPoints();
    this.uiView.updatePointsList(points);
  }

  /**
   * 更新状态显示
   */
  updateStatus() {
    const points = this.czmlModel.getAllPoints();
    const status = this.isAddingPoint ? 
      '请点击地图选择位置...' : 
      `就绪 (${points.length} 个点)`;
    
    this.uiView.updateStatus(status);
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
      
      this.uiView.showMessage('CZML文件导出成功！', 'success');
      console.log('CZML导出成功');
      
    } catch (error) {
      console.error('导出CZML失败:', error);
      this.uiView.showMessage('导出失败，请重试', 'error');
    }
  }

  /**
   * 加载CZML数据
   * @param {Array} czmlData CZML文档数组
   */
  loadCzmlData(czmlData) {
    try {
      // 这里可以实现加载外部CZML数据的逻辑
      // 现在先简单地清除现有数据然后重新添加
      this.czmlModel.clearAllPoints();
      
      // 遍历CZML数据，添加点
      if (Array.isArray(czmlData)) {
        czmlData.forEach(entity => {
          if (entity.position && entity.point && entity.id !== 'document') {
            const coords = entity.position.cartographicDegrees;
            if (coords && coords.length >= 3) {
              this.czmlModel.addPoint({
                lon: coords[0],
                lat: coords[1],
                height: coords[2]
              });
            }
          }
        });
      }
      
      this.uiView.showMessage('CZML数据加载成功！', 'success');
      console.log('CZML数据加载成功');
      
    } catch (error) {
      console.error('加载CZML数据失败:', error);
      this.uiView.showMessage('加载数据失败，请检查格式', 'error');
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息对象
   */
  getStatistics() {
    const points = this.czmlModel.getAllPoints();
    return {
      totalPoints: points.length,
      czmlSize: JSON.stringify(this.getCzmlData()).length,
      isEditing: this.isAddingPoint
    };
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