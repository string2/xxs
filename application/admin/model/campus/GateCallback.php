<?php

namespace app\admin\model\campus;

use think\Model;

class GateCallback extends Model
{
    // 表名
    protected $name = 'gate_callback';

    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = false;
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'action_text',
        'allow_text',
        'createtime_text',
    ];

    public function getActionList()
    {
        return [
            'verify'     => '通行校验',
            'openRecord' => '开门记录',
        ];
    }

    public function getAllowList()
    {
        return [
            '0' => '拒绝',
            '1' => '放行',
        ];
    }

    public function getActionTextAttr($value, $data)
    {
        $value = $value ?: ($data['action'] ?? '');
        $list = $this->getActionList();
        return $list[$value] ?? $value;
    }

    public function getAllowTextAttr($value, $data)
    {
        $value = $value !== null && $value !== '' ? (string)$value : (string)($data['allow'] ?? '0');
        $list = $this->getAllowList();
        return $list[$value] ?? $value;
    }

    public function getCreatetimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['createtime'] ?? '');
        return is_numeric($value) ? date('Y-m-d H:i:s', $value) : $value;
    }
}
