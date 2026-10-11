<?php

namespace app\api\controller;

use app\common\controller\Api;
use think\Db;

/**
 * 成绩接口（家长）
 */
class Score extends Api
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

    protected function assertChild($studentId, $parentId)
    {
        $bind = Db::name('parent_student')->where([
            'parent_id'  => $parentId,
            'student_id' => $studentId,
        ])->find();
        if (!$bind) {
            $this->error('无权查看该学生');
        }
    }

    /**
     * 学生成绩列表（按考试）
     */
    public function lists()
    {
        $parent = $this->getParent();
        $studentId = (int)$this->request->get('student_id');
        if (!$studentId) {
            $this->error('请选择学生');
        }
        $this->assertChild($studentId, $parent['id']);

        $examIds = Db::name('exam_rank')->where('student_id', $studentId)->group('exam_id')->column('exam_id');
        if (!$examIds) {
            $this->success('', ['list' => []]);
        }
        $exams = Db::name('exam')->where('id', 'in', $examIds)->where('status', 'normal')->order('exam_date desc,id desc')->select();
        $list = [];
        foreach ($exams as $exam) {
            $ranks = Db::name('exam_rank')->where(['exam_id' => $exam['id'], 'student_id' => $studentId])->select();
            $read = Db::name('score_read')->where([
                'exam_id'    => $exam['id'],
                'student_id' => $studentId,
                'parent_id'  => $parent['id'],
            ])->find();
            $list[] = [
                'exam'   => $exam,
                'ranks'  => $ranks,
                'is_read'=> $read ? 1 : 0,
                'readtime' => $read['readtime'] ?? null,
            ];
        }
        $this->success('', ['list' => $list]);
    }

    /**
     * 成绩详情
     */
    public function detail()
    {
        $parent = $this->getParent();
        $studentId = (int)$this->request->get('student_id');
        $examId = (int)$this->request->get('exam_id');
        $this->assertChild($studentId, $parent['id']);
        $exam = Db::name('exam')->where('id', $examId)->find();
        if (!$exam) {
            $this->error('考试不存在');
        }
        $ranks = Db::name('exam_rank')->where(['exam_id' => $examId, 'student_id' => $studentId])->select();
        $read = Db::name('score_read')->where([
            'exam_id' => $examId, 'student_id' => $studentId, 'parent_id' => $parent['id'],
        ])->find();
        $this->success('', [
            'exam'    => $exam,
            'ranks'   => $ranks,
            'is_read' => $read ? 1 : 0,
        ]);
    }

    /**
     * 波形图数据
     */
    public function chart()
    {
        $parent = $this->getParent();
        $studentId = (int)$this->request->get('student_id');
        $subject = $this->request->get('subject', '总分');
        $this->assertChild($studentId, $parent['id']);

        $rows = Db::name('exam_rank')->alias('r')
            ->join('exam e', 'r.exam_id=e.id')
            ->where('r.student_id', $studentId)
            ->where('r.subject', $subject)
            ->where('e.status', 'normal')
            ->order('e.exam_date asc,e.id asc')
            ->field('e.id as exam_id,e.name as exam_name,e.exam_date,r.score,r.class_rank,r.school_rank')
            ->select();
        $this->success('', [
            'subject' => $subject,
            'series'  => $rows,
        ]);
    }

    /**
     * 标记已阅读
     */
    public function read()
    {
        $parent = $this->getParent();
        $studentId = (int)$this->request->post('student_id');
        $examId = (int)$this->request->post('exam_id');
        $this->assertChild($studentId, $parent['id']);
        $now = time();
        $exist = Db::name('score_read')->where([
            'exam_id' => $examId, 'student_id' => $studentId, 'parent_id' => $parent['id'],
        ])->find();
        if ($exist) {
            $this->success('已阅读');
        }
        Db::name('score_read')->insert([
            'exam_id'    => $examId,
            'student_id' => $studentId,
            'parent_id'  => $parent['id'],
            'readtime'   => $now,
            'createtime' => $now,
            'updatetime' => $now,
        ]);
        $this->success('提交成功');
    }
}
