const api = require('../../utils/api');
Page({
  data:{children:[], studentId:0, currentName:'', list:[]},
  onShow(){
    api.get('/api/bind/profile').then(d=>{
      const children=d.children||[];
      const studentId=children[0]?children[0].id:0;
      this.setData({children, studentId, currentName:children[0]?children[0].name:''});
      this.load();
    });
  },
  onChild(e){ const c=this.data.children[e.detail.value]; this.setData({studentId:c.id, currentName:c.name}); this.load(); },
  load(){ api.get('/api/agreement/lists',{student_id:this.data.studentId}).then(d=>this.setData({list:d.list||[]})); },
  go(e){ wx.navigateTo({url:`/pages/agreement-detail/agreement-detail?id=${e.currentTarget.dataset.id}&student_id=${this.data.studentId}`}); }
});