const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    agreed: false
  },
  onShow() {
    if (!app.globalData.token) return;
    api.get('/api/bind/profile').then(data => {
      const roles = (data && data.roles) || [];
      if (roles.length) {
        app.setRole(app.globalData.role || roles[0]);
        wx.switchTab({ url: '/pages/index/index' });
        return;
      }
      wx.redirectTo({ url: '/pages/bind/bind' });
    }).catch(() => {});
  },
  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },
  openLegal(e) {
    const type = e.currentTarget.dataset.type || 'privacy';
    wx.navigateTo({ url: '/pages/legal/legal?type=' + type });
  },
  afterAuth() {
    api.get('/api/bind/profile').then(data => {
      const roles = (data && data.roles) || [];
      if (roles.length) {
        app.setRole(app.globalData.role || roles[0]);
        wx.switchTab({ url: '/pages/index/index' });
        return;
      }
      wx.redirectTo({ url: '/pages/bind/bind' });
    }).catch(() => {
      wx.redirectTo({ url: '/pages/bind/bind' });
    });
  },
  onAgreePrivacy() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意协议', icon: 'none' });
      return;
    }
    this.doWxLogin();
  },
  wxLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意协议', icon: 'none' });
      return;
    }
    // 已同意隐私授权时直接登录；未授权时由 agreePrivacyAuthorization 回调处理
    if (typeof wx.getPrivacySetting === 'function') {
      wx.getPrivacySetting({
        success: (res) => {
          if (res.needAuthorization) return;
          this.doWxLogin();
        },
        fail: () => this.doWxLogin()
      });
      return;
    }
    this.doWxLogin();
  },
  doWxLogin() {
    if (this._logging) return;
    this._logging = true;
    wx.login({
      success: (res) => {
        if (!res.code) {
          this._logging = false;
          wx.showToast({ title: '微信登录失败，请重试', icon: 'none' });
          return;
        }
        wx.showLoading({ title: '登录中', mask: true });
        api.post('/api/user/wxlogin', {
          code: res.code
        }).then(data => {
          const info = (data && data.userinfo) || {};
          if (!info.token) {
            this._logging = false;
            wx.hideLoading();
            wx.showToast({ title: '登录失败，未返回凭证', icon: 'none' });
            return;
          }
          app.setToken(info.token);
          wx.setStorageSync('legalAgreed', 1);
          wx.hideLoading();
          wx.showToast({ title: '登录成功' });
          setTimeout(() => {
            this._logging = false;
            this.afterAuth(data);
          }, 400);
        }).catch(msg => {
          this._logging = false;
          wx.hideLoading();
          wx.showToast({ title: String(msg || '登录失败'), icon: 'none', duration: 2800 });
        });
      },
      fail: () => {
        this._logging = false;
        wx.showToast({ title: '无法调用微信登录', icon: 'none' });
      }
    });
  }
});
