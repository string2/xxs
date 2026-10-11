<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;

/**
 * 协议签署
 *
 * @icon fa fa-circle-o
 */
class Agreementsign extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\AgreementSign
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\AgreementSign;
    }

    public function index()
    {
        return $this->campusRelationIndex(['agreementinfo', 'studentinfo', 'parentinfo']);
    }
}
