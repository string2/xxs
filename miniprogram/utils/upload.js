const app = getApp();

function upload(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      reject('未选择文件');
      return;
    }
    wx.uploadFile({
      url: app.globalData.baseUrl + '/api/common/upload',
      filePath,
      name: 'file',
      header: {
        token: app.globalData.token || ''
      },
      success(res) {
        let body = {};
        try {
          body = JSON.parse(res.data || '{}');
        } catch (e) {
          reject('上传响应异常');
          return;
        }
        if (body.code === 1) {
          resolve(body.data || {});
          return;
        }
        reject(body.msg || '上传失败');
      },
      fail(err) {
        reject((err && err.errMsg) || '上传失败');
      }
    });
  });
}

module.exports = { upload };
