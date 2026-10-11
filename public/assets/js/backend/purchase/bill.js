define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {
    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/bill/index' + location.search,
                    table: 'finance_bill',
                }
            });
            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: __('Id')},
                    {field: 'sn', title: '账单号', operate: 'LIKE'},
                    {field: 'title', title: '标题', operate: 'LIKE'},
                    {field: 'plan.sn', title: '合同编号', operate: false},
                    {field: 'customer_name', title: '客户', operate: false},
                    {field: 'quote_sn', title: '报价单号', operate: false},
                    {field: 'sell_amount', title: '报价金额', operate: false},
                    {field: 'cost_amount', title: '采购成本', operate: false},
                    {field: 'profit_amount', title: '预计毛利', operate: false},
                    {field: 'customer_received', title: '已收客户', operate: false},
                    {field: 'factory_paid', title: '已付工厂', operate: false},
                    {field: 'status', title: '状态', searchList: {"open":"未结清","partial":"部分结算","closed":"已结清"}, formatter: Table.api.formatter.status},
                    {field: 'updatetime', title: __('Updatetime'), operate: 'RANGE', addclass: 'datetimerange', formatter: Table.api.formatter.datetime},
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate,
                        buttons: [{
                            name: 'detail',
                            text: '详情',
                            title: '账单详情',
                            classname: 'btn btn-xs btn-info btn-dialog',
                            icon: 'fa fa-list',
                            url: 'purchase/bill/detail',
                            extend: 'data-area=\'["92%","85%"]\''
                        }],
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);

            var applySummary = function (data) {
                if (!data) {
                    return;
                }
                $.each(data, function (k, v) {
                    if (String(k).indexOf('s_') === 0) {
                        $('#' + k).text(v);
                    }
                });
            };

            var refreshSummary = function () {
                $.ajax({
                    url: Fast.api.fixurl('purchase/bill/index'),
                    type: 'GET',
                    dataType: 'json',
                    data: {summary: 1},
                    success: function (res) {
                        if (res && (res.code === 1 || res.code === '1') && res.data) {
                            applySummary(res.data);
                        }
                    }
                });
            };

            applySummary(Config.billSummary || {});

            $(document).on('click', '.btn-sync', function () {
                Backend.api.ajax({url: 'purchase/bill/sync'}, function () {
                    table.bootstrapTable('refresh');
                    refreshSummary();
                    return false;
                });
            });

            $(document).on('click', '.btn-refresh', function () {
                setTimeout(refreshSummary, 300);
            });
        },
        detail: function () {
            $(document).on('click', '.btn-ajax', function () {
                var url = $(this).data('url');
                var confirmText = $(this).data('confirm') || '确认？';
                var that = this;
                Layer.confirm(confirmText, function (index) {
                    Backend.api.ajax({url: url}, function () {
                        Layer.close(index);
                        setTimeout(function () { location.reload(); }, 400);
                        return false;
                    });
                });
                return false;
            });
        },
        linkquote: function () {
            Form.api.bindevent($("form[role=form]"));
            Form.events.selectpage($("form[role=form]"));
        },
        addreceipt: function () {
            Form.api.bindevent($("form[role=form]"));
        }
    };
    return Controller;
});
