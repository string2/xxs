<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;
use think\Db;

/**
 * 考试排名
 *
 * @icon fa fa-bar-chart
 */
class Examrank extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\ExamRank
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\ExamRank;
    }

    /**
     * 教师仅看本班；管理员看全校
     */
    public function index()
    {
        return $this->campusRelationIndex(['examinfo', 'studentinfo', 'classinfo'], function ($query) {
            if (!$this->auth->isSuperAdmin()) {
                $classIds = Db::name('school_class')->where('admin_id', $this->auth->id)->column('id');
                if (!$classIds) {
                    $classIds = Db::name('teacher')->where('admin_id', $this->auth->id)->column('class_id');
                }
                $classIds = array_filter(array_unique($classIds));
                if ($classIds) {
                    $query->where($this->campusModelField('class_id'), 'in', $classIds);
                } else {
                    $query->where($this->campusModelField('class_id'), 0);
                }
            }
        });
    }
}
