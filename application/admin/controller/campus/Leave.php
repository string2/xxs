<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;
use app\common\library\campus\GateService;
use app\common\library\campus\LeaveService;
use think\Db;

/**
 * 请假管理
 *
 * @icon fa fa-calendar-check-o
 */
class Leave extends Backend
{
    /**
     * @var \app\admin\model\campus\Leave
     */
    protected $model = null;
    protected $dataLimit = 'auth';
    protected $dataLimitField = 'admin_id';
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\Leave;
        $this->view->assign("leaveTypeList", $this->model->getLeaveTypeList());
        $this->view->assign("statusList", $this->model->getStatusList());
    }

    /**
     * 列表（关联学生姓名）
     */
    public function index()
    {
        $this->request->filter(['strip_tags', 'trim']);
        if ($this->request->isAjax()) {
            if ($this->request->request('keyField')) {
                return $this->selectpage();
            }
            // 旧状态一次性归一（left/笼统 rejected）
            try {
                LeaveService::normalizeLegacyStatuses();
            } catch (\Throwable $e) {
                // ignore
            }
            list($where, $sort, $order, $offset, $limit) = $this->buildparams();
            $list = $this->model
                ->with(['studentinfo', 'classinfo'])
                ->where($where)
                ->order($sort, $order)
                ->paginate($limit);
            $rows = $list->items();
            $ids = [];
            foreach ($rows as $row) {
                $ids[] = (int)$row['id'];
                // 历史 returned/left 归一为班主任已批准
                if (in_array($row['status'], ['returned', 'left'], true)) {
                    GateService::settleExpiredLeave($row->toArray());
                    $row['status'] = 'approved';
                }
            }
            $grouped = [];
            if ($ids) {
                $records = Db::name('gate_record')->where('leave_id', 'in', $ids)->order('id', 'asc')->select();
                foreach ($records as $r) {
                    $lid = (int)$r['leave_id'];
                    $dir = $r['direction'] ?? '';
                    $grouped[$lid][] = [
                        'time' => date('Y-m-d H:i:s', (int)$r['passtime']),
                        'dir'  => $dir === 'in' ? '进门' : ($dir === 'out' ? '出门' : '开门'),
                    ];
                }
            }
            foreach ($rows as $row) {
                $recs = $grouped[(int)$row['id']] ?? [];
                $row['gate_count'] = count($recs);
                $row['gate_records'] = $recs;
            }
            $result = ['total' => $list->total(), 'rows' => $rows];
            return json($result);
        }
        return $this->view->fetch();
    }

    public function approve($ids = null)
    {
        if (!$this->request->isPost()) {
            $this->error(__('Invalid parameters'));
        }
        $ids = $ids ?: $this->request->post('ids');
        $list = $this->model->where('id', 'in', $ids)->where('status', 'in', ['pending_teacher', 'parent_approved'])->select();
        if (!$list) {
            $this->error('没有待审核的请假单');
        }
        $count = 0;
        Db::startTrans();
        try {
            foreach ($list as $row) {
                LeaveService::teacherApprove($row['id'], $this->auth->id, true);
                $count++;
            }
            Db::commit();
        } catch (\Exception $e) {
            Db::rollback();
            $this->error($e->getMessage());
        }
        $this->success("已同意 {$count} 条");
    }

    public function reject($ids = null)
    {
        if (!$this->request->isPost()) {
            $this->error(__('Invalid parameters'));
        }
        $ids = $ids ?: $this->request->post('ids');
        $remark = $this->request->post('remark', '班主任拒绝');
        $list = $this->model->where('id', 'in', $ids)->where('status', 'in', ['pending_teacher', 'parent_approved'])->select();
        if (!$list) {
            $this->error('没有待审核的请假单');
        }
        $count = 0;
        Db::startTrans();
        try {
            foreach ($list as $row) {
                LeaveService::teacherApprove($row['id'], $this->auth->id, false, $remark);
                $count++;
            }
            Db::commit();
        } catch (\Exception $e) {
            Db::rollback();
            $this->error($e->getMessage());
        }
        $this->success("已拒绝 {$count} 条");
    }

    /**
     * 按时间统计请假人数
     */
    public function statistics()
    {
        $start = $this->request->get('start', '');
        $end = $this->request->get('end', '');
        $adminIds = $this->getDataLimitAdminIds();

        $query = Db::name('leave');
        if ($start) {
            $startTs = is_numeric($start) ? (int)$start : strtotime($start);
            $query->where('createtime', '>=', $startTs);
        }
        if ($end) {
            $endTs = is_numeric($end) ? (int)$end : strtotime($end . ' 23:59:59');
            $query->where('createtime', '<=', $endTs);
        }
        if (is_array($adminIds)) {
            $query->where('admin_id', 'in', $adminIds);
        }

        $total = (int)(clone $query)->count();
        $studentCount = (int)(clone $query)->group('student_id')->count();
        $statusRows = (clone $query)->field('status, COUNT(*) as cnt')->group('status')->select();

        $this->success('ok', null, [
            'total'          => $total,
            'student_count'  => $studentCount,
            'status_summary' => $statusRows,
        ]);
    }
}
