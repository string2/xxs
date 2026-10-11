<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;
use app\common\library\campus\ExportService;
use app\common\library\campus\RankService;
use think\Db;

/**
 * 考试成绩 / 考试管理
 *
 * @icon fa fa-file-text-o
 */
class Examscore extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\ExamScore
     */
    protected $model = null;
    protected $dataLimit = 'auth';
    protected $dataLimitField = 'admin_id';
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\ExamScore;
        $subjectList = [];
        try {
            $subjectList = Db::name('subject')->where('status', 'normal')->order('weigh desc,id asc')->column('name');
        } catch (\Throwable $e) {
            $subjectList = ['语文', '数学', '英语', '物理', '化学'];
        }
        if (!$subjectList) {
            $subjectList = ['语文', '数学', '英语', '物理', '化学'];
        }
        $this->view->assign('subjectList', $subjectList);
    }

    public function index()
    {
        return $this->campusRelationIndex(['examinfo', 'studentinfo', 'classinfo']);
    }

    public function import()
    {
        parent::import();
    }

    public function recalculate()
    {
        $examId = (int)$this->request->request('exam_id');
        if (!$examId) {
            $this->error('请指定考试');
        }
        RankService::recalculate($examId);
        $this->success('排名已更新');
    }

    /**
     * 导出成绩（含总分，可按考试/班级筛选）
     */
    public function export()
    {
        $examId = (int)$this->request->get('exam_id');
        $classId = (int)$this->request->get('class_id');
        $adminIds = $this->getDataLimitAdminIds();

        $query = Db::name('exam_score')->alias('es')
            ->join('student s', 'es.student_id=s.id', 'LEFT')
            ->join('exam e', 'es.exam_id=e.id', 'LEFT')
            ->join('school_class c', 'es.class_id=c.id', 'LEFT')
            ->field('es.id,e.name as exam_name,c.name as class_name,s.name as student_name,s.student_no,es.subject,es.score,es.is_total,es.admin_id');
        if ($examId) {
            $query->where('es.exam_id', $examId);
        }
        if ($classId) {
            $query->where('es.class_id', $classId);
        }
        if (is_array($adminIds)) {
            $query->where('es.admin_id', 'in', $adminIds);
        }
        $list = $query->order('es.exam_id desc,es.class_id asc,es.student_id asc,es.is_total asc')->select();
        $rows = [];
        foreach ($list as $item) {
            $rows[] = [
                'exam_name'    => $item['exam_name'],
                'class_name'   => $item['class_name'],
                'student_name' => $item['student_name'],
                'student_no'   => $item['student_no'],
                'subject'      => $item['subject'],
                'score'        => $item['score'],
                'is_total'     => $item['is_total'] ? '是' : '否',
            ];
        }
        ExportService::download('考试成绩_' . date('Ymd_His'), [
            'exam_name'    => '考试',
            'class_name'   => '班级',
            'student_name' => '学生',
            'student_no'   => '学号',
            'subject'      => '科目',
            'score'        => '分数',
            'is_total'     => '是否总分',
        ], $rows);
    }
}
