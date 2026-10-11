const api = require('../../utils/api');
const app = getApp();

const roleNames = { parent: '家长', student: '学生', dorm_admin: '宿管' };

Page({
  data: {
    role: 'student',
    name: '',
    mobile: '',
    namePlaceholder: '请输入学生备案姓名',
    mobilePlaceholder: '请输入学生备案手机号',
    statusBarHeight: 20,
    navBarHeight: 44,
    agreed: false
  },
  onLoad(q) {
    this.layoutNav();
    if (q.role) {
      this.pickRole({ currentTarget: { dataset: { role: q.role } } });
    }
    api.get('/api/bind/profile').then(d => {
      const roles = (d && d.roles) || [];
      // 已绑定且非强制重绑时，回到首页；解绑后来此页可继续绑定
      if (roles.length && !(q && q.rebind)) {
        const bound = roles[0];
        app.setRole(bound);
        wx.showToast({
          title: '已绑定' + (roleNames[bound] || '') + '身份',
          icon: 'none'
        });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
      }
    }).catch(() => {});
  },
  layoutNav() {
    try {
      const sys = wx.getSystemInfoSync();
      const menu = wx.getMenuButtonBoundingClientRect();
      const statusBarHeight = sys.statusBarHeight || 20;
      const gap = Math.max(0, (menu.top || statusBarHeight) - statusBarHeight);
      const navBarHeight = gap * 2 + (menu.height || 32);
      this.setData({
        statusBarHeight,
        navBarHeight: Math.max(navBarHeight, 44)
      });
    } catch (e) {
      this.setData({ statusBarHeight: 20, navBarHeight: 44 });
    }
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: '/pages/index/index' });
  },
  pickRole(e) {
    const role = e.currentTarget.dataset.role;
    const map = {
      parent: { namePlaceholder: '请输入家长备案姓名', mobilePlaceholder: '请输入家长备案手机号' },
      student: { namePlaceholder: '请输入学生备案姓名', mobilePlaceholder: '请输入学生备案手机号' },
      dorm_admin: { namePlaceholder: '请输入宿管备案姓名', mobilePlaceholder: '请输入宿管备案手机号' }
    };
    this.setData(Object.assign({ role }, map[role] || map.student));
  },
  onName(e) {
    this.setData({ name: (e.detail.value || '').trim() });
  },
  onMobile(e) {
    this.setData({ mobile: (e.detail.value || '').trim() });
  },
  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },
  openLegal(e) {
    const type = e.currentTarget.dataset.type || 'privacy';
    wx.navigateTo({ url: '/pages/legal/legal?type=' + type });
  },
  submit() {
    const { role, name, mobile, agreed } = this.data;
    if (!agreed) {
      wx.showToast({ title: '请先阅读并同意协议', icon: 'none' });
      return;
    }
    if (!name || name.length < 2) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(mobile)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    const pathMap = {
      parent: '/api/bind/parentBind',
      student: '/api/bind/studentBind',
      dorm_admin: '/api/bind/dormAdminBind'
    };
    wx.showLoading({ title: '校验中', mask: true });
    api.post(pathMap[role], { name, mobile }).then(() => {
      wx.hideLoading();
      app.setRole(role);
      wx.showToast({ title: '绑定成功' });
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
    }).catch(msg => {
      wx.hideLoading();
      wx.showToast({ title: String(msg || '绑定失败'), icon: 'none', duration: 2800 });
    });
  }
});
