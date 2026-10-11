<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;

/**
 * 小麦回调日志
 *
 * @icon fa fa-list-alt
 */
class Gatecallback extends Backend
{
    /**
     * @var \app\admin\model\campus\GateCallback
     */
    protected $model = null;

    /**
     * 无需鉴权的方法（仍需登录）
     */
    protected $noNeedRight = [];

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\GateCallback;
        $this->view->assign('actionList', $this->model->getActionList());
        $this->view->assign('allowList', $this->model->getAllowList());
    }

    /**
     * 仅查看/删除，不开放手工新增编辑
     */
    public function add()
    {
        $this->error('回调日志由系统自动写入，不可手工新增');
    }

    public function edit($ids = null)
    {
        $this->error('回调日志不可编辑');
    }
}
