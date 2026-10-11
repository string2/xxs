<?php

namespace app\common\library\campus;

use think\Db;
use think\Log;

/**
 * 门禁通行（小麦自行校验 + 开门记录）
 *
 * 开门条件：
 * 1. 手机号与学籍一致
 * 2. 请假状态为「已批准」(approved)
 * 3. 扫码时间在 start~end 内 → 可多次开门
 * 4. 若已过 end_time（晚归）：该请假在过期后尚未扫过码时，允许再开门 1 次
 */
class GateService
{
    /**
     * 小麦扫码时校验：手机号与学籍一致且请假流程已完成
     */
    public static function verifyForOpen($phone, $deviceNo)
    {
        $phone = trim((string)$phone);
        $deviceNo = trim((string)$deviceNo);
        if (!preg_match('/^1\d{10}$/', $phone)) {
            return self::deny('手机号格式不正确');
        }
        if ($deviceNo === '') {
            return self::deny('缺少设备号');
        }

        $device = self::findDevice($deviceNo);
        if (!$device) {
            return self::deny('门禁设备无效');
        }

        $student = Db::name('student')->where(['mobile' => $phone, 'status' => 'normal'])->find();
        if (!$student) {
            return self::deny('手机号与学籍信息不一致');
        }

        $direction = self::resolveDirection($device, (int)$student['id']);
        $leave = self::findPassableLeave((int)$student['id']);
        if (!$leave) {
            return self::deny(self::denyReasonForStudent((int)$student['id']));
        }

        return self::allow([
            'student'   => $student,
            'device'    => $device,
            'leave'     => $leave,
            'direction' => $direction,
        ]);
    }

    /**
     * 开门成功后只写通行记录（不维护离校/回校状态）
     */
    public static function recordOpen($phone, $deviceNo, $qrcode = '', $sceneName = '', $sn = '', $source = 'xiaomai')
    {
        $sn = trim((string)$sn);
        if ($sn !== '') {
            $exists = Db::name('gate_record')->where('vendor_sn', $sn)->find();
            if ($exists) {
                return ['record_id' => (int)$exists['id'], 'duplicate' => true];
            }
        }

        $deviceKey = trim((string)$deviceNo);
        if ($deviceKey === '' && trim((string)$qrcode) !== '') {
            $deviceKey = trim((string)$qrcode);
        }

        $check = self::verifyForOpen($phone, $deviceKey);
        if (!$check['allow']) {
            throw new \Exception($check['msg']);
        }

        $student = $check['data']['student'];
        $device = $check['data']['device'];
        $leave = $check['data']['leave'];
        $direction = $check['data']['direction'];
        $now = time();
        $source = in_array($source, ['xiaomai', 'miniapp'], true) ? $source : 'xiaomai';

        // 首次扫码记 leave_time（可选统计），状态保持已批准不变
        if (empty($leave['leave_time'])) {
            Db::name('leave')->where('id', $leave['id'])->update([
                'leave_time' => $now,
                'updatetime' => $now,
            ]);
        }

        $recordId = Db::name('gate_record')->insertGetId([
            'device_id'   => $device['id'],
            'student_id'  => $student['id'],
            'leave_id'    => $leave['id'],
            'direction'   => $direction,
            'mobile'      => $student['mobile'],
            'passtime'    => $now,
            'vendor_sn'   => $sn,
            'source'      => $source,
            'createtime'  => $now,
            'updatetime'  => $now,
        ]);

        return [
            'record_id' => $recordId,
            'direction' => $direction,
            'student'   => ['id' => $student['id'], 'name' => $student['name']],
            'leave_id'  => $leave['id'],
            'passtime'  => $now,
        ];
    }

    /**
     * 某条请假下的扫码开门记录（给列表/详情展示）
     */
    public static function recordsForLeave($leaveId)
    {
        $leaveId = (int)$leaveId;
        if ($leaveId <= 0) {
            return [];
        }
        $rows = Db::name('gate_record')->where('leave_id', $leaveId)->order('id', 'asc')->select();
        $list = [];
        foreach ($rows as $row) {
            $dir = $row['direction'] ?? '';
            $list[] = [
                'id'             => (int)$row['id'],
                'direction'      => $dir,
                'direction_text' => $dir === 'in' ? '进门' : ($dir === 'out' ? '出门' : '开门'),
                'passtime'       => (int)$row['passtime'],
                'time_text'      => date('Y-m-d H:i:s', (int)$row['passtime']),
                'source'         => $row['source'] ?? '',
                'mobile'         => $row['mobile'] ?? '',
            ];
        }
        return $list;
    }

    /**
     * 批量为请假行附加扫码次数与记录
     */
    public static function attachRecordsToLeaves($leaves)
    {
        if (!$leaves) {
            return $leaves;
        }
        $ids = [];
        foreach ($leaves as $row) {
            $id = is_array($row) ? (int)($row['id'] ?? 0) : (int)$row['id'];
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        $ids = array_values(array_unique($ids));
        $grouped = [];
        if ($ids) {
            $rows = Db::name('gate_record')->where('leave_id', 'in', $ids)->order('id', 'asc')->select();
            foreach ($rows as $row) {
                $lid = (int)$row['leave_id'];
                $dir = $row['direction'] ?? '';
                $grouped[$lid][] = [
                    'id'             => (int)$row['id'],
                    'direction'      => $dir,
                    'direction_text' => $dir === 'in' ? '进门' : ($dir === 'out' ? '出门' : '开门'),
                    'passtime'       => (int)$row['passtime'],
                    'time_text'      => date('Y-m-d H:i:s', (int)$row['passtime']),
                    'source'         => $row['source'] ?? '',
                ];
            }
        }

        $out = [];
        foreach ($leaves as $row) {
            $item = is_array($row) ? $row : $row->toArray();
            $lid = (int)$item['id'];
            $recs = $grouped[$lid] ?? [];
            $item['gate_count'] = count($recs);
            $item['gate_records'] = $recs;
            $item['status_display'] = self::displayStatus($item);
            $out[] = $item;
        }
        return $out;
    }

    /**
     * 小程序端查询当前通行资格
     */
    public static function passStatusForStudent($studentId)
    {
        $studentId = (int)$studentId;
        $student = Db::name('student')->where('id', $studentId)->find();
        if (!$student) {
            return ['can_pass' => false, 'hint' => '学生信息不存在'];
        }

        $active = self::findPassableLeave($studentId);
        if ($active) {
            $late = !self::inLeaveWindow($active);
            return [
                'can_pass'  => true,
                'direction' => $late ? 'in' : 'both',
                'hint'      => $late
                    ? '请假已到期，晚归可再扫码开门一次'
                    : '已批准，有效期内可多次扫码开门',
                'leave'     => self::formatLeaveBrief($active),
                'mobile'    => $student['mobile'],
            ];
        }

        $pending = Db::name('leave')->where('student_id', $studentId)
            ->where('status', 'in', ['pending_parent', 'pending_teacher', 'parent_approved'])
            ->order('id desc')->find();
        if ($pending) {
            return ['can_pass' => false, 'hint' => '请假审批中，请等待家长/班主任审核', 'leave' => self::formatLeaveBrief($pending)];
        }

        $approved = Db::name('leave')->where('student_id', $studentId)
            ->where('status', 'approved')
            ->order('id desc')->find();
        if ($approved) {
            $now = time();
            if ($now < (int)$approved['start_time']) {
                return ['can_pass' => false, 'hint' => '未到请假开始时间', 'leave' => self::formatLeaveBrief($approved)];
            }
            if ($now > (int)$approved['end_time']) {
                $hint = self::hasLateReturnUsed($approved)
                    ? '晚归开门次数已用完'
                    : '请假已过期，无法开门';
                return ['can_pass' => false, 'hint' => $hint, 'leave' => self::formatLeaveBrief($approved)];
            }
        }

        return ['can_pass' => false, 'hint' => '暂无已批准的有效请假，无法开门'];
    }

    public static function resolveDeviceKey($deviceNo, $qrcode = '')
    {
        $deviceNo = trim((string)$deviceNo);
        $qrcode = trim((string)$qrcode);
        if ($deviceNo !== '') {
            return $deviceNo;
        }
        if ($qrcode !== '') {
            return $qrcode;
        }

        $list = Db::name('gate_device')->where('status', 'normal')->order('id', 'asc')->limit(2)->select();
        if (!$list || count($list) !== 1) {
            return '';
        }
        $row = $list[0];
        if (!empty($row['device_no'])) {
            return (string)$row['device_no'];
        }
        if (!empty($row['qrcode_no'])) {
            return (string)$row['qrcode_no'];
        }
        return (string)($row['token'] ?? '');
    }

    public static function findDevice($deviceNo)
    {
        $deviceNo = trim((string)$deviceNo);
        if ($deviceNo === '') {
            return null;
        }
        $device = Db::name('gate_device')->where(['device_no' => $deviceNo, 'status' => 'normal'])->find();
        if ($device) {
            return $device;
        }
        $device = Db::name('gate_device')->where(['qrcode_no' => $deviceNo, 'status' => 'normal'])->find();
        if ($device) {
            return $device;
        }
        return Db::name('gate_device')->where(['token' => $deviceNo, 'status' => 'normal'])->find();
    }

    public static function logCallback($action, array $params, $allow = null, $msg = '')
    {
        $phone = isset($params['phone']) ? (string)$params['phone'] : '';
        $masked = preg_match('/^1\d{10}$/', $phone)
            ? (substr($phone, 0, 3) . '****' . substr($phone, -4))
            : $phone;
        $line = sprintf(
            '[XIAOMAI] %s phone=%s device=%s qrcode=%s sn=%s allow=%s msg=%s',
            $action,
            $masked,
            $params['device'] ?? '',
            $params['qrcode'] ?? '',
            $params['sn'] ?? '',
            $allow === null ? '-' : ($allow ? '1' : '0'),
            $msg
        );
        Log::write($line, 'info');

        try {
            $raw = $params['raw'] ?? '';
            if (is_array($raw)) {
                $raw = json_encode([
                    'phone'  => $params['phone'] ?? '',
                    'device' => $params['device'] ?? '',
                    'qrcode' => $params['qrcode'] ?? '',
                    'sn'     => $params['sn'] ?? '',
                ], JSON_UNESCAPED_UNICODE);
            }
            Db::name('gate_callback')->insert([
                'action'     => (string)$action,
                'phone'      => $phone,
                'device'     => (string)($params['device'] ?? ''),
                'qrcode'     => (string)($params['qrcode'] ?? ''),
                'scene_name' => (string)($params['scene_name'] ?? ''),
                'sn'         => (string)($params['sn'] ?? ''),
                'allow'      => $allow ? 1 : 0,
                'msg'        => mb_substr((string)$msg, 0, 250),
                'raw_data'   => (string)$raw,
                'createtime' => time(),
            ]);
        } catch (\Throwable $e) {
            Log::write('[XIAOMAI] save gate_callback failed: ' . $e->getMessage(), 'error');
        }
    }

    /**
     * 设备方向；双向设备按该生最近一次通行交替记录出/入（仅作记录，不影响能否开门）
     */
    protected static function resolveDirection(array $device, $studentId)
    {
        $dir = $device['direction'] ?? 'both';
        if ($dir === 'out' || $dir === 'in') {
            return $dir;
        }
        $last = Db::name('gate_record')->where('student_id', $studentId)->order('id desc')->find();
        if (!$last || $last['direction'] === 'in') {
            return 'out';
        }
        return 'in';
    }

    /**
     * 可开门请假：
     * - 已批准 + 在 start~end 内：可多次
     * - 已批准 + 已过 end：若过期后还没有扫码记录，允许晚归再开 1 次
     */
    protected static function findPassableLeave($studentId)
    {
        $now = time();
        $leave = Db::name('leave')->where('student_id', $studentId)
            ->where('status', 'approved')
            ->order('id desc')
            ->find();
        if (!$leave) {
            return null;
        }

        $start = (int)$leave['start_time'];
        $end = (int)$leave['end_time'];

        if ($now < $start) {
            return null;
        }
        // 有效期内
        if ($now <= $end) {
            return $leave;
        }
        // 晚归：过期后尚未有过扫码，允许再开一次
        if (!self::hasLateReturnUsed($leave)) {
            return $leave;
        }
        return null;
    }

    /**
     * 该请假在结束时间之后是否已扫码过（晚归名额是否已用）
     */
    protected static function hasLateReturnUsed(array $leave)
    {
        $end = (int)$leave['end_time'];
        $row = Db::name('gate_record')
            ->where('leave_id', (int)$leave['id'])
            ->where('passtime', '>', $end)
            ->order('id asc')
            ->find();
        return !empty($row);
    }

    protected static function inLeaveWindow(array $leave)
    {
        $now = time();
        return $now >= (int)$leave['start_time'] && $now <= (int)$leave['end_time'];
    }

    /**
     * 无法开门时的具体原因
     */
    protected static function denyReasonForStudent($studentId)
    {
        $now = time();
        $leave = Db::name('leave')->where('student_id', $studentId)
            ->where('status', 'approved')
            ->order('id desc')
            ->find();
        if ($leave) {
            if ($now < (int)$leave['start_time']) {
                return '未到请假开始时间';
            }
            if ($now > (int)$leave['end_time']) {
                return self::hasLateReturnUsed($leave)
                    ? '晚归开门次数已用完'
                    : '请假已过期，无法开门';
            }
        }
        $pending = Db::name('leave')->where('student_id', $studentId)
            ->where('status', 'in', ['pending_parent', 'pending_teacher', 'parent_approved'])
            ->order('id desc')->find();
        if ($pending) {
            return '请假审批中，暂不可开门';
        }
        return '暂无已批准的有效请假，无法开门';
    }

    /**
     * 历史 left/returned 归一为 approved（展示用，不作为开门条件扩展）
     */
    public static function settleExpiredForStudent($studentId)
    {
        Db::name('leave')->where('student_id', (int)$studentId)
            ->where('status', 'in', ['returned', 'left'])
            ->update(['status' => 'approved', 'updatetime' => time()]);
    }

    public static function settleExpiredLeave(array $leave)
    {
        if (in_array($leave['status'] ?? '', ['returned', 'left'], true)) {
            Db::name('leave')->where('id', $leave['id'])->update([
                'status'     => 'approved',
                'updatetime' => time(),
            ]);
            $leave['status'] = 'approved';
        }
        return $leave;
    }

    /**
     * 对外展示：仅审批进度（是否过期看请假起止时间）
     */
    public static function displayStatus(array $leave)
    {
        $status = (string)($leave['status'] ?? '');
        $map = [
            'pending_parent'   => '待家长批准',
            'pending_teacher'  => '待班主任批准',
            'parent_approved'  => '待班主任批准',
            'approved'         => '已批准',
            'rejected'         => '已拒绝',
            'parent_rejected'  => '已拒绝',
            'teacher_rejected' => '已拒绝',
            'left'             => '已批准',
            'returned'         => '已批准',
        ];
        return $map[$status] ?? $status;
    }

    protected static function formatLeaveBrief(array $leave)
    {
        return [
            'id'             => (int)$leave['id'],
            'status'         => $leave['status'],
            'status_display' => self::displayStatus($leave),
            'start_time'     => (int)$leave['start_time'],
            'end_time'       => (int)$leave['end_time'],
            'reason'         => $leave['reason'] ?? '',
        ];
    }

    protected static function allow($data)
    {
        return ['allow' => true, 'msg' => 'success', 'data' => $data];
    }

    protected static function deny($msg)
    {
        return ['allow' => false, 'msg' => $msg, 'data' => null];
    }
}
