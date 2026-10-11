const api = require('../../utils/api');
const fmt = require('../../utils/format');

function leaveStatusLabel(leave) {
  const status = leave.status;
  if (status === 'pending_parent') return '待家长批准';
  if (status === 'parent_approved' || status === 'pending_teacher') return '待班主任批准';
  if (status === 'approved' || status === 'left' || status === 'returned') return '已批准';
  if (status === 'rejected' || status === 'parent_rejected' || status === 'teacher_rejected') return '已拒绝';
  return leave.status_display || status;
}

Page({
  data: {
    id: 0,
    mode: 'student',
    leave: {},
    statusLabel: '',
    dateRange: '',
    gateRecords: [],
    gateCount: 0,
    canAudit: false
  },
  onLoad(q) {
    this.setData({ id: q.id, mode: q.mode || 'student' });
    this.load();
  },
  load() {
    api.get('/api/leave/detail', { id: this.data.id }).then(d => {
      const leave = d.leave || {};
      const records = d.gate_records || leave.gate_records || [];
      const statusLabel = leaveStatusLabel(leave);
      this.setData({
        leave,
        statusLabel,
        dateRange: fmt.formatLeaveRange(leave),
        gateRecords: records,
        gateCount: records.length,
        canAudit: this.data.mode === 'parent' && leave.status === 'pending_parent'
      });
    });
  },
  agree() {
    api.post('/api/leave/parentAudit', { leave_id: this.data.id, agree: 1 }).then(() => {
      wx.showToast({ title: '已同意' });
      setTimeout(() => wx.navigateBack(), 500);
    }).catch(m => wx.showToast({ title: String(m), icon: 'none' }));
  },
  reject() {
    api.post('/api/leave/parentAudit', { leave_id: this.data.id, agree: 0 }).then(() => {
      wx.showToast({ title: '已拒绝' });
      setTimeout(() => wx.navigateBack(), 500);
    }).catch(m => wx.showToast({ title: String(m), icon: 'none' }));
  }
});
