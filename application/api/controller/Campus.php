<?php

namespace app\api\controller;

use app\common\controller\Api;
use think\Db;

/**
 * 校园内容
 */
class Campus extends Api
{
    protected $noNeedLogin = ['lists', 'detail'];
    protected $noNeedRight = '*';

    public function lists()
    {
        $category = $this->request->get('category', '');
        $query = Db::name('campus_content')->where('status', 'normal');
        if ($category) {
            $query->where('category', $category);
        }
        $list = $query->order('weigh desc,id desc')->select();
        $this->success('', ['list' => $list]);
    }

    public function detail()
    {
        $id = (int)$this->request->get('id');
        $row = Db::name('campus_content')->where(['id' => $id, 'status' => 'normal'])->find();
        if (!$row) {
            $this->error('内容不存在');
        }
        $this->success('', $row);
    }
}
