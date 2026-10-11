<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;

/**
 * 门禁设备
 *
 * @icon fa fa-circle-o
 */
class Gatedevice extends Backend
{

    /**
     * GateDevice模型对象
     * @var \app\admin\model\campus\GateDevice
     */
    protected $model = null;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\GateDevice;
        $this->view->assign("directionList", $this->model->getDirectionList());
        $this->view->assign("statusList", $this->model->getStatusList());
    }

    /**
     * 新增：token 为空时自动生成，默认厂商小麦
     */
    public function add()
    {
        if ($this->request->isPost()) {
            $params = $this->request->post('row/a');
            if ($params) {
                if (empty($params['token'])) {
                    $params['token'] = 'GATE_' . strtoupper(substr(md5(uniqid((string)mt_rand(), true)), 0, 12));
                }
                if (empty($params['vendor'])) {
                    $params['vendor'] = 'xiaomai';
                }
                $this->request->post(['row' => $params]);
            }
        }
        return parent::add();
    }
}
