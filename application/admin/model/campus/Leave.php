<?php

namespace app\admin\model\campus;

use think\Model;


class Leave extends Model
{

    

    

    // 表名
    protected $name = 'leave';
    
    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [
        'leave_type_text',
        'start_time_text',
        'end_time_text',
        'status_text',
        'parent_time_text',
        'teacher_time_text',
        'leave_time_text',
        'return_time_text'
    ];
    

    
    public function getLeaveTypeList()
    {
        return ['affair' => __('Affair'), 'sick' => __('Sick')];
    }

    public function getStatusList()
    {
        return [
            'pending_parent'  => '待家长批准',
            'pending_teacher' => '待班主任批准',
            'approved'        => '已批准',
            'rejected'        => '已拒绝',
        ];
    }


    public function getLeaveTypeTextAttr($value, $data)
    {
        $value = $value ?: ($data['leave_type'] ?? '');
        $list = $this->getLeaveTypeList();
        return $list[$value] ?? '';
    }


    public function getStartTimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['start_time'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }


    public function getEndTimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['end_time'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }


    public function getStatusTextAttr($value, $data)
    {
        $status = $value ?: ($data['status'] ?? '');
        // 历史状态归一展示
        if (in_array($status, ['returned', 'left'], true)) {
            $status = 'approved';
        }
        if (in_array($status, ['parent_approved'], true)) {
            $status = 'pending_teacher';
        }
        if (in_array($status, ['parent_rejected', 'teacher_rejected'], true)) {
            $status = 'rejected';
        }
        $list = $this->getStatusList();
        return $list[$status] ?? $status;
    }


    public function getParentTimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['parent_time'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }


    public function getTeacherTimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['teacher_time'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }


    public function getLeaveTimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['leave_time'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }


    public function getReturnTimeTextAttr($value, $data)
    {
        $value = $value ?: ($data['return_time'] ?? '');
        return is_numeric($value) ? date("Y-m-d H:i:s", $value) : $value;
    }

    protected function setStartTimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }

    protected function setEndTimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }

    protected function setParentTimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }

    protected function setTeacherTimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }

    protected function setLeaveTimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }

    protected function setReturnTimeAttr($value)
    {
        return $value === '' ? null : ($value && !is_numeric($value) ? strtotime($value) : $value);
    }

    public function studentinfo()
    {
        return $this->belongsTo('Student', 'student_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

    public function classinfo()
    {
        return $this->belongsTo('SchoolClass', 'class_id', 'id', [], 'LEFT')->setEagerlyType(0);
    }

}
