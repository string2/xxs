const api = require('../../utils/api');

const resultMap = {
  normal: { label: '正常', dot: 'ok', pill: 'ok' },
  abnormal: { label: '异常', dot: 'danger', pill: 'danger' },
  leave: { label: '请假', dot: 'warn', pill: 'warn' }
};

Page({
  data: { check: null, items: [] },
  onShow() {
    api.get('/api/dorm/today').then(d => {
      const items = (d.items || []).map(it => {
        const r = resultMap[it.result] || { label: it.result, dot: 'muted', pill: '' };
        return Object.assign({}, it, {
          resultLabel: r.label,
          dotClass: r.dot,
          pillClass: r.pill
        });
      });
      this.setData({ check: d.check, items });
    }).catch(m => wx.showToast({ title: String(m), icon: 'none' }));
  }
});
