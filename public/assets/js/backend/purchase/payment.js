define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {
    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/payment/index' + location.search,
                    add_url: 'purchase/payment/add',
                    table: 'purchase_payment',
                }
            });
            var table = $("#table");
            var updateStatusTabs = function (counts) {
                counts = counts || {};
                var todoKeys = {pending: 1};
                $('.panel-heading .nav-tabs a[data-label]').each(function () {
                    var $a = $(this);
                    var key = $a.data('value');
                    if (key === '' || key === undefined || key === null) {
                        key = 'all';
                    }
                    var n = parseInt(counts[key], 10);
                    if (isNaN(n)) {
                        n = 0;
                    }
                    var badgeClass = 'badge';
                    if (todoKeys[key] && n > 0) {
                        badgeClass += ' badge-todo';
                    }
                    $a.html($a.data('label') + ' <span class="' + badgeClass + '">' + n + '</span>');
                });
            };
            var fmtAmt = function (n) {
                n = parseFloat(n);
                if (isNaN(n)) {
                    n = 0;
                }
                return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            };
            var renderTodayPanel = function ($box, data, opts) {
                opts = opts || {};
                if (!$box || !$box.length) {
                    return;
                }
                data = data || {};
                var items = data.items || [];
                var dateTip = data.date || '';
                var title = opts.title || '今日合计';
                var icon = opts.icon || 'fa-calendar-check-o';
                var tip = opts.tip || '';
                var emptyText = opts.empty || '暂无记录';
                var hdLeft = '<span><i class="fa ' + icon + '"></i> ' + Fast.api.escape(title)
                    + (dateTip ? (' <span class="pay-today-date">' + Fast.api.escape(dateTip) + '</span>') : '')
                    + (tip ? ('<span class="pay-today-sub">' + Fast.api.escape(tip) + '</span>') : '')
                    + '</span>';
                if (!items.length) {
                    $box.html(
                        '<div class="pay-today-hd">' + hdLeft + '</div>'
                        + '<div class="pay-today-empty">' + Fast.api.escape(emptyText) + '</div>'
                    );
                    return;
                }
                var html = '<div class="pay-today-hd">'
                    + hdLeft
                    + '<span class="pay-today-total">共 <strong>' + (data.total_count || 0) + '</strong> 笔，'
                    + '合计 <strong class="amt">' + fmtAmt(data.total_amount || data.total_text) + '</strong></span>'
                    + '</div><div class="pay-today-list">';
                $.each(items, function (i, it) {
                    html += '<div class="pay-today-item">'
                        + '<span class="name">' + Fast.api.escape(it.buyer_name || '-') + '</span>'
                        + '<span class="meta">' + (it.count || 0) + ' 笔</span>'
                        + '<span class="amt">' + fmtAmt(it.amount) + '</span>'
                        + '</div>';
                });
                html += '</div>';
                $box.html(html);
            };
            var renderTodayBuyerSubmit = function (extend) {
                extend = extend || {};
                var applyData = extend.todayApply || {};
                var paidData = extend.todayPaid || extend.todayBuyerSubmit || {};
                renderTodayPanel($('#pay-today-apply'), applyData, {
                    title: '今日申请',
                    icon: 'fa-paper-plane',
                    tip: '按提交日 · 待审批/已审批',
                    empty: '今天暂无待审批/已审批申请'
                });
                renderTodayPanel($('#pay-today-paid'), paidData, {
                    title: '今日付款',
                    icon: 'fa-calendar-check-o',
                    tip: '按付款单日期 · 已付款',
                    empty: '今天付款单日期暂无已付款记录'
                });
            };
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                // 不用插件固定列（与横向滚动条叠加会错位），改用 CSS sticky 钉住操作列
                fixedColumns: false,
                responseHandler: function (res) {
                    if (res && res.extend && res.extend.statusCount) {
                        updateStatusTabs(res.extend.statusCount);
                    }
                    if (res && res.extend) {
                        renderTodayBuyerSubmit(res.extend);
                    }
                    return res;
                },
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: __('Id')},
                    {field: 'plan.sn', title: '合同编号 / 供应商', operate: 'LIKE', sortable: false, width: 230,
                        formatter: function (value, row) {
                            var contractNo = value ? String(value) : '-';
                            var factory = row && row.factory_name ? String(row.factory_name) : '-';
                            return '<div class="payment-contract-factory-cell">'
                                + '<div class="payment-contract-line" title="' + Fast.api.escape(contractNo) + '">' + Fast.api.escape(contractNo) + '</div>'
                                + '<div class="payment-factory-line" title="' + Fast.api.escape(factory) + '">' + Fast.api.escape(factory) + '</div>'
                                + '</div>';
                        }
                    },
                    {field: 'buyer_name', title: '采购人', operate: 'LIKE', sortable: false},
                    {
                        field: 'payee_account_text', title: '收款账户', operate: 'LIKE', sortable: false,
                        cellStyle: function () {
                            return {css: {'white-space': 'normal', 'vertical-align': 'middle'}};
                        },
                        formatter: function (value, row) {
                            var bank = $.trim((row && row.payee_bank_name) || '');
                            var name = $.trim((row && row.payee_bank_account_name) || '');
                            var acc = $.trim((row && row.payee_bank_account) || '');
                            if (!bank && !name && !acc && value) {
                                var parts = String(value).split(/\s*\/\s*/);
                                bank = $.trim(parts[0] || '');
                                name = $.trim(parts[1] || '');
                                acc = $.trim(parts.slice(2).join(' / ') || '');
                            }
                            if (!bank && !name && !acc) {
                                return '<span class="text-muted">-</span>';
                            }
                            var html = '<div class="payee-account-cell" title="' + Fast.api.escape(String(value || [bank, name, acc].filter(Boolean).join(' / '))) + '">';
                            if (bank) {
                                html += '<div class="payee-bank">' + Fast.api.escape(bank) + '</div>';
                            }
                            if (name) {
                                html += '<div class="payee-name">' + Fast.api.escape(name) + '</div>';
                            }
                            if (acc) {
                                html += '<div class="payee-no">' + Fast.api.escape(acc) + '</div>';
                            }
                            html += '</div>';
                            return html;
                        }
                    },
                    {field: 'amount', title: '金额'},
                    {
                        field: 'pay_term_text', title: '付款账期', operate: false, sortable: false, width: 148,
                        cellStyle: function () {
                            return {css: {'white-space': 'normal', 'vertical-align': 'middle', 'text-align': 'left'}};
                        },
                        formatter: function (value, row) {
                            var list = (row && row.pay_schedule) ? row.pay_schedule : [];
                            var html = '<div class="plan-term-cell">';
                            if (!list.length) {
                                html += '<div class="plan-term-line"><span class="d">-</span><span class="a"></span></div>';
                            } else {
                                $.each(list, function (i, s) {
                                    html += '<div class="plan-term-line">'
                                        + '<span class="d">' + Fast.api.escape((s && s.pay_date) ? s.pay_date : '-') + '</span>'
                                        + '<span class="a">' + Fast.api.escape((s && s.amount_text) ? s.amount_text : '') + '</span>'
                                        + '</div>';
                                });
                            }
                            html += '</div>';
                            return html;
                        }
                    },
                    {
                        field: 'pay_channel', title: '支付方式', operate: '=',
                        searchList: {"company_special": "对公支付", "self": "自行支付", "alipay": "企业支付宝"},
                        formatter: function (value, row) {
                            var map = {
                                company_special: '对公支付',
                                company_normal: '对公支付',
                                self: '自行支付',
                                alipay: '企业支付宝',
                                company: '对公支付'
                            };
                            var searchValue = value;
                            if (searchValue === 'company' || searchValue === 'company_normal' || searchValue === '' || searchValue == null) {
                                searchValue = 'company_special';
                            }
                            var text = row.pay_channel_text || map[value] || map[searchValue] || '对公支付';
                            var clsMap = {
                                company_special: 'primary',
                                company_normal: 'primary',
                                self: 'warning',
                                alipay: 'success',
                                company: 'primary'
                            };
                            var cls = clsMap[value] || clsMap[searchValue] || 'default';
                            var label = '<span class="label label-' + cls + '">' + Fast.api.escape(text) + '</span>';
                            return '<a href="javascript:;" class="searchit" data-toggle="tooltip" title="' +
                                Fast.api.escape('点击搜索 ' + text) +
                                '" data-field="pay_channel" data-value="' + Fast.api.escape(String(searchValue)) + '">' + label + '</a>';
                        }
                    },
                    {field: 'pay_date', title: '付款单日期', operate: 'RANGE', addclass: 'datetimerange', sortable: true,
                        formatter: function (value, row) {
                            // 仅已付款显示财务确认付款日
                            if (row && row.status === 'paid') {
                                var d = row.confirm_pay_date || value || '';
                                return d ? Fast.api.escape(String(d)) : '-';
                            }
                            return '<span class="text-muted">-</span>';
                        }
                    },
                    {field: 'status', title: '状态', searchList: {"pending":"待审批","approved":"已审批","paid":"已付款","rejected":"已驳回","cancelled":"已取消"}, formatter: Table.api.formatter.status},
                    {
                        field: 'plan_contract', title: '合同附件', operate: false, align: 'center',
                        formatter: function (value) {
                            var path = value ? String(value) : '';
                            var files = path.split(/[,，]/).map(function (s) { return $.trim(s); }).filter(Boolean);
                            if (!files.length) {
                                return '<span class="text-muted">-</span>';
                            }
                            var badge = files.length > 1 ? ('<sup class="pay-contract-n">' + files.length + '</sup>') : '';
                            var tip = files.length > 1 ? ('查看合同（' + files.length + '份）') : '查看合同';
                            return '<a href="javascript:;" class="pay-contract-icon btn-pay-contract-view" data-contract="' + Fast.api.escape(path) + '" title="' + tip + '">'
                                + '<i class="fa fa-file-text-o"></i>' + badge + '</a>';
                        }
                    },
                    {
                        field: 'voucher', title: '凭证', operate: false, formatter: function (value) {
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
                                html.push('<a href="' + full + '" target="_blank"><img src="' + full + '" style="max-height:30px;max-width:30px;margin-right:2px;"></a>');
                            });
                            return html.join('') || '-';
                        }
                    },
                    {field: 'createtime', title: '提交时间', operate: 'RANGE', addclass: 'datetimerange', formatter: Table.api.formatter.datetime},
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, clickToSelect: false,
                        class: 'col-payment-operate', align: 'left', halign: 'left',
                        buttons: [{
                            name: 'detail',
                            text: '明细',
                            title: '付款申请物品明细',
                            classname: 'btn btn-xs btn-info btn-dialog',
                            icon: 'fa fa-list',
                            url: 'purchase/payment/detail',
                            extend: 'data-area=\'["92%","80%"]\''
                        }, {
                            name: 'editcontract',
                            text: '编辑',
                            title: '编辑合同附件',
                            classname: 'btn btn-xs btn-success btn-dialog',
                            icon: 'fa fa-pencil',
                            url: 'purchase/payment/editcontract',
                            extend: 'data-area=\'["640px","480px"]\''
                        }, {
                            name: 'approve',
                            text: '同意',
                            title: '同意审批',
                            classname: 'btn btn-xs btn-primary btn-ajax',
                            icon: 'fa fa-check',
                            url: 'purchase/payment/approve',
                            confirm: '确认同意该付款申请？',
                            visible: function (row) {
                                return row.status === 'pending' && !!Config.canApprovePayment;
                            }
                        }, {
                            name: 'reject',
                            text: '驳回',
                            title: '驳回付款申请',
                            classname: 'btn btn-xs btn-danger btn-reject-pay',
                            icon: 'fa fa-times',
                            url: 'purchase/payment/reject',
                            extend: function (row) {
                                return 'data-id="' + (row.id || '') + '"';
                            },
                            visible: function (row) {
                                return row.status === 'pending' && !!Config.canRejectPayment;
                            }
                        }, {
                            name: 'confirm',
                            text: '确认',
                            title: '确认付款',
                            classname: 'btn btn-xs btn-success btn-dialog',
                            icon: 'fa fa-check',
                            url: 'purchase/payment/confirm',
                            extend: 'data-area=\'["720px","680px"]\'',
                            visible: function (row) {
                                return row.status === 'approved' && !!Config.canConfirmPayment;
                            }
                        }, {
                            name: 'unpay',
                            text: '撤付',
                            title: '撤销付款',
                            classname: 'btn btn-xs btn-warning btn-ajax',
                            icon: 'fa fa-undo',
                            url: 'purchase/payment/unpay',
                            confirm: '确认撤销该笔付款？撤销后将退回已审批，计划已付金额会回退，可重新确认或撤销审批。',
                            visible: function (row) {
                                return row.status === 'paid' && !!Config.canConfirmPayment;
                            }
                        }, {
                            name: 'revoke',
                            text: '撤审',
                            title: '撤销付款审批',
                            classname: 'btn btn-xs btn-warning btn-ajax',
                            icon: 'fa fa-undo',
                            url: 'purchase/payment/revoke',
                            confirm: '确认撤销该付款申请的审批？撤销后将退回待审批，可修改后重新提交。已付款的不能撤销。',
                            visible: function (row) {
                                if (row.status !== 'approved') {
                                    return false;
                                }
                                return Config.isSuperAdmin || !!Config.canRevokePayment;
                            }
                        }, {
                            name: 'resubmit',
                            text: '重提',
                            title: '修改并重新提交（仅已驳回）',
                            classname: 'btn btn-xs btn-warning btn-dialog',
                            icon: 'fa fa-edit',
                            url: 'purchase/payment/edit',
                            extend: 'data-area=\'["520px","420px"]\'',
                            visible: function (row) {
                                if (row.status !== 'rejected') {
                                    return false;
                                }
                                return Config.isSuperAdmin || parseInt(row.admin_id, 10) === parseInt(Config.adminId, 10);
                            }
                        }, {
                            name: 'withdraw',
                            text: '撤回',
                            title: '撤回并删除本笔待审批申请',
                            classname: 'btn btn-xs btn-warning btn-ajax',
                            icon: 'fa fa-undo',
                            url: 'purchase/payment/withdraw',
                            confirm: '确认撤回并删除该付款申请？撤回后可重新提交。',
                            visible: function (row) {
                                if (row.status !== 'pending') {
                                    return false;
                                }
                                return Config.isSuperAdmin || parseInt(row.admin_id, 10) === parseInt(Config.adminId, 10);
                            }
                        }],
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
            var formatMoney = function (n) {
                var v = parseFloat(n);
                if (isNaN(v)) {
                    v = 0;
                }
                return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            };
            var updateSelectedSum = function () {
                var rows = Table.api.selecteddata(table) || [];
                var sum = 0;
                rows.forEach(function (row) {
                    var amt = parseFloat(row.amount);
                    if (!isNaN(amt)) {
                        sum += amt;
                    }
                });
                sum = Math.round(sum * 100) / 100;
                $('#pay-selected-count').text(rows.length);
                $('#pay-selected-amount').text(formatMoney(sum));
                $('#pay-selected-sum').toggleClass('is-empty', rows.length === 0);
            };
            table.on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
                updateSelectedSum();
            });
            table.on('post-body.bs.table', function () {
                updateSelectedSum();
            });
            updateSelectedSum();
            $(document).off('click.payBatchConfirm', '.btn-batch-confirm').on('click.payBatchConfirm', '.btn-batch-confirm', function (e) {
                e.preventDefault();
                if (!Config.canConfirmPayment) {
                    Layer.msg('无确认付款权限');
                    return false;
                }
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                var rows = Table.api.selecteddata(table) || [];
                if (!rows.length) {
                    Layer.msg('请先勾选付款申请');
                    return false;
                }
                var ids = [];
                var skipped = [];
                rows.forEach(function (row) {
                    var id = parseInt(row.id, 10) || 0;
                    if (!id) {
                        return;
                    }
                    if (row.status !== 'approved') {
                        skipped.push((row.sn || ('#' + id)) + '（非已审批）');
                        return;
                    }
                    ids.push(id);
                });
                if (!ids.length) {
                    Layer.msg(skipped.length ? ('勾选的记录均不可确认：' + skipped.slice(0, 3).join('、')) : '没有可确认的付款申请');
                    return false;
                }
                Backend.api.open(
                    'purchase/payment/batchconfirm?ids=' + ids.join(','),
                    '批量确认付款（' + ids.length + '）',
                    {
                        area: ['920px', '88%'],
                        end: function () {
                            table.bootstrapTable('refresh');
                        }
                    }
                );
                return false;
            });
            $(document).off('click.payContractView', '.btn-pay-contract-view').on('click.payContractView', '.btn-pay-contract-view', function () {
                var exist = $(this).attr('data-contract') || '';
                var files = String(exist).split(/[,，]/).map(function (s) {
                    return $.trim(s);
                }).filter(Boolean);
                var html = '<div class="pay-contract-view-list">';
                files.forEach(function (p, i) {
                    var name = p.split('/').pop() || ('合同' + (i + 1));
                    try {
                        name = decodeURIComponent(name);
                    } catch (e) {
                    }
                    html += '<a class="pay-contract-view-item" href="' + Fast.api.cdnurl(p) + '" target="_blank">'
                        + '<i class="fa fa-file-text-o"></i><span>' + Fast.api.escape(name) + '</span><i class="fa fa-external-link"></i></a>';
                });
                html += '</div>';
                Layer.open({
                    type: 1,
                    title: '合同附件（' + files.length + '）',
                    area: ['480px', 'auto'],
                    maxHeight: 520,
                    btn: ['关闭'],
                    btnAlign: 'c',
                    content: html,
                    yes: function (index) {
                        Layer.close(index);
                    }
                });
            });
            var resolvePaymentId = function (el) {
                var $el = $(el);
                var id = parseInt($el.data('id'), 10) || 0;
                if (id > 0) {
                    return id;
                }
                var href = String($el.attr('href') || $el.data('url') || '');
                var m = href.match(/\/ids\/(\d+)/);
                if (m) {
                    return parseInt(m[1], 10) || 0;
                }
                var rowIndex = $el.data('rowIndex');
                if (rowIndex !== undefined && rowIndex !== null && rowIndex !== '') {
                    var rows = table.bootstrapTable('getData') || [];
                    var row = rows[rowIndex];
                    if (row && row.id) {
                        return parseInt(row.id, 10) || 0;
                    }
                }
                return 0;
            };
            $(document).off('click.payIndexReject', '.btn-reject-pay').on('click.payIndexReject', '.btn-reject-pay', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                var id = resolvePaymentId(this);
                if (!id) {
                    Layer.msg('未找到付款申请');
                    return false;
                }
                Layer.prompt({
                    title: '拒绝审批：请填写驳回说明',
                    formType: 2,
                    value: '',
                    area: ['420px', '180px']
                }, function (value, index) {
                    value = $.trim(value || '');
                    if (!value) {
                        Layer.msg('请填写驳回说明');
                        return;
                    }
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'purchase/payment/reject/ids/' + id,
                        data: {reject_remark: value}
                    }, function () {
                        table.bootstrapTable('refresh');
                        return false;
                    });
                });
                return false;
            });
            // 支持从经营统计等入口带 ?status= 打开并自动筛选
            (function syncStatusTabFromUrl() {
                var m = (location.search || '').match(/[?&]status=([^&]*)/);
                if (!m) {
                    return;
                }
                var st = decodeURIComponent(m[1] || '');
                if (!st) {
                    return;
                }
                var $tab = $('.panel-heading .nav-tabs a[data-toggle="tab"][data-value="' + st + '"]');
                if (!$tab.length) {
                    return;
                }
                $('.panel-heading .nav-tabs li').removeClass('active');
                $tab.parent().addClass('active');
                setTimeout(function () {
                    $tab.trigger('shown.bs.tab');
                }, 0);
            })();
        },
        add: function () {
            // 默认对公支付；可不强制改选
            if (!$('input[name="row[pay_channel]"]:checked').val()) {
                $('input[name="row[pay_channel]"]').first().prop('checked', true);
            }

            Form.api.bindevent($('#add-form'), function () {
                try {
                    parent.$('.btn-refresh').trigger('click');
                } catch (e) {
                }
                try {
                    var idx = parent.Layer.getFrameIndex(window.name);
                    parent.Layer.close(idx);
                } catch (e2) {
                }
                return false;
            });
            var dummyRatios = function (n) {
                n = parseInt(n, 10) || 1;
                if (n <= 1) {
                    return [100];
                }
                if (n === 2) {
                    return [50, 50];
                }
                return [34, 33, 33];
            };
            var splitEqualAmounts = function (total, n) {
                total = Math.round((parseFloat(total) || 0) * 100) / 100;
                n = parseInt(n, 10) || 1;
                if (n < 1) {
                    n = 1;
                }
                if (n > 3) {
                    n = 3;
                }
                var out = [];
                var allocated = 0;
                var each = Math.round(total / n * 100) / 100;
                for (var i = 0; i < n; i++) {
                    if (i === n - 1) {
                        out.push(Math.round((total - allocated) * 100) / 100);
                    } else {
                        out.push(each);
                        allocated = Math.round((allocated + each) * 100) / 100;
                    }
                }
                return out;
            };
            var fmt = function (n) {
                n = parseFloat(n);
                if (isNaN(n)) {
                    return '-';
                }
                return n.toFixed(2);
            };
            var today = function () {
                var d = new Date();
                var m = d.getMonth() + 1;
                var day = d.getDate();
                return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
            };
            var addDays = function (base, days) {
                var d = base ? new Date(base.replace(/-/g, '/')) : new Date();
                if (isNaN(d.getTime())) {
                    d = new Date();
                }
                d.setDate(d.getDate() + (days || 0));
                var m = d.getMonth() + 1;
                var day = d.getDate();
                return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
            };
            var termText = function (n) {
                n = parseInt(n, 10) || 1;
                if (n <= 1) {
                    return '分一期';
                }
                return n === 2 ? '分两期' : '分三期';
            };
            var buildSchedule = function (total, paid, dates, amounts, waive) {
                // amounts 为「净应付款」（总额−抹零）拆分；抹零不再计入已覆盖
                total = Math.round((parseFloat(total) || 0) * 100) / 100;
                paid = Math.round((parseFloat(paid) || 0) * 100) / 100;
                waive = Math.max(0, Math.round((parseFloat(waive) || 0) * 100) / 100);
                var netBase = Math.max(0, Math.round((total - waive) * 100) / 100);
                var unpaid = Math.max(0, Math.round((total - paid - waive) * 100) / 100);
                amounts = (amounts || []).map(function (a) {
                    return Math.round((parseFloat(a) || 0) * 100) / 100;
                });
                var n = amounts.length;
                if (!n) {
                    amounts = splitEqualAmounts(netBase, 1);
                    n = 1;
                }
                // 若传入的是合同毛额拆分，先扣掉抹零得到净额
                var amtSum = amounts.reduce(function (a, b) { return a + b; }, 0);
                amtSum = Math.round(amtSum * 100) / 100;
                if (waive > 0.001 && Math.abs(amtSum - total) <= 0.02 && Math.abs(amtSum - netBase) > 0.02) {
                    amounts = grossToNetAmounts(amounts, waive);
                }
                var ratios = dummyRatios(n);
                dates = dates || [];
                while (dates.length < n) {
                    dates.push(addDays(today(), dates.length * 30));
                }
                dates = dates.slice(0, n);
                var schedule = [];
                var remainPaid = paid;
                var amountParts = [];
                for (var i = 0; i < n; i++) {
                    var amount = amounts[i];
                    amountParts.push(amount);
                    var covered = 0;
                    var status = 'pending';
                    if (remainPaid >= amount - 0.001) {
                        covered = amount;
                        remainPaid = Math.round((remainPaid - amount) * 100) / 100;
                        status = 'paid';
                    } else if (remainPaid > 0.001) {
                        covered = remainPaid;
                        remainPaid = 0;
                        status = 'partial';
                    }
                    var due = Math.max(0, Math.round((amount - covered) * 100) / 100);
                    var label = n <= 1 ? '分一期（全款）' : ('第' + (i + 1) + '期');
                    schedule.push({
                        index: i + 1,
                        label: label,
                        ratio: ratios[i],
                        pay_date: dates[i] || addDays(today(), i * 30),
                        amount: amount,
                        paid: covered,
                        due: due,
                        status: status
                    });
                }
                var nextAmount = 0;
                var nextIndex = 0;
                var foundNext = false;
                for (var k = 0; k < schedule.length; k++) {
                    if (!foundNext && schedule[k].due > 0.001) {
                        nextAmount = schedule[k].due;
                        nextIndex = schedule[k].index;
                        foundNext = true;
                    }
                }
                var grossParts = netToGrossAmounts(amountParts, waive);
                return {
                    pay_term: n <= 1 ? 'full' : 'ratio',
                    pay_ratios: ratios.join('/'),
                    pay_dates: dates.join('/'),
                    // 回写计划仍用合同毛额拆分（合计=采购总额）
                    pay_amounts: grossParts.map(function (a) { return fmt(a); }).join('/'),
                    periods: n,
                    pay_term_text: termText(n),
                    total: total,
                    net_base: netBase,
                    paid: paid,
                    waive: waive,
                    unpaid: unpaid,
                    schedule: schedule,
                    suggest_amount: foundNext ? nextAmount : unpaid,
                    suggest_index: foundNext ? nextIndex : 0,
                    suggest_label: foundNext ? schedule[nextIndex - 1].label : '',
                    suggest_amount_text: fmt(foundNext ? nextAmount : unpaid),
                    suggest_pay_date: foundNext ? schedule[nextIndex - 1].pay_date : dates[0]
                };
            };
            var getNetBase = function () {
                var total = parseFloat($('#pay-schedule-wrap').attr('data-total')) || 0;
                var waive = Math.max(0, parseFloat($('#pay-schedule-wrap').attr('data-waive')) || 0);
                return Math.max(0, Math.round((total - waive) * 100) / 100);
            };
            var grossToNetAmounts = function (grossAmounts, waive) {
                var arr = (grossAmounts || []).map(function (a) {
                    return Math.round((parseFloat(a) || 0) * 100) / 100;
                });
                waive = Math.max(0, Math.round((parseFloat(waive) || 0) * 100) / 100);
                if (!arr.length || waive <= 0.001) {
                    return arr;
                }
                for (var i = arr.length - 1; i >= 0 && waive > 0.001; i--) {
                    var take = Math.min(arr[i], waive);
                    arr[i] = Math.round((arr[i] - take) * 100) / 100;
                    waive = Math.round((waive - take) * 100) / 100;
                }
                return arr;
            };
            var netToGrossAmounts = function (netAmounts, waive) {
                var arr = (netAmounts || []).map(function (a) {
                    return Math.round((parseFloat(a) || 0) * 100) / 100;
                });
                waive = Math.max(0, Math.round((parseFloat(waive) || 0) * 100) / 100);
                if (!arr.length) {
                    return arr;
                }
                if (waive > 0.001) {
                    arr[arr.length - 1] = Math.round((arr[arr.length - 1] + waive) * 100) / 100;
                }
                return arr;
            };
            var readDatesFromDom = function () {
                var dates = [];
                $('#pay-schedule-body tr:visible').each(function () {
                    dates.push($.trim($(this).find('.sch-date').val() || '') || today());
                });
                return dates;
            };
            var readAmountsFromDom = function () {
                var amounts = [];
                $('#pay-schedule-body tr:visible').each(function () {
                    var v = parseFloat($(this).find('.sch-amount').val());
                    if (!isNaN(v)) {
                        amounts.push(Math.round(v * 100) / 100);
                    }
                });
                return amounts;
            };
            var updateAmountSumTip = function (amounts, total) {
                total = Math.round((parseFloat(total) || 0) * 100) / 100;
                var sum = (amounts || []).reduce(function (a, b) {
                    return a + b;
                }, 0);
                sum = Math.round(sum * 100) / 100;
                $('.pay-amount-sum').text(fmt(sum));
                $('.pay-total-sum').text(fmt(total));
                $('.amount-sum-bad').toggle(Math.abs(sum - total) > 0.02);
            };
            var syncHidden = function (data) {
                $('#c-pay-ratios').val(data.pay_ratios || '');
                $('#c-pay-term').val(data.pay_term || 'full');
                $('#c-pay-dates').val(data.pay_dates || '');
                $('#c-pay-amounts').val(data.pay_amounts || '');
                if (data.suggest_pay_date) {
                    $('#c-pay-date').val(data.suggest_pay_date);
                }
                $('#info-pay-term').text(data.pay_term_text || '');
                if (data.suggest_label) {
                    $('#suggest-hint').text('建议本次：' + data.suggest_label + ' ' + (data.suggest_amount_text || fmt(data.suggest_amount)));
                } else {
                    $('#suggest-hint').text('');
                }
            };
            var renderRows = function (list) {
                var $body = $('#pay-schedule-body');
                $body.empty();
                $.each(list, function (i, sch) {
                    var due = parseFloat(sch.due) || 0;
                    var tr = '<tr data-index="' + (sch.index || (i + 1)) + '" data-due="' + due + '">' +
                        '<td><input type="date" class="form-control input-sm sch-date" value="' + (sch.pay_date || today()) + '"></td>' +
                        '<td class="sch-label">' + (sch.label || '') + '</td>' +
                        '<td><input type="number" class="form-control input-sm sch-amount" min="0" step="0.01" value="' + fmt(sch.amount) + '"></td>' +
                        '<td class="sch-paid">' + fmt(sch.paid) + '</td>' +
                        '<td class="sch-due ' + (due > 0 ? 'text-warning' : '') + '"><strong>' + fmt(due) + '</strong></td>' +
                        '<td class="sch-op">' + (due > 0.001
                            ? '<a href="javascript:;" class="btn btn-xs btn-info btn-fill-due" data-due="' + due + '" data-date="' + (sch.pay_date || '') + '">填入</a>'
                            : '-') + '</td>' +
                        '</tr>';
                    $body.append(tr);
                });
                updateAmountSumTip(list.map(function (s) {
                    return parseFloat(s.amount) || 0;
                }), getNetBase());
            };
            var setAmountCapped = function (suggest, payDate) {
                var remain = parseFloat($('#add-form').attr('data-remain-apply'));
                if (isNaN(remain)) {
                    remain = parseFloat($('#pay-schedule-wrap').attr('data-remain-apply')) || 0;
                }
                var amt = parseFloat(suggest) || 0;
                if (remain >= 0 && amt - remain > 0.001) {
                    amt = remain;
                }
                $('#c-amount').val(amt > 0 ? fmt(amt) : (remain > 0 ? fmt(remain) : ''));
                if (payDate) {
                    $('#c-pay-date').val(payDate);
                }
            };
            var refreshAmountsKeepDates = function (updateAmount) {
                var $wrap = $('#pay-schedule-wrap');
                var total = parseFloat($wrap.attr('data-total')) || 0;
                var paid = parseFloat($wrap.attr('data-paid')) || 0;
                var waive = parseFloat($wrap.attr('data-waive')) || 0;
                var dates = readDatesFromDom();
                var amounts = readAmountsFromDom();
                if (!amounts.length) {
                    return null;
                }
                var data = buildSchedule(total, paid, dates, amounts, waive);
                $('#pay-schedule-body tr').each(function (i) {
                    var sch = data.schedule[i];
                    if (!sch) {
                        return;
                    }
                    var due = parseFloat(sch.due) || 0;
                    $(this).attr('data-due', due).attr('data-index', sch.index);
                    $(this).find('.sch-label').text(sch.label);
                    $(this).find('.sch-paid').text(fmt(sch.paid));
                    $(this).find('.sch-due').toggleClass('text-warning', due > 0).html('<strong>' + fmt(due) + '</strong>');
                    $(this).find('.sch-op').html(due > 0.001
                        ? '<a href="javascript:;" class="btn btn-xs btn-info btn-fill-due" data-due="' + due + '" data-date="' + ($(this).find('.sch-date').val() || sch.pay_date || '') + '">填入</a>'
                        : '-');
                });
                data.pay_dates = readDatesFromDom().join('/');
                syncHidden(data);
                updateAmountSumTip(amounts, getNetBase());
                if (updateAmount !== false) {
                    setAmountCapped(data.suggest_amount, data.suggest_pay_date);
                }
                return data;
            };
            var applyPeriods = function (n, dates, updateAmount, amounts) {
                n = parseInt(n, 10) || 1;
                if (n < 1) {
                    n = 1;
                }
                if (n > 3) {
                    n = 3;
                }
                $('input[name="pay_periods"][value="' + n + '"]').prop('checked', true);
                dates = dates || [];
                while (dates.length < n) {
                    dates.push(addDays(today(), dates.length * 30));
                }
                dates = dates.slice(0, n);
                var $wrap = $('#pay-schedule-wrap');
                var total = parseFloat($wrap.attr('data-total')) || 0;
                var waive = parseFloat($wrap.attr('data-waive')) || 0;
                var netBase = Math.max(0, Math.round((total - waive) * 100) / 100);
                if (!amounts || amounts.length !== n) {
                    amounts = splitEqualAmounts(netBase, n);
                } else {
                    // 传入毛额时先转净额
                    var sumIn = amounts.reduce(function (a, b) { return a + b; }, 0);
                    sumIn = Math.round(sumIn * 100) / 100;
                    if (waive > 0.001 && Math.abs(sumIn - total) <= 0.02) {
                        amounts = grossToNetAmounts(amounts, waive);
                    }
                }
                var data = buildSchedule(
                    total,
                    parseFloat($wrap.attr('data-paid')) || 0,
                    dates,
                    amounts,
                    waive
                );
                renderRows(data.schedule);
                syncHidden(data);
                updateAmountSumTip(readAmountsFromDom(), netBase);
                if (updateAmount !== false) {
                    setAmountCapped(data.suggest_amount, data.suggest_pay_date);
                }
                $wrap.show();
                return data;
            };
            var buildPaymentOp = function (p) {
                var parts = [];
                if (parseInt(p.can_resubmit, 10)) {
                    parts.push('<a href="javascript:;" class="btn btn-xs btn-success btn-resubmit-pay" data-id="' + (p.id || 0) + '"><i class="fa fa-edit"></i> 编辑</a>');
                }
                if (parseInt(p.can_delete, 10)) {
                    parts.push('<a href="javascript:;" class="btn btn-xs btn-danger btn-delete-rejected-pay" data-id="' + (p.id || 0) + '" data-sn="' + Fast.api.escape(p.sn || '') + '"><i class="fa fa-trash"></i> 删除</a>');
                }
                if (parseInt(p.can_withdraw, 10)) {
                    parts.push('<a href="javascript:;" class="btn btn-xs btn-warning btn-withdraw-pay" data-id="' + (p.id || 0) + '" data-sn="' + Fast.api.escape(p.sn || '') + '"><i class="fa fa-undo"></i> 撤销</a>');
                }
                return parts.length ? parts.join(' ') : '<span class="text-muted">-</span>';
            };
            var fillPaymentList = function (data) {
                var list = (data && data.payment_list) ? data.payment_list : [];
                var $body = $('#payment-list-body');
                $body.empty();
                if (!list.length) {
                    $('#payment-list-empty').show();
                    $('#payment-list-table-wrap').hide();
                } else {
                    $('#payment-list-empty').hide();
                    $('#payment-list-table-wrap').show();
                    list.forEach(function (p) {
                        $body.append(
                            '<tr data-id="' + (p.id || 0) + '">' +
                            '<td>' + Fast.api.escape(p.sn || '') + '</td>' +
                            '<td class="text-danger">' + Fast.api.escape(p.amount_text || fmt(p.amount)) + '</td>' +
                            '<td>' + Fast.api.escape(p.pay_channel_text || ({company_special:'对公支付',company_normal:'对公支付',self:'自行支付',alipay:'企业支付宝',company:'对公支付'}[p.pay_channel] || '对公支付')) + '</td>' +
                            '<td>' + Fast.api.escape(p.status_text || p.status || '') + '</td>' +
                            '<td>' + Fast.api.escape((p.status === 'paid' && p.pay_date) ? p.pay_date : '-') + '</td>' +
                            '<td>' + Fast.api.escape(p.admin_name || '-') + '</td>' +
                            '<td>' + Fast.api.escape(p.createtime || '-') + '</td>' +
                            '<td>' + buildPaymentOp(p) + '</td>' +
                            '</tr>'
                        );
                    });
                }
                var appliedText = (data && (data.applied_amount_text != null)) ? data.applied_amount_text : fmt((data && data.applied_amount) || 0);
                var remainText = (data && (data.remain_apply_text != null)) ? data.remain_apply_text : fmt((data && data.remain_apply) || 0);
                var remain = parseFloat((data && data.remain_apply) != null ? data.remain_apply : 0) || 0;
                var applied = parseFloat((data && data.applied_amount) != null ? data.applied_amount : 0) || 0;
                var total = parseFloat((data && data.total_amount) != null ? data.total_amount : 0) || 0;
                if (appliedText === '-') {
                    appliedText = '0.00';
                }
                if (remainText === '-') {
                    remainText = '0.00';
                }
                $('#info-applied').text(appliedText);
                $('#info-remain-apply').text(remainText);
                $('#info-remain-apply-2').text(remainText);
                $('#add-form')
                    .attr('data-remain-apply', remain)
                    .attr('data-applied', applied)
                    .attr('data-total', total);
                if (data && data.id) {
                    $('#add-form').attr('data-plan-id', data.id);
                }
                $('#pay-schedule-wrap').attr('data-remain-apply', remain);
                $('#c-amount').attr('max', remain > 0 ? remain.toFixed(2) : '0');
                if (data) {
                    $('#payment-list-wrap').show();
                } else {
                    $('#payment-list-wrap').hide();
                }
            };
            var fillPlanInfo = function (data) {
                if (!data) {
                    $('#plan-info-wrap').hide();
                    $('#payee-account-wrap').hide();
                    $('#c-factory_account_id').empty();
                    fillPaymentList(null);
                    return;
                }
                fillPaymentList(data);
                var snLabel = Fast.api.escape(data.sn || '');
                if (data.title) {
                    snLabel += ' / ' + Fast.api.escape(data.title);
                }
                $('#pay-plan-sn-label').html(snLabel ? ('<strong>' + snLabel + '</strong>') : '');
                $('#info-buyer').text(data.buyer_name || '-');
                $('#info-date').text(data.purchase_date || '-');
                $('#info-total').text(data.total_amount_text || data.total_amount || '-');
                $('#info-paid').text(data.paid_amount_text || data.paid_amount || '-');
                $('#info-unpaid').text(data.unpaid_amount_text || data.unpaid_amount || '-');
                $('#info-waive').text(data.waive_amount_text || data.waive_amount || '0.00');
                var remark = $.trim(data.waive_remark || '');
                var $wr = $('#info-waive-remark');
                if (remark) {
                    $wr.text('说明：' + remark).show();
                } else {
                    $wr.text('').hide();
                }
                $('#btn-waive-settle').data('remark', remark);
                var canWaive = parseInt(data.can_waive, 10) === 1;
                var waiveAmt = parseFloat(data.waive_amount) || 0;
                $('#btn-waive-settle').toggle(canWaive);
                $('#btn-waive-clear').toggle(waiveAmt > 0.001);
                $('#info-factory').text(data.factory_name || '-');
                $('#info-tax-no').text(data.factory_tax_no || '-');
                if ($('#info-pay-term').length) {
                    $('#info-pay-term').text(data.pay_term_text || '-');
                }
                var $acc = $('#c-factory_account_id');
                $acc.empty();
                var accounts = data.factory_accounts || [];
                if (accounts.length) {
                    accounts.forEach(function (a) {
                        var opt = $('<option></option>')
                            .val(a.id || 0)
                            .text(a.label || '')
                            .attr('data-tax-no', a.tax_no || '');
                        if (a.is_default) {
                            opt.prop('selected', true);
                        }
                        $acc.append(opt);
                    });
                    $('#payee-account-wrap').show();
                    var $sel = $acc.find('option:selected');
                    if ($sel.length && $sel.attr('data-tax-no')) {
                        $('#info-tax-no').text($sel.attr('data-tax-no') || '-');
                    }
                } else {
                    $('#payee-account-wrap').hide();
                }
                $('#pay-schedule-wrap')
                    .attr('data-total', data.total_amount != null ? data.total_amount : 0)
                    .attr('data-paid', data.paid_amount != null ? data.paid_amount : 0)
                    .attr('data-waive', data.waive_amount != null ? data.waive_amount : 0)
                    .attr('data-remain-apply', data.remain_apply != null ? data.remain_apply : 0);
                var list = data.pay_schedule || [];
                var dates = list.length ? list.map(function (s) {
                    return s.pay_date || '';
                }) : [];
                if ((!dates.join('') || !dates.length) && data.pay_dates) {
                    dates = String(data.pay_dates).split(/[\/,]/);
                }
                var amounts = [];
                if (data.pay_amounts) {
                    amounts = String(data.pay_amounts).split(/[\/,]/).map(function (x) {
                        return parseFloat(x);
                    }).filter(function (x) {
                        return !isNaN(x);
                    });
                } else if (list.length) {
                    amounts = list.map(function (s) {
                        return parseFloat(s.amount);
                    }).filter(function (x) {
                        return !isNaN(x);
                    });
                }
                var n = amounts.length || list.length || parseInt(data.periods, 10) || 1;
                applyPeriods(n, dates, true, amounts.length === n ? amounts : null);
                var remain = parseFloat(data.remain_apply) || 0;
                var amt = parseFloat($('#c-amount').val()) || 0;
                if (amt - remain > 0.001) {
                    $('#c-amount').val(remain > 0 ? remain.toFixed(2) : '');
                }
                $('#plan-info-wrap').show();
            };
            var loadPlanInfo = function (planId) {
                planId = parseInt(planId, 10) || 0;
                if (!planId) {
                    fillPlanInfo(null);
                    return;
                }
                Backend.api.ajax({
                    url: 'purchase/payment/planinfo',
                    data: {plan_id: planId}
                }, function (data) {
                    fillPlanInfo(data);
                    return false;
                }, function () {
                    fillPlanInfo(null);
                    return false;
                });
            };

            $(document).off('change.payPeriods', 'input[name="pay_periods"]')
                .on('change.payPeriods', 'input[name="pay_periods"]', function () {
                    var n = parseInt($(this).val(), 10) || 1;
                    var oldDates = readDatesFromDom();
                    applyPeriods(n, oldDates, true);
                });
            $(document).off('change.payAcc', '#c-factory_account_id')
                .on('change.payAcc', '#c-factory_account_id', function () {
                    var tax = $(this).find('option:selected').attr('data-tax-no') || '';
                    $('#info-tax-no').text(tax || '-');
                });
            // 首屏已有账户时同步一次税号
            (function () {
                var $sel = $('#c-factory_account_id option:selected');
                if ($sel.length && $sel.attr('data-tax-no') !== undefined) {
                    var tax = $sel.attr('data-tax-no') || '';
                    if (tax) {
                        $('#info-tax-no').text(tax);
                    }
                }
            })();
            $(document).off('input.payAmount change.payAmount', '.sch-amount')
                .on('input.payAmount change.payAmount', '.sch-amount', function () {
                    refreshAmountsKeepDates(false);
                });
            $(document).off('change.payDate', '.sch-date').on('change.payDate', '.sch-date', function () {
                var dates = readDatesFromDom();
                $('#c-pay-dates').val(dates.join('/'));
                var $tr = $(this).closest('tr');
                $tr.find('.btn-fill-due').attr('data-date', $(this).val() || '');
            });
            $(document).off('click.payFillDue', '.btn-fill-due').on('click.payFillDue', '.btn-fill-due', function () {
                var due = parseFloat($(this).data('due'));
                var date = $(this).attr('data-date') || $(this).closest('tr').find('.sch-date').val() || today();
                var remain = parseFloat($('#add-form').attr('data-remain-apply')) || 0;
                if (!isNaN(due) && due > 0) {
                    var fill = Math.min(due, remain);
                    $('#c-amount').val(fill > 0 ? fill.toFixed(2) : '0');
                }
                $('#c-pay-date').val(date);
            });
            $('#add-form').on('submit.validate', function () {
                if (!$('input[name="row[pay_channel]"]:checked').val()) {
                    $('input[name="row[pay_channel]"]').first().prop('checked', true);
                }
                var dates = readDatesFromDom();
                for (var i = 0; i < dates.length; i++) {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(dates[i])) {
                        Toastr.error('请填写第' + (i + 1) + '期付款日期');
                        return false;
                    }
                }
                var scheduleTotal = getNetBase();
                var scheduleAmounts = readAmountsFromDom();
                var n = scheduleAmounts.length || dates.length || 1;
                if (scheduleAmounts.length) {
                    var amtSum = scheduleAmounts.reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    amtSum = Math.round(amtSum * 100) / 100;
                    if (Math.abs(amtSum - scheduleTotal) > 0.02) {
                        Toastr.error('各期应付款合计须等于可再申请净额（总额−抹零）' + scheduleTotal.toFixed(2) + '，当前为 ' + amtSum.toFixed(2));
                        return false;
                    }
                }
                var amount = parseFloat($('#c-amount').val());
                var remain = parseFloat($('#add-form').attr('data-remain-apply'));
                if (isNaN(remain)) {
                    remain = parseFloat($('#pay-schedule-wrap').attr('data-remain-apply')) || 0;
                }
                if (isNaN(amount) || amount <= 0) {
                    Toastr.error('请填写付款金额');
                    return false;
                }
                if (amount - remain > 0.001) {
                    Toastr.error('付款金额不能超过可再申请金额 ' + remain.toFixed(2) + '，请勿超额提交');
                    return false;
                }
                if (remain <= 0.001) {
                    Toastr.error('可再申请金额为 0，请勿超额提交');
                    return false;
                }
                $('#c-pay-ratios').val(dummyRatios(n).join('/'));
                $('#c-pay-term').val(n <= 1 ? 'full' : 'ratio');
                $('#c-pay-dates').val(dates.join('/'));
                if (scheduleAmounts.length) {
                    var waive = parseFloat($('#pay-schedule-wrap').attr('data-waive')) || 0;
                    var grossAmounts = netToGrossAmounts(scheduleAmounts, waive);
                    $('#c-pay-amounts').val(grossAmounts.map(function (a) {
                        return a.toFixed(2);
                    }).join('/'));
                }
                if (!$('#c-pay-date').val()) {
                    $('#c-pay-date').val(dates[0] || today());
                }
            });
            $(document).off('click.payWithdraw', '.btn-withdraw-pay').on('click.payWithdraw', '.btn-withdraw-pay', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var id = parseInt($(this).data('id'), 10) || 0;
                var sn = $(this).data('sn') || '';
                if (!id) {
                    return;
                }
                var planId = parseInt($('#add-form').attr('data-plan-id'), 10)
                    || parseInt($('input[name="row[plan_id]"]').val(), 10)
                    || parseInt($('#c-plan_id').val(), 10)
                    || 0;
                Layer.confirm('确认撤销删除付款申请' + (sn ? '「' + sn + '」' : '') + '？撤销后可重新提交。', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'purchase/payment/withdraw/ids/' + id
                    }, function () {
                        if (planId) {
                            loadPlanInfo(planId);
                        }
                        try {
                            parent.$('.btn-refresh').trigger('click');
                        } catch (err) {}
                        return false;
                    });
                });
            });
            $(document).off('click.payResubmit', '.btn-resubmit-pay').on('click.payResubmit', '.btn-resubmit-pay', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var id = parseInt($(this).data('id'), 10) || 0;
                if (!id) {
                    return;
                }
                var planId = parseInt($('#add-form').attr('data-plan-id'), 10)
                    || parseInt($('input[name="row[plan_id]"]').val(), 10)
                    || parseInt($('#c-plan_id').val(), 10)
                    || 0;
                Backend.api.open('purchase/payment/edit/ids/' + id, '修改并重新提交', {
                    area: ['520px', '420px'],
                    end: function () {
                        if (planId) {
                            loadPlanInfo(planId);
                        }
                        try {
                            parent.$('.btn-refresh').trigger('click');
                        } catch (err) {}
                    }
                });
            });
            $(document).off('click.payDeleteRejected', '.btn-delete-rejected-pay').on('click.payDeleteRejected', '.btn-delete-rejected-pay', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var id = parseInt($(this).data('id'), 10) || 0;
                var sn = $(this).data('sn') || '';
                if (!id) {
                    return;
                }
                var planId = parseInt($('#add-form').attr('data-plan-id'), 10)
                    || parseInt($('input[name="row[plan_id]"]').val(), 10)
                    || parseInt($('#c-plan_id').val(), 10)
                    || 0;
                Layer.confirm('确认删除已驳回的付款申请' + (sn ? '「' + sn + '」' : '') + '？', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'purchase/payment/withdraw/ids/' + id
                    }, function () {
                        if (planId) {
                            loadPlanInfo(planId);
                        }
                        try {
                            parent.$('.btn-refresh').trigger('click');
                        } catch (err) {}
                        return false;
                    });
                });
            });
            var currentPlanId = function () {
                return parseInt($('#add-form').attr('data-plan-id'), 10)
                    || parseInt($('input[name="row[plan_id]"]').val(), 10)
                    || parseInt($('#c-plan_id').val(), 10)
                    || 0;
            };
            var openWaiveForm = function (defaultAmt, existingRemark, onOk) {
                var remarkVal = Fast.api.escape(existingRemark || '');
                var html = '<div style="padding:14px 18px 6px;">'
                    + '<div class="form-group" style="margin-bottom:12px;">'
                    + '<label>抹零金额 <span class="text-danger">*</span></label>'
                    + '<input type="number" class="form-control" id="waive-amt-input" step="0.01" min="0" value="' + (defaultAmt || 0).toFixed(2) + '">'
                    + '</div>'
                    + '<div class="form-group" style="margin-bottom:8px;">'
                    + '<label>抹零说明</label>'
                    + '<textarea class="form-control" id="waive-remark-input" rows="3" placeholder="如：供应商抹零 / 优惠尾款">' + remarkVal + '</textarea>'
                    + '</div>'
                    + '<p class="help-block" style="margin:0;color:#888;font-size:12px;">记为无需再付，不产生付款流水；合同总额不变。</p>'
                    + '</div>';
                Layer.open({
                    type: 1,
                    title: '抹零平账',
                    area: ['440px', '340px'],
                    content: html,
                    btn: ['确定', '取消'],
                    yes: function (index) {
                        var amt = parseFloat($('#waive-amt-input').val());
                        if (isNaN(amt) || amt < 0) {
                            Layer.msg('请输入有效抹零金额');
                            return;
                        }
                        var remark = $.trim($('#waive-remark-input').val() || '');
                        Layer.close(index);
                        if (typeof onOk === 'function') {
                            onOk(amt, remark);
                        }
                    }
                });
            };
            var submitWaive = function (amount, remark) {
                var planId = currentPlanId();
                if (!planId) {
                    Toastr.error('未找到采购计划');
                    return;
                }
                Backend.api.ajax({
                    url: 'purchase/plan/waive/ids/' + planId,
                    data: {amount: amount, remark: remark || ''}
                }, function () {
                    loadPlanInfo(planId);
                    try {
                        parent.$('.btn-refresh').trigger('click');
                    } catch (err) {}
                    return false;
                });
            };
            $(document).off('click.payWaive', '#btn-waive-settle').on('click.payWaive', '#btn-waive-settle', function (e) {
                e.preventDefault();
                var total = parseFloat($('#pay-schedule-wrap').attr('data-total')) || 0;
                var paid = parseFloat($('#pay-schedule-wrap').attr('data-paid')) || 0;
                var defaultAmt = Math.max(0, Math.round((total - paid) * 100) / 100);
                if (defaultAmt <= 0.001) {
                    Toastr.info('当前已无需抹零');
                    return;
                }
                var existingRemark = String($(this).data('remark') || '');
                openWaiveForm(defaultAmt, existingRemark, function (amt, remark) {
                    submitWaive(amt, remark);
                });
            });
            $(document).off('click.payWaiveClear', '#btn-waive-clear').on('click.payWaiveClear', '#btn-waive-clear', function (e) {
                e.preventDefault();
                Layer.confirm('确认撤销抹零？撤销后未付将恢复。', function (index) {
                    Layer.close(index);
                    submitWaive(0, '');
                });
            });
            $('#c-plan_id').data('eSelect', function () {
                loadPlanInfo($('#c-plan_id').val());
            });
            $(document).on('change', '#c-plan_id', function () {
                loadPlanInfo($(this).val());
            });
            if ($('#c-plan_id').val()) {
                loadPlanInfo($('#c-plan_id').val());
            } else if ($('input[name="row[plan_id]"]').val()) {
                // 预载计划：从隐藏字段与接口补全
                var pid = $('input[name="row[plan_id]"]').val();
                var datesText = $('#c-pay-dates').val() || '';
                var amountsText = $('#c-pay-amounts').val() || '';
                var dates = datesText ? datesText.split(/[\/,]/) : [];
                var amounts = amountsText ? amountsText.split(/[\/,]/).map(function (x) {
                    return parseFloat(x);
                }).filter(function (x) {
                    return !isNaN(x);
                }) : [];
                if (amounts.length) {
                    applyPeriods(amounts.length, dates, !$('#c-amount').val(), amounts);
                } else {
                    loadPlanInfo(pid);
                }
            }
        },
        confirm: function () { Controller.api.bindevent(); },
        batchconfirm: function () {
            require(['upload'], function (Upload) {
                if ($('.faupload').length) {
                    Upload.api.upload($('.faupload'));
                }
            });
            Form.api.bindevent($('#batch-confirm-form'), function () {
                try {
                    parent.$('#table').bootstrapTable('refresh');
                } catch (e) {}
                try {
                    parent.$('.btn-refresh').trigger('click');
                } catch (e2) {}
                return true;
            });
        },
        batchadd: function () {
            var recalcSum = function () {
                var sum = 0;
                $('#batch-pay-form .batch-amt').each(function () {
                    var n = parseFloat($(this).val());
                    if (!isNaN(n)) {
                        sum += n;
                    }
                });
                $('#batch-sum-amount').text(sum.toFixed(2));
            };
            $(document).on('input change', '#batch-pay-form .batch-amt', recalcSum);
            recalcSum();
            if (!$('#batch-pay-form input[name="pay_channel"]:checked').val()) {
                $('#batch-pay-form input[name="pay_channel"]').first().prop('checked', true);
            }
            Form.api.bindevent($('#batch-pay-form'), function () {
                try {
                    parent.$('#table').bootstrapTable('refresh');
                } catch (e) {}
                try {
                    parent.$('.btn-refresh').trigger('click');
                } catch (e2) {}
                return true;
            }, null, function () {
                if (!$('#batch-pay-form input[name="pay_channel"]:checked').val()) {
                    $('#batch-pay-form input[name="pay_channel"]').first().prop('checked', true);
                }
                return true;
            });
        },
        editcontract: function () {
            require(['upload'], function (Upload) {
                if ($('.faupload').length) {
                    Upload.api.upload($('.faupload'));
                }
            });
            Form.api.bindevent($("#editcontract-form"), function () {
                try {
                    parent.$('.btn-refresh').trigger('click');
                } catch (e) {}
                try {
                    var idx = parent.Layer.getFrameIndex(window.name);
                    parent.Layer.close(idx);
                } catch (e2) {}
                return true;
            });
        },
        edit: function () {
            Form.api.bindevent($("#edit-form"), function () {
                try {
                    parent.$('.btn-refresh').trigger('click');
                } catch (e) {}
                try {
                    var idx = parent.Layer.getFrameIndex(window.name);
                    parent.Layer.close(idx);
                } catch (e2) {}
                return true;
            });
            if ($.fn.datetimepicker) {
                $('#c-pay_date').datetimepicker({
                    format: 'YYYY-MM-DD',
                    useCurrent: false,
                    showTodayButton: true
                });
            }
        },
        detail: function () {
            $(document).off('click.payDetailContract', '.btn-pay-detail-contract').on('click.payDetailContract', '.btn-pay-detail-contract', function () {
                var raw = $(this).attr('data-files') || '[]';
                var files = [];
                try {
                    files = JSON.parse(raw);
                } catch (e) {
                    files = [];
                }
                if (!$.isArray(files) || !files.length) {
                    Layer.msg('暂无合同附件');
                    return;
                }
                var html = '<div class="pay-contract-view-list">';
                files.forEach(function (p, i) {
                    p = String(p || '');
                    var name = p.split('/').pop() || ('合同' + (i + 1));
                    try {
                        name = decodeURIComponent(name);
                    } catch (e2) {
                    }
                    html += '<a class="pay-contract-view-item" href="' + Fast.api.cdnurl(p) + '" target="_blank">'
                        + '<i class="fa fa-file-text-o"></i><span>' + Fast.api.escape(name) + '</span><i class="fa fa-external-link"></i></a>';
                });
                html += '</div>';
                Layer.open({
                    type: 1,
                    title: '合同附件（' + files.length + '）',
                    area: ['480px', 'auto'],
                    maxHeight: 520,
                    btn: ['关闭'],
                    btnAlign: 'c',
                    content: html,
                    yes: function (index) {
                        Layer.close(index);
                    }
                });
            });
            $(document).off('click.payDetailApprove', '.btn-approve-payment').on('click.payDetailApprove', '.btn-approve-payment', function () {
                var $btn = $(this);
                var url = $btn.data('url');
                var confirmText = $btn.data('confirm') || '确认同意该付款申请？';
                if (!url) {
                    return;
                }
                Layer.confirm(confirmText, function (index) {
                    Layer.close(index);
                    Backend.api.ajax({url: url}, function () {
                        try {
                            parent.$('.btn-refresh').trigger('click');
                        } catch (e) {}
                        var frameIndex = parent.Layer.getFrameIndex(window.name);
                        parent.Layer.close(frameIndex);
                        return false;
                    });
                });
            });
            $(document).off('click.payDetailReject', '.btn-reject-payment').on('click.payDetailReject', '.btn-reject-payment', function () {
                var $btn = $(this);
                var id = parseInt($btn.data('id'), 10) || parseInt(Config.paymentId, 10) || 0;
                if (!id) {
                    var href = String($btn.attr('href') || $btn.data('url') || '');
                    var m = href.match(/\/ids\/(\d+)/);
                    id = m ? (parseInt(m[1], 10) || 0) : 0;
                }
                if (!id) {
                    Layer.msg('未找到付款申请');
                    return;
                }
                Layer.prompt({
                    title: '拒绝审批：请填写驳回说明',
                    formType: 2,
                    value: '',
                    area: ['420px', '180px']
                }, function (value, index) {
                    value = $.trim(value || '');
                    if (!value) {
                        Layer.msg('请填写驳回说明');
                        return;
                    }
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'purchase/payment/reject/ids/' + id,
                        data: {reject_remark: value}
                    }, function () {
                        try {
                            parent.$('.btn-refresh').trigger('click');
                        } catch (e) {}
                        var frameIndex = parent.Layer.getFrameIndex(window.name);
                        parent.Layer.close(frameIndex);
                        return false;
                    });
                });
            });
            $(document).off('click.payDetailWithdraw', '.btn-withdraw-payment').on('click.payDetailWithdraw', '.btn-withdraw-payment', function () {
                var id = $(this).data('id');
                if (!id) {
                    return;
                }
                Layer.confirm('确认撤销删除该付款申请？撤销后可重新提交。', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({url: 'purchase/payment/withdraw/ids/' + id}, function () {
                        try {
                            parent.$('.btn-refresh').trigger('click');
                        } catch (e) {}
                        var frameIndex = parent.Layer.getFrameIndex(window.name);
                        parent.Layer.close(frameIndex);
                        return false;
                    });
                });
            });
            $(document).off('click.payDetailRevoke', '.btn-revoke-payment').on('click.payDetailRevoke', '.btn-revoke-payment', function () {
                var id = $(this).data('id');
                if (!id) {
                    return;
                }
                Layer.confirm('确认撤销该付款申请的审批？撤销后将退回待审批，可修改后重新提交。', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({url: 'purchase/payment/revoke/ids/' + id}, function () {
                        try {
                            parent.$('.btn-refresh').trigger('click');
                        } catch (e) {}
                        var frameIndex = parent.Layer.getFrameIndex(window.name);
                        parent.Layer.close(frameIndex);
                        return false;
                    });
                });
            });
            $(document).off('click.payDetailUnpay', '.btn-unpay-payment').on('click.payDetailUnpay', '.btn-unpay-payment', function () {
                var id = $(this).data('id');
                if (!id) {
                    return;
                }
                Layer.confirm('确认撤销该笔付款？撤销后将退回已审批，计划已付金额会回退。', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({url: 'purchase/payment/unpay/ids/' + id}, function () {
                        try {
                            parent.$('.btn-refresh').trigger('click');
                            if (parent.parent && parent.parent.$) {
                                parent.parent.$('.btn-refresh-pays').trigger('click');
                            }
                        } catch (e) {}
                        var frameIndex = parent.Layer.getFrameIndex(window.name);
                        parent.Layer.close(frameIndex);
                        return false;
                    });
                });
            });
        },
        api: { bindevent: function () { Form.api.bindevent($("form[role=form]")); } }
    };
    return Controller;
});
