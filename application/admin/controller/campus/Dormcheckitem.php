<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;

/**
 * 查寝明细
 *
 * @icon fa fa-circle-o
 */
class Dormcheckitem extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\DormCheckItem
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\DormCheckItem;
        $this->view->assign("resultList", $this->model->getResultList());
    }

    public function index()
    {
        return $this->campusRelationIndex(['roominfo']);
    }
}
