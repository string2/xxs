<?php

namespace app\admin\model\campus;

use think\Model;


class LeaveLog extends Model
{

    

    

    // 表名
    protected $name = 'leave_log';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = false;
    protected $deleteTime = false;

    // 追加属性
    protected $append = [

    ];

    public function leaveinfo()
    {
        return $this->belongsTo('Leave', 'leave_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }
}
