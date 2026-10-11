<?php

namespace app\api\controller;

use app\common\controller\Api;
use app\common\library\Auth;
use app\common\library\Sms as Smslib;
use app\common\model\User;
use think\Hook;

/**
 * 手机短信接口
 */
class Sms extends Api
{
    protected $noNeedLogin = '*';
    protected $noNeedRight = '*';

    protected function validateMobileEvent($mobile, $event)
    {
        if (!$event) {
            return;
        }
        $userinfo = User::getByMobile($mobile);
        if ($event == 'register' && $userinfo) {
            $this->error(__('已被注册'));
        } elseif ($event == 'changemobile' && $userinfo) {
            $auth = Auth::instance();
            $token = $this->request->server('HTTP_TOKEN', $this->request->request('token', ''));
            if ($token) {
                $auth->init($token);
            }
            if (!$auth->isLogin() || (int)$userinfo->id !== (int)$auth->id) {
                $this->error(__('已被占用'));
            }
        } elseif (in_array($event, ['changepwd', 'resetpwd']) && !$userinfo) {
            $this->error(__('未注册'));
        }
    }

    /**
     * 发送验证码
     */
    public function send()
    {
        $mobile = $this->request->post("mobile");
        $event = $this->request->post("event");
        $event = $event ? $event : 'register';

        if (!$mobile || !\think\Validate::regex($mobile, "^1\d{10}$")) {
            $this->error(__('手机号不正确'));
        }
        $last = Smslib::get($mobile, $event);
        if ($last && time() - $last['createtime'] < 60) {
            $this->error(__('发送频繁'));
        }
        $ipSendTotal = \app\common\model\Sms::where(['ip' => $this->request->ip()])->whereTime('createtime', '-1 hours')->count();
        if ($ipSendTotal >= 5) {
            $this->error(__('发送频繁'));
        }
        $this->validateMobileEvent($mobile, $event);

        if (!Hook::get('sms_send')) {
            $this->error(__('请在后台插件管理安装短信验证插件'));
        }
        $ret = Smslib::send($mobile, null, $event);
        if ($ret) {
            $this->success(__('发送成功'));
        } else {
            $this->error(__('发送失败，请检查短信配置是否正确'));
        }
    }

    /**
     * 检测验证码
     */
    public function check()
    {
        $mobile = $this->request->post("mobile");
        $event = $this->request->post("event");
        $event = $event ? $event : 'register';
        $captcha = $this->request->post("captcha");

        if (!$mobile || !\think\Validate::regex($mobile, "^1\d{10}$")) {
            $this->error(__('手机号不正确'));
        }
        $this->validateMobileEvent($mobile, $event);
        $ret = Smslib::check($mobile, $captcha, $event);
        if ($ret) {
            $this->success(__('成功'));
        } else {
            $this->error(__('验证码不正确'));
        }
    }
}
