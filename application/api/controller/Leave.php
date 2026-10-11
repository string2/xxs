<?php

namespace app\api\controller;

use app\common\controller\Api;
use app\common\library\campus\GateService;
use app\common\library\campus\LeaveService;
use think\Db;

/**
 * 请假接口
 */
class Leave extends Api
{
    protected $noNeedLogin = [];
    protected $noNeedRight = '*';

    protected function getStudent()
    {
        $student = Db::name('student')->where('user_id', $this->auth->id)->find();
        if (!$student) {
            $this->error('请先绑定学生身份');
        }
        return $student;
    }

    protected function getParent()
    {
        $parent = Db::name('parent')->where('user_id', $this->auth->id)->find();
        if (!$parent) {
            $this->error('请先绑定家长身份');
        }
        return $parent;
    }

    /**
     * 学生提交请假
     */
    public function apply()
    {
        $student = $this->getStudent();
        $leaveType = $this->request->post('leave_type', 'affair');
        $reason = $this->request->post('reason', '');
        $leaveDatesRaw = trim((string)$this->request->post('leave_dates', ''));
        $startTime = $this->request->post('start_time');
        $endTime = $this->request->post('end_time');

        if (!$reason) {
            $this->error('请填写请假原因');
        }

        $days = 0;
        if ($leaveDatesRaw !== '') {
            $dates = array_values(array_unique(array_filter(array_map('trim', explode(',', $leaveDatesRaw)))));
            sort($dates);
            $valid = [];
            foreach ($dates as $d) {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
                    $this->error('请假日期格式不正确');
                }
                $ts = strtotime($d . ' 00:00:00');
                if ($ts === false) {
                    $this->error('请假日期无效');
                }
                if ($ts < strtotime(date('Y-m-d') . ' 00:00:00')) {
                    $this->error('不能选择过去的日期');
                }
                $valid[] = $d;
            }
            if (!$valid) {
                $this->error('请选择请假日期');
            }
            $start = strtotime($valid[0] . ' 08:00:00');
            $end = strtotime($valid[count($valid) - 1] . ' 18:00:00');
            $days = count($valid);
        } else {
            if (!$startTime || !$endTime) {
                $this->error('请选择请假日期');
            }
            $start = is_numeric($startTime) ? (int)$startTime : strtotime($startTime);
            $end = is_numeric($endTime) ? (int)$endTime : strtotime($endTime);
            if ($end <= $start) {
                $this->error('结束时间需大于开始时间');
            }
            $days = round(($end - $start) / 86400, 1);
            if ($days < 0.5) {
                $days = 0.5;
            }
        }

        $class = Db::name('school_class')->where('id', $student['class_id'])->find();
        $now = time();
        $id = Db::name('leave')->insertGetId([
            'student_id' => $student['id'],
            'class_id'   => $student['class_id'],
            'admin_id'   => $class['admin_id'] ?? $student['admin_id'],
            'room_id'    => $student['room_id'],
            'leave_type' => in_array($leaveType, ['affair', 'sick']) ? $leaveType : 'affair',
            'reason'     => $reason,
            'start_time' => $start,
            'end_time'   => $end,
            'days'       => $days,
            'status'     => 'pending_parent',
            'createtime' => $now,
            'updatetime' => $now,
        ]);
        LeaveService::addLog($id, 'apply', 'student', $student['id'], '学生提交请假');
        $this->success('提交成功，等待家长审核', ['id' => $id]);
    }

    /**
     * 我的请假列表（学生）
     */
    public function myList()
    {
        $student = $this->getStudent();
        GateService::settleExpiredForStudent($student['id']);
        $list = Db::name('leave')->where('student_id', $student['id'])->order('id desc')->select();
        foreach ($list as &$row) {
            if (!empty($row['parent_sign_image'])) {
                $row['parent_sign_image'] = cdnurl($row['parent_sign_image'], true);
            }
        }
        unset($row);
        $list = GateService::attachRecordsToLeaves($list);
        $this->success('', ['list' => $list]);
    }

    /**
     * 家长查看子女请假
     */
    public function parentList()
    {
        $parent = $this->getParent();
        $studentId = (int)$this->request->get('student_id');
        $query = Db::name('leave')->alias('l')
            ->join('parent_student ps', 'ps.student_id=l.student_id')
            ->where('ps.parent_id', $parent['id']);
        if ($studentId) {
            $query->where('l.student_id', $studentId);
        }
        $list = $query->field('l.*')->order('l.id desc')->select();
        $settled = [];
        foreach ($list as $row) {
            $sid = (int)$row['student_id'];
            if ($sid && empty($settled[$sid])) {
                GateService::settleExpiredForStudent($sid);
                $settled[$sid] = true;
            }
        }
        $query = Db::name('leave')->alias('l')
            ->join('parent_student ps', 'ps.student_id=l.student_id')
            ->where('ps.parent_id', $parent['id']);
        if ($studentId) {
            $query->where('l.student_id', $studentId);
        }
        $list = $query->field('l.*')->order('l.id desc')->select();
        foreach ($list as &$row) {
            if (!empty($row['parent_sign_image'])) {
                $row['parent_sign_image'] = cdnurl($row['parent_sign_image'], true);
            }
        }
        unset($row);
        $list = GateService::attachRecordsToLeaves($list);
        $this->success('', ['list' => $list]);
    }

    /**
     * 家长审核
     */
    public function parentAudit()
    {
        $parent = $this->getParent();
        $leaveId = (int)$this->request->post('leave_id');
        $agree = (int)$this->request->post('agree', 1);
        $remark = $this->request->post('remark', '');
        $signImage = trim((string)$this->request->post('sign_image', ''));
        $leave = Db::name('leave')->where('id', $leaveId)->find();
        if (!$leave) {
            $this->error('请假单不存在');
        }
        $bind = Db::name('parent_student')->where([
            'parent_id' => $parent['id'], 'student_id' => $leave['student_id'],
        ])->find();
        if (!$bind) {
            $this->error('无权审核');
        }
        try {
            LeaveService::parentApprove($leaveId, $parent['id'], $agree ? true : false, $remark, $signImage);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
        $this->success($agree ? '已同意' : '已拒绝');
    }

    /**
     * 请假详情
     */
    public function detail()
    {
        $id = (int)$this->request->get('id');
        $leave = Db::name('leave')->where('id', $id)->find();
        if (!$leave) {
            $this->error('不存在');
        }
        GateService::settleExpiredForStudent((int)$leave['student_id']);
        $leave = Db::name('leave')->where('id', $id)->find();
        if (!empty($leave['parent_sign_image'])) {
            $leave['parent_sign_image'] = cdnurl($leave['parent_sign_image'], true);
        }
        $leave['status_display'] = GateService::displayStatus($leave);
        $leave['gate_records'] = GateService::recordsForLeave($id);
        $leave['gate_count'] = count($leave['gate_records']);
        $logs = Db::name('leave_log')->where('leave_id', $id)->order('id asc')->select();
        $this->success('', ['leave' => $leave, 'logs' => $logs, 'gate_records' => $leave['gate_records']]);
    }
}
