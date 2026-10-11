<?php

namespace app\admin\model\campus;

use think\Model;


class ExamScore extends Model
{
    // 表名
    protected $name = 'exam_score';

    // 自动写入时间戳字段
    protected $autoWriteTimestamp = 'integer';

    // 定义时间戳字段名
    protected $createTime = 'createtime';
    protected $updateTime = 'updatetime';
    protected $deleteTime = false;

    // 追加属性
    protected $append = [];

    protected static function init()
    {
        $recalc = function ($row) {
            if (!empty($row['exam_id']) && empty($row['is_total'])) {
                \app\common\library\campus\RankService::recalculate($row['exam_id']);
            }
        };
        self::afterInsert($recalc);
        self::afterUpdate($recalc);
        self::afterDelete(function ($row) {
            if (!empty($row['exam_id'])) {
                \app\common\library\campus\RankService::recalculate($row['exam_id']);
            }
        });
    }

    public function examinfo()
    {
        return $this->belongsTo('Exam', 'exam_id', 'id', [], 'LEFT')->setEagerlyType(0);
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
