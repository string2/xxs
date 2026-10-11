<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;
use think\Db;

/**
 * 家长
 *
 * @icon fa fa-circle-o
 */
class Parentuser extends Backend
{

    /**
     * Parentuser模型对象
     * @var \app\admin\model\campus\Parentuser
     */
    protected $model = null;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\Parentuser;
        $this->view->assign("statusList", $this->model->getStatusList());
    }

    /**
     * 列表：附带关联学生班级与姓名
     */
    public function index()
    {
        $this->request->filter(['strip_tags', 'trim']);
        if ($this->request->isAjax()) {
            if ($this->request->request('keyField')) {
                return $this->selectpage();
            }
            list($where, $sort, $order, $offset, $limit) = $this->buildparams();
            $list = $this->model->where($where)->order($sort, $order)->paginate($limit);
            $rows = collection($list->items())->toArray();
            $parentIds = array_column($rows, 'id');
            $childMap = [];
            if ($parentIds) {
                $binds = Db::name('parent_student')->alias('ps')
                    ->join('student s', 'ps.student_id=s.id', 'LEFT')
                    ->join('school_class c', 's.class_id=c.id', 'LEFT')
                    ->where('ps.parent_id', 'in', $parentIds)
                    ->field('ps.parent_id,s.name as student_name,c.name as class_name,ps.relation')
                    ->select();
                foreach ($binds as $b) {
                    $pid = (int)$b['parent_id'];
                    $name = trim((string)($b['student_name'] ?? ''));
                    if ($name === '') {
                        continue;
                    }
                    $class = trim((string)($b['class_name'] ?? ''));
                    $rel = trim((string)($b['relation'] ?? '家长'));
                    $label = $class !== '' ? ($class . '·' . $name) : $name;
                    if ($rel !== '' && $rel !== '家长') {
                        $label .= '(' . $rel . ')';
                    }
                    $childMap[$pid][] = $label;
                }
            }
            foreach ($rows as &$row) {
                $kids = $childMap[(int)$row['id']] ?? [];
                $row['children_text'] = $kids ? implode('、', $kids) : '未绑定学生';
            }
            unset($row);
            return json(['total' => $list->total(), 'rows' => $rows]);
        }
        return $this->view->fetch();
    }
}
