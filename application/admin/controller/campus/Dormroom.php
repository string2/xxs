<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;

/**
 * 寝室房间
 *
 * @icon fa fa-circle-o
 */
class Dormroom extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\DormRoom
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\DormRoom;
        $this->view->assign("statusList", $this->model->getStatusList());
    }

    public function index()
    {
        return $this->campusRelationIndex(['buildinginfo']);
    }
}
