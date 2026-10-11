<?php

namespace app\admin\controller;

use app\common\controller\Backend;
use app\common\library\campus\DashboardService;

/**
 * 控制台
 *
 * @icon   fa fa-dashboard
 * @remark 智慧校园数据看板
 */
class Dashboard extends Backend
{
    protected $noNeedRight = ['stats'];

    public function index()
    {
        $start = $this->request->param('start', '');
        $end = $this->request->param('end', '');
        $data = DashboardService::build($this->auth, $start ?: null, $end ?: null);

        $this->view->assign([
            'scope'        => $data['scope'],
            'summary'      => $data['summary'],
            'dateRange'    => $data['dateRange'],
            'classChart'   => $data['classChart'],
            'recentLeaves' => $data['recentLeaves'],
        ]);

        $this->assignDashboardConfig($data);

        return $this->view->fetch();
    }

    /**
     * 按日期范围刷新看板数据
     */
    public function stats()
    {
        $start = $this->request->param('start', '');
        $end = $this->request->param('end', '');
        $data = DashboardService::build($this->auth, $start ?: null, $end ?: null);
        $this->success('', null, [
            'dateRange'    => $data['dateRange'],
            'summary'      => $data['summary'],
            'leaveTrend'   => $data['leaveTrend'],
            'leaveStatus'  => $data['leaveStatus'],
            'scoreChart'   => $data['scoreChart'],
            'classChart'   => $data['classChart'],
            'recentLeaves' => $data['recentLeaves'],
        ]);
    }

    protected function assignDashboardConfig(array $data)
    {
        $this->assignconfig('campusDashboard', [
            'scopeLabel'   => $data['scope']['label'],
            'role'         => $data['scope']['role'],
            'dateRange'    => $data['dateRange'],
            'summary'      => $data['summary'],
            'leaveTrend'   => $data['leaveTrend'],
            'leaveStatus'  => $data['leaveStatus'],
            'scoreChart'   => $data['scoreChart'],
            'classChart'   => $data['classChart'],
            'recentLeaves' => $data['recentLeaves'],
        ]);
    }
}
