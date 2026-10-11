<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;
use think\Config;
use think\Db;

/**
 * 小麦对接说明
 *
 * @icon fa fa-plug
 */
class Xiaomaisetup extends Backend
{
    protected $model = null;
    protected $noNeedRight = ['*'];

    public function index()
    {
        $site = request()->domain();
        $devices = [];
        $verifyToday = 0;
        $openToday = 0;
        try {
            $devices = Db::name('gate_device')
                ->where('status', 'normal')
                ->order('id asc')
                ->select();
            $dayStart = strtotime(date('Y-m-d 00:00:00'));
            $verifyToday = (int)Db::name('gate_callback')
                ->where('action', 'verify')
                ->where('createtime', '>=', $dayStart)
                ->count();
            $openToday = (int)Db::name('gate_callback')
                ->where('action', 'openRecord')
                ->where('createtime', '>=', $dayStart)
                ->count();
        } catch (\Throwable $e) {
            $devices = [];
        }

        $this->view->assign([
            'verifyUrl'     => rtrim($site, '/') . '/api/xiaomai/verify',
            'openRecordUrl' => rtrim($site, '/') . '/api/xiaomai/openRecord',
            'devices'       => $devices,
            'xiaomaiConfig' => Config::get('xiaomai') ?: [],
            'verifyToday'   => $verifyToday,
            'openToday'     => $openToday,
        ]);
        return $this->view->fetch();
    }
}
