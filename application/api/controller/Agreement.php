<?php

namespace app\api\controller;

use app\common\controller\Api;
use think\Db;

/**
 * 协议签署（家长）
 */
class Agreement extends Api
{
    protected $noNeedLogin = [];
    protected $noNeedRight = '*';

    protected function getParent()
    {
        $parent = Db::name('parent')->where('user_id', $this->auth->id)->find();
        if (!$parent) {
            $this->error('请先绑定家长身份');
        }
        return $parent;
    }

    public function lists()
    {
        $parent = $this->getParent();
        $studentId = (int)$this->request->get('student_id', 0);
        $agreements = Db::name('agreement')->where('status', 'normal')->order('id desc')->select();
        $list = [];
        foreach ($agreements as $item) {
            $sign = null;
            if ($studentId) {
                $sign = Db::name('agreement_sign')->where([
                    'agreement_id' => $item['id'],
                    'parent_id'    => $parent['id'],
                    'student_id'   => $studentId,
                ])->find();
            }
            $list[] = [
                'agreement' => $item,
                'signed'    => $sign ? 1 : 0,
                'sign'      => $sign,
            ];
        }
        $this->success('', ['list' => $list]);
    }

    public function detail()
    {
        $id = (int)$this->request->get('id');
        $row = Db::name('agreement')->where(['id' => $id, 'status' => 'normal'])->find();
        if (!$row) {
            $this->error('协议不存在');
        }
        $this->success('', $row);
    }

    public function sign()
    {
        $parent = $this->getParent();
        $agreementId = (int)$this->request->post('agreement_id');
        $studentId = (int)$this->request->post('student_id');
        $signImage = $this->request->post('sign_image', '');
        if (!$agreementId || !$studentId) {
            $this->error('参数错误');
        }
        $bind = Db::name('parent_student')->where([
            'parent_id' => $parent['id'], 'student_id' => $studentId,
        ])->find();
        if (!$bind) {
            $this->error('未绑定该学生');
        }
        $agreement = Db::name('agreement')->where(['id' => $agreementId, 'status' => 'normal'])->find();
        if (!$agreement) {
            $this->error('协议不存在');
        }
        $exist = Db::name('agreement_sign')->where([
            'agreement_id' => $agreementId,
            'parent_id'    => $parent['id'],
            'student_id'   => $studentId,
        ])->find();
        if ($exist) {
            $this->error('已签署');
        }
        $now = time();
        Db::name('agreement_sign')->insert([
            'agreement_id' => $agreementId,
            'parent_id'    => $parent['id'],
            'student_id'   => $studentId,
            'sign_image'   => $signImage,
            'signtime'     => $now,
            'createtime'   => $now,
            'updatetime'   => $now,
        ]);
        $this->success('签署成功');
    }
}
