<?php

namespace app\api\controller;

use app\common\controller\Api;
use think\Db;

/**
 * 查寝接口（寝室管理员）
 */
class Dorm extends Api
{
    protected $noNeedLogin = [];
    protected $noNeedRight = '*';

    protected function getDormAdmin()
    {
        $admin = Db::name('dorm_admin')->where('user_id', $this->auth->id)->where('status', 'normal')->find();
        if (!$admin) {
            $this->error('请先绑定寝室管理员身份');
        }
        return $admin;
    }

    /**
     * 楼层房间布局 + 请假标红 + 今日查寝状态
     */
    public function layout()
    {
        $admin = $this->getDormAdmin();
        $buildingId = (int)$this->request->get('building_id', $admin['building_id']);
        $floor = $this->request->get('floor', '');
        $checkDate = $this->request->get('check_date', date('Y-m-d'));

        // 可选楼层
        $floorOptions = [];
        if ($admin['floors'] !== '') {
            $floorOptions = array_values(array_filter(array_map('intval', explode(',', $admin['floors']))));
        }
        if (!$floorOptions) {
            $floorOptions = Db::name('dorm_room')
                ->where(['building_id' => $buildingId, 'status' => 'normal'])
                ->group('floor')
                ->order('floor asc')
                ->column('floor');
            $floorOptions = array_map('intval', $floorOptions ?: []);
        }
        if ($floor === '' && $floorOptions) {
            $floor = (string)$floorOptions[0];
        }

        $query = Db::name('dorm_room')->where(['building_id' => $buildingId, 'status' => 'normal']);
        if ($floor !== '') {
            $query->where('floor', (int)$floor);
        }
        $rooms = $query->order('floor asc,room_no asc')->select();

        // 今日已查房间
        $checkedMap = [];
        $check = Db::name('dorm_check')->where([
            'dorm_admin_id' => $admin['id'],
            'building_id'   => $buildingId,
            'check_date'    => $checkDate,
        ])->find();
        if ($check) {
            $items = Db::name('dorm_check_item')->where('check_id', $check['id'])->select();
            foreach ($items as $it) {
                $checkedMap[$it['room_id']] = $it;
            }
        }

        // 进行中请假的寝室
        $leaveCounts = [];
        $leaveRows = Db::name('leave')
            ->where('status', 'in', ['approved', 'left', 'pending_teacher', 'pending_parent'])
            ->where('room_id', '>', 0)
            ->field('room_id, COUNT(*) as cnt')
            ->group('room_id')
            ->select();
        foreach ($leaveRows as $row) {
            $leaveCounts[$row['room_id']] = (int)$row['cnt'];
        }

        $list = [];
        foreach ($rooms as $room) {
            $leaveCount = isset($leaveCounts[$room['id']]) ? $leaveCounts[$room['id']] : 0;
            $onLeave = $leaveCount > 0;
            $checked = isset($checkedMap[$room['id']]) ? $checkedMap[$room['id']] : null;
            $checkResult = $checked ? $checked['result'] : '';

            // UI 状态：leave > checked normal/abnormal > unchecked
            if ($onLeave || $checkResult === 'leave') {
                $uiStatus = 'leave';
                $statusText = $leaveCount > 0 ? ($leaveCount . '人请假') : '有请假';
            } elseif ($checkResult === 'abnormal') {
                $uiStatus = 'abnormal';
                $statusText = '异常';
            } elseif ($checkResult === 'normal') {
                $uiStatus = 'normal';
                $statusText = '正常';
            } else {
                $uiStatus = 'unchecked';
                $statusText = '未查';
            }

            $list[] = [
                'room'         => $room,
                'is_leave'     => $onLeave ? 1 : 0,
                'leave_count'  => $leaveCount,
                'check_result' => $checkResult,
                'ui_status'    => $uiStatus,
                'status_text'  => $statusText,
            ];
        }

        $building = Db::name('dorm_building')->where('id', $buildingId)->find();
        $this->success('', [
            'building'      => $building,
            'floors'        => $floorOptions,
            'current_floor' => (int)$floor,
            'check_date'    => $checkDate,
            'rooms'         => $list,
        ]);
    }

    /**
     * 提交查寝结果
     */
    public function check()
    {
        $admin = $this->getDormAdmin();
        $roomId = (int)$this->request->post('room_id');
        $result = $this->request->post('result', 'normal');
        $remark = $this->request->post('remark', '');
        $checkDate = $this->request->post('check_date', date('Y-m-d'));
        if (!$roomId || !in_array($result, ['normal', 'abnormal', 'leave'])) {
            $this->error('参数错误');
        }
        $checkId = $this->saveCheckItem($admin, $roomId, $result, $remark, $checkDate);
        $this->success('查寝已记录', ['check_id' => $checkId]);
    }

    /**
     * 批量提交查寝结果
     *
     * @ApiMethod (POST)
     * @ApiParams (name="room_ids", type="string", required=true, description="房间ID，逗号分隔")
     * @ApiParams (name="result", type="string", required=true, description="normal/abnormal/leave")
     */
    public function batchCheck()
    {
        $admin = $this->getDormAdmin();
        $roomIdsRaw = $this->request->post('room_ids', '');
        $result = $this->request->post('result', 'normal');
        $remark = $this->request->post('remark', '');
        $checkDate = $this->request->post('check_date', date('Y-m-d'));
        if (!in_array($result, ['normal', 'abnormal', 'leave'])) {
            $this->error('参数错误');
        }
        if (is_array($roomIdsRaw)) {
            $roomIds = array_filter(array_map('intval', $roomIdsRaw));
        } else {
            $roomIds = array_filter(array_map('intval', explode(',', (string)$roomIdsRaw)));
        }
        if (!$roomIds) {
            $this->error('请选择房间');
        }
        $checkId = 0;
        $count = 0;
        foreach ($roomIds as $roomId) {
            if ($roomId <= 0) {
                continue;
            }
            $checkId = $this->saveCheckItem($admin, $roomId, $result, $remark, $checkDate);
            $count++;
        }
        if (!$count) {
            $this->error('没有有效的房间');
        }
        $this->success('批量查寝已记录', ['check_id' => $checkId, 'count' => $count]);
    }

    /**
     * 保存单条查寝记录
     */
    protected function saveCheckItem($admin, $roomId, $result, $remark, $checkDate)
    {
        $room = Db::name('dorm_room')->where('id', $roomId)->find();
        if (!$room) {
            return 0;
        }
        $now = time();
        $check = Db::name('dorm_check')->where([
            'dorm_admin_id' => $admin['id'],
            'building_id'   => $room['building_id'],
            'check_date'    => $checkDate,
        ])->find();
        if (!$check) {
            $checkId = Db::name('dorm_check')->insertGetId([
                'dorm_admin_id' => $admin['id'],
                'building_id'   => $room['building_id'],
                'check_date'    => $checkDate,
                'remark'        => '',
                'createtime'    => $now,
                'updatetime'    => $now,
            ]);
        } else {
            $checkId = $check['id'];
        }

        $item = Db::name('dorm_check_item')->where(['check_id' => $checkId, 'room_id' => $roomId])->find();
        $data = [
            'check_id'   => $checkId,
            'room_id'    => $roomId,
            'result'     => $result,
            'remark'     => $remark,
            'updatetime' => $now,
        ];
        if ($item) {
            Db::name('dorm_check_item')->where('id', $item['id'])->update($data);
        } else {
            $data['createtime'] = $now;
            Db::name('dorm_check_item')->insert($data);
        }
        return $checkId;
    }

    /**
     * 今日查寝记录
     */
    public function today()
    {
        $admin = $this->getDormAdmin();
        $date = $this->request->get('check_date', date('Y-m-d'));
        $check = Db::name('dorm_check')->where([
            'dorm_admin_id' => $admin['id'],
            'check_date'    => $date,
        ])->find();
        $items = [];
        if ($check) {
            $items = Db::name('dorm_check_item')->alias('i')
                ->join('dorm_room r', 'i.room_id=r.id')
                ->where('i.check_id', $check['id'])
                ->field('i.*,r.room_no,r.floor')
                ->select();
        }
        $this->success('', ['check' => $check, 'items' => $items]);
    }
}
