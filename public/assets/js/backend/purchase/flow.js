define(['jquery', 'bootstrap', 'backend', 'table', 'form', 'echarts', 'echarts-theme'], function ($, undefined, Backend, Table, Form, Echarts, undefined) {
    var pieChart = null;
    var statsLoaded = false;

    var moneyCell = function (value, cls) {
        if (!value) {
            return '';
        }
        return '<span class="' + cls + '">' + Fast.api.escape(String(value)) + '</span>';
    };

    var renderList = function (items, $el, barClass) {
        if (!items || !items.length) {
            $el.html('<div class="empty">暂无数据</div>');
            return;
        }
        var html = [];
        $.each(items, function (i, row) {
            var pct = parseFloat(row.pct) || 0;
            html.push('<div class="row-item">');
            html.push('<div class="n" title="' + Fast.api.escape(row.name || '') + '">' + Fast.api.escape(row.name || '') + '</div>');
            html.push('<div class="bar ' + barClass + '"><i style="width:' + Math.min(100, pct) + '%"></i></div>');
            html.push('<div class="a">' + Fast.api.escape(row.amount || '0.00') + ' · ' + pct + '%</div>');
            html.push('</div>');
        });
        $el.html(html.join(''));
    };

    var renderTop = function (items, $el) {
        if (!items || !items.length) {
            $el.html('<div class="empty">暂无数据</div>');
            return;
        }
        var html = [];
        $.each(items, function (i, row) {
            html.push('<div class="item"><span class="nm">' + (i + 1) + '. ' + Fast.api.escape(row.name || '') +
                '</span><span class="am">' + Fast.api.escape(row.amount || '0.00') + '（' + (row.pct || 0) + '%）</span></div>');
        });
        $el.html(html.join(''));
    };

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/flow/index' + location.search,
                    add_url: 'purchase/flow/add',
                    edit_url: 'purchase/flow/edit',
                    del_url: 'purchase/flow/del',
                    multi_url: 'purchase/flow/multi',
                    table: 'finance_flow',
                }
            });
            var table = $("#table");
            var saveRemark = function (rowId, remark) {
                Backend.api.ajax({
                    url: 'purchase/flow/saveremark/ids/' + rowId,
                    data: {remark: remark}
                });
            };
            var fillKpi = function (ext) {
                if (!ext) {
                    return;
                }
                $('#kpi-income').text(ext.income || '0.00');
                $('#kpi-expense').text(ext.expense || '0.00');
                $('#kpi-balance').text(ext.balance || '0.00');
            };
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'pay_date',
                sortOrder: 'desc',
                fixedColumns: true,
                fixedRightNumber: 1,
                escape: false,
                queryParams: function (params) {
                    params.filter_year = $('#flow-year').val() || '0';
                    params.filter_month = $('#flow-month').val() || '0';
                    return params;
                },
                responseHandler: function (res) {
                    if (res && res.extend) {
                        fillKpi(res.extend);
                    }
                    return res;
                },
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: __('Id'), sortable: true, visible: false},
                    {field: 'month', title: '月', operate: false, sortable: false},
                    {field: 'pay_date', title: '日期', operate: 'RANGE', addclass: 'datetimerange', autocomplete: false, sortable: true},
                    {
                        field: 'flow_type', title: '收支', searchList: {"pay": "支出", "receive": "收入"},
                        formatter: function (value, row) {
                            var text = row.ie_text || (value === 'receive' ? '收入' : '支出');
                            return '<span class="' + (value === 'receive' ? 'text-info' : 'text-danger') + '">' + Fast.api.escape(text) + '</span>';
                        }
                    },
                    {field: 'expense_name', title: '类型', operate: 'LIKE'},
                    {
                        field: 'summary', title: '摘要', operate: false,
                        formatter: function (value) {
                            return Fast.api.escape(value || '-');
                        }
                    },
                    {
                        field: 'amount', title: '金额', operate: 'BETWEEN', sortable: true,
                        formatter: function (value, row) {
                            var amt = parseFloat(value);
                            if (isNaN(amt)) {
                                amt = 0;
                            }
                            var isIn = (row && row.flow_type === 'receive') || amt > 0;
                            var abs = Math.abs(amt).toFixed(2);
                            if (isIn) {
                                return '<span class="text-danger" style="font-variant-numeric:tabular-nums;font-weight:600;">'
                                    + Fast.api.escape(abs) + '</span>';
                            }
                            return '<span class="text-success" style="font-variant-numeric:tabular-nums;font-weight:600;">'
                                + '-' + Fast.api.escape(abs) + '</span>';
                        }
                    },
                    {
                        field: 'balance', title: '账户结余', operate: false, sortable: false,
                        formatter: function (value) {
                            return moneyCell(value, 'text-success');
                        }
                    },
                    {
                        field: 'remark', title: '备注', operate: 'LIKE', clickToSelect: false,
                        formatter: function (value, row) {
                            var v = value || '';
                            return '<input type="text" class="form-control input-sm fld-flow-remark" data-id="' + row.id + '" ' +
                                'value="' + Fast.api.escape(v) + '" style="min-width:120px;" placeholder="备注">';
                        }
                    },
                    {
                        field: 'voucher', title: '凭证', operate: false,
                        formatter: function (value) {
                            if (!value) {
                                return '-';
                            }
                            var html = [];
                            $.each(String(value).split(','), function (i, url) {
                                url = $.trim(url);
                                if (!url) {
                                    return;
                                }
                                var full = Fast.api.cdnurl(url);
                                html.push('<a href="' + full + '" target="_blank"><img src="' + full + '" style="max-height:28px;max-width:28px;margin-right:2px;"></a>');
                            });
                            return html.join('') || '-';
                        }
                    },
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate,
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
            $(document).off('blur.flowRemark', '.fld-flow-remark').on('blur.flowRemark', '.fld-flow-remark', function () {
                var id = $(this).data('id');
                var remark = $.trim($(this).val() || '');
                if (!id) {
                    return;
                }
                saveRemark(id, remark);
            });
            $(document).off('change.flowPeriod', '#flow-year,#flow-month').on('change.flowPeriod', '#flow-year,#flow-month', function () {
                statsLoaded = false;
                table.bootstrapTable('refresh');
                if ($('#tab-stats').hasClass('active')) {
                    Controller.api.loadStats();
                }
            });
            $('a[href="#tab-stats"]').on('shown.bs.tab', function () {
                Controller.api.loadStats();
            });
            $(document).off('click.flowExport', '.btn-export').on('click.flowExport', '.btn-export', function () {
                var ids = Table.api.selectedids(table);
                var url = Fast.api.fixurl('purchase/flow/export')
                    + '?filter_year=' + encodeURIComponent($('#flow-year').val() || '0')
                    + '&filter_month=' + encodeURIComponent($('#flow-month').val() || '0');
                if (ids.length) {
                    url += '&ids=' + ids.join(',');
                }
                window.open(url, '_blank');
            });
        },
        add: function () {
            Controller.api.bindevent();
        },
        edit: function () {
            Controller.api.bindevent();
        },
        expensenames: function () {
            Form.api.bindevent($("form[role=form]"));
        },
        api: {
            loadStats: function () {
                Backend.api.ajax({
                    url: 'purchase/flow/stats',
                    data: {
                        filter_year: $('#flow-year').val() || '0',
                        filter_month: $('#flow-month').val() || '0'
                    }
                }, function (data) {
                    statsLoaded = true;
                    if (data) {
                        $('#kpi-income').text(data.income || '0.00');
                        $('#kpi-expense').text(data.expense || '0.00');
                        $('#kpi-balance').text(data.balance || '0.00');
                        renderTop(data.income_top, $('#top-income'));
                        renderTop(data.expense_top, $('#top-expense'));
                        renderTop(data.month_top, $('#top-month'));
                        renderList(data.income_dist, $('#dist-income'), 'is-in');
                        renderList(data.expense_dist, $('#dist-expense'), 'is-out');
                        renderList(data.month_dist, $('#dist-month'), 'is-out');
                        Controller.api.renderPie(data);
                    }
                    return false;
                });
            },
            renderPie: function (data) {
                var el = document.getElementById('flow-pie');
                if (!el || !Echarts) {
                    return;
                }
                if (!pieChart) {
                    pieChart = Echarts.init(el, 'walden');
                    $(window).on('resize.flowPie', function () {
                        if (pieChart) {
                            pieChart.resize();
                        }
                    });
                }
                var income = parseFloat(data.income_raw) || 0;
                var expense = parseFloat(data.expense_raw) || 0;
                var balance = parseFloat(data.balance_raw) || 0;
                var slices = [
                    {name: '收入', value: income, itemStyle: {color: '#3b82f6'}},
                    {name: '支出', value: expense, itemStyle: {color: '#f59e0b'}}
                ];
                if (balance >= 0) {
                    slices.push({name: '结余', value: balance, itemStyle: {color: '#22c55e'}});
                } else {
                    slices.push({name: '亏损', value: Math.abs(balance), itemStyle: {color: '#ef4444'}});
                }
                pieChart.setOption({
                    tooltip: {trigger: 'item', formatter: '{b}: {c} ({d}%)'},
                    legend: {bottom: 8},
                    series: [{
                        type: 'pie',
                        radius: ['42%', '68%'],
                        center: ['50%', '46%'],
                        label: {formatter: '{b}\n{d}%'},
                        data: slices
                    }]
                });
                pieChart.resize();
            },
            syncFlowType: function () {
                var type = $('input[name="row[flow_type]"]:checked').val() || 'pay';
                var $biz = $('#c-biz_type');
                var $unit = $('#c-pay_unit');
                if (type === 'receive') {
                    if (!$biz.val() || $biz.val() === '运营成本') {
                        $biz.val('客户回款');
                    }
                    $unit.attr('placeholder', '付款方 / 客户');
                } else {
                    if (!$biz.val() || $biz.val() === '客户回款') {
                        $biz.val('运营成本');
                    }
                    $unit.attr('placeholder', '收款方 / 支付单位');
                }
            },
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
                $(document).off('change.flowType', 'input[name="row[flow_type]"]').on('change.flowType', 'input[name="row[flow_type]"]', function () {
                    Controller.api.syncFlowType();
                });
                Controller.api.syncFlowType();
                var toggleCustomExpense = function () {
                    var $custom = $('#c-expense_name_custom');
                    var isCustom = $('#c-expense_name').val() === '__custom__';
                    if (isCustom) {
                        $custom.prop('disabled', false).attr('data-rule', 'required').show().focus();
                    } else {
                        $custom.prop('disabled', true).removeAttr('data-rule').val('').hide();
                        var $group = $custom.closest('.form-group');
                        $group.removeClass('has-error has-success');
                        $group.find('.help-block.with-errors, .msg-box').empty();
                    }
                };
                $(document).off('change.flowExpense', '#c-expense_name').on('change.flowExpense', '#c-expense_name', toggleCustomExpense);
                toggleCustomExpense();
            }
        }
    };
    return Controller;
});
