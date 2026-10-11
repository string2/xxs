<?php

namespace app\admin\model\campus;

use think\Model;


class AgreementSign extends Model
{

    

    

    // 表名
    protected $name = 'agreement_sign';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'signtime_text'
    ];
    

    



    public function getSigntimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['signtime'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }

    protected function setSigntimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }

    public function agreementinfo()
    {
        return $this->belongsTo('Agreement', 'agreement_id', 'id', [], 'LEFT')->setEagerlyType(0);
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
