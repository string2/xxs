<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\common\controller\Backend;
use app\common\library\campus\ExportService;
use think\Db;

/**
 * 学生管理
 *
 * @icon fa fa-users
 */
class Student extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\Student
     */
    protected $model = null;
    protected $searchFields = 'id,name,mobile,student_no';
    protected $dataLimit = 'auth';
    protected $dataLimitField = 'admin_id';
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\Student;
        $this->view->assign("genderList", $this->model->getGenderList());
        $this->view->assign("statusList", $this->model->getStatusList());
    }

    public function index()
    {
        return $this->campusRelationIndex(['classinfo', 'roominfo']);
    }

    public function import()
    {
        parent::import();
    }

    public function add()
    {
        if ($this->request->isPost()) {
            $params = $this->request->post('row/a');
            if ($params) {
                if (empty($params['admin_id'])) {
                    $params['admin_id'] = $this->auth->id;
                }
                if (!empty($params['class_id'])) {
                    $class = Db::name('school_class')->where('id', $params['class_id'])->find();
                    if ($class && $class['admin_id'] && empty($params['admin_id'])) {
                        $params['admin_id'] = $class['admin_id'];
                    }
                }
                $this->request->post(['row' => $params]);
            }
        }
        return parent::add();
    }

    /**
     * 导出学生
     */
    public function export()
    {
        $adminIds = $this->getDataLimitAdminIds();
        $query = Db::name('student')->alias('s')
            ->join('school_class c', 's.class_id=c.id', 'LEFT')
            ->join('dorm_room r', 's.room_id=r.id', 'LEFT')
            ->field('s.id,s.name,s.student_no,s.mobile,s.gender,s.status,c.name as class_name,r.room_no,s.admin_id,s.createtime');
        if (is_array($adminIds)) {
            $query->where('s.admin_id', 'in', $adminIds);
        }
        $list = $query->order('s.id asc')->select();
        $genderMap = ['male' => '男', 'female' => '女', 'unknown' => '未知'];
        $rows = [];
        foreach ($list as $item) {
            $rows[] = [
                'id'          => $item['id'],
                'name'        => $item['name'],
                'student_no'  => $item['student_no'],
                'mobile'      => $item['mobile'],
                'gender'      => $genderMap[$item['gender']] ?? $item['gender'],
                'class_name'  => $item['class_name'],
                'room_no'     => $item['room_no'],
                'status'      => $item['status'] === 'normal' ? '正常' : '隐藏',
                'createtime'  => $item['createtime'] ? date('Y-m-d H:i:s', $item['createtime']) : '',
            ];
        }
        ExportService::download('学生名单_' . date('Ymd_His'), [
            'id'         => 'ID',
            'name'       => '姓名',
            'student_no' => '学号',
            'mobile'     => '手机号',
            'gender'     => '性别',
            'class_name' => '班级',
            'room_no'    => '寝室',
            'status'     => '状态',
            'createtime' => '创建时间',
        ], $rows);
    }
}
