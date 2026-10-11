const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    roleText: '未选择',
    menus: []
  },
  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.loadProfile();
  },
  loadProfile() {
    api.get('/api/bind/profile').then(data => {
      app.globalData.profile = data;
      const role = app.globalData.role || (data.roles[0] || '');
      if (!role && (!data.roles || !data.roles.length)) {
        wx.redirectTo({ url: '/pages/bind/bind' });
        return;
      }
      if (role) app.setRole(role);
      this.buildMenus(role || data.roles[0]);
    }).catch(() => {
      // token 失效时 api 层会清凭证并跳转登录，此处不再弹 toast
    });
  },
  buildMenus(role) {
    const map = {
      parent: [
        { name: '成绩查询', icon: 'ic-score', tone: 'tone-2', url: '/pages/score/score' },
        { name: '成绩趋势', icon: 'ic-trend', tone: 'tone-3', url: '/pages/score-chart/score-chart' },
        { name: '协议签字', icon: 'ic-sign', tone: 'tone-1', url: '/pages/agreement/agreement' },
        { name: '请假审核', icon: 'ic-audit', tone: 'tone-4', url: '/pages/leave-list/leave-list?mode=parent' },
        { name: '进出记录', icon: 'ic-gate', tone: 'tone-5', url: '/pages/gate/gate?mode=view' }
      ],
      student: [
        { name: '我要请假', icon: 'ic-leave', tone: 'tone-2', url: '/pages/leave-apply/leave-apply' },
        { name: '我的请假', icon: 'ic-list', tone: 'tone-3', url: '/pages/leave-list/leave-list?mode=student' },
        { name: '门禁扫码', icon: 'ic-scan', tone: 'tone-1', url: '/pages/gate/gate' }
      ],
      dorm_admin: [
        { name: '每日查寝', icon: 'ic-dorm', tone: 'tone-1', url: '/pages/dorm/dorm' },
        { name: '今日记录', icon: 'ic-record', tone: 'tone-2', url: '/pages/dorm-check/dorm-check' }
      ]
    };
    const names = { parent: '身份 · 家长', student: '身份 · 学生', dorm_admin: '身份 · 宿管' };
    this.setData({
      roleText: names[role] || role || '未绑定',
      menus: map[role] || [{ name: '去绑定身份', icon: 'ic-bind', tone: 'tone-3', url: '/pages/bind/bind' }]
    });
  },
  go(e) {
    const url = e.currentTarget.dataset.url;
    const tabPages = ['/pages/index/index', '/pages/mine/mine'];
    const path = url.split('?')[0];
    if (tabPages.indexOf(path) !== -1) {
      wx.switchTab({ url: path });
    } else {
      wx.navigateTo({ url });
    }
  }
});
