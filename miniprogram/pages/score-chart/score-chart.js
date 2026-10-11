const api = require('../../utils/api');
Page({
  data:{children:[], studentId:0, currentName:'', subjects:['总分','语文','数学','英语'], subject:'总分', series:[]},
  onShow(){
    api.get('/api/bind/profile').then(d=>{
      const children=d.children||[];
      const studentId=children[0]?children[0].id:0;
      this.setData({children, studentId, currentName:children[0]?children[0].name:''});
      if(studentId) this.load();
    });
  },
  onChild(e){ const c=this.data.children[e.detail.value]; this.setData({studentId:c.id, currentName:c.name}); this.load(); },
  onSubject(e){ this.setData({subject:this.data.subjects[e.detail.value]}); this.load(); },
  load(){ api.get('/api/score/chart',{student_id:this.data.studentId, subject:this.data.subject}).then(d=>this.setData({series:d.series||[]})); }
});