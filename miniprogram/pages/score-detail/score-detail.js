const api = require('../../utils/api');
Page({
  data:{exam:{}, ranks:[], is_read:0, studentId:0, examId:0},
  onLoad(q){
    this.setData({studentId:q.student_id, examId:q.exam_id});
    api.get('/api/score/detail',{student_id:q.student_id, exam_id:q.exam_id}).then(d=>{
      this.setData({exam:d.exam||{}, ranks:d.ranks||[], is_read:d.is_read});
    });
  },
  read(){
    api.post('/api/score/read',{student_id:this.data.studentId, exam_id:this.data.examId}).then(()=>{
      wx.showToast({title:'已提交'}); this.setData({is_read:1});
    }).catch(m=>wx.showToast({title:String(m),icon:'none'}));
  }
});