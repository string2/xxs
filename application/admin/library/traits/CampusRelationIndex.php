<?php

namespace app\admin\library\traits;

/**
 * 智慧校园列表：关联查询 + 名称搜索
 */
trait CampusRelationIndex
{
    /**
     * 主表字段加别名，避免 JOIN 后列名歧义
     */
    protected function campusModelField($field)
    {
        $alias = \think\Loader::parseName(basename(str_replace('\\', '/', get_class($this->model))));
        return $alias . '.' . ltrim($field, '.');
    }

    /**
     * @param array         $with           关联预加载
     * @param callable|null $queryCallback  额外查询条件
     * @return mixed
     */
    protected function campusRelationIndex(array $with, callable $queryCallback = null)
    {
        $this->request->filter(['strip_tags', 'trim']);
        if ($this->request->isAjax()) {
            if ($this->request->request('keyField')) {
                return $this->selectpage();
            }
            list($where, $sort, $order, $offset, $limit) = $this->buildparams();
            $query = $this->model->with($with)->where($where);
            if ($queryCallback) {
                $queryCallback($query);
            }
            $list = $query->order($sort, $order)->paginate($limit);
            return json(['total' => $list->total(), 'rows' => $list->items()]);
        }
        return $this->view->fetch();
    }
}
