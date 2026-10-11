<?php

namespace app\api\controller;

use app\common\controller\Api;
use think\Db;
use think\Validate;

/**
 * 角色绑定接口
 * 绑定规则：所选身份 + 姓名 + 手机号必须与后台备案完全匹配
 */
class Bind extends Api
{
    protected $noNeedLogin = [];
    protected $noNeedRight = '*';

    protected static $roleNames = [
        'parent'     => '家长',
        'student'    => '学生',
        'dorm_admin' => '宿管',
    ];

    protected static $roleTables = [
        'parent'     => 'parent',
        'student'    => 'student',
        'dorm_admin' => 'dorm_admin',
    ];

    /**
     * 当前账号已绑定的身份列表（理论上最多一种）
     */
    protected function currentRoles()
    {
        $userId = (int)$this->auth->id;
        $roles = [];
        if (Db::name('parent')->where('user_id', $userId)->find()) {
            $roles[] = 'parent';
        }
        if (Db::name('student')->where('user_id', $userId)->find()) {
            $roles[] = 'student';
        }
        if (Db::name('dorm_admin')->where('user_id', $userId)->find()) {
            $roles[] = 'dorm_admin';
        }
        return $roles;
    }

    /**
     * 一个账号只能绑定一种身份
     */
    protected function assertSingleRole($wantRole)
    {
        $roles = $this->currentRoles();
        if (!$roles) {
            return;
        }
        if (count($roles) === 1 && $roles[0] === $wantRole) {
            return;
        }
        $bound = self::$roleNames[$roles[0]] ?? $roles[0];
        $this->error('您已绑定「' . $bound . '」身份，一个账号只能绑定一种身份');
    }

    /**
     * 校验姓名、手机号，并在对应身份表中精确匹配备案
     * @return array 备案记录
     */
    protected function findIdentityRecord($role, $name, $mobile)
    {
        $roleName = self::$roleNames[$role] ?? '该';
        $table = self::$roleTables[$role] ?? '';
        if ($table === '') {
            $this->error('不支持的身份类型');
        }

        $name = trim((string)$name);
        $mobile = trim((string)$mobile);
        if ($name === '' || mb_strlen($name) < 2) {
            $this->error('请输入真实姓名');
        }
        if (!Validate::regex($mobile, '^1\d{10}$')) {
            $this->error('请输入正确的手机号');
        }

        // 先按手机号查该身份是否存在
        $byMobile = Db::name($table)->where(['mobile' => $mobile, 'status' => 'normal'])->find();
        if (!$byMobile) {
            $this->error('系统中不存在该' . $roleName . '身份备案，无法绑定');
        }
        // 再校验姓名是否一致
        if (trim((string)$byMobile['name']) !== $name) {
            $this->error('姓名与手机号不匹配，无法绑定该' . $roleName . '身份');
        }

        // 防止拿其他身份信息误绑：若所选身份未命中，但其他身份表命中同号，给出更明确提示
        foreach (self::$roleTables as $otherRole => $otherTable) {
            if ($otherRole === $role) {
                continue;
            }
            $other = Db::name($otherTable)->where(['mobile' => $mobile, 'status' => 'normal'])->find();
            if ($other && trim((string)$other['name']) === $name) {
                // 同人同号出现在多种身份表时，以当前所选身份表为准（已通过）
                break;
            }
        }

        return $byMobile;
    }

    /**
     * 绑定成功后同步会员手机号、昵称
     */
    protected function syncUserProfile($name, $mobile)
    {
        $now = time();
        $userId = (int)$this->auth->id;
        Db::name('user')->where('mobile', $mobile)->where('id', '<>', $userId)->update([
            'mobile'     => '',
            'updatetime' => $now,
        ]);
        Db::name('user')->where('id', $userId)->update([
            'mobile'     => $mobile,
            'nickname'   => $name,
            'updatetime' => $now,
        ]);
    }

    /**
     * 当前用户角色信息
     */
    public function profile()
    {
        $userId = $this->auth->id;
        $parent = Db::name('parent')->where('user_id', $userId)->find();
        $student = Db::name('student')->where('user_id', $userId)->find();
        $dormAdmin = Db::name('dorm_admin')->where('user_id', $userId)->find();
        $roles = [];
        if ($parent) {
            $roles[] = 'parent';
        }
        if ($student) {
            $roles[] = 'student';
        }
        if ($dormAdmin) {
            $roles[] = 'dorm_admin';
        }
        if (count($roles) > 1) {
            $roles = [$roles[0]];
        }
        $students = [];
        if ($parent && in_array('parent', $roles, true)) {
            $students = Db::name('parent_student')->alias('ps')
                ->join('student s', 'ps.student_id=s.id')
                ->where('ps.parent_id', $parent['id'])
                ->field('s.id,s.name,s.mobile,s.class_id,s.room_id,s.student_no')
                ->select();
        }
        $this->success('', [
            'roles'      => $roles,
            'role'       => $roles ? $roles[0] : '',
            'parent'     => in_array('parent', $roles, true) ? $parent : null,
            'student'    => in_array('student', $roles, true) ? $student : null,
            'dorm_admin' => in_array('dorm_admin', $roles, true) ? $dormAdmin : null,
            'children'   => $students,
            'user'       => $this->auth->getUserinfo(),
        ]);
    }

    /**
     * 家长绑定：必须匹配后台「家长」备案（姓名 + 手机号 + 身份）
     */
    public function parentBind()
    {
        $this->assertSingleRole('parent');
        $name = $this->request->post('name', '');
        $mobile = $this->request->post('mobile', '');
        $parent = $this->findIdentityRecord('parent', $name, $mobile);

        if ((int)$parent['user_id'] === (int)$this->auth->id) {
            $this->success('已绑定', ['parent' => $parent]);
        }

        $now = time();
        Db::name('parent')->where('id', $parent['id'])->update([
            'user_id'    => $this->auth->id,
            'updatetime' => $now,
        ]);
        $this->syncUserProfile($parent['name'], $parent['mobile']);
        $parent['user_id'] = $this->auth->id;
        $this->success('绑定成功', ['parent' => $parent]);
    }

    /**
     * 学生绑定：必须匹配后台「学生」备案（姓名 + 手机号 + 身份）
     */
    public function studentBind()
    {
        $this->assertSingleRole('student');
        $name = $this->request->post('name', '');
        $mobile = $this->request->post('mobile', '');
        $student = $this->findIdentityRecord('student', $name, $mobile);

        if ((int)$student['user_id'] === (int)$this->auth->id) {
            $this->success('已绑定', ['student' => $student]);
        }

        $now = time();
        Db::name('student')->where('id', $student['id'])->update([
            'user_id'    => $this->auth->id,
            'updatetime' => $now,
        ]);
        $this->syncUserProfile($student['name'], $student['mobile']);
        $student['user_id'] = $this->auth->id;
        $this->success('绑定成功', ['student' => $student]);
    }

    /**
     * 宿管绑定：必须匹配后台「寝室管理员」备案（姓名 + 手机号 + 身份）
     */
    public function dormAdminBind()
    {
        $this->assertSingleRole('dorm_admin');
        $name = $this->request->post('name', '');
        $mobile = $this->request->post('mobile', '');
        $admin = $this->findIdentityRecord('dorm_admin', $name, $mobile);

        if ((int)$admin['user_id'] === (int)$this->auth->id) {
            $this->success('已绑定', ['dorm_admin' => $admin]);
        }

        $now = time();
        Db::name('dorm_admin')->where('id', $admin['id'])->update([
            'user_id'    => $this->auth->id,
            'updatetime' => $now,
        ]);
        $this->syncUserProfile($admin['name'], $admin['mobile']);
        $admin['user_id'] = $this->auth->id;
        $this->success('绑定成功', ['dorm_admin' => $admin]);
    }

    /**
     * 解绑当前身份（学生/家长/宿管），并清空会员手机号，便于换角色或换号重绑
     */
    public function unbind()
    {
        $userId = (int)$this->auth->id;
        $roles = $this->currentRoles();
        if (!$roles) {
            $this->error('当前未绑定身份');
        }

        $now = time();
        Db::startTrans();
        try {
            Db::name('parent')->where('user_id', $userId)->update([
                'user_id'    => 0,
                'updatetime' => $now,
            ]);
            Db::name('student')->where('user_id', $userId)->update([
                'user_id'    => 0,
                'updatetime' => $now,
            ]);
            Db::name('dorm_admin')->where('user_id', $userId)->update([
                'user_id'    => 0,
                'updatetime' => $now,
            ]);
            Db::name('user')->where('id', $userId)->update([
                'mobile'     => '',
                'updatetime' => $now,
            ]);
            Db::commit();
        } catch (\Exception $e) {
            Db::rollback();
            $this->error($e->getMessage() ?: '解绑失败');
        }

        $this->success('已解绑', [
            'roles' => [],
            'role'  => '',
        ]);
    }
}
