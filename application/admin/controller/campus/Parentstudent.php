<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;

/**
 * 家长学生绑定
 *
 * @icon fa fa-circle-o
 */
class Parentstudent extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\ParentStudent
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\ParentStudent;
    }

    public function index()
    {
        return $this->campusRelationIndex(['parentinfo', 'studentinfo']);
    }
}
