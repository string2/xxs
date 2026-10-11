<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;
use think\Db;

/**
 * 考试
 *
 * @icon fa fa-circle-o
 */
class Exam extends Backend
{
    /**
     * Exam模型对象
     * @var \app\admin\model\campus\Exam
     */
    protected $model = null;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\Exam;
        $this->view->assign('statusList', $this->model->getStatusList());
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

    /**
     * 保存前把科目勾选转为逗号分隔
     */
    protected function normalizeSubjects(&$params)
    {
        if (isset($params['subjects']) && is_array($params['subjects'])) {
            $params['subjects'] = implode(',', array_values(array_filter(array_map('trim', $params['subjects']))));
        }
    }

    public function add()
    {
        if ($this->request->isPost()) {
            $params = $this->request->post('row/a');
            if ($params) {
                $this->normalizeSubjects($params);
                $this->request->post(['row' => $params]);
            }
        }
        return parent::add();
    }

    public function edit($ids = null)
    {
        if ($this->request->isPost()) {
            $params = $this->request->post('row/a');
            if ($params) {
                $this->normalizeSubjects($params);
                $this->request->post(['row' => $params]);
            }
            return parent::edit($ids);
        }
        $row = $this->model->get($ids);
        if (!$row) {
            $this->error(__('No Results were found'));
        }
        $checked = array_filter(array_map('trim', explode(',', (string)$row['subjects'])));
        $this->view->assign('checkedSubjects', $checked);
        return parent::edit($ids);
    }
}
