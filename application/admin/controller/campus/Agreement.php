<?php

namespace app\admin\controller\campus;

use app\common\controller\Backend;
use think\Db;

/**
 * 协议管理
 *
 * @icon fa fa-pencil-square-o
 */
class Agreement extends Backend
{
    /**
     * @var \app\admin\model\campus\Agreement
     */
    protected $model = null;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\Agreement;
        $this->view->assign("statusList", $this->model->getStatusList());
    }

    /**
     * 签署进度：已签 / 未签家长
     */
    public function progress($ids = null)
    {
        $id = (int)($ids ?: $this->request->get('ids'));
        $agreement = $this->model->get($id);
        if (!$agreement) {
            $this->error('协议不存在');
        }

        if ($this->request->isAjax()) {
            $type = $this->request->get('type', 'signed'); // signed|unsigned
            $parents = Db::name('parent')->alias('p')
                ->join('parent_student ps', 'ps.parent_id=p.id')
                ->join('student s', 's.id=ps.student_id')
                ->where('p.status', 'normal')
                ->field('p.id as parent_id,p.name as parent_name,p.mobile as parent_mobile,s.id as student_id,s.name as student_name,s.mobile as student_mobile')
                ->select();

            $signs = Db::name('agreement_sign')->where('agreement_id', $id)->select();
            $signedMap = [];
            foreach ($signs as $sign) {
                $key = $sign['parent_id'] . '_' . $sign['student_id'];
                $signedMap[$key] = $sign;
            }

            $signed = [];
            $unsigned = [];
            foreach ($parents as $row) {
                $key = $row['parent_id'] . '_' . $row['student_id'];
                if (isset($signedMap[$key])) {
                    $row['signtime'] = $signedMap[$key]['signtime'];
                    $row['sign_image'] = $signedMap[$key]['sign_image'];
                    $signed[] = $row;
                } else {
                    $unsigned[] = $row;
                }
            }
            $list = $type === 'unsigned' ? $unsigned : $signed;
            return json(['total' => count($list), 'rows' => $list]);
        }

        $this->view->assign('row', $agreement);
        return $this->view->fetch();
    }
}
