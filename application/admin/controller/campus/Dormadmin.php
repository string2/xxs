<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;

/**
 * 寝室管理员
 *
 * @icon fa fa-circle-o
 */
class Dormadmin extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\DormAdmin
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\DormAdmin;
        $this->view->assign("statusList", $this->model->getStatusList());
    }

    public function index()
    {
        return $this->campusRelationIndex(['buildinginfo']);
    }
}
