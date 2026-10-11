define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            // 初始化表格参数配置
            Table.api.init({
                extend: {
                    index_url: 'campus/leavelog/index' + location.search,
                    add_url: 'campus/leavelog/add',
                    edit_url: 'campus/leavelog/edit',
                    del_url: 'campus/leavelog/del',
                    multi_url: 'campus/leavelog/multi',
                    import_url: 'campus/leavelog/import',
                    table: 'leave_log',
                }
            });

            var table = $("#table");

            // 初始化表格
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: 'ID'},
                        {field: 'studentinfo.name', title: '学生', operate: 'LIKE'},
                        {field: 'leaveinfo.reason', title: '请假原因', operate: 'LIKE'},
                        {field: 'leave_id', title: '请假ID', visible: false},
                        {field: 'action', title: __('Action'), operate: 'LIKE'},
                        {field: 'operator_type', title: __('Operator_type'), operate: 'LIKE'},
                        {field: 'operator_id', title: __('Operator_id')},
                        {field: 'content', title: __('Content'), operate: 'LIKE', table: table, class: 'autocontent', formatter: Table.api.formatter.content},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });

            // 为表格绑定事件
            Table.api.bindevent(table);
        },
        add: function () {
            Controller.api.bindevent();
        },
        edit: function () {
            Controller.api.bindevent();
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
