App({
  globalData: {
    // 客户测试 / 正式环境
    baseUrl: 'https://xxs.wallsu.com',
    token: '',
    profile: null,
    role: ''
  },
  onLaunch() {
    const token = wx.getStorageSync('token') || '';
    const role = wx.getStorageSync('role') || '';
    this.globalData.token = token;
    this.globalData.role = role;
  },
  setToken(token) {
    this.globalData.token = token || '';
    wx.setStorageSync('token', this.globalData.token);
  },
  setRole(role) {
    this.globalData.role = role || '';
    wx.setStorageSync('role', this.globalData.role);
  }
});
