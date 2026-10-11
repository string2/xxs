const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    mode: 'scan',
    list: [],
    studentId: 0,
    passStatus: null,
    mobile: ''
  },
  onLoad(q) {
    this.setData({ mode: q.mode || 'scan' });
  },
  onShow() {
    api.get('/api/bind/profile').then(d => {
      let studentId = 0;
      let mobile = '';
      if (d.student) {
        studentId = d.student.id;
        mobile = d.student.mobile || '';
      } else if (d.children && d.children[0]) {
        studentId = d.children[0].id;
        mobile = d.children[0].mobile || '';
      }
      this.setData({ studentId, mobile });
      if (studentId && this.data.mode !== 'view') {
        api.get('/api/gate/passStatus').then(s => this.setData({ passStatus: s }));
      }
      if (studentId) {
        api.get('/api/gate/records', { student_id: studentId }).then(r => {
          const list = (r.list || []).map(item => ({
            ...item,
            passtime: format.formatDateTime(item.passtime)
          }));
          this.setData({ list });
        });
      }
    });
  }
});
