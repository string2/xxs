<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;
use think\Db;

/**
 * 门禁进出记录
 *
 * @icon fa fa-exchange
 */
class Gaterecord extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\GateRecord
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\GateRecord;
        $this->view->assign('directionList', $this->model->getDirectionList());
    }

    /**
     * 列表（设备/学生/请假关联名称，支持搜索）
     */
    public function index()
    {
        return $this->campusRelationIndex(['deviceinfo', 'studentinfo', 'leaveinfo'], function ($query) {
            $adminIds = $this->getTeacherScopeAdminIds();
            if ($adminIds !== null) {
                $studentIds = Db::name('student')->where('admin_id', 'in', $adminIds)->column('id');
                if ($studentIds) {
                    $query->where($this->campusModelField('student_id'), 'in', $studentIds);
                } else {
                    $query->where($this->campusModelField('student_id'), 0);
                }
            }
        });
    }

    /**
     * 教师组仅看本班学生进出记录
     */
    protected function getTeacherScopeAdminIds()
    {
        if ($this->auth->isSuperAdmin()) {
            return null;
        }
        $groupIds = Db::name('auth_group_access')->where('uid', $this->auth->id)->column('group_id');
        $teacherGroupId = Db::name('auth_group')->where('name', '教师组')->value('id');
        if ($teacherGroupId && in_array($teacherGroupId, $groupIds)) {
            return [$this->auth->id];
        }
        return null;
    }
}
