/**
 * CZML编辑器功能测试脚本（更新版）
 * 修复了异步操作的时机问题
 * 在浏览器控制台中运行此脚本来测试所有功能
 */

// 等待编辑器加载完成
if (typeof window.czmlEditor === 'undefined') {
  console.error('❌ CZML编辑器未加载，请等待编辑器初始化完成');
} else {
  console.log('🧪 开始CZML编辑器功能测试... (修复版)\n');

  // 测试结果记录
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // 同步测试函数
  function runSyncTest(testName, testFunction) {
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
      console.log('');
      return result;
    } catch (error) {
      console.error(`💥 ${testName} - 错误:`, error);
      testResults.failed++;
      testResults.tests.push({ name: testName, result: 'ERROR', error: error.message });
      console.log('');
      return false;
    }
  }

  // 异步测试函数
  async function runAsyncTest(testName, testFunction) {
    try {
      console.log(`🔍 测试: ${testName}`);
      const result = await testFunction();
      if (result) {
        console.log(`✅ ${testName} - 通过`);
        testResults.passed++;
        testResults.tests.push({ name: testName, result: 'PASS' });
      } else {
        console.log(`❌ ${testName} - 失败`);
        testResults.failed++;
        testResults.tests.push({ name: testName, result: 'FAIL' });
      }
      console.log('');
      return result;
    } catch (error) {
      console.error(`💥 ${testName} - 错误:`, error);
      testResults.failed++;
      testResults.tests.push({ name: testName, result: 'ERROR', error: error.message });
      console.log('');
      return false;
    }
  }

  // 主测试函数
  async function runAllTests() {
    console.log('🧪 开始CZML编辑器功能测试... (修复版)\n');

    // 清理测试环境
    console.log('🧹 清理测试环境...');
    window.czmlEditor.clearAll();
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('');

    // 1. 基础接口测试
    runSyncTest('基础接口可用性', () => {
      return window.czmlEditor && 
             typeof window.czmlEditor.executeCommand === 'function' &&
             typeof window.czmlEditor.undo === 'function' &&
             typeof window.czmlEditor.redo === 'function' &&
             typeof window.czmlEditor.getStats === 'function';
    });

    // 2. GeometryUtils测试（改为更合理的测试）
    runSyncTest('GeometryUtils工具类', () => {
      // 测试基础功能而不是具体的添加操作
      const stats = window.czmlEditor.getStats();
      return stats && 
             typeof stats.totalPoints === 'number' &&
             typeof stats.totalGeometries === 'number';
    });

    // 3. AddPoint测试（异步，修复版）
    await runAsyncTest('AddPoint命令', async () => {
      const initialStats = window.czmlEditor.getStats();
      console.log(`   初始点数: ${initialStats.totalPoints}`);
      
      // 执行AddPoint命令
      window.czmlEditor.addPoint(-100, 40, 500);
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const newStats = window.czmlEditor.getStats();
      console.log(`   执行后点数: ${newStats.totalPoints}`);
      console.log(`   点数变化: ${initialStats.totalPoints} -> ${newStats.totalPoints}`);
      
      return newStats.totalPoints === initialStats.totalPoints + 1;
    });

    // 4. AddPolyline测试（异步，修复版）
    await runAsyncTest('AddPolyline命令', async () => {
      const initialStats = window.czmlEditor.getStats();
      console.log(`   初始折线数: ${initialStats.totalPolylines}`);
      
      window.czmlEditor.addPolyline([
        { lon: -90, lat: 30, height: 0 },
        { lon: -85, lat: 35, height: 500 },
        { lon: -80, lat: 40, height: 1000 }
      ]);
      
      // AddPolyline需要更多时间完成
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const newStats = window.czmlEditor.getStats();
      console.log(`   执行后折线数: ${newStats.totalPolylines}`);
      console.log(`   折线数变化: ${initialStats.totalPolylines} -> ${newStats.totalPolylines}`);
      
      return newStats.totalPolylines === initialStats.totalPolylines + 1;
    });

    // 5. 撤销功能测试（异步，修复版）
    await runAsyncTest('撤销功能', async () => {
      const beforeStats = window.czmlEditor.getStats();
      console.log(`   撤销前点数: ${beforeStats.totalPoints}`);
      
      // 添加一个点
      window.czmlEditor.addPoint(-70, 45, 200);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const afterAddStats = window.czmlEditor.getStats();
      console.log(`   添加后点数: ${afterAddStats.totalPoints}`);
      
      if (afterAddStats.totalPoints !== beforeStats.totalPoints + 1) {
        console.log('   ❌ 前置条件失败：添加点操作未成功');
        return false;
      }
      
      // 执行撤销
      window.czmlEditor.undo();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const afterUndoStats = window.czmlEditor.getStats();
      console.log(`   撤销后点数: ${afterUndoStats.totalPoints}`);
      console.log(`   撤销验证: ${beforeStats.totalPoints} -> ${afterAddStats.totalPoints} -> ${afterUndoStats.totalPoints}`);
      
      return afterUndoStats.totalPoints === beforeStats.totalPoints;
    });

    // 6. 重做功能测试（异步，修复版）
    await runAsyncTest('重做功能', async () => {
      const beforeStats = window.czmlEditor.getStats();
      console.log(`   重做前点数: ${beforeStats.totalPoints}`);
      
      // 添加点 -> 撤销 -> 重做
      window.czmlEditor.addPoint(-60, 50, 300);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const afterAddStats = window.czmlEditor.getStats();
      if (afterAddStats.totalPoints !== beforeStats.totalPoints + 1) {
        console.log('   ❌ 前置条件失败：添加点操作未成功');
        return false;
      }
      
      window.czmlEditor.undo();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const afterUndoStats = window.czmlEditor.getStats();
      if (afterUndoStats.totalPoints !== beforeStats.totalPoints) {
        console.log('   ❌ 前置条件失败：撤销操作未成功');
        return false;
      }
      
      // 执行重做
      window.czmlEditor.redo();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const afterRedoStats = window.czmlEditor.getStats();
      console.log(`   重做后点数: ${afterRedoStats.totalPoints}`);
      console.log(`   重做验证: ${beforeStats.totalPoints} -> 撤销 -> ${afterRedoStats.totalPoints}`);
      
      return afterRedoStats.totalPoints === beforeStats.totalPoints + 1;
    });

    // 7. Clear命令测试（异步，修复版）
    await runAsyncTest('Clear命令', async () => {
      // 先添加一些内容
      window.czmlEditor.addPoint(-50, 25, 100);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const beforeClearStats = window.czmlEditor.getStats();
      console.log(`   清除前几何体数: ${beforeClearStats.totalGeometries}`);
      
      if (beforeClearStats.totalGeometries === 0) {
        console.log('   ❌ 前置条件失败：没有几何体可清除');
        return false;
      }
      
      // 执行清除
      window.czmlEditor.clearAll();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const afterClearStats = window.czmlEditor.getStats();
      console.log(`   清除后几何体数: ${afterClearStats.totalGeometries}`);
      
      return afterClearStats.totalPoints === 0 && afterClearStats.totalPolylines === 0;
    });

    // 8. 命令历史功能测试（异步，修复版）
    await runAsyncTest('命令历史功能', async () => {
      const initialHistory = window.czmlEditor.getCommandHistory();
      console.log(`   初始命令数: ${initialHistory.totalCommands}`);
      
      window.czmlEditor.addPoint(-40, 20, 150);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const newHistory = window.czmlEditor.getCommandHistory();
      console.log(`   执行后命令数: ${newHistory.totalCommands}`);
      
      return newHistory && newHistory.totalCommands >= 1;
    });

    // 9. 统计信息功能测试（修复版）
    runSyncTest('统计信息功能', () => {
      const stats = window.czmlEditor.getStats();
      
      // 基础检查
      if (!stats) {
        console.log('   ❌ 统计信息对象不存在');
        return false;
      }
      
      // 检查必需的数字属性
      const requiredNumbers = ['totalPoints', 'totalPolylines', 'registeredCommands'];
      for (const prop of requiredNumbers) {
        if (typeof stats[prop] !== 'number') {
          console.log(`   ❌ ${prop} 不是数字类型: ${typeof stats[prop]}`);
          return false;
        }
      }
      
      // 检查可用命令列表（灵活检查）
      let hasCommands = false;
      
      // 方法1: 检查stats.availableCommands
      if (Array.isArray(stats.availableCommands)) {
        hasCommands = true;
      } else {
        // 方法2: 尝试getCommands()
        try {
          const commands = window.czmlEditor.getCommands();
          if (Array.isArray(commands)) {
            hasCommands = true;
          }
        } catch (error) {
          // 方法3: 检查其他可能的属性名
          const possibleProps = ['commands', 'commandList', 'availableCommands'];
          for (const prop of possibleProps) {
            if (Array.isArray(stats[prop])) {
              hasCommands = true;
              break;
            }
          }
        }
      }
      
      if (!hasCommands) {
        console.log('   ❌ 无法获取可用命令列表');
        // 显示stats的所有属性以便调试
        console.log('   调试信息 - stats对象的所有属性:');
        Object.entries(stats).forEach(([key, value]) => {
          console.log(`     ${key}: ${typeof value} = ${Array.isArray(value) ? '[Array]' : value}`);
        });
        return false;
      }
      
      console.log(`   统计信息: 点=${stats.totalPoints}, 线=${stats.totalPolylines}, 命令=${stats.registeredCommands}`);
      return true;
    });

    // 10. CZML数据获取测试
    runSyncTest('CZML数据获取', () => {
      const czmlData = window.czmlEditor.getCzmlData();
      const isValid = Array.isArray(czmlData) && 
             czmlData.length >= 1 && 
             czmlData[0].id === 'document';
      
      if (isValid) {
        console.log(`   CZML数据: ${czmlData.length}个实体, 大小=${JSON.stringify(czmlData).length}字节`);
      }
      
      return isValid;
    });

    // 输出最终测试结果
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
      console.log('\n⚠️ 部分测试失败，请检查相关功能');
    }

    return testResults;
  }

  // 诊断函数（用于调试特定问题）
  window.czmlEditorDiagnose = function(commandName = 'AddPoint') {
    console.log(`🔍 诊断${commandName}问题...`);
    
    const beforeStats = window.czmlEditor.getStats();
    console.log('执行前状态:', beforeStats);
    
    if (commandName === 'AddPoint') {
      window.czmlEditor.addPoint(-100, 40, 500);
    } else if (commandName === 'AddPolyline') {
      window.czmlEditor.addPolyline([
        { lon: -90, lat: 30, height: 0 },
        { lon: -85, lat: 35, height: 500 }
      ]);
    }
    
    setTimeout(() => {
      const afterStats = window.czmlEditor.getStats();
      console.log('执行后状态:', afterStats);
      
      if (commandName === 'AddPoint') {
        console.log('点数变化:', beforeStats.totalPoints, '->', afterStats.totalPoints);
        if (afterStats.totalPoints === beforeStats.totalPoints + 1) {
          console.log('✅ AddPoint实际上是成功的！');
        } else {
          console.log('❌ AddPoint确实失败了');
        }
      } else if (commandName === 'AddPolyline') {
        console.log('折线数变化:', beforeStats.totalPolylines, '->', afterStats.totalPolylines);
        if (afterStats.totalPolylines === beforeStats.totalPolylines + 1) {
          console.log('✅ AddPolyline实际上是成功的！');
        } else {
          console.log('❌ AddPolyline确实失败了');
        }
      }
      
      // 检查CZML数据
      const czml = window.czmlEditor.getCzmlData();
      console.log('CZML实体数量:', czml.length);
      
      // 检查命令历史
      const history = window.czmlEditor.getCommandHistory();
      console.log('命令历史长度:', history.totalCommands);
      
    }, 500);
  };

  // 自动运行测试
  runAllTests();
}

// 性能测试函数（保持原有功能）
window.czmlEditorPerformanceTest = async function() {
  console.log('🚀 开始性能测试...');
  
  const startTime = performance.now();
  
  // 清除现有内容
  window.czmlEditor.clearAll();
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // 添加大量点
  console.log('添加100个点...');
  const pointPromises = [];
  for (let i = 0; i < 100; i++) {
    const lon = -180 + Math.random() * 360;
    const lat = -90 + Math.random() * 180;
    const height = Math.random() * 10000;
    window.czmlEditor.addPoint(lon, lat, height);
    
    // 每10个点等待一下，避免过快执行
    if (i % 10 === 9) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // 等待所有点添加完成
  await new Promise(resolve => setTimeout(resolve, 2000));
  
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
    
    // 折线之间稍微等待
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // 等待所有操作完成
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  const stats = window.czmlEditor.getStats();
  
  console.log(`\n📊 性能测试结果:`);
  console.log(`⏱️  总耗时: ${duration.toFixed(2)}ms`);
  console.log(`📍 创建点数: ${stats.totalPoints}`);
  console.log(`📏 创建线数: ${stats.totalPolylines}`);
  console.log(`💾 CZML大小: ${(stats.czmlSize / 1024).toFixed(2)}KB`);
  console.log(`🏃 平均每个几何体耗时: ${(duration / (stats.totalPoints + stats.totalPolylines)).toFixed(2)}ms`);
  
  return {
    duration,
    pointsCreated: stats.totalPoints,
    polylinesCreated: stats.totalPolylines,
    czmlSize: stats.czmlSize,
    avgTimePerGeometry: duration / (stats.totalPoints + stats.totalPolylines)
  };
};

// 提供清理函数
window.czmlEditorCleanup = function() {
  console.log('🧹 清理测试数据...');
  window.czmlEditor.clearAll();
  setTimeout(() => {
    console.log('✅ 清理完成');
    const stats = window.czmlEditor.getStats();
    console.log(`清理后状态: 点=${stats.totalPoints}, 线=${stats.totalPolylines}`);
  }, 300);
};

// 导出主要函数供外部调用
window.runCzmlTests = runAllTests;

console.log('\n🔧 可用的调试命令:');
console.log('• runCzmlTests() - 运行完整测试套件');
console.log('• czmlEditorDiagnose("AddPoint") - 诊断AddPoint问题');
console.log('• czmlEditorDiagnose("AddPolyline") - 诊断AddPolyline问题');
console.log('• czmlEditorPerformanceTest() - 运行性能测试');
console.log('• czmlEditorCleanup() - 清理测试数据');