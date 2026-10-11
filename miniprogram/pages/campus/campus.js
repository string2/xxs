const api = require('../../utils/api');

const categoryMap = {
  intro: '学校介绍',
  feature: '办学特色',
  rule: '管理制度',
  news: '校园动态'
};

const statusMap = {
  pending_parent: '待家长批准',
  parent_approved: '待班主任批准',
  pending_teacher: '待班主任批准',
  approved: '已批准',
  rejected: '已拒绝',
  parent_rejected: '已拒绝',
  teacher_rejected: '已拒绝',
  left: '已批准',
  returned: '已批准'
};

Page({
  data: { detail: null },
  onLoad(q) {
    if (q.id) this.loadDetail(q.id);
  },
  loadDetail(id) {
    api.get('/api/campus/detail', { id }).then(d => {
      const cat = (d.category || '').toLowerCase();
      d.categoryLabel = categoryMap[cat] || d.category || '校园资讯';
      this.setData({ detail: d });
      if (d && d.title) wx.setNavigationBarTitle({ title: d.title });
    }).catch(msg => wx.showToast({ title: String(msg), icon: 'none' }));
  }
});
