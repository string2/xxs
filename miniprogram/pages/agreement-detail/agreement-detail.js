const api = require('../../utils/api');
Page({
  data:{id:0, studentId:0, row:{}},
  onLoad(q){ this.setData({id:q.id, studentId:q.student_id}); api.get('/api/agreement/detail',{id:q.id}).then(d=>this.setData({row:d})); },
  sign(){
    api.post('/api/agreement/sign',{agreement_id:this.data.id, student_id:this.data.studentId, sign_image:'signed'}).then(()=>{
      wx.showToast({title:'签署成功'}); setTimeout(()=>wx.navigateBack(),500);
    }).catch(m=>wx.showToast({title:String(m),icon:'none'}));
  }
});