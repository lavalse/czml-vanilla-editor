/**
 * 添加点命令类
 * 实现命令模式，支持撤销/重做功能
 * 为将来的Rhino风格Command based UI做准备
 */
class AddPointCommand {
  constructor(czmlModel, coord) {
    this.czmlModel = czmlModel;
    this.coord = coord;
    this.pointId = null;
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

      this.pointId = this.czmlModel.addPoint(this.coord);
      this.executed = true;
      
      console.log(`AddPointCommand executed: ${this.pointId}`);
      return true;
      
    } catch (error) {
      console.error('AddPointCommand execution failed:', error);
      return false;
    }
  }

  /**
   * 撤销命令
   * @returns {boolean} 是否撤销成功
   */
  undo() {
    try {
      if (!this.executed || !this.pointId) {
        console.warn('无法撤销：命令未执行或无效的点ID');
        return false;
      }

      // 这里需要在CzmlModel中实现removePoint方法
      // 现在先用简单的方式处理
      const czmlDoc = this.czmlModel.getCzmlDocument();
      const index = czmlDoc.findIndex(entity => entity.id === this.pointId);
      
      if (index > 0) {
        czmlDoc.splice(index, 1);
        this.czmlModel.notifyListeners();
        this.executed = false;
        
        console.log(`AddPointCommand undone: ${this.pointId}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('AddPointCommand undo failed:', error);
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
   * 获取命令描述
   * @returns {string} 命令描述
   */
  getDescription() {
    return `添加点 (${this.coord.lon.toFixed(6)}, ${this.coord.lat.toFixed(6)})`;
  }

  /**
   * 获取命令类型
   * @returns {string} 命令类型
   */
  getType() {
    return 'AddPointCommand';
  }

  /**
   * 验证命令是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    return this.coord && 
           typeof this.coord.lon === 'number' && 
           typeof this.coord.lat === 'number' && 
           typeof this.coord.height === 'number';
  }
}

export default AddPointCommand;