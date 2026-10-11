define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'campus/gaterecord/index' + location.search,
                    add_url: 'campus/gaterecord/add',
                    edit_url: 'campus/gaterecord/edit',
                    del_url: 'campus/gaterecord/del',
                    multi_url: 'campus/gaterecord/multi',
                    import_url: 'campus/gaterecord/import',
                    table: 'gate_record',
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
                        {field: 'deviceinfo.name', title: '门禁设备', operate: 'LIKE'},
                        {field: 'device_id', title: '设备ID', visible: false},
                        {field: 'studentinfo.name', title: '学生', operate: 'LIKE'},
                        {field: 'student_id', title: '学生ID', visible: false},
                        {field: 'leaveinfo.reason', title: '关联请假', operate: 'LIKE', formatter: function (value, row) {
                            if (!row.leave_id) return '无';
                            var reason = value ? value.substring(0, 12) : '请假';
                            var status = row.leaveinfo && row.leaveinfo.status_text ? row.leaveinfo.status_text : '';
                            return status ? reason + '（' + status + '）' : reason;
                        }},
                        {field: 'leave_id', title: '请假ID', visible: false},
                        {field: 'direction', title: '方向', searchList: {"out": "离校", "in": "回校"}, formatter: Table.api.formatter.normal},
                        {field: 'mobile', title: '核验手机号', operate: 'LIKE'},
                        {field: 'passtime', title: '通行时间', operate: 'RANGE', addclass: 'datetimerange', autocomplete: false, formatter: Table.api.formatter.datetime},
                        {field: 'createtime', title: '创建时间', operate: 'RANGE', addclass: 'datetimerange', autocomplete: false, formatter: Table.api.formatter.datetime},
                        {field: 'updatetime', title: '更新时间', operate: 'RANGE', addclass: 'datetimerange', autocomplete: false, formatter: Table.api.formatter.datetime},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });

            Table.api.bindevent(table);

            // 联调时自动刷新，减少“数据回传不及时”的感觉
            var autoTimer = setInterval(function () {
                if (!$('#table').length) {
                    clearInterval(autoTimer);
                    return;
                }
                table.bootstrapTable('refresh', {silent: true});
            }, 5000);
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
