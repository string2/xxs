<?php

namespace app\admin\model\campus;

use think\Model;


class ScoreRead extends Model
{

    

    

    // 表名
    protected $name = 'score_read';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'readtime_text'
    ];
    

    



    public function getReadtimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['readtime'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }

    protected function setReadtimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }

    public function examinfo()
    {
        return $this->belongsTo('Exam', 'exam_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

    public function studentinfo()
    {
        return $this->belongsTo('Student', 'student_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

    public function parentinfo()
    {
        return $this->belongsTo('Parentuser', 'parent_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }
}
