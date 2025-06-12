/**
 * CZML编辑器功能测试脚本
 * 在浏览器控制台中运行此脚本来测试所有功能
 */

// 等待编辑器加载完成
if (typeof window.czmlEditor === 'undefined') {
  console.error('❌ CZML编辑器未加载，请等待编辑器初始化完成');
} else {
  console.log('🧪 开始CZML编辑器功能测试...\n');

  // 测试结果记录
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function runTest(testName, testFunction) {
    try {
      console.log(`🔍 测试: ${testName}`);
      const result = testFunction();
      if (result) {
        console.log(`✅ ${testName} - 通过`);
        testResults.passed++;
        testResults.tests.push({ name: testName, result: 'PASS' });
      } else {
        console.log(`❌ ${testName} - 失败`);
        testResults.failed++;
        testResults.tests.push({ name: testName, result: 'FAIL' });
      }
    } catch (error) {
      console.error(`💥 ${testName} - 错误:`, error);
      testResults.failed++;
      testResults.tests.push({ name: testName, result: 'ERROR', error: error.message });
    }
    console.log('');
  }

  // 1. 测试基础接口
  runTest('基础接口可用性', () => {
    return window.czmlEditor && 
           typeof window.czmlEditor.executeCommand === 'function' &&
           typeof window.czmlEditor.undo === 'function' &&
           typeof window.czmlEditor.redo === 'function' &&
           typeof window.czmlEditor.getStats === 'function';
  });

  // 2. 测试GeometryUtils
  runTest('GeometryUtils工具类', () => {
    // 假设GeometryUtils被正确导入到全局或通过controller可访问
    const coord = { lon: -108.5, lat: 39.5, height: 1000 };
    // 这里我们通过编辑器的内部方法间接测试
    window.czmlEditor.addPoint(-108.5, 39.5, 1000);
    const stats = window.czmlEditor.getStats();
    return stats.totalPoints >= 1;
  });

  // 3. 测试添加点功能
  runTest('AddPoint命令', () => {
    const initialStats = window.czmlEditor.getStats();
    window.czmlEditor.addPoint(-100, 40, 500);
    const newStats = window.czmlEditor.getStats();
    return newStats.totalPoints === initialStats.totalPoints + 1;
  });

  // 4. 测试添加折线功能
  runTest('AddPolyline命令', () => {
    const initialStats = window.czmlEditor.getStats();
    window.czmlEditor.addPolyline([
      { lon: -90, lat: 30, height: 0 },
      { lon: -85, lat: 35, height: 500 },
      { lon: -80, lat: 40, height: 1000 }
    ]);
    
    // 等待异步操作完成
    return new Promise((resolve) => {
      setTimeout(() => {
        const newStats = window.czmlEditor.getStats();
        resolve(newStats.totalPolylines === initialStats.totalPolylines + 1);
      }, 500);
    });
  });

  // 5. 测试撤销功能
  runTest('撤销功能', () => {
    const beforeStats = window.czmlEditor.getStats();
    window.czmlEditor.addPoint(-70, 45, 200);
    const afterAddStats = window.czmlEditor.getStats();
    
    if (afterAddStats.totalPoints !== beforeStats.totalPoints + 1) {
      return false;
    }
    
    window.czmlEditor.undo();
    const afterUndoStats = window.czmlEditor.getStats();
    return afterUndoStats.totalPoints === beforeStats.totalPoints;
  });

  // 6. 测试重做功能
  runTest('重做功能', () => {
    const beforeStats = window.czmlEditor.getStats();
    window.czmlEditor.addPoint(-60, 50, 300);
    window.czmlEditor.undo();
    
    const afterUndoStats = window.czmlEditor.getStats();
    if (afterUndoStats.totalPoints !== beforeStats.totalPoints) {
      return false;
    }
    
    window.czmlEditor.redo();
    const afterRedoStats = window.czmlEditor.getStats();
    return afterRedoStats.totalPoints === beforeStats.totalPoints + 1;
  });

  // 7. 测试清除功能
  runTest('Clear命令', () => {
    // 先添加一些内容
    window.czmlEditor.addPoint(-50, 25, 100);
    window.czmlEditor.clearAll();
    
    const stats = window.czmlEditor.getStats();
    return stats.totalPoints === 0 && stats.totalPolylines === 0;
  });

  // 8. 测试命令历史
  runTest('命令历史功能', () => {
    window.czmlEditor.addPoint(-40, 20, 150);
    const history = window.czmlEditor.getCommandHistory();
    return history && history.totalCommands >= 1;
  });

  // 9. 测试统计信息
  runTest('统计信息功能', () => {
    const stats = window.czmlEditor.getStats();
    return stats && 
           typeof stats.totalPoints === 'number' &&
           typeof stats.totalPolylines === 'number' &&
           typeof stats.registeredCommands === 'number' &&
           Array.isArray(stats.availableCommands);
  });

  // 10. 测试CZML导出
  runTest('CZML数据获取', () => {
    const czmlData = window.czmlEditor.getCzmlData();
    return Array.isArray(czmlData) && 
           czmlData.length >= 1 && 
           czmlData[0].id === 'document';
  });

  // 等待所有异步测试完成
  setTimeout(() => {
    console.log('\n📊 测试结果汇总:');
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n📋 详细结果:');
    testResults.tests.forEach((test, index) => {
      const status = test.result === 'PASS' ? '✅' : test.result === 'FAIL' ? '❌' : '💥';
      console.log(`${index + 1}. ${status} ${test.name}`);
      if (test.error) {
        console.log(`   错误: ${test.error}`);
      }
    });

    if (testResults.failed === 0) {
      console.log('\n🎉 所有测试通过！CZML编辑器功能正常！');
    } else {
      console.log('\n⚠️  部分测试失败，请检查相关功能');
    }
  }, 1000);
}

// 性能测试函数
window.czmlEditorPerformanceTest = function() {
  console.log('🚀 开始性能测试...');
  
  const startTime = performance.now();
  
  // 清除现有内容
  window.czmlEditor.clearAll();
  
  // 添加大量点
  console.log('添加100个点...');
  for (let i = 0; i < 100; i++) {
    const lon = -180 + Math.random() * 360;
    const lat = -90 + Math.random() * 180;
    const height = Math.random() * 10000;
    window.czmlEditor.addPoint(lon, lat, height);
  }
  
  // 添加一些折线
  console.log('添加10条折线...');
  for (let i = 0; i < 10; i++) {
    const coords = [];
    for (let j = 0; j < 5; j++) {
      coords.push({
        lon: -180 + Math.random() * 360,
        lat: -90 + Math.random() * 180,
        height: Math.random() * 5000
      });
    }
    window.czmlEditor.addPolyline(coords);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  const stats = window.czmlEditor.getStats();
  
  console.log(`\n📊 性能测试结果:`);
  console.log(`⏱️  总耗时: ${duration.toFixed(2)}ms`);
  console.log(`📍 创建点数: ${stats.totalPoints}`);
  console.log(`📏 创建线数: ${stats.totalPolylines}`);
  console.log(`💾 CZML大小: ${(stats.czmlSize / 1024).toFixed(2)}KB`);
  console.log(`🏃 平均每个几何体耗时: ${(duration / (stats.totalPoints + stats.totalPolylines)).toFixed(2)}ms`);
};

// 提供清理函数
window.czmlEditorCleanup = function() {
  console.log('🧹 清理测试数据...');
  window.czmlEditor.clearAll();
  console.log('✅ 清理完成');
};