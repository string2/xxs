<?php

namespace app\admin\model\campus;

use think\Model;


class ParentStudent extends Model
{

    

    

    // 表名
    protected $name = 'parent_student';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [

    ];

    public function parentinfo()
    {
        return $this->belongsTo('Parentuser', 'parent_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

    public function studentinfo()
    {
        return $this->belongsTo('Student', 'student_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }
}
