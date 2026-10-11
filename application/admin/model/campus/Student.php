<?php

namespace app\admin\model\campus;

use think\Model;


class Student extends Model
{

    

    

    // 表名
    protected $name = 'student';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'gender_text',
        'status_text'
    ];
    

    
    public function getGenderList()
    {
        return ['male' => '男', 'female' => '女', 'unknown' => '未知'];
    }

    public function getStatusList()
    {
        return ['normal' => __('Normal'), 'hidden' => __('Hidden')];
    }

    public function getGenderTextAttr($value, $data)
    {
        $value = $value ?: ($data['gender'] ?? '');
        $list = $this->getGenderList();
        return $list[$value] ?? '';
    }

    public function getStatusTextAttr($value, $data)
    {
        $value = $value ?: ($data['status'] ?? '');
        $list = $this->getStatusList();
        return $list[$value] ?? '';
    }

    public function classinfo()
    {
        return $this->belongsTo('SchoolClass', 'class_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

    public function roominfo()
    {
        return $this->belongsTo('DormRoom', 'room_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

}
