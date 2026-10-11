define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'campus/examrank/index' + location.search,
                    add_url: '',
                    edit_url: '',
                    del_url: '',
                    table: 'exam_rank',
                }
            });

            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'school_rank',
                sortOrder: 'asc',
                columns: [
                    [
                        {field: 'id', title: 'ID', visible: false},
                        {field: 'examinfo.name', title: '考试', operate: 'LIKE'},
                        {field: 'exam_id', title: '考试ID', visible: false},
                        {field: 'classinfo.name', title: '班级', operate: 'LIKE'},
                        {field: 'class_id', title: '班级ID', visible: false},
                        {field: 'studentinfo.name', title: '学生', operate: 'LIKE'},
                        {field: 'student_id', title: '学生ID', visible: false},
                        {field: 'subject', title: '科目', operate: 'LIKE', formatter: function (value) {
                            if (value === '总分') {
                                return '<span class="label label-primary">总分排名</span>';
                            }
                            return '<span class="label label-info">单科·' + (value || '-') + '</span>';
                        }},
                        {field: 'score', title: '分数', operate: 'BETWEEN', sortable: true},
                        {field: 'class_rank', title: '班级排名', sortable: true},
                        {field: 'school_rank', title: '全校排名', sortable: true},
                        {field: 'createtime', title: '生成时间', operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime}
                    ]
                ]
            });
            Table.api.bindevent(table);
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
