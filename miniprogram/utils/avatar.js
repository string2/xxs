const app = getApp();
const api = require('./api');
const upload = require('./upload');

function isDefaultAvatar(avatar) {
  return !avatar || avatar.indexOf('data:image/svg') === 0;
}

function resolve(avatar) {
  if (isDefaultAvatar(avatar)) return '';
  if (/^https?:\/\//i.test(avatar)) return avatar;
  const base = (app.globalData.baseUrl || '').replace(/\/$/, '');
  if (!base) return avatar;
  return base + (avatar.charAt(0) === '/' ? avatar : '/' + avatar);
}

function syncProfile(payload) {
  return api.post('/api/user/wxProfile', payload);
}

function saveWxAvatar(tempPath, nickname) {
  return upload.upload(tempPath).then(data => {
    const avatar = data.fullurl || data.url || '';
    const post = { avatar };
    if (nickname) post.nickname = nickname;
    return syncProfile(post);
  });
}

module.exports = {
  isDefaultAvatar,
  resolve,
  syncProfile,
  saveWxAvatar
};
