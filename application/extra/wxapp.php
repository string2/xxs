<?php

/**
 * 微信小程序配置（正式环境请在 .env 填写 AppSecret）
 * .env 示例：
 * [wxapp]
 * app_id = wx9fa378251ee8d2f1
 * app_secret = 你的密钥
 */
use think\Env;

return [
    'app_id'     => Env::get('wxapp.app_id', 'wx9fa378251ee8d2f1'),
    'app_secret' => Env::get('wxapp.app_secret', ''),
];
