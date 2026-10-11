define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'campus/gatecallback/index' + location.search,
                    del_url: 'campus/gatecallback/del',
                    table: 'gate_callback',
                }
            });

            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                sortOrder: 'desc',
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: 'ID'},
                        {
                            field: 'action',
                            title: '类型',
                            searchList: {"verify": "通行校验", "openRecord": "开门记录"},
                            formatter: Table.api.formatter.normal
                        },
                        {field: 'phone', title: '手机号', operate: 'LIKE'},
                        {field: 'device', title: '设备号', operate: 'LIKE'},
                        {field: 'qrcode', title: '二维码编号', operate: 'LIKE'},
                        {field: 'scene_name', title: '场景', operate: 'LIKE'},
                        {field: 'sn', title: 'Sn', operate: 'LIKE'},
                        {
                            field: 'allow',
                            title: '结果',
                            searchList: {"0": "拒绝", "1": "放行"},
                            formatter: Table.api.formatter.status,
                            custom: {"0": "danger", "1": "success"}
                        },
                        {field: 'msg', title: '说明', operate: 'LIKE', table: table, class: 'autocontent', formatter: Table.api.formatter.content},
                        {
                            field: 'createtime',
                            title: '时间',
                            operate: 'RANGE',
                            addclass: 'datetimerange',
                            autocomplete: false,
                            formatter: Table.api.formatter.datetime
                        },
                        {
                            field: 'operate',
                            title: __('Operate'),
                            table: table,
                            events: Table.api.events.operate,
                            formatter: Table.api.formatter.operate
                        }
                    ]
                ]
            });
            Table.api.bindevent(table);

            var autoTimer = setInterval(function () {
                if (!$('#table').length) {
                    clearInterval(autoTimer);
                    return;
                }
                table.bootstrapTable('refresh', {silent: true});
            }, 5000);
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
