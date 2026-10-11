const app = getApp();

function request(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const baseUrl = (app && app.globalData && app.globalData.baseUrl) || '';
    if (!baseUrl) {
      reject('服务地址未配置');
      return;
    }
    wx.request({
      url: baseUrl + path,
      method,
      data,
      timeout: 15000,
      header: {
        'content-type': 'application/x-www-form-urlencoded',
        token: (app.globalData && app.globalData.token) || ''
      },
      success(res) {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject('服务器异常（' + res.statusCode + '），请稍后重试');
          return;
        }
        if (typeof res.data !== 'object' || res.data === null) {
          reject('服务器响应异常，请稍后重试');
          return;
        }
        const body = res.data;
        if (body.code === 1) {
          resolve(body.data);
          return;
        }
        if (body.code === 401) {
          try {
            app.setToken('');
            app.setRole('');
            app.globalData.profile = null;
          } catch (e) {}
          const pages = getCurrentPages();
          const cur = pages.length ? pages[pages.length - 1].route : '';
          if (cur !== 'pages/login/login') {
            wx.redirectTo({ url: '/pages/login/login' });
          }
          reject('请先登录');
          return;
        }
        reject(body.msg || '请求失败');
      },
      fail(err) {
        const tip = (err && err.errMsg) || '';
        if (tip.indexOf('timeout') !== -1) {
          reject('网络超时，请检查网络后重试');
          return;
        }
        if (tip.indexOf('fail') !== -1) {
          reject('无法连接服务器，请检查网络或稍后重试');
          return;
        }
        reject(tip || '网络错误');
      }
    });
  });
}

function get(path, data) {
  return request(path, 'GET', data);
}

function post(path, data) {
  return request(path, 'POST', data);
}

module.exports = { request, get, post };
