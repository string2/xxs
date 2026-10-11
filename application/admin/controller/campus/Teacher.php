<?php

namespace app\admin\controller\campus;

use app\admin\library\traits\CampusRelationIndex;
use app\admin\model\AuthGroupAccess;
use app\common\controller\Backend;
use fast\Random;
use think\Db;
use think\Validate;

/**
 * 教师
 *
 * @icon fa fa-circle-o
 */
class Teacher extends Backend
{
    use CampusRelationIndex;

    /**
     * @var \app\admin\model\campus\Teacher
     */
    protected $model = null;
    protected $relationSearch = true;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\campus\Teacher;
        $this->view->assign("statusList", $this->model->getStatusList());
    }

    public function index()
    {
        return $this->campusRelationIndex(['classinfo']);
    }

    /**
     * 添加教师并开通后台账号
     */
    public function add()
    {
        if ($this->request->isPost()) {
            $this->token();
            $params = $this->request->post('row/a');
            if (!$params) {
                $this->error(__('Parameter %s can not be empty', ''));
            }
            $params = $this->preExcludeFields($params);
            if (empty($params['mobile']) || empty($params['name'])) {
                $this->error('姓名和手机号必填');
            }
            if (!Validate::regex($params['mobile'], '^1\d{10}$')) {
                $this->error('手机号格式不正确');
            }
            $exists = Db::name('admin')->where('username', $params['mobile'])->find();
            if ($exists) {
                $this->error('该手机号已开通后台账号');
            }

            $password = $this->request->post('password', '123456');
            $salt = Random::alnum();
            $group = Db::name('auth_group')->where('name', '教师组')->find();
            if (!$group) {
                $this->error('请先创建教师组');
            }

            Db::startTrans();
            try {
                $adminId = Db::name('admin')->insertGetId([
                    'username'   => $params['mobile'],
                    'nickname'   => $params['name'],
                    'password'   => md5(md5($password) . $salt),
                    'salt'       => $salt,
                    'avatar'     => '',
                    'email'      => $params['mobile'] . '@school.local',
                    'mobile'     => $params['mobile'],
                    'loginfailure' => 0,
                    'createtime' => time(),
                    'updatetime' => time(),
                    'status'     => 'normal',
                ]);
                AuthGroupAccess::create(['uid' => $adminId, 'group_id' => $group['id']]);
                $params['admin_id'] = $adminId;
                $params['createtime'] = time();
                $params['updatetime'] = time();
                $this->model->allowField(true)->save($params);
                if (!empty($params['class_id'])) {
                    Db::name('school_class')->where('id', $params['class_id'])->update([
                        'admin_id'   => $adminId,
                        'updatetime' => time(),
                    ]);
                }
                Db::commit();
            } catch (\Exception $e) {
                Db::rollback();
                $this->error($e->getMessage());
            }
            $this->success('教师账号已开通，默认密码：' . $password);
        }
        return $this->view->fetch();
    }
}
