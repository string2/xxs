<?php

namespace app\admin\model\campus;

use think\Model;


class GateDevice extends Model
{

    

    

    // 表名
    protected $name = 'gate_device';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'direction_text',
        'status_text'
    ];
    

    
    public function getDirectionList()
    {
        return ['both' => __('Both'), 'out' => __('Out'), 'in' => __('In')];
    }

    public function getStatusList()
    {
        return ['normal' => __('Normal'), 'hidden' => __('Hidden')];
    }


    public function getDirectionTextAttr($value, $data)
    {
        $value = $value ?: ($data['direction'] ?? '');
        $list = $this->getDirectionList();
        return $list[$value] ?? '';
    }


    public function getStatusTextAttr($value, $data)
    {
        $value = $value ?: ($data['status'] ?? '');
        $list = $this->getStatusList();
        return $list[$value] ?? '';
    }




}
