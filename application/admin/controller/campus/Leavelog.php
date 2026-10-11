<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;

/**
 * 请假日志
 *
 * @icon fa fa-circle-o
 */
class Leavelog extends Backend
{
    /**
     * @var \app\admin\model\campus\LeaveLog
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\LeaveLog;
    }

    public function index()
    {
        $this->request->filter(['strip_tags', 'trim']);
        if ($this->request->isAjax()) {
            if ($this->request->request('keyField')) {
                return $this->selectpage();
            }
            list($where, $sort, $order, $offset, $limit) = $this->buildparams();
            $query = $this->model->alias('leavelog')
                ->join('leave leaveinfo', 'leavelog.leave_id = leaveinfo.id', 'LEFT')
                ->join('student studentinfo', 'leaveinfo.student_id = studentinfo.id', 'LEFT')
                ->with(['leaveinfo', 'leaveinfo.studentinfo'])
                ->field('leavelog.*')
                ->where($where);
            $list = $query->order($sort, $order)->paginate($limit);
            return json(['total' => $list->total(), 'rows' => $list->items()]);
        }
        return $this->view->fetch();
    }
}
