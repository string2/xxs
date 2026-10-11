define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {
    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/category/index' + location.search,
                    add_url: 'purchase/category/add',
                    edit_url: 'purchase/category/edit',
                    del_url: 'purchase/category/del',
                    multi_url: 'purchase/category/multi',
                    dragsort_url: '',
                    table: 'purchase_category',
                }
            });
            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: __('Id')},
                    {field: 'name', title: '分类名称', operate: 'LIKE'},
                    {field: 'buyer_names', title: '采购负责人', operate: false},
                    {field: 'status', title: __('Status'), searchList: {"normal":__('Normal'),"hidden":__('Hidden')}, formatter: Table.api.formatter.status},
                    {field: 'createtime', title: __('Createtime'), operate: 'RANGE', addclass: 'datetimerange', formatter: Table.api.formatter.datetime},
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate,
                        buttons: [{
                            name: 'setbuyer',
                            text: '默认负责人',
                            title: '设置默认采购负责人（采购员可勾选自己负责的分类）',
                            classname: 'btn btn-xs btn-info btn-dialog',
                            icon: 'fa fa-user',
                            url: 'purchase/category/setbuyer'
                        }],
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
        },
        add: function () { Controller.api.bindevent(); },
        edit: function () { Controller.api.bindevent(); },
        setbuyer: function () { Controller.api.bindevent(); },
        api: { bindevent: function () { Form.api.bindevent($("form[role=form]")); } }
    };
    return Controller;
});
