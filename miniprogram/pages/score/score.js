const api = require('../../utils/api');
const app = getApp();
Page({
  data:{children:[], studentId:0, currentName:'请选择', list:[]},
  onShow(){
    api.get('/api/bind/profile').then(d=>{
      const children=d.children||[];
      const studentId = children[0]?children[0].id:0;
      this.setData({children, studentId, currentName: children[0]?children[0].name:'无绑定学生'});
      if(studentId) this.load(studentId);
    });
  },
  onChild(e){
    const i=e.detail.value; const c=this.data.children[i];
    this.setData({studentId:c.id, currentName:c.name}); this.load(c.id);
  },
  load(id){ api.get('/api/score/lists',{student_id:id}).then(d=>this.setData({list:d.list||[]})); },
  go(e){ wx.navigateTo({url:`/pages/score-detail/score-detail?student_id=${this.data.studentId}&exam_id=${e.currentTarget.dataset.examid}`}); }
});