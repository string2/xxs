const api = require('../../utils/api');
const fmt = require('../../utils/format');

function leaveStatusView(item) {
  const status = item.status;
  if (status === 'pending_parent') return { label: '待家长批准', dot: 'warn' };
  if (status === 'parent_approved' || status === 'pending_teacher') return { label: '待班主任批准', dot: 'warn' };
  if (status === 'approved' || status === 'left' || status === 'returned') return { label: '已批准', dot: 'ok' };
  if (status === 'rejected' || status === 'parent_rejected' || status === 'teacher_rejected') {
    return { label: '已拒绝', dot: 'danger' };
  }
  return { label: item.status_display || status, dot: 'muted' };
}

function mapLeaveItem(item) {
  const s = leaveStatusView(item);
  const gateCount = Number(item.gate_count || (item.gate_records || []).length || 0);
  return Object.assign({}, item, {
    statusLabel: s.label,
    dotClass: s.dot,
    dateRange: fmt.formatLeaveRange(item),
    gate_count: gateCount,
    gate_records: item.gate_records || [],
    gateExpanded: false
  });
}

Page({
  data: { mode: 'student', list: [] },
  onLoad(q) {
    this.setData({ mode: q.mode || 'student' });
  },
  onShow() {
    const path = this.data.mode === 'parent' ? '/api/leave/parentList' : '/api/leave/myList';
    api.get(path).then(d => {
      this.setData({ list: (d.list || []).map(mapLeaveItem) });
    });
  },
  apply() {
    wx.navigateTo({ url: '/pages/leave-apply/leave-apply' });
  },
  go(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/leave-audit/leave-audit?id=' + id + '&mode=' + this.data.mode });
  },
  toggleGate(e) {
    const idx = e.currentTarget.dataset.idx;
    const key = 'list[' + idx + '].gateExpanded';
    this.setData({ [key]: !this.data.list[idx].gateExpanded });
  }
});
