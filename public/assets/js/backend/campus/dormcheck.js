define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'campus/dormcheck/index' + location.search,
                    add_url: 'campus/dormcheck/add',
                    edit_url: 'campus/dormcheck/edit',
                    del_url: 'campus/dormcheck/del',
                    multi_url: 'campus/dormcheck/multi',
                    table: 'dorm_check',
                }
            });

            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: 'ID'},
                        {field: 'dorm_admin_name', title: '查寝员', operate: false},
                        {field: 'dorm_admin_id', title: '查寝员ID', visible: false},
                        {field: 'building_name', title: '楼栋', operate: false},
                        {field: 'building_id', title: '楼栋ID', visible: false},
                        {field: 'check_date', title: '查寝日期', operate: 'RANGE', addclass: 'datetimerange', autocomplete: false},
                        {field: 'item_count', title: '已查房间数', operate: false},
                        {field: 'remark', title: '备注', operate: 'LIKE'},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });
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
