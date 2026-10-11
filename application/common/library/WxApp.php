<?php

namespace app\common\library;

use think\Config;

/**
 * 微信小程序登录
 */
class WxApp
{
    public static function code2Session($code)
    {
        $code = trim((string)$code);
        if ($code === '') {
            throw new \InvalidArgumentException('缺少微信登录 code');
        }

        $config = Config::get('wxapp') ?: [];
        $appId = $config['app_id'] ?? '';
        $secret = $config['app_secret'] ?? '';

        // 未配置 AppSecret 时使用开发模式（模拟器调试）
        if ($secret === '') {
            return [
                'openid'      => 'dev_' . substr(md5($code . ($appId ?: 'campus')), 0, 28),
                'session_key' => '',
                'unionid'     => '',
            ];
        }

        $query = http_build_query([
            'appid'      => $appId,
            'secret'     => $secret,
            'js_code'    => $code,
            'grant_type' => 'authorization_code',
        ]);
        $url = 'https://api.weixin.qq.com/sns/jscode2session?' . $query;
        $response = self::httpGet($url);
        if (empty($response['openid'])) {
            $msg = $response['errmsg'] ?? '微信登录失败';
            throw new \RuntimeException($msg . (isset($response['errcode']) ? ' (' . $response['errcode'] . ')' : ''));
        }

        return $response;
    }

    protected static function httpGet($url)
    {
        $body = '';
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 10,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
            ]);
            $body = curl_exec($ch);
            if ($body === false) {
                $err = curl_error($ch);
                curl_close($ch);
                throw new \RuntimeException('无法连接微信服务器' . ($err ? '：' . $err : ''));
            }
            curl_close($ch);
        } else {
            $body = @file_get_contents($url);
            if ($body === false) {
                throw new \RuntimeException('无法连接微信服务器');
            }
        }
        $data = json_decode((string)$body, true);

        return is_array($data) ? $data : [];
    }
}
