define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            // 初始化表格参数配置
            Table.api.init({
                extend: {
                    index_url: 'campus/dormcheckitem/index' + location.search,
                    add_url: 'campus/dormcheckitem/add',
                    edit_url: 'campus/dormcheckitem/edit',
                    del_url: 'campus/dormcheckitem/del',
                    multi_url: 'campus/dormcheckitem/multi',
                    import_url: 'campus/dormcheckitem/import',
                    table: 'dorm_check_item',
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
                        {field: 'check_id', title: __('Check_id'), visible: false},
                        {field: 'roominfo.room_no', title: '寝室', operate: 'LIKE'},
                        {field: 'room_id', title: '寝室ID', visible: false},
                        {field: 'result', title: __('Result'), searchList: {"normal":__('Normal'),"abnormal":__('Abnormal'),"leave":__('Leave')}, formatter: Table.api.formatter.normal},
                        {field: 'remark', title: __('Remark'), operate: 'LIKE', table: table, class: 'autocontent', formatter: Table.api.formatter.content},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'updatetime', title: __('Updatetime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
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
