const api = require('../../utils/api');
const avatarUtil = require('../../utils/avatar');
const app = getApp();

const roleNames = { parent: '家长端', student: '学生端', dorm_admin: '寝室管理端' };
const quickLinkMap = {
  parent: [
    { title: '请假审核', desc: '处理子女请假', url: '/pages/leave-list/leave-list?mode=parent' },
    { title: '成绩查询', desc: '查看考试成绩', url: '/pages/score/score' }
  ],
  student: [
    { title: '我的请假', desc: '查看审批进度', url: '/pages/leave-list/leave-list?mode=student' },
    { title: '我要请假', desc: '提交新的申请', url: '/pages/leave-apply/leave-apply' }
  ],
  dorm_admin: [
    { title: '每日查寝', desc: '标记房间状态', url: '/pages/dorm/dorm' },
    { title: '查寝记录', desc: '今日查寝明细', url: '/pages/dorm-check/dorm-check' }
  ]
};

const categoryMap = {
  intro: '学校介绍',
  feature: '办学特色',
  rule: '管理制度',
  news: '校园动态'
};

const campusIconMap = {
  intro: { iconMark: '学', iconTone: 'intro' },
  feature: { iconMark: '特', iconTone: 'feature' },
  rule: { iconMark: '制', iconTone: 'rule' },
  news: { iconMark: '讯', iconTone: 'news' }
};

function pickCampusIcon(item) {
  const cat = (item.category || '').toLowerCase();
  const title = item.title || '';
  if (campusIconMap[cat]) return campusIconMap[cat];
  if (title.indexOf('简介') >= 0) return campusIconMap.intro;
  if (title.indexOf('特色') >= 0) return campusIconMap.feature;
  if (title.indexOf('制度') >= 0) return campusIconMap.rule;
  return { iconMark: title.slice(0, 1) || '讯', iconTone: 'news' };
}

Page({
  data: {
    role: '',
    roleLabel: '未绑定',
    roleClass: '',
    nickname: '',
    mobile: '',
    avatarUrl: '',
    avatarDisplay: '',
    avatarText: '校',
    boundText: '尚未绑定身份',
    quickLinks: [],
    newsList: [],
    bannerPadTop: 96
  },
  onLoad() {
    this.layoutBanner();
  },
  onShow() {
    this.refreshProfile();
    this.loadNews();
  },
  layoutBanner() {
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      // 头像落在胶囊下方，留出呼吸空间
      const padTop = Math.ceil((menu.bottom || 0) + 16);
      this.setData({ bannerPadTop: Math.max(padTop, 84) });
    } catch (e) {
      this.setData({ bannerPadTop: 100 });
    }
  },
  refreshProfile() {
    const role = app.globalData.role || '';
    this.setData({
      role,
      roleLabel: roleNames[role] || role || '未绑定'
    });
    api.get('/api/bind/profile').then(d => {
      app.globalData.profile = d;
      const user = d.user || {};
      const nickname = user.nickname || user.username || '';
      const mobile = this.pickMobile(d, user);
      const roles = d.roles || [];
      const current = role || roles[0] || '';
      const boundText = current
        ? ('已绑定' + (roleNames[current] || '身份'))
        : '尚未绑定身份';
      if (current) app.setRole(current);
      const resolved = avatarUtil.resolve(user.avatar);
      this.setData({
        nickname,
        mobile,
        avatarUrl: resolved,
        avatarDisplay: this.pickAvatarDisplay(resolved),
        avatarText: (nickname || '校').slice(0, 1),
        role: current,
        roleLabel: roleNames[current] || '未绑定',
        roleClass: current === 'parent' ? 'role-parent' : current === 'student' ? 'role-student' : current === 'dorm_admin' ? 'role-dorm' : '',
        boundText,
        quickLinks: quickLinkMap[current] || []
      });
    }).catch(() => {});
  },
  pickMobile(profile, user) {
    const fromUser = (user && user.mobile) || '';
    if (fromUser) return String(fromUser);
    const student = profile && profile.student;
    if (student && student.mobile) return String(student.mobile);
    const parent = profile && profile.parent;
    if (parent && parent.mobile) return String(parent.mobile);
    const dorm = profile && profile.dorm_admin;
    if (dorm && dorm.mobile) return String(dorm.mobile);
    return '';
  },
  pickAvatarDisplay(url) {
    if (!url) return '';
    if (/^wxfile:\/\//i.test(url) || /^https:\/\//i.test(url)) return url;
    if (/^http:\/\//i.test(url)) {
      const local = wx.getStorageSync('mineAvatarLocal') || '';
      if (local) return local;
    }
    return url;
  },
  onAvatarError() {
    this.setData({ avatarDisplay: '' });
  },
  onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;
    if (!tempPath) return;
    wx.setStorageSync('mineAvatarLocal', tempPath);
    wx.showLoading({ title: '同步头像', mask: true });
    avatarUtil.saveWxAvatar(tempPath).then(data => {
      wx.hideLoading();
      const user = (data && data.userinfo) || {};
      const resolved = avatarUtil.resolve(user.avatar) || tempPath;
      this.setData({
        avatarUrl: resolved,
        avatarDisplay: tempPath,
        nickname: user.nickname || this.data.nickname,
        avatarText: ((user.nickname || this.data.nickname) || '校').slice(0, 1)
      });
      wx.showToast({ title: '头像已更新' });
    }).catch(msg => {
      wx.hideLoading();
      wx.showToast({ title: String(msg), icon: 'none' });
    });
  },
  loadNews() {
    api.get('/api/campus/lists').then(d => {
      const raw = d.list || [];
      const newsList = raw.map(item => {
        const cat = (item.category || '').toLowerCase();
        const icon = pickCampusIcon(item);
        return Object.assign({}, item, {
          categoryLabel: categoryMap[cat] || item.category || '校园资讯',
          iconMark: icon.iconMark,
          iconTone: icon.iconTone
        });
      });
      this.setData({ newsList });
    }).catch(() => this.setData({ newsList: [] }));
  },
  openNews(e) {
    wx.navigateTo({ url: '/pages/campus/campus?id=' + e.currentTarget.dataset.id });
  },
  goPage(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url });
  },
  toBind() {
    const role = this.data.role || app.globalData.role || '';
    if (!role) {
      wx.navigateTo({ url: '/pages/bind/bind' });
      return;
    }
    wx.showActionSheet({
      itemList: ['解绑并重新绑定', '仅解绑身份'],
      success: res => {
        if (res.tapIndex === 0) {
          this.confirmUnbind(true);
        } else if (res.tapIndex === 1) {
          this.confirmUnbind(false);
        }
      }
    });
  },
  confirmUnbind(goBind) {
    const role = this.data.role || '';
    const label = roleNames[role] || '当前';
    wx.showModal({
      title: goBind ? '解绑并重新绑定' : '解绑身份',
      content: goBind
        ? ('将解绑「' + label + '」身份并清空已绑手机号，然后可重新选择角色与手机号绑定。是否继续？')
        : ('将解绑「' + label + '」身份并清空已绑手机号，解绑后需重新绑定才能使用对应服务。是否继续？'),
      confirmColor: '#0f1c24',
      success: res => {
        if (!res.confirm) return;
        this.doUnbind(goBind);
      }
    });
  },
  doUnbind(goBind) {
    wx.showLoading({ title: '解绑中', mask: true });
    api.post('/api/bind/unbind', {}).then(() => {
      wx.hideLoading();
      app.setRole('');
      app.globalData.profile = null;
      this.setData({
        role: '',
        roleLabel: '未绑定',
        roleClass: '',
        boundText: '尚未绑定身份',
        mobile: '',
        quickLinks: []
      });
      wx.showToast({ title: '已解绑', icon: 'success' });
      if (goBind) {
        setTimeout(() => wx.navigateTo({ url: '/pages/bind/bind' }), 400);
      } else {
        this.refreshProfile();
      }
    }).catch(msg => {
      wx.hideLoading();
      wx.showToast({ title: String(msg || '解绑失败'), icon: 'none' });
    });
  },
  openLegal(e) {
    const type = e.currentTarget.dataset.type || 'privacy';
    wx.navigateTo({ url: '/pages/legal/legal?type=' + type });
  },
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号吗？',
      confirmColor: '#0f1c24',
      success: res => {
        if (!res.confirm) return;
        app.setToken('');
        app.setRole('');
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  }
});
