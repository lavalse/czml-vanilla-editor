/**
 * 添加Polyline命令类
 * 支持多点输入，临时预览和确认提交
 */
class AddPolylineCommand {
  constructor(czmlModel, initialCoords = []) {
    this.czmlModel = czmlModel;
    this.coordinates = [...initialCoords]; // 已收集的坐标点
    this.polylineId = null;
    this.executed = false;
  }

  /**
   * 执行命令
   * @returns {boolean} 是否执行成功
   */
  execute() {
    try {
      if (this.executed) {
        console.warn('命令已经执行过了');
        return false;
      }

      if (this.coordinates.length < 2) {
        throw new Error('Polyline至少需要2个点');
      }

      this.polylineId = this.czmlModel.addPolyline(this.coordinates);
      this.executed = true;
      
      console.log(`AddPolylineCommand executed: ${this.polylineId} with ${this.coordinates.length} points`);
      return true;
      
    } catch (error) {
      console.error('AddPolylineCommand execution failed:', error);
      return false;
    }
  }

  /**
   * 撤销命令
   * @returns {boolean} 是否撤销成功
   */
  undo() {
    try {
      if (!this.executed || !this.polylineId) {
        console.warn('无法撤销：命令未执行或无效的polyline ID');
        return false;
      }

      const czmlDoc = this.czmlModel.getCzmlDocument();
      const index = czmlDoc.findIndex(entity => entity.id === this.polylineId);
      
      if (index > 0) {
        czmlDoc.splice(index, 1);
        this.czmlModel.notifyListeners();
        this.executed = false;
        
        console.log(`AddPolylineCommand undone: ${this.polylineId}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('AddPolylineCommand undo failed:', error);
      return false;
    }
  }

  /**
   * 重做命令
   * @returns {boolean} 是否重做成功
   */
  redo() {
    if (this.executed) {
      console.warn('命令已经执行，无需重做');
      return false;
    }
    
    return this.execute();
  }

  /**
   * 添加坐标点
   * @param {Object} coord 坐标对象 {lon, lat, height}
   */
  addCoordinate(coord) {
    this.coordinates.push(coord);
  }

  /**
   * 获取当前坐标数组
   * @returns {Array} 坐标数组
   */
  getCoordinates() {
    return [...this.coordinates];
  }

  /**
   * 获取坐标点数量
   * @returns {number} 点数量
   */
  getPointCount() {
    return this.coordinates.length;
  }

  /**
   * 是否可以执行（至少需要2个点）
   * @returns {boolean} 是否可执行
   */
  canExecute() {
    return this.coordinates.length >= 2;
  }

  /**
   * 获取命令描述
   * @returns {string} 命令描述
   */
  getDescription() {
    return `添加Polyline (${this.coordinates.length} 个点)`;
  }

  /**
   * 获取命令类型
   * @returns {string} 命令类型
   */
  getType() {
    return 'AddPolylineCommand';
  }

  /**
   * 验证命令是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    return this.coordinates.length >= 2 && 
           this.coordinates.every(coord => 
             coord && 
             typeof coord.lon === 'number' && 
             typeof coord.lat === 'number' && 
             typeof coord.height === 'number'
           );
  }
}

export default AddPolylineCommand;