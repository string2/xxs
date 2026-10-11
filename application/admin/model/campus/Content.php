<?php

namespace app\admin\model\campus;

use think\Model;


class Content extends Model
{

    

    

    // 表名
    protected $name = 'campus_content';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'category_text',
        'status_text'
    ];
    

    protected static function init()
    {
        self::afterInsert(function ($row) {
            if (!$row['weigh']) {
                $pk = $row->getPk();
                $row->getQuery()->where($pk, $row[$pk])->update(['weigh' => $row[$pk]]);
            }
        });
    }

    
    public function getCategoryList()
    {
        return ['intro' => __('Intro'), 'feature' => __('Feature'), 'rule' => __('Rule'), 'notice' => __('Notice'), 'other' => __('Other')];
    }

    public function getStatusList()
    {
        return ['normal' => __('Normal'), 'hidden' => __('Hidden')];
    }


    public function getCategoryTextAttr($value, $data)
    {
        $value = $value ?: ($data['category'] ?? '');
        $list = $this->getCategoryList();
        return $list[$value] ?? '';
    }


    public function getStatusTextAttr($value, $data)
    {
        $value = $value ?: ($data['status'] ?? '');
        $list = $this->getStatusList();
        return $list[$value] ?? '';
    }




}
