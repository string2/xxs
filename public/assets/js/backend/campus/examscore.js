define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'campus/examscore/index' + location.search,
                    add_url: 'campus/examscore/add',
                    edit_url: 'campus/examscore/edit',
                    del_url: 'campus/examscore/del',
                    multi_url: 'campus/examscore/multi',
                    import_url: 'campus/examscore/import',
                    table: 'exam_score',
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
                        {field: 'examinfo.name', title: '考试', operate: 'LIKE'},
                        {field: 'exam_id', title: '考试ID', visible: false},
                        {field: 'studentinfo.name', title: '学生', operate: 'LIKE'},
                        {field: 'student_id', title: '学生ID', visible: false},
                        {field: 'classinfo.name', title: '班级', operate: 'LIKE'},
                        {field: 'class_id', title: '班级ID', visible: false},
                        {field: 'subject', title: '科目', operate: 'LIKE', formatter: function (value, row) {
                            if (row.is_total == 1 || value === '总分') {
                                return '<span class="text-muted">总分(自动汇总)</span>';
                            }
                            return value || '-';
                        }},
                        {field: 'score', title: '分数', operate: 'BETWEEN'},
                        {field: 'is_total', title: '类型', searchList: {"0":"单科","1":"总分"}, formatter: function (v) { return v == 1 ? '<span class="label label-default">总分</span>' : '<span class="label label-success">单科</span>'; }},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });
            Table.api.bindevent(table);

            $(document).on('click', '.btn-recalc', function () {
                Layer.prompt({title: '请输入考试ID', formType: 0}, function (value, index) {
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'campus/examscore/recalculate',
                        data: {exam_id: value}
                    }, function () {
                        table.bootstrapTable('refresh');
                    });
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
