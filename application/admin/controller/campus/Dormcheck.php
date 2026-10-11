<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;
use think\Db;

/**
 * 每日查寝（管理员查看）
 *
 * @icon fa fa-bed
 */
class Dormcheck extends Backend
{
    /**
     * @var \app\admin\model\campus\DormCheck
     */
    protected $model = null;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\DormCheck;
    }

    public function index()
    {
        $this->request->filter(['strip_tags', 'trim']);
        if ($this->request->isAjax()) {
            if ($this->request->request('keyField')) {
                return $this->selectpage();
            }
            list($where, $sort, $order, $offset, $limit) = $this->buildparams();
            $list = $this->model->where($where)->order($sort, $order)->paginate($limit);
            $rows = $list->items();
            $adminIds = [];
            $buildingIds = [];
            $checkIds = [];
            foreach ($rows as $r) {
                $adminIds[] = $r['dorm_admin_id'];
                $buildingIds[] = $r['building_id'];
                $checkIds[] = $r['id'];
            }
            $admins = $adminIds ? Db::name('dorm_admin')->where('id', 'in', $adminIds)->column('name', 'id') : [];
            $buildings = $buildingIds ? Db::name('dorm_building')->where('id', 'in', $buildingIds)->column('name', 'id') : [];
            $itemCounts = [];
            if ($checkIds) {
                $counts = Db::name('dorm_check_item')->where('check_id', 'in', $checkIds)->field('check_id, COUNT(*) as cnt')->group('check_id')->select();
                foreach ($counts as $c) {
                    $itemCounts[$c['check_id']] = $c['cnt'];
                }
            }
            foreach ($rows as &$row) {
                $row['dorm_admin_name'] = $admins[$row['dorm_admin_id']] ?? '';
                $row['building_name'] = $buildings[$row['building_id']] ?? '';
                $row['item_count'] = $itemCounts[$row['id']] ?? 0;
            }
            unset($row);
            return json(['total' => $list->total(), 'rows' => $rows]);
        }
        return $this->view->fetch();
    }
}
