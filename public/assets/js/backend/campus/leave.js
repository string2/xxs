define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'campus/leave/index' + location.search,
                    add_url: 'campus/leave/add',
                    edit_url: 'campus/leave/edit',
                    del_url: 'campus/leave/del',
                    multi_url: 'campus/leave/multi',
                    table: 'leave',
                }
            });

            var table = $("#table");
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
                        {field: 'studentinfo.name', title: '学生', operate: 'LIKE'},
                        {field: 'student_id', title: '学生ID', visible: false},
                        {field: 'classinfo.name', title: '班级', operate: 'LIKE'},
                        {field: 'class_id', title: '班级ID', visible: false},
                        {field: 'leave_type', title: '类型', searchList: {"affair":"事假","sick":"病假"}, formatter: Table.api.formatter.normal},
                        {field: 'reason', title: '原因', operate: 'LIKE', table: table, class: 'autocontent', formatter: Table.api.formatter.content},
                        {field: 'start_time', title: '开始', operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'end_time', title: '结束', operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'days', title: '天数', operate:'BETWEEN'},
                        {field: 'status', title: '状态', searchList: {"pending_parent":"待家长批准","pending_teacher":"待班主任批准","approved":"已批准","rejected":"已拒绝"}, formatter: Table.api.formatter.status, custom: {"pending_parent":"warning","pending_teacher":"warning","approved":"success","rejected":"danger"}},
                        {field: 'parent_sign_image', title: '家长签字', operate: false, events: Table.api.events.image, formatter: Table.api.formatter.image},
                        {field: 'gate_count', title: '扫码开门', operate: false, formatter: function (value, row) {
                            var n = parseInt(value || row.gate_count || 0, 10) || 0;
                            if (n <= 0) {
                                return '<span class="text-muted">0 次</span>';
                            }
                            return '<a href="javascript:;" class="btn-gate-records text-primary" data-id="' + row.id + '">' + n + ' 次 · 查看</a>';
                        }},
                        {field: 'gate_records', title: '扫码明细', visible: false, operate: false},
                        {field: 'createtime', title: '申请时间', operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });
            Table.api.bindevent(table);

            // 请假字段较多，放大添加/编辑弹窗
            var leaveDialogArea = ['1100px', '95%'];
            $('.btn-add, .btn-edit').data('area', leaveDialogArea);
            table.on('post-body.bs.table', function () {
                $('.btn-editone', table).data('area', leaveDialogArea).attr('data-area', '["1100px","95%"]');
            });

            require(['bootstrap-daterangepicker'], function () {
                $('#stat-range').daterangepicker({
                    autoUpdateInput: false,
                    locale: {format: 'YYYY-MM-DD', applyLabel: '确定', cancelLabel: '清除'}
                }).on('apply.daterangepicker', function (ev, picker) {
                    $(this).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));
                }).on('cancel.daterangepicker', function () {
                    $(this).val('');
                });
            });

            $(document).on('click', '.btn-approve', function () {
                var ids = Table.api.selectedids(table);
                if (!ids.length) return Layer.msg('请选择待审核请假单');
                Backend.api.ajax({url: 'campus/leave/approve', data: {ids: ids.join(',')}}, function () {
                    table.bootstrapTable('refresh');
                });
            });
            $(document).on('click', '.btn-reject', function () {
                var ids = Table.api.selectedids(table);
                if (!ids.length) return Layer.msg('请选择待审核请假单');
                Backend.api.ajax({url: 'campus/leave/reject', data: {ids: ids.join(',')}}, function () {
                    table.bootstrapTable('refresh');
                });
            });
            $(document).on('click', '.btn-stat', function () {
                var range = $('#stat-range').val() || '';
                var start = '', end = '';
                if (range.indexOf(' - ') !== -1) {
                    var arr = range.split(' - ');
                    start = arr[0];
                    end = arr[1];
                }
                Backend.api.ajax({
                    url: 'campus/leave/statistics',
                    data: {start: start, end: end}
                }, function (data, ret) {
                    var d = ret.data || data || {};
                    $('#stat-result').text('请假单 ' + (d.total || 0) + ' 条，涉及学生 ' + (d.student_count || 0) + ' 人');
                    return false;
                });
            });

            // 查看该请假下的扫码开门记录
            $(document).on('click', '.btn-gate-records', function () {
                var id = $(this).data('id');
                var row = table.bootstrapTable('getRowByUniqueId', id) || null;
                if (!row) {
                    var all = table.bootstrapTable('getData') || [];
                    for (var i = 0; i < all.length; i++) {
                        if (String(all[i].id) === String(id)) {
                            row = all[i];
                            break;
                        }
                    }
                }
                var records = (row && row.gate_records) ? row.gate_records : [];
                if (!records.length) {
                    Layer.msg('暂无扫码记录');
                    return;
                }
                var html = '<div style="padding:12px 16px;max-height:420px;overflow:auto;">';
                html += '<table class="table table-striped table-bordered" style="margin:0;"><thead><tr><th>#</th><th>时间</th><th>方向</th></tr></thead><tbody>';
                for (var j = 0; j < records.length; j++) {
                    html += '<tr><td>' + (j + 1) + '</td><td>' + (records[j].time || '') + '</td><td>' + (records[j].dir || '') + '</td></tr>';
                }
                html += '</tbody></table></div>';
                Layer.open({
                    type: 1,
                    title: '扫码开门记录（请假 #' + id + '）',
                    area: ['520px', '480px'],
                    content: html
                });
            });
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
