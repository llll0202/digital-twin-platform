export function analyzeDeviceStatus(device = []) {
  const risks = [];
  const suggestions = [];
  device.forEach((device) => {
    device.metrics.forEach((metric) => {
      const value = Number(metric.value);
      const unit = metric.unit || '';

      if (metric.name.includes('温度') && value > 1550) {
        risks.push(`${device.name}温度偏高，当前值 ${value}${unit}`);
        suggestions.push(`检查${device.name}冷却系统，持续观察温度变化`);
      }

      if (metric.name.includes('压力') && value > 5) {
        risks.push(`${device.name}压力偏高，当前值 ${value}${unit}`);
        suggestions.push(`检查${device.name}压力控制系统和安全阀状态`);
      }

      if (metric.name.includes('作业率') && value < 90) {
        risks.push(`${device.name}作业率偏低，当前值 ${value}${unit}`);
        suggestions.push(`排查${device.name}生产节拍和设备运行稳定性`);
      }

      if (metric.name.includes('合格率') && value < 95) {
        risks.push(`${device.name}合格率偏低，当前值 ${value}${unit}`);
        suggestions.push(`检查${device.name}工艺参数和质量控制流程`);
      }
    });
  });

  let level = 'normal';
  let summary = '设备运行状态正常，暂无明显异常。';
  if (risks.length > 0) {
    level = 'warning';
    summary = `检测到 ${risks.length} 项潜在风险，请关注相关设备状态。`;
  }

  if (risks.length >= 3) {
    level = 'danger';
    summary = `检测到 ${risks.length} 项异常风险，建议立即排查关键设备。`;
  }

  return {
    level,
    summary,
    risks,
    suggestions,
  };
}
