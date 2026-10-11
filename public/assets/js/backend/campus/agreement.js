define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'campus/agreement/index' + location.search,
                    add_url: 'campus/agreement/add',
                    edit_url: 'campus/agreement/edit',
                    del_url: 'campus/agreement/del',
                    multi_url: 'campus/agreement/multi',
                    table: 'agreement',
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
                        {field: 'title', title: '标题', operate: 'LIKE'},
                        {field: 'need_sign', title: '需签字', formatter: function (v) { return v == 1 ? '是' : '否'; }},
                        {field: 'status', title: __('Status'), searchList: {"normal":__('Normal'),"hidden":__('Hidden')}, formatter: Table.api.formatter.status},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });
            Table.api.bindevent(table);

            $(document).on('click', '.btn-progress', function () {
                var ids = Table.api.selectedids(table);
                if (ids.length !== 1) {
                    Layer.msg('请选择一条协议');
                    return;
                }
                Fast.api.open('campus/agreement/progress/ids/' + ids[0], '签署进度', {area: ['90%', '90%']});
            });
        },
        add: function () {
            Controller.api.bindevent();
        },
        edit: function () {
            Controller.api.bindevent();
        },
        progress: function () {
            Table.api.init({});
            var type = 'signed';
            var table = $("#table");
            table.bootstrapTable({
                url: 'campus/agreement/progress/ids/' + agreementId,
                pk: 'parent_id',
                sortName: 'parent_id',
                queryParams: function (params) {
                    params.type = type;
                    return params;
                },
                columns: [
                    [
                        {field: 'parent_name', title: '家长'},
                        {field: 'parent_mobile', title: '家长手机'},
                        {field: 'student_name', title: '学生'},
                        {field: 'student_mobile', title: '学生手机'},
                        {field: 'signtime', title: '签署时间', formatter: Table.api.formatter.datetime}
                    ]
                ]
            });
            Table.api.bindevent(table);
            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                type = $(this).data('value');
                table.bootstrapTable('refresh');
            });
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
