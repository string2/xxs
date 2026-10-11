<?php

// +----------------------------------------------------------------------
// | ThinkPHP [ WE CAN DO IT JUST THINK ]
// +----------------------------------------------------------------------
// | Copyright (c) 2006-2016 http://thinkphp.cn All rights reserved.
// +----------------------------------------------------------------------
// | Licensed ( http://www.apache.org/licenses/LICENSE-2.0 )
// +----------------------------------------------------------------------
// | Author: liu21st <liu21st@gmail.com>
// +----------------------------------------------------------------------
// [ 应用入口文件 ]
// 定义应用目录
define('APP_PATH', __DIR__ . '/../application/');

// 判断是否安装
if (!is_file(APP_PATH . 'admin/command/Install/install.lock')) {
    header("location:./install.php");
    exit;
}

// 仅首页跳转后台；API / 其它模块走正常入口
$path = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
if ($path === '' || $path === '/') {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $uri = $uri === null ? '/' : $uri;
    // 内置服务器经 router.php 转发时 PATH_INFO 可能为空，用 URI 再判一次
    if ($uri === '/' || $uri === '/index.php' || preg_match('#^/index\.php/?$#', $uri)) {
        $s = isset($_GET['s']) ? (string)$_GET['s'] : '';
        if ($s === '' || $s === '/') {
            header('location:./fs.php');
            exit;
        }
    }
}

// 加载框架引导文件
require __DIR__ . '/../thinkphp/start.php';
