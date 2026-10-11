<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;

/**
 * 成绩阅读记录
 *
 * @icon fa fa-circle-o
 */
class Scoreread extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\ScoreRead
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\ScoreRead;
    }

    public function index()
    {
        return $this->campusRelationIndex(['examinfo', 'studentinfo', 'parentinfo']);
    }
}
