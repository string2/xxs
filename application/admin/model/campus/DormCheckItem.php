<?php

namespace app\admin\model\campus;

use think\Model;


class DormCheckItem extends Model
{

    

    

    // 表名
    protected $name = 'dorm_check_item';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'result_text'
    ];
    

    
    public function getResultList()
    {
        return ['normal' => __('Normal'), 'abnormal' => __('Abnormal'), 'leave' => __('Leave')];
    }


    public function getResultTextAttr($value, $data)
    {
        $value = $value ?: ($data['result'] ?? '');
        $list = $this->getResultList();
        return $list[$value] ?? '';
    }

    public function roominfo()
    {
        return $this->belongsTo('DormRoom', 'room_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }
}
