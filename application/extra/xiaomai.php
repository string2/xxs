<?php

/**
 * 小麦开门 OPEN 场景对接配置
 * 场景模式：数据接口 -> 校验过程 -> 自行校验
 * .env 示例：
 * [xiaomai]
 * api_token = 你的口令
 * callback_secret =
 */
use think\Env;

return [
    // 主动调用小麦 API 的基地址
    'api_base'  => Env::get('xiaomai.api_base', 'https://www.xiaomaivip.com'),
    // 接口口令（Header: token，调用 /user/report、/user/unReport 等）
    'api_token' => Env::get('xiaomai.api_token', ''),
    // 回调可选密钥（若在小麦后台配置了额外校验参数可填写）
    'callback_secret' => Env::get('xiaomai.callback_secret', ''),
];
