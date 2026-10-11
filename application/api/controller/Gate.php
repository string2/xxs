<?php

namespace app\api\controller;

use app\common\controller\Api;
use app\common\library\campus\GateService;
use think\Db;

/**
 * 门禁扫码
 */
class Gate extends Api
{
    protected $noNeedLogin = [];
    protected $noNeedRight = '*';

    /**
     * 学生扫码通行
     */
    public function scan()
    {
        $token = $this->request->post('device_token');
        $mobile = $this->request->post('mobile');
        if (!$token) {
            $this->error('缺少设备标识');
        }
        $student = Db::name('student')->where('user_id', $this->auth->id)->find();
        if (!$student) {
            $this->error('请先绑定学生身份');
        }
        if (!$mobile) {
            $mobile = $student['mobile'];
        }
        if ($mobile !== $student['mobile']) {
            $this->error('手机号与学籍不匹配');
        }
        try {
            // 与小麦闸机同一套请假校验规则（token 对应门禁设备 token/device_no）
            $result = GateService::recordOpen($mobile, $token, '', '', '', 'miniapp');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
        $this->success('通行成功', $result);
    }

    /**
     * 当前通行资格（学生查看是否可去闸机扫码）
     */
    public function passStatus()
    {
        $student = Db::name('student')->where('user_id', $this->auth->id)->find();
        if (!$student) {
            $this->error('请先绑定学生身份');
        }
        $this->success('', GateService::passStatusForStudent((int)$student['id']));
    }

    /**
     * 进出记录（学生自己 / 家长看子女）
     */
    public function records()
    {
        $studentId = (int)$this->request->get('student_id');
        if (!$studentId) {
            $student = Db::name('student')->where('user_id', $this->auth->id)->find();
            if ($student) {
                $studentId = $student['id'];
            }
        }
        if (!$studentId) {
            $this->error('请指定学生');
        }
        // 权限：本人或绑定家长
        $ok = false;
        $self = Db::name('student')->where(['id' => $studentId, 'user_id' => $this->auth->id])->find();
        if ($self) {
            $ok = true;
        } else {
            $parent = Db::name('parent')->where('user_id', $this->auth->id)->find();
            if ($parent) {
                $bind = Db::name('parent_student')->where([
                    'parent_id' => $parent['id'], 'student_id' => $studentId,
                ])->find();
                $ok = (bool)$bind;
            }
        }
        if (!$ok) {
            $this->error('无权查看');
        }
        $list = Db::name('gate_record')->where('student_id', $studentId)->order('id desc')->limit(100)->select();
        $this->success('', ['list' => $list]);
    }
}
