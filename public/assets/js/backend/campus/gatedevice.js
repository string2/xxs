define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            // 初始化表格参数配置
            Table.api.init({
                extend: {
                    index_url: 'campus/gatedevice/index' + location.search,
                    add_url: 'campus/gatedevice/add',
                    edit_url: 'campus/gatedevice/edit',
                    del_url: 'campus/gatedevice/del',
                    multi_url: 'campus/gatedevice/multi',
                    import_url: 'campus/gatedevice/import',
                    table: 'gate_device',
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
                        {field: 'name', title: __('Name'), operate: 'LIKE'},
                        {field: 'device_no', title: __('Device_no'), operate: 'LIKE'},
                        {field: 'qrcode_no', title: __('Qrcode_no'), operate: 'LIKE'},
                        {field: 'scene_name', title: __('Scene_name'), operate: 'LIKE'},
                        {field: 'token', title: __('Token'), operate: 'LIKE', visible: false},
                        {field: 'location', title: __('Location'), operate: 'LIKE'},
                        {field: 'direction', title: __('Direction'), searchList: {"both":__('Both'),"out":__('Out'),"in":__('In')}, formatter: Table.api.formatter.normal},
                        {field: 'status', title: __('Status'), searchList: {"normal":__('Normal'),"hidden":__('Hidden')}, formatter: Table.api.formatter.status},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'updatetime', title: __('Updatetime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime, visible: false},
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
