define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'trade/customer_quote/index' + location.search,
                    add_url: '',
                    edit_url: 'trade/customer_quote/edit',
                    del_url: 'trade/customer_quote/del',
                    multi_url: 'trade/customer_quote/multi',
                    table: 'customer_quote',
                }
            });

            var table = $("#table");

            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                escape: false,
                fixedColumns: true,
                fixedRightNumber: 1,
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: __('Id')},
                        {field: 'sn', title: '报价单号', operate: 'LIKE'},
                        {field: 'customer.name', title: '客户', operate: false},
                        {field: 'inquiry.sn', title: '询价单', operate: false},
                        {field: 'currency', title: '币种', operate: 'LIKE'},
                        {field: 'profit_rate', title: '利润%', operate: 'BETWEEN'},
                        {field: 'total_amount', title: '总金额', operate: 'BETWEEN'},
                        {field: 'status', title: '状态', searchList: {"draft":"草稿","sent":"已发送","done":"完成"}, formatter: Table.api.formatter.status},
                        {field: 'createtime', title: __('Createtime'), operate: 'RANGE', addclass: 'datetimerange', formatter: Table.api.formatter.datetime},
                        {
                            field: 'operate',
                            title: __('Operate'),
                            table: table,
                            events: Table.api.events.operate,
                            buttons: [
                                {
                                    name: 'detail',
                                    text: '处理',
                                    title: '报价单详情',
                                    classname: 'btn btn-xs btn-info btn-dialog',
                                    icon: 'fa fa-list',
                                    url: 'trade/customer_quote/detail',
                                    extend: 'data-area=\'["95%","95%"]\''
                                },
                                {
                                    name: 'export',
                                    text: '导出',
                                    classname: 'btn btn-xs btn-success',
                                    icon: 'fa fa-download',
                                    url: 'trade/customer_quote/export',
                                    extend: 'target="_blank"'
                                }
                            ],
                            formatter: Table.api.formatter.operate
                        }
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
        detail: function () {
            var quoteId = $('.btn-group[data-quote-id]').data('quote-id');

            var recalcRowAmount = function ($tr) {
                var qty = parseFloat($tr.find('.item-qty').val()) || 0;
                var sell = parseFloat($tr.find('.item-sell').val()) || 0;
                var amount = (qty * sell).toFixed(2);
                $tr.find('.item-amount').text(amount);
                Controller.api.refreshTotal();
            };

            $(document).on('input change', '.item-qty, .item-sell', function () {
                recalcRowAmount($(this).closest('tr'));
            });

            $(document).on('click', '.btn-save-items', function () {
                Backend.api.ajax({
                    url: 'trade/customer_quote/saveitems/ids/' + quoteId,
                    data: $('#quote-items-form').serialize()
                }, function (data, ret) {
                    Layer.msg(ret.msg);
                    setTimeout(function () {
                        location.reload();
                    }, 600);
                    return false;
                });
            });

            $(document).on('click', '.btn-recalc', function () {
                var rate = $('#profit-rate').val();
                Layer.confirm('确认按利润加点 ' + rate + '% 从工厂价重算全部卖价？', function (index) {
                    Backend.api.ajax({
                        url: 'trade/customer_quote/recalc/ids/' + quoteId,
                        data: {profit_rate: rate}
                    }, function () {
                        Layer.close(index);
                        location.reload();
                        return false;
                    });
                });
            });

            $(document).on('click', '.btn-set-status', function () {
                var status = $(this).data('status');
                Backend.api.ajax({
                    url: 'trade/customer_quote/setstatus/ids/' + quoteId,
                    data: {status: status}
                }, function () {
                    setTimeout(function () {
                        location.reload();
                    }, 500);
                    return false;
                });
            });

            $(document).on('click', '.btn-save-header', function () {
                Backend.api.ajax({
                    url: 'trade/customer_quote/edit/ids/' + quoteId,
                    data: {
                        'row[currency]': $('#currency').val(),
                        'row[profit_rate]': $('#profit-rate').val(),
                        'row[remark]': $('#remark').val()
                    }
                }, function () {
                    setTimeout(function () {
                        location.reload();
                    }, 500);
                    return false;
                });
            });

            $(document).on('click', '.btn-inquiry', function () {
                var id = $(this).data('id');
                if (id) {
                    Backend.api.open('trade/inquiry/detail?ids=' + id, '询价单详情', {area: ['95%', '95%']});
                }
            });
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            },
            refreshTotal: function () {
                var total = 0;
                $('.item-amount').each(function () {
                    total += parseFloat($(this).text()) || 0;
                });
                total = total.toFixed(2);
                $('#total-amount').text(total);
                $('#foot-total').text(total);
            }
        }
    };
    return Controller;
});
