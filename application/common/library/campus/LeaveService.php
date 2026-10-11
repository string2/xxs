<?php

namespace app\common\library\campus;

use think\Db;

/**
 * 请假状态流转
 */
class LeaveService
{
    public static function addLog($leaveId, $action, $operatorType, $operatorId, $content = '')
    {
        Db::name('leave_log')->insert([
            'leave_id'      => $leaveId,
            'action'        => $action,
            'operator_type' => $operatorType,
            'operator_id'   => $operatorId,
            'content'       => $content,
            'createtime'    => time(),
        ]);
    }

    /**
     * 家长审核
     */
    public static function parentApprove($leaveId, $parentId, $agree, $remark = '', $signImage = '')
    {
        $leave = Db::name('leave')->where('id', $leaveId)->find();
        if (!$leave || $leave['status'] !== 'pending_parent') {
            throw new \Exception('请假单状态不可审核');
        }
        $now = time();
        $signImage = trim((string)$signImage);
        if ($agree) {
            if ($signImage === '') {
                throw new \Exception('请先完成家长签字');
            }
            Db::name('leave')->where('id', $leaveId)->update([
                'status'            => 'pending_teacher',
                'parent_id'         => $parentId,
                'parent_time'       => $now,
                'parent_sign_image' => $signImage,
                'remark'            => $remark,
                'updatetime'        => $now,
            ]);
            self::addLog($leaveId, 'parent_approve', 'parent', $parentId, $remark ?: '家长已批准，待班主任审核');
        } else {
            $data = [
                'status'      => 'rejected',
                'parent_id'   => $parentId,
                'parent_time' => $now,
                'remark'      => $remark,
                'updatetime'  => $now,
            ];
            if ($signImage !== '') {
                $data['parent_sign_image'] = $signImage;
            }
            Db::name('leave')->where('id', $leaveId)->update($data);
            self::addLog($leaveId, 'parent_reject', 'parent', $parentId, $remark ?: '家长已拒绝');
        }
    }

    /**
     * 班主任审核
     */
    public static function teacherApprove($leaveId, $adminId, $agree, $remark = '')
    {
        $leave = Db::name('leave')->where('id', $leaveId)->find();
        // 兼容：历史 parent_approved 与待班主任批准 都可审
        if (!$leave || !in_array($leave['status'], ['pending_teacher', 'parent_approved'], true)) {
            throw new \Exception('请假单状态不可审核');
        }
        $now = time();
        if ($agree) {
            Db::name('leave')->where('id', $leaveId)->update([
                'status'       => 'approved',
                'admin_id'     => $adminId,
                'teacher_time' => $now,
                'remark'       => $remark,
                'updatetime'   => $now,
            ]);
            self::addLog($leaveId, 'teacher_approve', 'teacher', $adminId, $remark ?: '班主任已批准');
        } else {
            Db::name('leave')->where('id', $leaveId)->update([
                'status'       => 'rejected',
                'admin_id'     => $adminId,
                'teacher_time' => $now,
                'remark'       => $remark,
                'updatetime'   => $now,
            ]);
            self::addLog($leaveId, 'teacher_reject', 'teacher', $adminId, $remark ?: '班主任已拒绝');
        }
    }

    /**
     * 门禁扫码通行（小程序等）：只写通行记录，不改离校/回校状态
     */
    public static function gatePass($deviceToken, $mobile)
    {
        $result = GateService::recordOpen($mobile, $deviceToken, '', '', '', 'miniapp');
        $device = GateService::findDevice($deviceToken);
        $student = Db::name('student')->where(['mobile' => $mobile, 'status' => 'normal'])->find();
        return [
            'record_id'  => $result['record_id'],
            'direction'  => $result['direction'],
            'student'    => $student ? ['id' => $student['id'], 'name' => $student['name'], 'mobile' => $student['mobile']] : $result['student'],
            'leave_id'   => $result['leave_id'],
            'passtime'   => $result['passtime'],
            'device'     => $device ? ['id' => $device['id'], 'name' => $device['name']] : null,
        ];
    }

    /**
     * 兼容旧状态：left/rejected 迁移为新审批状态
     */
    public static function normalizeLegacyStatuses()
    {
        Db::name('leave')->where('status', 'left')->update([
            'status'     => 'approved',
            'updatetime' => time(),
        ]);
        Db::name('leave')->where('status', 'returned')->update([
            'status'     => 'approved',
            'updatetime' => time(),
        ]);
        Db::name('leave')->where('status', 'parent_approved')->update([
            'status'     => 'pending_teacher',
            'updatetime' => time(),
        ]);
        Db::name('leave')->where('status', 'in', ['parent_rejected', 'teacher_rejected'])->update([
            'status'     => 'rejected',
            'updatetime' => time(),
        ]);
    }
}