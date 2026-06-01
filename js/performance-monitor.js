/**
 * 性能監控工具
 * 用於追蹤和報告應用程式的性能指標
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.history = [];
    this.maxHistory = 50;
  }

  start(label) {
    this.metrics.set(label, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  end(label) {
    const metric = this.metrics.get(label);
    if (!metric) return 0;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.history.push({
      label,
      duration: metric.duration,
      timestamp: Date.now()
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return metric.duration;
  }

  getDuration(label) {
    const metric = this.metrics.get(label);
    return metric?.duration || 0;
  }

  getAverageDuration(label) {
    const relevant = this.history.filter(h => h.label === label);
    if (relevant.length === 0) return 0;
    const sum = relevant.reduce((acc, h) => acc + h.duration, 0);
    return sum / relevant.length;
  }

  getReport() {
    const report = {};
    for (const [label, metric] of this.metrics) {
      if (metric.duration !== null) {
        report[label] = {
          duration: metric.duration.toFixed(2),
          average: this.getAverageDuration(label).toFixed(2)
        };
      }
    }
    return report;
  }

  logReport() {
    const report = this.getReport();
    console.group('⏱️ 性能報告');
    for (const [label, data] of Object.entries(report)) {
      console.log(`${label}: ${data.duration}ms (平均: ${data.average}ms)`);
    }
    console.groupEnd();
  }

  clear() {
    this.metrics.clear();
    this.history = [];
  }
}

window.PerformanceMonitor = PerformanceMonitor;
