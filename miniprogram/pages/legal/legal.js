const legal = require('../../utils/legal');

Page({
  data: {
    type: 'privacy',
    title: '',
    updated: '',
    sections: []
  },
  onLoad(q) {
    const type = q.type === 'service' ? 'service' : 'privacy';
    const doc = legal.getDoc(type);
    this.setData({
      type,
      title: doc.title,
      updated: doc.updated,
      sections: doc.sections || []
    });
    wx.setNavigationBarTitle({ title: doc.title });
  }
});
