define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {
    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/opcost/index' + location.search,
                    add_url: 'purchase/opcost/add',
                    edit_url: 'purchase/opcost/edit',
                    del_url: 'purchase/opcost/del',
                    multi_url: 'purchase/opcost/multi',
                    table: 'operate_cost',
                }
            });
            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                sortOrder: 'desc',
                fixedColumns: true,
                fixedRightNumber: 1,
                responseHandler: function (res) {
                    if (res && res.extend) {
                        $('#opcost-sum-payable').text(res.extend.sum_payable || '0.00');
                        $('#opcost-sum-paid').text(res.extend.sum_paid || '0.00');
                        $('#opcost-sum-unpaid').text(res.extend.sum_unpaid || '0.00');
                    }
                    return res;
                },
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: __('Id'), sortable: true},
                    {
                        field: 'status', title: '处理状态', searchList: {"pending": "待处理", "done": "已处理"},
                        formatter: function (value) {
                            var map = {pending: ['default', '待处理'], done: ['success', '已处理']};
                            var item = map[value] || map.pending;
                            return '<span class="label label-' + item[0] + '">' + item[1] + '</span>';
                        }
                    },
                    {field: 'expense_name', title: '费用名称', operate: 'LIKE'},
                    {field: 'pay_unit', title: '支付单位', operate: 'LIKE'},
                    {field: 'amount_payable', title: '应付', operate: 'BETWEEN'},
                    {field: 'amount_paid', title: '已付', operate: 'BETWEEN'},
                    {field: 'amount_unpaid', title: '未付', operate: 'BETWEEN'},
                    {
                        field: 'files', title: '附件', operate: false, align: 'center',
                        formatter: function (value) {
                            var path = value ? String(value) : '';
                            var files = path.split(/[,，]/).map(function (s) { return $.trim(s); }).filter(Boolean);
                            if (!files.length) {
                                return '<span class="text-muted">-</span>';
                            }
                            var html = [];
                            $.each(files, function (i, url) {
                                var full = Fast.api.cdnurl(url);
                                if (/\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(url)) {
                                    html.push('<a href="' + full + '" target="_blank" title="查看附件"><img src="' + full + '" style="max-height:28px;max-width:28px;margin-right:2px;border-radius:2px;"></a>');
                                } else {
                                    html.push('<a href="' + full + '" target="_blank" title="查看附件" style="margin-right:4px;"><i class="fa fa-paperclip"></i></a>');
                                }
                            });
                            return html.join('') || '-';
                        }
                    },
                    {
                        field: 'pay_count', title: '付款记录', operate: false, align: 'center',
                        formatter: function (value, row) {
                            var n = parseInt(value, 10) || 0;
                            var text = n > 0 ? (n + '笔') : '查看';
                            var cls = n > 0 ? 'btn-success' : 'btn-default';
                            return '<a href="javascript:;" class="btn btn-xs ' + cls + ' btn-dialog" data-url="purchase/opcost/payrecords?ids=' + row.id + '" title="付款记录" data-area=\'["92%","90%"]\'><i class="fa fa-list"></i> ' + text + '</a>';
                        }
                    },
                    {field: 'admin_name', title: '提交人', operate: false},
                    {field: 'remark', title: '备注', operate: 'LIKE', formatter: Table.api.formatter.content},
                    {field: 'createtime', title: '创建时间', operate: 'RANGE', addclass: 'datetimerange', autocomplete: false, formatter: Table.api.formatter.datetime},
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate,
                        buttons: [{
                            name: 'pay',
                            text: '付款',
                            title: '付款',
                            classname: 'btn btn-xs btn-info btn-dialog',
                            icon: 'fa fa-rmb',
                            url: 'purchase/opcost/pay',
                            extend: 'data-area=\'["720px","780px"]\'',
                            visible: function (row) {
                                return parseFloat(row.amount_unpaid) > 0 && !!Config.canPay;
                            }
                        }],
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
        },
        add: function () {
            Controller.api.bindevent();
            var $sel = $('#c-expense_name');
            if ($sel.data('selectpicker')) {
                $sel.selectpicker('setStyle', 'btn-default');
                $sel.selectpicker('refresh');
            }
        },
        edit: function () {
            Controller.api.bindevent();
            var $sel = $('#c-expense_name');
            if ($sel.data('selectpicker')) {
                $sel.selectpicker('refresh');
            }
        },
        pay: function () {
            Controller.api.bindevent();
        },
        payrecords: function () {
            $(document).on('click', '.btn-refresh-pays', function () {
                location.reload();
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
