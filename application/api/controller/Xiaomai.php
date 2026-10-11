<?php

namespace app\api\controller;

use app\common\controller\Api;
use app\common\library\campus\GateService;

/**
 * 小麦开门回调（自行校验 + 开门记录下发）
 *
 * 官方文档约定（必须严格遵守）：
 * - 请求参数：phone、device
 * - 放行：{"code":1,"msg":"success"}   —— code=1 校验通过
 * - 拒绝：{"code":0,"msg":"error"}     —— 其余值不通过
 *
 * 小麦后台：
 * - 场景模式：数据接口 -> 校验过程 -> 自行校验
 * - 校验地址：https://你的域名/api/xiaomai/verify
 * - 下发地址：https://你的域名/api/xiaomai/openRecord
 */
class Xiaomai extends Api
{
    protected $noNeedLogin = ['verify', 'openRecord'];
    protected $noNeedRight = '*';

    /**
     * 自行校验
     */
    public function verify()
    {
        $payload = $this->parseXiaomaiPayload();
        if ($payload['phone'] === '') {
            $this->xiaomaiResult(false, '缺少手机号', $payload, 'verify');
        }

        $deviceKey = GateService::resolveDeviceKey($payload['device'], $payload['qrcode']);
        if ($deviceKey === '') {
            $this->xiaomaiResult(false, '缺少设备号', $payload, 'verify');
        }

        // 回写解析后的设备号，便于回调日志排查
        $payload['device'] = $deviceKey;
        $check = GateService::verifyForOpen($payload['phone'], $deviceKey);
        $this->xiaomaiResult($check['allow'], $check['msg'] ?: ($check['allow'] ? 'success' : 'error'), $payload, 'verify');
    }

    /**
     * 开门记录下发（同样按官方 code 约定回包）
     */
    public function openRecord()
    {
        $payload = $this->parseXiaomaiPayload();
        if ($payload['phone'] === '') {
            $this->xiaomaiResult(false, '缺少手机号', $payload, 'openRecord');
        }

        try {
            $deviceKey = GateService::resolveDeviceKey($payload['device'] ?? '', $payload['qrcode'] ?? '');
            if ($deviceKey !== '') {
                $payload['device'] = $deviceKey;
            }
            GateService::recordOpen(
                $payload['phone'],
                $deviceKey,
                $payload['qrcode'],
                $payload['scene_name'],
                $payload['sn'],
                'xiaomai'
            );
        } catch (\Throwable $e) {
            $msg = $e->getMessage() ?: 'error';
            $this->xiaomaiResult(false, $msg, $payload, 'openRecord');
        }

        $this->xiaomaiResult(true, 'success', $payload, 'openRecord');
    }

    /**
     * 兼容小麦大小写 / 多种字段名（文档要求 phone、device）
     */
    protected function parseXiaomaiPayload()
    {
        $input = array_merge($this->request->param() ?: [], $this->request->post() ?: []);
        $raw = $this->request->getInput();
        if ($raw) {
            $json = json_decode($raw, true);
            if (is_array($json)) {
                $input = array_merge($input, $json);
            }
        }

        $pick = function (array $keys) use ($input) {
            foreach ($keys as $key) {
                if (isset($input[$key]) && $input[$key] !== '' && $input[$key] !== null) {
                    return trim((string)$input[$key]);
                }
                foreach ($input as $k => $v) {
                    if (strcasecmp((string)$k, $key) === 0 && $v !== '' && $v !== null) {
                        return trim((string)$v);
                    }
                }
            }
            return '';
        };

        return [
            'phone'      => $pick(['phone', 'Phone', 'mobile', 'Mobile', 'tel', 'Tel']),
            'device'     => $pick(['device', 'Device', 'device_no', 'DeviceNo', 'deviceNo', 'deviceSn', 'DeviceSn', 'sn_device']),
            'qrcode'     => $pick(['qrcode', 'QRcode', 'Qrcode', 'QRCode', 'qr_code', 'code']),
            'scene_name' => $pick(['scene_name', 'SceneName', 'scene', 'Scene']),
            'sn'         => $pick(['sn', 'Sn', 'SN', 'vendor_sn']),
            'raw'        => $input,
        ];
    }

    /**
     * 严格按小麦文档回包：仅 code + msg，HTTP 一律 200
     * code=1 通过，code=0 不通过
     */
    protected function xiaomaiResult($allow, $msg = '', array $payload = null, $action = '')
    {
        $allow = (bool)$allow;
        if ($allow) {
            $msg = 'success';
        } elseif ($msg === '') {
            $msg = 'error';
        }

        // 官方示例只包含 code、msg，勿附加其他字段
        $result = [
            'code' => $allow ? 1 : 0,
            'msg'  => $msg,
        ];

        if ($action !== '' && is_array($payload)) {
            $allowFlag = $allow;
            $logMsg = $msg;
            register_shutdown_function(function () use ($action, $payload, $allowFlag, $logMsg) {
                try {
                    GateService::logCallback($action, $payload, $allowFlag, $logMsg);
                } catch (\Throwable $e) {
                    // ignore
                }
            });
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('Connection: close');
        $body = json_encode($result, JSON_UNESCAPED_UNICODE);
        header('Content-Length: ' . strlen($body));
        echo $body;
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        exit;
    }
}
