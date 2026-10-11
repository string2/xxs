define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            // 初始化表格参数配置
            Table.api.init({
                extend: {
                    index_url: 'campus/student/index' + location.search,
                    add_url: 'campus/student/add',
                    edit_url: 'campus/student/edit',
                    del_url: 'campus/student/del',
                    multi_url: 'campus/student/multi',
                    import_url: 'campus/student/import',
                    table: 'student',
                }
            });

            var table = $("#table");

            // 初始化表格
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                fixedColumns: true,
                fixedRightNumber: 1,
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: 'ID'},
                        {field: 'user_id', title: __('User_id'), visible: false},
                        {field: 'admin_id', title: __('Admin_id'), visible: false},
                        {field: 'classinfo.name', title: '班级', operate: 'LIKE'},
                        {field: 'class_id', title: '班级ID', visible: false},
                        {field: 'roominfo.room_no', title: '寝室', operate: 'LIKE'},
                        {field: 'room_id', title: '寝室ID', visible: false},
                        {field: 'name', title: __('Name'), operate: 'LIKE'},
                        {field: 'student_no', title: __('Student_no'), operate: 'LIKE'},
                        {field: 'mobile', title: __('Mobile'), operate: 'LIKE'},
                        {field: 'gender', title: __('Gender'), searchList: {"male":"男","female":"女","unknown":"未知"}, formatter: Table.api.formatter.normal},
                        {field: 'status', title: __('Status'), searchList: {"normal":__('Normal'),"hidden":__('Hidden')}, formatter: Table.api.formatter.status},
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
