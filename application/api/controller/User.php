<?php

namespace app\api\controller;

use app\common\controller\Api;
use app\common\library\Ems;
use app\common\library\Sms;
use app\common\library\WxApp;
use fast\Random;
use think\Config;
use think\Db;
use think\Validate;

/**
 * 会员接口
 */
class User extends Api
{
    protected $noNeedLogin = ['login', 'mobilelogin', 'register', 'resetpwd', 'changeemail', 'changemobile', 'third', 'wxlogin'];
    protected $noNeedRight = '*';

    public function _initialize()
    {
        parent::_initialize();

        if (!Config::get('fastadmin.usercenter')) {
            $this->error(__('User center already closed'));
        }

    }

    /**
     * 会员中心
     */
    public function index()
    {
        $this->success('', ['welcome' => $this->auth->nickname]);
    }

    /**
     * 会员登录
     *
     * @ApiMethod (POST)
     * @ApiParams (name="account", type="string", required=true, description="账号")
     * @ApiParams (name="password", type="string", required=true, description="密码")
     */
    public function login()
    {
        $account = $this->request->post('account');
        $password = $this->request->post('password');
        if (!$account || !$password) {
            $this->error(__('Invalid parameters'));
        }
        $ret = $this->auth->login($account, $password);
        if ($ret) {
            $data = ['userinfo' => $this->auth->getUserinfo()];
            $this->success(__('Logged in successful'), $data);
        } else {
            $this->error($this->auth->getError());
        }
    }

    /**
     * 手机验证码登录
     *
     * @ApiMethod (POST)
     * @ApiParams (name="mobile", type="string", required=true, description="手机号")
     * @ApiParams (name="captcha", type="string", required=true, description="验证码")
     */
    public function mobilelogin()
    {
        $mobile = $this->request->post('mobile');
        $captcha = $this->request->post('captcha');
        if (!$mobile || !$captcha) {
            $this->error(__('Invalid parameters'));
        }
        if (!Validate::regex($mobile, "^1\d{10}$")) {
            $this->error(__('Mobile is incorrect'));
        }
        if (!Sms::check($mobile, $captcha, 'mobilelogin')) {
            $this->error(__('Captcha is incorrect'));
        }
        $user = \app\common\model\User::getByMobile($mobile);
        if ($user) {
            if ($user->status != 'normal') {
                $this->error(__('Account is locked'));
            }
            //如果已经有账号则直接登录
            $ret = $this->auth->direct($user->id);
        } else {
            $ret = $this->auth->register($mobile, Random::alnum(), '', $mobile, []);
        }
        if ($ret) {
            Sms::flush($mobile, 'mobilelogin');
            $data = ['userinfo' => $this->auth->getUserinfo()];
            $this->success(__('Logged in successful'), $data);
        } else {
            $this->error($this->auth->getError());
        }
    }

    /**
     * 注册会员
     *
     * @ApiMethod (POST)
     * @ApiParams (name="username", type="string", required=true, description="用户名")
     * @ApiParams (name="password", type="string", required=true, description="密码")
     * @ApiParams (name="email", type="string", required=true, description="邮箱")
     * @ApiParams (name="mobile", type="string", required=true, description="手机号")
     * @ApiParams (name="code", type="string", required=true, description="验证码")
     */
    public function register()
    {
        $username = trim((string)$this->request->post('username'));
        $password = (string)$this->request->post('password');
        $email = trim((string)$this->request->post('email'));
        $mobile = trim((string)$this->request->post('mobile'));
        $code = $this->request->post('code');
        if (!$username || !$password) {
            $this->error(__('Invalid parameters'));
        }
        if (strlen($username) < 3 || strlen($username) > 30) {
            $this->error('用户名长度需为 3-30 个字符');
        }
        if (strlen($password) < 6 || strlen($password) > 30) {
            $this->error('密码长度需为 6-30 个字符');
        }
        // 小程序可不传邮箱：自动生成合法唯一邮箱，避免「邮箱不正确」
        if (!$email || !Validate::is($email, 'email')) {
            $safe = preg_replace('/[^a-zA-Z0-9]/', '', $username);
            if ($safe === '' || strlen($safe) < 3) {
                $safe = 'u' . substr(md5($username . microtime(true)), 0, 10);
            }
            $email = strtolower($safe) . '_' . substr(md5(uniqid('', true)), 0, 6) . '@campus.local';
        }
        if ($mobile !== '' && !Validate::regex($mobile, '^1\d{10}$')) {
            $this->error(__('Mobile is incorrect'));
        }
        // 空手机号统一为 null，避免空字符串冲突
        if ($mobile === '') {
            $mobile = null;
        }
        $captchaType = Config::get('fastadmin.user_register_captcha');
        if ($captchaType) {
            if ($captchaType == 'mobile' && $mobile) {
                $ret = Sms::check($mobile, $code, 'register');
                if (!$ret) {
                    $this->error(__('Captcha is incorrect'));
                }
            } elseif ($captchaType == 'email') {
                $ret = Ems::check($email, $code, 'register');
                if (!$ret) {
                    $this->error(__('Captcha is incorrect'));
                }
            }
        }
        $ret = $this->auth->register($username, $password, $email, $mobile ?: '', []);
        if ($ret) {
            $data = ['userinfo' => $this->auth->getUserinfo()];
            $this->success(__('Sign up successful'), $data);
        } else {
            $this->error($this->auth->getError() ?: '注册失败');
        }
    }

    /**
     * 微信小程序一键登录
     *
     * @ApiMethod (POST)
     * @ApiParams (name="code", type="string", required=true, description="wx.login 返回的 code")
     * @ApiParams (name="nickname", type="string", required=false, description="微信昵称")
     */
    public function wxlogin()
    {
        $code = trim((string)$this->request->post('code'));
        $nickname = trim((string)$this->request->post('nickname', ''));
        if ($code === '') {
            $this->error('缺少微信登录凭证');
        }

        try {
            $session = WxApp::code2Session($code);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());
        }

        $openid = $session['openid'];
        $now = time();
        $wxRow = Db::name('wx_user')->where('openid', $openid)->find();

        if ($wxRow) {
            $user = \app\common\model\User::get($wxRow['user_id']);
            if (!$user || $user->status != 'normal') {
                $this->error('账号不可用');
            }
            $ret = $this->auth->direct($user->id);
            if (!$ret) {
                $this->error($this->auth->getError());
            }
            Db::name('wx_user')->where('id', $wxRow['id'])->update([
                'session_key' => $session['session_key'] ?? '',
                'unionid'     => $session['unionid'] ?? '',
                'updatetime'  => $now,
            ]);
        } else {
            $username = 'wx_' . substr(md5($openid), 0, 16);
            while (\app\common\model\User::getByUsername($username)) {
                $username = 'wx_' . substr(md5($openid . Random::alnum(4)), 0, 16);
            }
            $email = strtolower($username) . '@wx.campus.local';
            $ret = $this->auth->register($username, Random::alnum(16), $email, '', []);
            if (!$ret) {
                $this->error($this->auth->getError() ?: '注册失败');
            }
            $userId = $this->auth->id;
            if ($nickname !== '') {
                Db::name('user')->where('id', $userId)->update(['nickname' => $nickname, 'updatetime' => $now]);
            }
            Db::name('wx_user')->insert([
                'user_id'     => $userId,
                'openid'      => $openid,
                'unionid'     => $session['unionid'] ?? '',
                'session_key' => $session['session_key'] ?? '',
                'createtime'  => $now,
                'updatetime'  => $now,
            ]);
        }

        if ($nickname !== '') {
            Db::name('user')->where('id', $this->auth->id)->update(['nickname' => $nickname, 'updatetime' => $now]);
        }

        $userinfo = $this->auth->getUserinfo();
        $this->success('登录成功', [
            'userinfo'         => $userinfo,
            'need_bind_mobile' => empty($userinfo['mobile']),
        ]);
    }

    /**
     * 退出登录
     * @ApiMethod (POST)
     */
    public function logout()
    {
        if (!$this->request->isPost()) {
            $this->error(__('Invalid parameters'));
        }
        $this->auth->logout();
        $this->success(__('Logout successful'));
    }

    /**
     * 修改会员个人信息
     *
     * @ApiMethod (POST)
     * @ApiParams (name="avatar", type="string", required=true, description="头像地址")
     * @ApiParams (name="username", type="string", required=true, description="用户名")
     * @ApiParams (name="nickname", type="string", required=true, description="昵称")
     * @ApiParams (name="bio", type="string", required=true, description="个人简介")
     */
    public function profile()
    {
        $user = $this->auth->getUser();
        $username = $this->request->post('username');
        $nickname = $this->request->post('nickname');
        $bio = $this->request->post('bio');
        $avatar = $this->request->post('avatar', '', 'trim,strip_tags,htmlspecialchars');
        if ($username) {
            $exists = \app\common\model\User::where('username', $username)->where('id', '<>', $this->auth->id)->find();
            if ($exists) {
                $this->error(__('Username already exists'));
            }
            $user->username = $username;
        }
        if ($nickname) {
            $exists = \app\common\model\User::where('nickname', $nickname)->where('id', '<>', $this->auth->id)->find();
            if ($exists) {
                $this->error(__('Nickname already exists'));
            }
            $user->nickname = $nickname;
        }
        if ($avatar) {
            //判断是否匹配config('upload.cdnurl')开头以及当前$SERVER['HTTP_HOST']开头。
            if (preg_match('/^' . preg_quote(config('upload.cdnurl') . '/', '/') . '/i', $avatar)
                || preg_match('/^' . preg_quote(substr(config('upload.savekey'), 0, strpos(config('upload.savekey'), '{')), '/') . '/i', $avatar)
                || preg_match('/^' . preg_quote($_SERVER['HTTP_HOST'] . '/', '/') . '/i', $avatar)) {
                $user->avatar = $avatar;
            }
        }
        $user->bio = $bio;
        $user->save();
        $this->success();
    }

    /**
     * 小程序同步微信头像昵称
     *
     * @ApiMethod (POST)
     * @ApiParams (name="nickname", type="string", required=false, description="微信昵称")
     * @ApiParams (name="avatar", type="string", required=false, description="头像地址")
     */
    public function wxProfile()
    {
        $user = $this->auth->getUser();
        $nickname = $this->request->post('nickname', '', 'trim,strip_tags,htmlspecialchars');
        $avatar = $this->request->post('avatar', '', 'trim,strip_tags,htmlspecialchars');
        if ($nickname !== '') {
            $user->nickname = $nickname;
        }
        if ($avatar !== '') {
            if (preg_match('/^https?:\/\//i', $avatar)) {
                $user->avatar = $avatar;
            } elseif (preg_match('/^\/uploads\//i', $avatar)) {
                $user->avatar = cdnurl($avatar, true);
            } elseif (preg_match('/^uploads\//i', $avatar)) {
                $user->avatar = cdnurl('/' . ltrim($avatar, '/'), true);
            }
        }
        $user->save();
        $this->success('更新成功', ['userinfo' => $this->auth->getUserinfo()]);
    }

    /**
     * 修改邮箱
     *
     * @ApiMethod (POST)
     * @ApiParams (name="email", type="string", required=true, description="邮箱")
     * @ApiParams (name="captcha", type="string", required=true, description="验证码")
     */
    public function changeemail()
    {
        $user = $this->auth->getUser();
        $email = $this->request->post('email');
        $captcha = $this->request->post('captcha');
        if (!$email || !$captcha) {
            $this->error(__('Invalid parameters'));
        }
        if (!Validate::is($email, "email")) {
            $this->error(__('Email is incorrect'));
        }
        if (\app\common\model\User::where('email', $email)->where('id', '<>', $user->id)->find()) {
            $this->error(__('Email already exists'));
        }
        $result = Ems::check($email, $captcha, 'changeemail');
        if (!$result) {
            $this->error(__('Captcha is incorrect'));
        }
        $verification = $user->verification;
        $verification->email = 1;
        $user->verification = $verification;
        $user->email = $email;
        $user->save();

        Ems::flush($email, 'changeemail');
        $this->success();
    }

    /**
     * 修改手机号
     *
     * @ApiMethod (POST)
     * @ApiParams (name="mobile", type="string", required=true, description="手机号")
     * @ApiParams (name="captcha", type="string", required=true, description="验证码")
     */
    public function changemobile()
    {
        $user = $this->auth->getUser();
        $mobile = $this->request->post('mobile');
        $captcha = $this->request->post('captcha');
        if (!$mobile || !$captcha) {
            $this->error(__('Invalid parameters'));
        }
        if (!Validate::regex($mobile, "^1\d{10}$")) {
            $this->error(__('Mobile is incorrect'));
        }
        if (\app\common\model\User::where('mobile', $mobile)->where('id', '<>', $user->id)->find()) {
            $this->error(__('Mobile already exists'));
        }
        $result = Sms::check($mobile, $captcha, 'changemobile');
        if (!$result) {
            $this->error(__('Captcha is incorrect'));
        }
        $verification = $user->verification;
        $verification->mobile = 1;
        $user->verification = $verification;
        $user->mobile = $mobile;
        $user->save();

        Sms::flush($mobile, 'changemobile');
        $this->success();
    }

    /**
     * 通过姓名 + 手机号绑定（校验学校备案信息，无需短信验证码）
     *
     * @ApiMethod (POST)
     * @ApiParams (name="name", type="string", required=true, description="真实姓名")
     * @ApiParams (name="mobile", type="string", required=true, description="手机号")
     */
    public function bindbynamemobile()
    {
        if (!$this->auth->isLogin()) {
            $this->error(__('Please login first'), null, 401);
        }
        $name = trim((string)$this->request->post('name', ''));
        $mobile = trim((string)$this->request->post('mobile', ''));
        if ($name === '' || mb_strlen($name) < 2) {
            $this->error('请输入真实姓名');
        }
        if (!Validate::regex($mobile, '^1\d{10}$')) {
            $this->error(__('Mobile is incorrect'));
        }

        $matched = Db::name('student')->where(['name' => $name, 'mobile' => $mobile, 'status' => 'normal'])->find();
        $matchType = $matched ? 'student' : '';
        if (!$matched) {
            $matched = Db::name('dorm_admin')->where(['name' => $name, 'mobile' => $mobile, 'status' => 'normal'])->find();
            $matchType = $matched ? 'dorm_admin' : '';
        }
        if (!$matched) {
            $matched = Db::name('parent')->where(['name' => $name, 'mobile' => $mobile, 'status' => 'normal'])->find();
            $matchType = $matched ? 'parent' : '';
        }
        if (!$matched) {
            $this->error('姓名与手机号不匹配，请确认已在学校备案');
        }

        $now = time();
        $userId = (int)$this->auth->id;
        // 释放其他账号占用的同号
        Db::name('user')->where('mobile', $mobile)->where('id', '<>', $userId)->update([
            'mobile'     => '',
            'updatetime' => $now,
        ]);

        $user = $this->auth->getUser();
        $verification = $user->verification;
        $verification->mobile = 1;
        $user->verification = $verification;
        $user->mobile = $mobile;
        $user->nickname = $name;
        $user->save();

        $this->success('绑定成功', [
            'match_type' => $matchType,
            'userinfo'   => $this->auth->getUserinfo(),
        ]);
    }

    /**
     * 第三方登录
     *
     * @ApiMethod (POST)
     * @ApiParams (name="platform", type="string", required=true, description="平台名称")
     * @ApiParams (name="code", type="string", required=true, description="Code码")
     */
    public function third()
    {
        $url = url('user/index');
        $platform = $this->request->post("platform");
        $code = $this->request->post("code");
        $config = get_addon_config('third');
        if (!$config || !isset($config[$platform])) {
            $this->error(__('Invalid parameters'));
        }
        $app = new \addons\third\library\Application($config);
        //通过code换access_token和绑定会员
        $result = $app->{$platform}->getUserInfo(['code' => $code]);
        if ($result) {
            $loginret = \addons\third\library\Service::connect($platform, $result);
            if ($loginret) {
                $data = [
                    'userinfo'  => $this->auth->getUserinfo(),
                    'thirdinfo' => $result
                ];
                $this->success(__('Logged in successful'), $data);
            }
        }
        $this->error(__('Operation failed'), $url);
    }

    /**
     * 重置密码
     *
     * @ApiMethod (POST)
     * @ApiParams (name="mobile", type="string", required=true, description="手机号")
     * @ApiParams (name="newpassword", type="string", required=true, description="新密码")
     * @ApiParams (name="captcha", type="string", required=true, description="验证码")
     */
    public function resetpwd()
    {
        $type = $this->request->post("type", "mobile");
        $mobile = $this->request->post("mobile");
        $email = $this->request->post("email");
        $newpassword = $this->request->post("newpassword");
        $captcha = $this->request->post("captcha");
        if (!$newpassword || !$captcha) {
            $this->error(__('Invalid parameters'));
        }
        //验证Token
        if (!Validate::make()->check(['newpassword' => $newpassword], ['newpassword' => 'require|regex:\S{6,30}'])) {
            $this->error(__('Password must be 6 to 30 characters'));
        }
        if ($type == 'mobile') {
            if (!Validate::regex($mobile, "^1\d{10}$")) {
                $this->error(__('Mobile is incorrect'));
            }
            $user = \app\common\model\User::getByMobile($mobile);
            if (!$user) {
                $this->error(__('User not found'));
            }
            $ret = Sms::check($mobile, $captcha, 'resetpwd');
            if (!$ret) {
                $this->error(__('Captcha is incorrect'));
            }
            Sms::flush($mobile, 'resetpwd');
        } else {
            if (!Validate::is($email, "email")) {
                $this->error(__('Email is incorrect'));
            }
            $user = \app\common\model\User::getByEmail($email);
            if (!$user) {
                $this->error(__('User not found'));
            }
            $ret = Ems::check($email, $captcha, 'resetpwd');
            if (!$ret) {
                $this->error(__('Captcha is incorrect'));
            }
            Ems::flush($email, 'resetpwd');
        }
        //模拟一次登录
        $this->auth->direct($user->id);
        $ret = $this->auth->changepwd($newpassword, '', true);
        if ($ret) {
            $this->success(__('Reset password successful'));
        } else {
            $this->error($this->auth->getError());
        }
    }
}
