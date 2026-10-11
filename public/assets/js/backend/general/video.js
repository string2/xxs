define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'general/video/index' + location.search,
                    add_url: 'general/video/add',
                    edit_url: 'general/video/edit',
                    del_url: 'general/video/del',
                    multi_url: 'general/video/multi',
                    table: 'video',
                }
            });

            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'weigh',
                sortOrder: 'desc',
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: __('Id'), sortable: true},
                        {field: 'title', title: __('Title'), operate: 'LIKE'},
                        {field: 'cover', title: __('Cover'), operate: false, events: Table.api.events.image, formatter: Table.api.formatter.image},
                        {field: 'video_url', title: __('Video_url'), operate: false, formatter: function (value) {
                            if (!value) return '-';
                            var url = Fast.api.cdnurl(value);
                            return '<a href="' + url + '" target="_blank" class="btn btn-xs btn-default"><i class="fa fa-play"></i> 预览</a>';
                        }},
                        {field: 'duration', title: __('Duration'), operate: false},
                        {field: 'views', title: __('Views'), operate: false, sortable: true},
                        {field: 'weigh', title: __('Weigh'), operate: false, sortable: true},
                        {field: 'status', title: __('Status'), searchList: {"normal": __('Normal'), "hidden": __('Hidden')}, formatter: Table.api.formatter.status},
                        {field: 'createtime', title: __('Createtime'), operate: 'RANGE', addclass: 'datetimerange', autocomplete: false, formatter: Table.api.formatter.datetime, sortable: true},
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
        library: function () {
        },
        play: function () {
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
