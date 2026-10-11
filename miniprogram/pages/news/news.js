// 资讯已并入「我的」，保留页面以免旧路径报错
Page({
  onShow() {
    wx.switchTab({ url: '/pages/mine/mine' });
  }
});
