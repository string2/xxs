define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            // 初始化表格参数配置
            Table.api.init({
                extend: {
                    index_url: 'campus/parentstudent/index' + location.search,
                    add_url: 'campus/parentstudent/add',
                    edit_url: 'campus/parentstudent/edit',
                    del_url: 'campus/parentstudent/del',
                    multi_url: 'campus/parentstudent/multi',
                    import_url: 'campus/parentstudent/import',
                    table: 'parent_student',
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
                        {field: 'parentinfo.name', title: '家长', operate: 'LIKE'},
                        {field: 'parent_id', title: '家长ID', visible: false},
                        {field: 'studentinfo.name', title: '学生', operate: 'LIKE'},
                        {field: 'student_id', title: '学生ID', visible: false},
                        {field: 'relation', title: __('Relation'), operate: 'LIKE'},
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
