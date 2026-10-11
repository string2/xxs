// 已合并到绑定身份页，保留入口做兼容跳转
Page({
  onLoad() {
    wx.redirectTo({ url: '/pages/bind/bind' });
  }
});
