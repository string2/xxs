<?php

namespace app\common\library\campus;

use fast\Date;
use think\Db;

/**
 * 智慧校园控制台数据统计
 */
class DashboardService
{
    /**
     * 解析当前登录用户的数据范围
     */
    public static function resolveScope($auth)
    {
        if ($auth->isSuperAdmin()) {
            return [
                'role'      => 'super',
                'label'     => '全校',
                'admin_ids' => null,
                'class_ids' => null,
            ];
        }

        $groupIds = Db::name('auth_group_access')->where('uid', $auth->id)->column('group_id');
        $teacherGroupId = Db::name('auth_group')->where('name', '教师组')->value('id');
        if ($teacherGroupId && in_array($teacherGroupId, $groupIds)) {
            $teacher = Db::name('teacher')->where('admin_id', $auth->id)->find();
            $className = '';
            $classIds = [];
            if ($teacher && $teacher['class_id']) {
                $classIds = [(int)$teacher['class_id']];
                $className = (string)Db::name('school_class')->where('id', $teacher['class_id'])->value('name');
            }
            return [
                'role'      => 'teacher',
                'label'     => $className ?: '本班',
                'admin_ids' => [$auth->id],
                'class_ids' => $classIds ?: null,
            ];
        }

        return [
            'role'      => 'admin',
            'label'     => '全校',
            'admin_ids' => null,
            'class_ids' => null,
        ];
    }

    /**
     * 解析日期范围，默认近 7 天
     */
    public static function parseRange($start = null, $end = null)
    {
        if ($start && $end) {
            $startTs = strtotime($start . ' 00:00:00');
            $endTs = strtotime($end . ' 23:59:59');
        } else {
            $startTs = Date::unixtime('day', -6);
            $endTs = Date::unixtime('day', 0, 'end');
            $start = date('Y-m-d', $startTs);
            $end = date('Y-m-d', $endTs);
        }
        if (!$startTs || !$endTs || $startTs > $endTs) {
            $startTs = Date::unixtime('day', -6);
            $endTs = Date::unixtime('day', 0, 'end');
            $start = date('Y-m-d', $startTs);
            $end = date('Y-m-d', $endTs);
        }
        // 最多统计 90 天
        if (($endTs - $startTs) > 90 * 86400) {
            $startTs = $endTs - 90 * 86400 + 1;
            $start = date('Y-m-d', $startTs);
        }

        $days = (int)floor(($endTs - $startTs) / 86400) + 1;
        $label = $start === $end ? $start : ($start . ' ~ ' . $end);

        return [
            'start'    => $start,
            'end'      => $end,
            'start_ts' => $startTs,
            'end_ts'   => $endTs,
            'days'     => $days,
            'label'    => $label,
        ];
    }

    protected static function applyAdminScope($query, $scope, $field = 'admin_id')
    {
        if (!empty($scope['admin_ids']) && is_array($scope['admin_ids'])) {
            $query->where($field, 'in', $scope['admin_ids']);
        }
        return $query;
    }

    protected static function applyDateScope($query, array $range, $field = 'createtime')
    {
        return $query->where($field, 'between', [$range['start_ts'], $range['end_ts']]);
    }

    /**
     * 请假记录：申请时间或请假时段与区间有交集
     */
    protected static function applyLeavePeriodScope($query, array $range, $alias = '')
    {
        $p = $alias ? $alias . '.' : '';
        return $query->where(function ($q) use ($range, $p) {
            $q->where($p . 'createtime', 'between', [$range['start_ts'], $range['end_ts']])
                ->whereOr(function ($q2) use ($range, $p) {
                    $q2->where($p . 'start_time', '<=', $range['end_ts'])
                        ->where($p . 'end_time', '>=', $range['start_ts']);
                });
        });
    }

    public static function build($auth, $start = null, $end = null)
    {
        $scope = self::resolveScope($auth);
        $range = self::parseRange($start, $end);
        $summary = self::summary($scope, $range);
        $leaveTrend = self::leaveTrend($scope, $range);
        $leaveStatus = self::leaveStatus($scope, $range);
        $scoreChart = self::scoreOverview($scope);
        $classChart = self::classOverview($scope);
        $recentLeaves = self::recentLeaves($scope, $range);

        return [
            'scope'        => $scope,
            'dateRange'    => $range,
            'summary'      => $summary,
            'leaveTrend'   => $leaveTrend,
            'leaveStatus'  => $leaveStatus,
            'scoreChart'   => $scoreChart,
            'classChart'   => $classChart,
            'recentLeaves' => $recentLeaves,
        ];
    }

    protected static function leaveQuery($scope)
    {
        $query = Db::name('leave');
        self::applyAdminScope($query, $scope);
        return $query;
    }

    protected static function summary($scope, array $range)
    {
        $studentQ = Db::name('student')->where('status', 'normal');
        self::applyAdminScope($studentQ, $scope);

        $pendingTeacher = (int)self::leaveQuery($scope)
            ->where('status', 'in', ['pending_teacher', 'parent_approved'])
            ->count();

        $periodLeaveQ = self::leaveQuery($scope);
        self::applyLeavePeriodScope($periodLeaveQ, $range);
        $periodLeave = (int)$periodLeaveQ->count();

        $gateQ = Db::name('gate_record');
        self::applyDateScope($gateQ, $range);
        if (!empty($scope['admin_ids'])) {
            $studentIds = Db::name('student')->where('admin_id', 'in', $scope['admin_ids'])->column('id');
            if ($studentIds) {
                $gateQ->where('student_id', 'in', $studentIds);
            } else {
                $gateQ->where('student_id', 0);
            }
        }
        $periodGate = (int)$gateQ->count();

        $examIds = self::scopedExamIds($scope);
        $examCount = count($examIds);

        $avgScore = 0;
        if ($examIds) {
            $latestExamId = max($examIds);
            $avgQ = Db::name('exam_score')
                ->where('exam_id', $latestExamId)
                ->where('is_total', 1);
            self::applyAdminScope($avgQ, $scope);
            $avgScore = round((float)$avgQ->avg('score'), 1);
        }

        $data = [
            'student_count'    => (int)$studentQ->count(),
            'class_count'      => self::classCount($scope),
            'pending_teacher'  => $pendingTeacher,
            'period_leave'     => $periodLeave,
            'period_gate'      => $periodGate,
            'exam_count'       => $examCount,
            'latest_avg_score' => $avgScore,
        ];

        if ($scope['role'] !== 'teacher') {
            $data['teacher_count'] = (int)Db::name('teacher')->where('status', 'normal')->count();
            $data['period_dorm_check'] = (int)Db::name('dorm_check')
                ->where('check_date', 'between', [$range['start'], $range['end']])
                ->count();
            $data['content_count'] = (int)Db::name('campus_content')->where('status', 'normal')->count();
            $data['agreement_count'] = (int)Db::name('agreement')->where('status', 'normal')->count();
        }

        return $data;
    }

    protected static function classCount($scope)
    {
        if (!empty($scope['class_ids'])) {
            return count($scope['class_ids']);
        }
        return (int)Db::name('school_class')->where('status', 'normal')->count();
    }

    protected static function scopedExamIds($scope)
    {
        $q = Db::name('exam_score')->distinct(true)->field('exam_id');
        self::applyAdminScope($q, $scope);
        return array_filter(array_map('intval', $q->column('exam_id')));
    }

    protected static function leaveTrend($scope, array $range)
    {
        $start = $range['start_ts'];
        $end = $range['end_ts'];
        $columns = [];
        for ($t = $start; $t <= $end; $t += 86400) {
            $columns[] = date('Y-m-d', $t);
        }

        $q = Db::name('leave')
            ->where('createtime', 'between', [$start, $end])
            ->field('DATE(FROM_UNIXTIME(createtime)) as d, COUNT(*) as c')
            ->group('d');
        self::applyAdminScope($q, $scope);
        $rows = $q->select();
        $map = [];
        foreach ($rows as $row) {
            $map[$row['d']] = (int)$row['c'];
        }

        $values = [];
        foreach ($columns as $col) {
            $values[] = $map[$col] ?? 0;
        }

        return ['columns' => $columns, 'values' => $values];
    }

    protected static function leaveStatus($scope, array $range)
    {
        $labels = [
            'pending_parent'   => '待家长批准',
            'parent_approved'  => '待班主任批准',
            'pending_teacher'  => '待班主任批准',
            'approved'         => '已批准',
            'rejected'         => '已拒绝',
            'parent_rejected'  => '已拒绝',
            'teacher_rejected' => '已拒绝',
            'left'             => '已批准',
            'returned'         => '已批准',
        ];
        $q = Db::name('leave')->field('status, COUNT(*) as c')->group('status');
        self::applyAdminScope($q, $scope);
        self::applyLeavePeriodScope($q, $range);
        $rows = $q->select();

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'name'  => $labels[$row['status']] ?? $row['status'],
                'value' => (int)$row['c'],
            ];
        }
        if (!$items) {
            $items[] = ['name' => '暂无数据', 'value' => 0];
        }
        return $items;
    }

    protected static function scoreOverview($scope)
    {
        $examIds = self::scopedExamIds($scope);
        if (!$examIds) {
            return ['exam_name' => '暂无考试', 'subjects' => [], 'averages' => []];
        }

        $latestExamId = max($examIds);
        $exam = Db::name('exam')->where('id', $latestExamId)->find();
        $q = Db::name('exam_score')
            ->where('exam_id', $latestExamId)
            ->where('is_total', 0)
            ->field('subject, AVG(score) as avg_score')
            ->group('subject')
            ->order('subject asc');
        self::applyAdminScope($q, $scope);
        $rows = $q->select();

        $subjects = [];
        $averages = [];
        foreach ($rows as $row) {
            $subjects[] = $row['subject'];
            $averages[] = round((float)$row['avg_score'], 1);
        }

        $totalQ = Db::name('exam_score')
            ->where('exam_id', $latestExamId)
            ->where('is_total', 1);
        self::applyAdminScope($totalQ, $scope);
        $totalAvg = round((float)$totalQ->avg('score'), 1);
        if ($totalAvg > 0) {
            $subjects[] = '总分';
            $averages[] = $totalAvg;
        }

        return [
            'exam_name' => $exam ? $exam['name'] : ('考试#' . $latestExamId),
            'subjects'  => $subjects ?: ['暂无'],
            'averages'  => $averages ?: [0],
        ];
    }

    protected static function classOverview($scope)
    {
        if ($scope['role'] === 'teacher') {
            $q = Db::name('student')->where('status', 'normal')
                ->field('gender, COUNT(*) as c')
                ->group('gender');
            self::applyAdminScope($q, $scope);
            $rows = $q->select();
            $map = ['male' => '男生', 'female' => '女生', 'unknown' => '未知'];
            $names = [];
            $values = [];
            foreach ($rows as $row) {
                $names[] = $map[$row['gender']] ?? $row['gender'];
                $values[] = (int)$row['c'];
            }
            return [
                'title'  => '本班性别分布',
                'names'  => $names ?: ['暂无'],
                'values' => $values ?: [0],
            ];
        }

        $rows = Db::name('student')->alias('s')
            ->join('school_class c', 's.class_id=c.id', 'LEFT')
            ->where('s.status', 'normal')
            ->field('c.name as class_name, COUNT(*) as c')
            ->group('s.class_id')
            ->order('c desc')
            ->limit(8)
            ->select();

        $names = [];
        $values = [];
        foreach ($rows as $row) {
            $names[] = $row['class_name'] ?: '未分班';
            $values[] = (int)$row['c'];
        }
        return [
            'title'  => '各班学生人数',
            'names'  => $names ?: ['暂无'],
            'values' => $values ?: [0],
        ];
    }

    protected static function recentLeaves($scope, array $range, $limit = 8)
    {
        $statusMap = [
            'pending_parent'   => '待家长批准',
            'parent_approved'  => '待班主任批准',
            'pending_teacher'  => '待班主任批准',
            'approved'         => '已批准',
            'rejected'         => '已拒绝',
            'parent_rejected'  => '已拒绝',
            'teacher_rejected' => '已拒绝',
            'left'             => '已批准',
            'returned'         => '已批准',
        ];
        $q = Db::name('leave')->alias('l')
            ->join('student s', 'l.student_id=s.id', 'LEFT')
            ->field('l.id,s.name as student_name,l.reason,l.status,l.createtime,l.start_time,l.end_time')
            ->order('l.id desc')
            ->limit($limit);
        self::applyLeavePeriodScope($q, $range, 'l');
        self::applyAdminScope($q, $scope, 'l.admin_id');
        $rows = $q->select();

        foreach ($rows as &$row) {
            $row['status_text'] = $statusMap[$row['status']] ?? $row['status'];
            $row['createtime_text'] = $row['createtime'] ? date('Y-m-d H:i', $row['createtime']) : '';
            $row['range_text'] = ($row['start_time'] ? date('m-d', $row['start_time']) : '')
                . ' ~ '
                . ($row['end_time'] ? date('m-d', $row['end_time']) : '');
            $row['status_class'] = self::statusClass($row['status']);
        }
        unset($row);
        return $rows;
    }

    protected static function statusClass($status)
    {
        if (in_array($status, ['pending_parent', 'pending_teacher', 'parent_approved'], true)) {
            return 'warn';
        }
        if (in_array($status, ['approved', 'returned', 'left'], true)) {
            return 'ok';
        }
        if (in_array($status, ['rejected', 'parent_rejected', 'teacher_rejected'], true)) {
            return 'danger';
        }
        return '';
    }
}
