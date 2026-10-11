define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {
    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/invoice/index' + location.search,
                    del_url: 'purchase/invoice/del',
                    table: 'purchase_invoice',
                }
            });
            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                sortOrder: 'desc',
                escape: false,
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: 'ID', operate: false, visible: false},
                    {field: 'batch_sn', title: '批次号', operate: 'LIKE'},
                    {field: 'plan_sn', title: '采购计划', operate: false},
                    {field: 'buyer_name', title: '采购人', operate: false},
                    {
                        field: 'item_count', title: '物品数', operate: false, align: 'center',
                        formatter: function (v) {
                            var n = parseInt(v, 10) || 0;
                            return '<span class="label label-primary">' + n + '</span>';
                        }
                    },
                    {
                        field: 'names_text', title: '开票品名摘要', operate: false,
                        formatter: function (v) {
                            return Fast.api.escape(v || '-');
                        }
                    },
                    {
                        field: 'origin_place', title: '货源地', operate: 'LIKE',
                        formatter: function (v) {
                            return Fast.api.escape(v || '-');
                        }
                    },
                    {field: 'admin_name', title: '提交人', operate: false},
                    {
                        field: 'createtime', title: __('Createtime'), operate: 'RANGE', addclass: 'datetimerange',
                        formatter: Table.api.formatter.datetime
                    },
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate,
                        formatter: Table.api.formatter.operate,
                        buttons: [
                            {
                                name: 'detail',
                                text: '物品清单',
                                title: '发票物品清单',
                                classname: 'btn btn-xs btn-info btn-dialog',
                                icon: 'fa fa-list',
                                url: 'purchase/invoice/detail',
                                extend: 'data-area=\'["92%","88%"]\''
                            }
                        ]
                    }
                ]]
            });
            Table.api.bindevent(table);
        },
        detail: function () {
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
