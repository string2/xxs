<?php

namespace app\admin\model\campus;

use think\Model;


class GateRecord extends Model
{

    

    

    // 表名
    protected $name = 'gate_record';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'direction_text',
        'passtime_text'
    ];
    

    
    public function getDirectionList()
    {
        return ['out' => '离校', 'in' => '回校'];
    }


    public function getDirectionTextAttr($value, $data)
    {
        $value = $value ?: ($data['direction'] ?? '');
        $list = $this->getDirectionList();
        return $list[$value] ?? '';
    }

    public function deviceinfo()
    {
        return $this->belongsTo('GateDevice', 'device_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

    public function studentinfo()
    {
        return $this->belongsTo('Student', 'student_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

    public function leaveinfo()
    {
        return $this->belongsTo('Leave', 'leave_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }


    public function getPasstimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['passtime'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }

    protected function setPasstimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }


}
