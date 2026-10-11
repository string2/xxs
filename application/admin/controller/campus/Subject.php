<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;

/**
 * 考试科目
 *
 * @icon fa fa-book
 */
class Subject extends Backend
{
    /**
     * @var \app\admin\model\campus\Subject
     */
    protected $model = null;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\Subject;
        $this->view->assign('statusList', $this->model->getStatusList());
    }
}
