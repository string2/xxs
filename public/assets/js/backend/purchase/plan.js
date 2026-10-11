define(['jquery', 'bootstrap', 'backend', 'table', 'form', 'template', 'upload'], function ($, undefined, Backend, Table, Form, Template, Upload) {

    var initQuoteTableUi = function () {
        var fmtPrice = function (v) {
            var n = parseFloat(v);
            return isNaN(n) ? '' : n.toFixed(6).replace(/\.?0+$/, '');
        };
        var recalcRow = function (tr) {
            var qty = parseFloat(tr.data('qty'));
            if (isNaN(qty)) {
                qty = parseFloat(tr.find('.fld-qty').val());
            }
            var price = parseFloat(tr.find('.fld-price').val());
            var $amount = tr.find('.fld-amount');
            if (isNaN(qty) || isNaN(price)) {
                $amount.text('-');
            } else {
                $amount.text((qty * price).toFixed(2));
            }
            var $hist = tr.find('.fld-history-price');
            var hist = parseFloat($hist.attr('data-history'));
            if (!isNaN(hist) && hist > 0 && !isNaN(price) && price > hist) {
                $hist.css({color: '#dd4b39', fontWeight: '600'});
            } else if ($hist.length) {
                $hist.css({color: '', fontWeight: ''});
            }
        };
        var recalcSum = function () {
            var sumQty = 0;
            var sumAmount = 0;
            $('tr[data-uk]').each(function () {
                var tr = $(this);
                var qty = parseFloat(tr.data('qty'));
                if (isNaN(qty)) {
                    qty = parseFloat(tr.find('.fld-qty').val()) || 0;
                }
                var price = parseFloat(tr.find('.fld-price').val());
                sumQty += isNaN(qty) ? 0 : qty;
                if (!isNaN(qty) && !isNaN(price)) {
                    sumAmount += qty * price;
                }
            });
            $('#quote-sum-qty').text(Math.round(sumQty));
            $('#quote-sum-amount').text(sumAmount.toFixed(2));
        };
        $(document).off('input.quoteUi').on('input.quoteUi', '.fld-price', function () {
            recalcRow($(this).closest('tr'));
            recalcSum();
        });
        $(document).off('blur.quoteUi').on('blur.quoteUi', '.fld-price', function () {
            var $el = $(this);
            var p = fmtPrice($el.val());
            if (p !== '') {
                $el.val(p);
            }
            recalcRow($el.closest('tr'));
            recalcSum();
        });
        $(document).off('click.quoteUiImg').on('click.quoteUiImg', '.quote-img-preview, .quote-media .faupload-preview a.thumbnail', function (e) {
            var $a = $(this);
            var href = $a.attr('href') || '';
            var dataUrl = $a.data('url') || $a.find('img').attr('src') || '';
            var check = href + ' ' + dataUrl;
            if (!/\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(check) && !/^data:image\//i.test(href) && !dataUrl) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            var src = dataUrl || Fast.api.cdnurl(href);
            var L = (window.parent && window.parent !== window && parent.Layer) ? parent.Layer : Layer;
            L.photos({photos: {start: 0, data: [{src: src, thumb: src}]}, anim: 5});
        });
    };

    var refreshParentPlanTable = function () {
        try {
            if (parent.$ && parent.$('#table').length) {
                parent.$('#table').bootstrapTable('refresh');
                return true;
            }
            if (parent.$ && parent.$('.btn-refresh').length) {
                parent.$('.btn-refresh').trigger('click');
                return true;
            }
        } catch (e) {
        }
        return false;
    };

    var closeDialogAndRefreshParent = function () {
        setTimeout(function () {
            try {
                var frameIndex = parent.Layer.getFrameIndex(window.name);
                if (frameIndex) {
                    refreshParentPlanTable();
                    parent.Layer.close(frameIndex);
                    return;
                }
            } catch (e) {
            }
            location.reload();
        }, 500);
    };

    var bindRefreshParentOnClose = function () {
        $(window).off('unload.planRefreshParent').on('unload.planRefreshParent', function () {
            refreshParentPlanTable();
        });
    };

    var bindCellTextMore = function () {
        $(document).off('click.planCellMore', '.cell-text-more').on('click.planCellMore', '.cell-text-more', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var full = $(this).attr('data-full') || $.trim($(this).text() || '');
            if (!full || full === '-') {
                return;
            }
            var title = $(this).attr('data-label') || '备注';
            Layer.open({
                type: 1,
                title: title,
                area: ['560px', '380px'],
                shadeClose: true,
                content: '<div style="padding:16px;line-height:1.7;word-break:break-all;white-space:pre-wrap;">' + Fast.api.escape(full) + '</div>'
            });
        });
    };

    var bindQuoteForm = function (options) {
        options = options || {};
        var withApprove = !!options.withApprove;
        var planId = $('.btn-submit-plan').data('id');

        Form.events.plupload($('body'));
        Form.events.faselect($('body'));
        initQuoteTableUi();
        bindCellTextMore();

        // 同一合同共用供应商：改一行同步到空行
        $(document).off('blur.quoteFactoryEdit').on('blur.quoteFactoryEdit', '.fld-factory', function () {
            var name = $.trim($(this).val() || '');
            if (!name) {
                return;
            }
            $('tr[data-uk] .fld-factory').each(function () {
                if (!$.trim($(this).val() || '')) {
                    $(this).val(name);
                }
            });
        });

        $('.check-all').on('change', function () {
            $('.item-check').prop('checked', $(this).prop('checked'));
        });

        var saveRow = function (tr, reload) {
            var id = tr.data('id');
            return Backend.api.ajax({
                url: 'purchase/plan/saveitem/ids/' + id,
                data: {
                    qty: tr.find('.fld-qty').val(),
                    price: tr.find('.fld-price').val(),
                    description: tr.find('.fld-desc').val(),
                    factory_name: $.trim(tr.find('.fld-factory').val() || ''),
                    image: tr.find('.fld-image').val(),
                    contract: tr.find('.fld-contract').val()
                }
            }, function (data, ret) {
                var finish = function () {
                    if (reload !== false) {
                        Layer.msg(ret.msg || '已保存');
                        setTimeout(function () { location.reload(); }, 400);
                    }
                };
                if ($('#c-plan-contract').length && planId) {
                    Backend.api.ajax({
                        url: 'purchase/plan/savecontract/ids/' + planId,
                        data: {contract: $('#c-plan-contract').val()}
                    }, function () {
                        finish();
                        return false;
                    }, function () {
                        finish();
                        return false;
                    });
                } else {
                    finish();
                }
                return false;
            });
        };

        $(document).on('click', '.btn-close-plan', function () {
            var index = parent.Layer.getFrameIndex(window.name);
            parent.Layer.close(index);
            if (parent.$ && parent.$("#table").length) {
                parent.$("#table").bootstrapTable('refresh');
            }
        });

        $(document).on('click', '.btn-enter-packing-plan', function () {
            var pid = $(this).data('plan-id');
            if (!pid) {
                Layer.msg('计划ID无效');
                return;
            }
            Backend.api.open('purchase/container/planpacks?plan_id=' + pid, '打包信息', {area: ['95%', '85%']});
        });

        $(document).on('click', '.btn-save-item', function () {
            saveRow($(this).closest('tr'), true);
        });

        $(document).on('click', '.btn-save-all', function () {
            var rows = $('tr[data-id]');
            if (!rows.length) {
                Layer.msg('没有可保存的明细');
                return;
            }
            var planContract = $('#c-plan-contract').length ? $('#c-plan-contract').val() : null;
            var afterItems = function () {
                if (planContract === null || !planId) {
                    Layer.msg('全部已保存');
                    setTimeout(function () { location.reload(); }, 500);
                    return;
                }
                Backend.api.ajax({
                    url: 'purchase/plan/savecontract/ids/' + planId,
                    data: {contract: planContract}
                }, function () {
                    Layer.msg('全部已保存');
                    setTimeout(function () { location.reload(); }, 500);
                    return false;
                });
            };
            var i = 0;
            var next = function () {
                if (i >= rows.length) {
                    afterItems();
                    return;
                }
                var tr = $(rows[i++]);
                Backend.api.ajax({
                    url: 'purchase/plan/saveitem/ids/' + tr.data('id'),
                    data: {
                        qty: tr.find('.fld-qty').val(),
                        price: tr.find('.fld-price').val(),
                        description: tr.find('.fld-desc').val(),
                        factory_name: $.trim(tr.find('.fld-factory').val() || ''),
                        image: tr.find('.fld-image').val(),
                        contract: tr.find('.fld-contract').val()
                    }
                }, function () {
                    next();
                    return false;
                }, function () {
                    Layer.msg('第 ' + i + ' 行保存失败，已中止');
                    return false;
                });
            };
            next();
        });

        $(document).on('click', '.btn-submit-plan', function (e) {
            e.preventDefault();
            var $btn = $(this);
            // 详情/报价页用 data-id；列表操作列常见 data-ids
            var id = $btn.data('id') || $btn.data('ids') || $btn.attr('data-id') || $btn.attr('data-ids');
            id = parseInt(id, 10) || 0;
            if (!id) {
                Layer.msg('未找到计划ID');
                return false;
            }
            var defaultTerm = $btn.data('pay-term') || 'full';
            var defaultRatios = String($btn.data('pay-ratios') || '100');
            var planTotal = parseFloat($btn.data('total-amount') || $btn.attr('data-total-amount') || 0) || 0;
            var defaultContractNo = String($btn.data('sn') || $btn.attr('data-sn') || '').trim();
            // 系统自动生成的 PP… 不当作合同编号预填
            if (/^PP\d{14,}/.test(defaultContractNo)) {
                defaultContractNo = '';
            }
            if (!$('#submit-plan-payterm-tpl').length) {
                Layer.msg('提交模板未加载，请刷新页面后重试');
                return false;
            }
            var defaultParts = defaultRatios.replace(/%/g, '').split(/[\/,\-，、|]+/).map(function (x) {
                return parseInt($.trim(x), 10);
            }).filter(function (n) { return !isNaN(n) && n > 0; });
            var defaultPeriods = 1;
            if (defaultTerm === 'ratio' && defaultParts.length >= 2) {
                defaultPeriods = Math.min(3, defaultParts.length);
            } else if (defaultParts.length === 1 && defaultParts[0] === 100) {
                defaultPeriods = 1;
            }
            var paySch = {
                today: function () {
                    var d = new Date();
                    var m = d.getMonth() + 1;
                    var day = d.getDate();
                    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
                },
                addDays: function (base, days) {
                    var d = base ? new Date(base.replace(/-/g, '/')) : new Date();
                    if (isNaN(d.getTime())) {
                        d = new Date();
                    }
                    d.setDate(d.getDate() + (days || 0));
                    var m = d.getMonth() + 1;
                    var day = d.getDate();
                    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
                },
                fmt: function (n) {
                    n = parseFloat(n);
                    return isNaN(n) ? '0.00' : n.toFixed(2);
                },
                splitEqual: function (total, n) {
                    total = Math.round((parseFloat(total) || 0) * 100) / 100;
                    n = parseInt(n, 10) || 1;
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
                },
                dummyRatios: function (n) {
                    n = parseInt(n, 10) || 1;
                    if (n <= 1) {
                        return [100];
                    }
                    return n === 2 ? [50, 50] : [34, 33, 33];
                },
                readAmounts: function (layero) {
                    var amounts = [];
                    layero.find('.pay-period-row:visible').each(function () {
                        var v = parseFloat($(this).find('.pay-amount-input').val());
                        if (!isNaN(v)) {
                            amounts.push(Math.round(v * 100) / 100);
                        }
                    });
                    return amounts;
                },
                readDates: function (layero) {
                    var dates = [];
                    var self = this;
                    layero.find('.pay-period-row:visible').each(function () {
                        dates.push($.trim($(this).find('.pay-date-input').val() || '') || self.today());
                    });
                    return dates;
                },
                bind: function (layero, total, periods) {
                    var self = this;
                    total = Math.round((parseFloat(total) || 0) * 100) / 100;
                    layero.find('.pay-total-sum').text(self.fmt(total));
                    var updateSumTip = function () {
                        var amounts = self.readAmounts(layero);
                        var sum = amounts.reduce(function (a, b) { return a + b; }, 0);
                        sum = Math.round(sum * 100) / 100;
                        layero.find('.pay-amount-sum').text(self.fmt(sum));
                        layero.find('.amount-sum-bad').toggle(Math.abs(sum - total) > 0.02);
                    };
                    var syncPeriods = function (resetAmounts) {
                        var n = parseInt(layero.find('input[name="submit_pay_periods"]:checked').val(), 10) || 1;
                        var amounts = self.splitEqual(total, n);
                        layero.find('.pay-period-row').each(function () {
                            var idx = parseInt($(this).data('period'), 10);
                            var show = idx <= n;
                            $(this).toggle(show);
                            if (!show) {
                                return;
                            }
                            if (resetAmounts) {
                                var $date = $(this).find('.pay-date-input');
                                if (!$date.val()) {
                                    $date.val(self.addDays(self.today(), (idx - 1) * 30));
                                }
                                $(this).find('.pay-amount-input').val(self.fmt(amounts[idx - 1] || 0));
                            }
                            $(this).find('.pay-period-label').text(n <= 1 ? '分一期（全款）' : ('第' + idx + '期'));
                        });
                        updateSumTip();
                    };
                    layero.find('input[name="submit_pay_periods"][value="' + (periods || 1) + '"]').prop('checked', true);
                    layero.find('input[name="submit_pay_periods"]').off('change.submitPaySch').on('change.submitPaySch', function () {
                        syncPeriods(true);
                    });
                    layero.off('input.submitPayAmt change.submitPayAmt', '.pay-amount-input').on('input.submitPayAmt change.submitPayAmt', '.pay-amount-input', updateSumTip);
                    syncPeriods(true);
                },
                validate: function (layero, total) {
                    total = Math.round((parseFloat(total) || 0) * 100) / 100;
                    var n = parseInt(layero.find('input[name="submit_pay_periods"]:checked').val(), 10) || 1;
                    var dates = this.readDates(layero);
                    var amounts = this.readAmounts(layero);
                    for (var i = 0; i < dates.length; i++) {
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(dates[i])) {
                            return {ok: false, msg: '请填写第' + (i + 1) + '期付款日期'};
                        }
                    }
                    if (amounts.length !== n) {
                        return {ok: false, msg: '请填写各期应付款'};
                    }
                    var sum = amounts.reduce(function (a, b) { return a + b; }, 0);
                    sum = Math.round(sum * 100) / 100;
                    if (Math.abs(sum - total) > 0.02) {
                        return {ok: false, msg: '各期应付款合计须等于采购总额 ' + total.toFixed(2) + '，当前为 ' + sum.toFixed(2)};
                    }
                    return {
                        ok: true,
                        pay_term: n <= 1 ? 'full' : 'ratio',
                        pay_ratios: this.dummyRatios(n).join('/'),
                        pay_dates: dates.join('/'),
                        pay_amounts: amounts.map(function (a) { return a.toFixed(2); }).join('/')
                    };
                }
            };
            Layer.open({
                type: 1,
                title: '提交审批',
                area: ['560px', 'auto'],
                btn: ['确认提交'],
                btnAlign: 'c',
                content: Template('submit-plan-payterm-tpl', {}),
                success: function (layero) {
                    if (defaultContractNo) {
                        layero.find('#c-submit-plan-contract-no').val(defaultContractNo);
                    }
                    layero.data('planTotal', planTotal);
                    paySch.bind(layero, planTotal, defaultPeriods);
                },
                yes: function (index, layero) {
                    var contractNo = $.trim(layero.find('#c-submit-plan-contract-no').val() || '');
                    if (!contractNo) {
                        Layer.msg('请填写合同编号');
                        return;
                    }
                    if (contractNo.length > 100) {
                        Layer.msg('合同编号最长 100 个字符');
                        return;
                    }
                    var total = parseFloat(layero.data('planTotal')) || planTotal || 0;
                    var sch = paySch.validate(layero, total);
                    if (!sch.ok) {
                        Layer.msg(sch.msg);
                        return;
                    }
                    var doSubmit = function () {
                        Backend.api.ajax({
                            url: 'purchase/plan/submit/ids/' + id,
                            data: {
                                pay_term: sch.pay_term,
                                pay_ratios: sch.pay_ratios,
                                pay_dates: sch.pay_dates,
                                pay_amounts: sch.pay_amounts,
                                contract: $('#c-plan-contract').val() || '',
                                contract_no: contractNo
                            }
                        }, function () {
                            Layer.close(index);
                            // 列表页刷新表格；详情/报价弹窗则刷新父页或关闭
                            if ($('#table').length && $('.btn-refresh').length) {
                                $('.btn-refresh').trigger('click');
                            } else {
                                setTimeout(function () { location.reload(); }, 600);
                            }
                            return false;
                        });
                    };
                    if ($('#c-plan-contract').length) {
                        Backend.api.ajax({
                            url: 'purchase/plan/savecontract/ids/' + id,
                            data: {contract: $('#c-plan-contract').val() || ''}
                        }, function () {
                            doSubmit();
                            return false;
                        }, function () {
                            doSubmit();
                            return false;
                        });
                    } else {
                        doSubmit();
                    }
                }
            });
        });

        if (withApprove) {
            $(document).on('click', '.btn-batch-approve', function () {
                var id = $(this).data('id');
                var level = parseInt($(this).data('level'), 10) || 1;
                var action = $(this).data('action') || 'approve';
                var remarks = {};
                var rejectCount = 0;
                $('.fld-reject-remark').each(function () {
                    var itemId = $(this).data('id');
                    var remark = $.trim($(this).val() || '');
                    if (itemId && remark) {
                        remarks[itemId] = remark;
                        rejectCount++;
                    }
                });
                if (action === 'reject') {
                    if (!rejectCount) {
                        Layer.msg('退回前请至少在一项明细填写审批退回备注');
                        return;
                    }
                    Layer.confirm('有 <strong>' + rejectCount + '</strong> 项填写了退回备注，确认<strong>退回整单</strong>给采购员？', function (index) {
                        Layer.close(index);
                        Backend.api.ajax({
                            url: 'purchase/plan/batchapprove/ids/' + id,
                            data: {
                                level: level,
                                action: 'reject',
                                remarks: JSON.stringify(remarks)
                            }
                        }, function () {
                            closeDialogAndRefreshParent();
                            return false;
                        });
                    });
                    return;
                }
                if (rejectCount) {
                    Layer.msg('已填写退回备注，请改点「退回审批」；或先清空备注后再确认通过');
                    return;
                }
                Layer.confirm('确认' + (level === 1 ? '一审' : '二审') + '全部通过？', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'purchase/plan/batchapprove/ids/' + id,
                        data: {
                            level: level,
                            action: 'approve',
                            remarks: JSON.stringify({})
                        }
                    }, function () {
                        closeDialogAndRefreshParent();
                        return false;
                    });
                });
            });
        }

        $(document).off('click.planWithdraw', '.btn-withdraw-plan').on('click.planWithdraw', '.btn-withdraw-plan', function () {
            var $btn = $(this);
            var id = $btn.data('id') || $btn.data('ids') || $btn.attr('data-id') || $btn.attr('data-ids');
            id = parseInt(id, 10) || 0;
            if (!id) {
                // 列表操作列：从行索引取 id
                var tableId = $btn.data('table-id') || 'table';
                var rowIndex = $btn.data('row-index');
                if (rowIndex != null && $('#' + tableId).length) {
                    var rows = $('#' + tableId).bootstrapTable('getData') || [];
                    if (rows[rowIndex]) {
                        id = parseInt(rows[rowIndex].id, 10) || 0;
                    }
                }
            }
            if (!id) {
                Layer.msg('未找到计划ID');
                return false;
            }
            Layer.confirm('确认撤回该计划？撤回后可修改再提交。', function (index) {
                Layer.close(index);
                Backend.api.ajax({
                    url: 'purchase/plan/withdraw/ids/' + id
                }, function () {
                    setTimeout(function () {
                        var frameIndex = parent.Layer.getFrameIndex(window.name);
                        if (frameIndex) {
                            parent.Layer.close(frameIndex);
                            if (parent.$ && parent.$('#table').length) {
                                parent.$('#table').bootstrapTable('refresh');
                            }
                        } else if ($('#table').length) {
                            $('#table').bootstrapTable('refresh');
                        } else {
                            location.reload();
                        }
                    }, 400);
                    return false;
                });
            });
            return false;
        });

        $(document).off('click.planRevoke', '.btn-revoke-plan').on('click.planRevoke', '.btn-revoke-plan', function () {
            var id = $(this).data('id');
            if (!id) {
                return;
            }
            Layer.confirm('确认撤销该计划的审批？撤销后将退回可编辑状态，修改后需重新提交审批。', function (index) {
                Layer.close(index);
                Backend.api.ajax({
                    url: 'purchase/plan/revoke/ids/' + id
                }, function () {
                    setTimeout(function () {
                        var frameIndex = parent.Layer.getFrameIndex(window.name);
                        if (frameIndex) {
                            parent.Layer.close(frameIndex);
                            if (parent.$ && parent.$('#table').length) {
                                parent.$('#table').bootstrapTable('refresh');
                            }
                        } else {
                            location.reload();
                        }
                    }, 500);
                    return false;
                });
            });
        });
    };

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/plan/index' + location.search,
                    del_url: '',
                    table: 'purchase_plan',
                }
            }, {
                align: 'center',
                halign: 'center',
                valign: 'middle'
            });
            var table = $("#table");
            var cellEllip = function (text) {
                text = text == null ? '' : String(text);
                if (!text || text === '-') {
                    return '<span class="text-muted">-</span>';
                }
                // 小屏也不用省略号截断，完整显示，表格可横向滚动
                return '<span class="plan-cell-full" title="' + Fast.api.escape(text) + '">' + Fast.api.escape(text) + '</span>';
            };
            var updateStatusTabs = function (counts) {
                counts = counts || {};
                var todoKeys = {pending1: 1, pending2: 1};
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
            var syncPlanTopHScroll = function () {
                var $wrap = $('.plan-table-wrap');
                var $body = $wrap.find('.fixed-table-body').first();
                if (!$body.length) {
                    return;
                }
                var $top = $wrap.find('.plan-top-hscroll');
                if (!$top.length) {
                    $top = $('<div class="plan-top-hscroll" title="横向滚动"><div class="plan-top-hscroll-inner"></div></div>');
                    var $container = $wrap.find('.fixed-table-container').first();
                    if ($container.length) {
                        $container.before($top);
                    } else {
                        $wrap.prepend($top);
                    }
                }
                var $inner = $top.find('.plan-top-hscroll-inner');
                var $tbl = $body.find('> table').first();
                var tableW = Math.ceil($tbl.outerWidth() || 0);
                var viewW = Math.ceil($body.innerWidth() || 0);
                $inner.css('width', Math.max(tableW, 1) + 'px');
                var need = tableW > viewW + 2;
                $top.toggle(need);
                if (!need) {
                    return;
                }
                var syncing = false;
                $top.off('scroll.planTopH').on('scroll.planTopH', function () {
                    if (syncing) {
                        return;
                    }
                    syncing = true;
                    $body.scrollLeft($top.scrollLeft());
                    syncing = false;
                });
                $body.off('scroll.planTopH').on('scroll.planTopH', function () {
                    if (syncing) {
                        return;
                    }
                    syncing = true;
                    $top.scrollLeft($body.scrollLeft());
                    syncing = false;
                });
                $top.scrollLeft($body.scrollLeft());
            };
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                // 不用插件固定列（与横向滚动条叠加会错位），改用 CSS sticky 钉住操作列
                fixedColumns: false,
                onPostHeader: function () {
                    $('.plan-table-wrap thead th .th-inner, .plan-table-wrap .fixed-table-header th .th-inner')
                        .css('text-align', 'center');
                    setTimeout(syncPlanTopHScroll, 0);
                },
                onPostBody: function () {
                    setTimeout(syncPlanTopHScroll, 0);
                },
                responseHandler: function (res) {
                    if (res && res.extend && res.extend.statusCount) {
                        updateStatusTabs(res.extend.statusCount);
                    }
                    return res;
                },
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: __('Id'), width: 52, operate: '='},
                    {field: 'sn', title: '合同编号 / 供应商', operate: 'LIKE', width: 220, formatter: function (v, row) {
                        var sn = v ? String(v) : '-';
                        var factory = row && row.factory && row.factory.name
                            ? String(row.factory.name)
                            : ((row && row.factory_name) ? String(row.factory_name) : ((row && row['factory.name']) ? String(row['factory.name']) : '-'));
                        return '<div class="plan-contract-factory-cell">'
                            + '<div class="plan-contract-line" title="' + Fast.api.escape(sn) + '">' + Fast.api.escape(sn) + '</div>'
                            + '<div class="plan-factory-line" title="' + Fast.api.escape(factory) + '">' + Fast.api.escape(factory) + '</div>'
                            + '</div>';
                    }},
                    {field: 'marks', title: '唛头', operate: 'LIKE', width: 108, formatter: function (v) {
                        if (!v) {
                            return '-';
                        }
                        var parts = String(v).split(/\s*,\s*/).filter(function (s) {
                            return s !== '';
                        });
                        if (!parts.length) {
                            return '-';
                        }
                        var first = parts[0];
                        var extra = parts.length > 1 ? (' +' + (parts.length - 1)) : '';
                        var tip = parts.length > 1 ? ('查看全部唛头（' + parts.length + '）') : String(v);
                        return '<a href="javascript:;" class="plan-marks-link btn-plan-marks-view" data-marks="' + Fast.api.escape(String(v)) + '" title="' + Fast.api.escape(tip) + '">'
                            + Fast.api.escape(first + extra) + '</a>';
                    }},

                    {field: 'buyer_name', title: '采购人', operate: 'LIKE', width: 64, align: 'center', halign: 'center', valign: 'middle', class: 'col-plan-buyer',
                        cellStyle: function () {
                            return {css: {'text-align': 'center'}};
                        }, formatter: function (v) {
                            return '<div style="text-align:center;">' + Fast.api.escape(v || '-') + '</div>';
                        }},
                    {field: 'paid_amount', title: '已付 / 总额', operate: false, width: 148, align: 'center', halign: 'center', valign: 'middle', class: 'col-plan-paid',
                        cellStyle: function () {
                            return {css: {'text-align': 'center'}};
                        }, formatter: function (v, row) {
                        var total = parseFloat(row.total_amount);
                        var paid = parseFloat(row.paid_amount);
                        var waive = parseFloat(row.waive_amount) || 0;
                        if (isNaN(total)) {
                            total = 0;
                        }
                        if (isNaN(paid)) {
                            paid = 0;
                        }
                        var tip = '已付 ' + paid.toFixed(2) + ' / 总额 ' + total.toFixed(2);
                        if (waive > 0.001) {
                            tip += '，抹零 ' + waive.toFixed(2);
                        }
                        var html = '<span class="plan-paid-total" title="' + Fast.api.escape(tip) + '">'
                            + paid.toFixed(2) + ' / ' + total.toFixed(2);
                        if (waive > 0.001) {
                            html += '<br><span class="text-success" style="font-size:11px;">抹零 ' + waive.toFixed(2) + '</span>';
                        }
                        html += '</span>';
                        return html;
                    }},
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
                    {field: 'pay_progress', title: '付款进度', operate: false, width: 128, formatter: function (v, row) {
                        var total = parseFloat(row.total_amount) || 0;
                        var paid = parseFloat(row.paid_amount) || 0;
                        var waive = parseFloat(row.waive_amount) || 0;
                        var covered = paid + waive;
                        var pct = 0;
                        if (total > 0) {
                            pct = Math.round(covered / total * 1000) / 10;
                        } else if (covered > 0) {
                            pct = 100;
                        }
                        if (pct < 0) {
                            pct = 0;
                        }
                        if (pct > 100) {
                            pct = 100;
                        }
                        var tip = v ? String(v) : (paid.toFixed(2) + ' / ' + total.toFixed(2) + ' (' + pct + '%)');
                        if (waive > 0.001 && (!v || String(v).indexOf('抹零') < 0)) {
                            tip += '，抹零 ' + waive.toFixed(2);
                        }
                        var termText = Fast.api.escape((row && row.pay_term_text) ? row.pay_term_text : '分一期');
                        return '<div class="plan-pay-prog" title="' + Fast.api.escape(tip) + '">'
                            + '<div class="plan-pay-term">' + termText + '</div>'
                            + '<div class="plan-pay-row">'
                            + '<div class="plan-pay-bar"><i style="width:' + pct + '%"></i></div>'
                            + '<span>' + pct + '%</span></div></div>';
                    }},
                    {field: 'status', title: '状态', width: 90, searchList: {"pending1":"初审中","pending2":"终审中","approved":"已审批","rejected":"已驳回"}, custom: {"pending1":"warning","pending2":"info","approved":"success","rejected":"danger"}, formatter: function (value, row, index) {
                        var v = (row && row.status != null && row.status !== '') ? String(row.status) : String(value == null ? '' : value);
                        // 未提交草稿：页签并入「初审中」，行内单独标「未提交」，避免误以为已在审、找不到撤回
                        if (v === 'draft') {
                            return '<span class="text-muted" style="white-space:nowrap;"><i class="fa fa-circle"></i> 未提交</span>';
                        }
                        var displayMap = {"pending1":"初审中","pending2":"终审中","approved":"已审批","rejected":"已驳回"};
                        var display = displayMap[v] || v;
                        var colorMap = {"pending1":"warning","pending2":"info","approved":"success","rejected":"danger"};
                        var color = colorMap[v] || 'primary';
                        return '<span class="text-' + color + '" style="white-space:nowrap;"><i class="fa fa-circle"></i> ' + display + '</span>';
                    }},
                    {
                        field: 'contract', title: '合同', operate: false, align: 'center', width: 48,
                        formatter: function (v, row) {
                            var path = v ? String(v) : '';
                            var files = path.split(/[,，]/).map(function (s) { return $.trim(s); }).filter(Boolean);
                            var isOwner = Config.isSuperAdmin || parseInt(row.buyer_admin_id, 10) === parseInt(Config.adminId, 10);
                            var canEdit = isOwner && (row.status === 'draft' || row.status === 'rejected'
                                || row.status === 'pending1' || row.status === 'pending2' || row.status === 'approved');
                            var dataContract = Fast.api.escape(path);
                            if (files.length) {
                                var badge = files.length > 1 ? ('<sup class="plan-contract-n">' + files.length + '</sup>') : '';
                                var tip = files.length > 1 ? ('查看合同（' + files.length + '份）') : '查看合同';
                                return '<a href="javascript:;" class="plan-contract-icon btn-plan-contract-view" data-id="' + row.id + '" data-contract="' + dataContract + '" data-can-edit="' + (canEdit ? '1' : '0') + '" title="' + tip + '">'
                                    + '<i class="fa fa-file-text-o"></i>' + badge + '</a>';
                            }
                            if (canEdit) {
                                return '<a href="javascript:;" class="plan-contract-icon plan-contract-icon-upload btn-plan-contract" data-id="' + row.id + '" data-contract="" title="提交合同"><i class="fa fa-cloud-upload"></i></a>';
                            }
                            return '<span class="text-muted">-</span>';
                        }
                    },
                    {
                        field: 'invoice_btn', title: '发票', operate: false, align: 'center', width: 52,
                        formatter: function (v, row) {
                            if (row.status !== 'approved') {
                                return '<span class="text-muted">-</span>';
                            }
                            return '<a href="javascript:;" class="btn btn-xs btn-warning btn-plan-invoice" data-id="' + row.id + '" title="查看物品并提交发票">发票</a>';
                        }
                    },
                    {
                        field: 'pay_count', title: '付款', operate: false, align: 'center', width: 58,
                        formatter: function (v, row) {
                            var n = parseInt(v, 10) || 0;
                            var pending = parseInt(row.pay_pending_count, 10) || 0;
                            var cls = pending > 0 ? 'btn-danger' : 'btn-warning';
                            var label = pending > 0
                                ? ('待审')
                                : (n > 0 ? (n + '笔') : '查看');
                            var tip = pending > 0
                                ? ('待审批 ' + pending + ' 笔')
                                : (n > 0 ? ('共 ' + n + ' 笔付款申请') : '查看付款申请');
                            return '<a href="javascript:;" class="btn btn-xs ' + cls + ' btn-plan-pays" data-id="' + row.id + '" title="' + tip + '">' + label + '</a>';
                        }
                    },
                    {field: 'createtime', title: __('Createtime'), width: 148, operate: 'RANGE', addclass: 'datetimerange', formatter: Table.api.formatter.datetime},
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, clickToSelect: false,
                        class: 'col-plan-operate', width: 190, align: 'left', halign: 'left',
                        cellStyle: function () {
                            return {css: {'white-space': 'nowrap', 'text-align': 'left', 'padding-left': '8px', 'padding-right': '6px'}};
                        },
                        buttons: [{
                            name: 'editinfo',
                            text: '编辑',
                            title: '编辑合同编号 / 供应商 / 总金额 / 付款账期',
                            classname: 'btn btn-xs btn-success btn-dialog',
                            icon: 'fa fa-pencil',
                            url: 'purchase/plan/edit',
                            extend: 'data-area=\'["960px","85%"]\'',
                            visible: function (row) {
                                if (Config.financeOnlyPlans) {
                                    return false;
                                }
                                if (row.status !== 'pending1' && row.status !== 'approved' && row.status !== 'rejected') {
                                    return false;
                                }
                                return Config.isSuperAdmin
                                    || parseInt(row.buyer_admin_id, 10) === parseInt(Config.adminId, 10)
                                    || !!Config.canApprove1
                                    || !!Config.canApprove2;
                            }
                        }, {
                            name: 'withdraw',
                            text: '撤回',
                            title: '撤回审批申请',
                            classname: 'btn btn-xs btn-warning btn-withdraw-plan',
                            icon: 'fa fa-undo',
                            extend: function (row) {
                                return 'data-id="' + (row.id || 0) + '"';
                            },
                            visible: function (row) {
                                if (Config.financeOnlyPlans) {
                                    return false;
                                }
                                if (row.status !== 'pending1' && row.status !== 'pending2') {
                                    return false;
                                }
                                return !!row.can_withdraw;
                            }
                        }, {
                            name: 'fillquote',
                            text: '报价',
                            title: '录入报价',
                            classname: 'btn btn-xs btn-success btn-dialog',
                            icon: 'fa fa-edit',
                            url: 'purchase/plan/fillquote',
                            extend: 'data-area=\'["92%","72%"]\'',
                            visible: function (row) {
                                return row.status === 'draft' || row.status === 'rejected';
                            }
                        }, {
                            name: 'submit',
                            text: '提交',
                            title: '提交审批',
                            classname: 'btn btn-xs btn-primary btn-submit-plan',
                            icon: 'fa fa-send',
                            extend: 'data-toggle="tooltip" data-sn="{sn}" data-total-amount="{total_amount}" data-pay-term="{pay_term}" data-pay-ratios="{pay_ratios}"',
                            visible: function (row) {
                                if (row.status !== 'draft' && row.status !== 'rejected') {
                                    return false;
                                }
                                return Config.isSuperAdmin || parseInt(row.buyer_admin_id, 10) === parseInt(Config.adminId, 10);
                            }
                        }, {
                            name: 'delplan',
                            text: '删除',
                            title: '删除已驳回计划',
                            classname: 'btn btn-xs btn-danger btn-ajax',
                            icon: 'fa fa-trash',
                            url: 'purchase/plan/del',
                            confirm: '确认删除该计划？采购物品会退回待提交，可重新报价组计划。',
                            visible: function (row) {
                                if (Config.financeOnlyPlans) {
                                    return false;
                                }
                                if (row.status !== 'rejected') {
                                    return false;
                                }
                                return Config.isSuperAdmin || parseInt(row.buyer_admin_id, 10) === parseInt(Config.adminId, 10);
                            }
                        }, {
                            name: 'approve',
                            text: '审批',
                            title: '采购计划审批',
                            classname: 'btn btn-xs btn-warning btn-plan-detail-dlg',
                            icon: 'fa fa-check-square-o',
                            url: 'purchase/plan/detail',
                            extend: 'data-area=\'["100%","100%"]\'',
                            visible: function (row) {
                                var isOwner = !Config.isSuperAdmin && parseInt(row.buyer_admin_id, 10) === parseInt(Config.adminId, 10);
                                if (row.status === 'pending1') {
                                    return !!Config.canApprove1 && !isOwner;
                                }
                                if (row.status === 'pending2') {
                                    return !!Config.canApprove2 && !isOwner;
                                }
                                return false;
                            }
                        }, {
                            name: 'revoke',
                            text: '撤销',
                            title: '撤销审批',
                            classname: 'btn btn-xs btn-warning btn-ajax',
                            icon: 'fa fa-undo',
                            url: 'purchase/plan/revoke',
                            confirm: '确认撤销该计划的审批？撤销后将退回可编辑状态，修改后需重新提交审批。已有付款、发票或装箱的计划不能撤销。',
                            visible: function (row) {
                                if (row.status !== 'approved') {
                                    return false;
                                }
                                if (Config.financeOnlyPlans) {
                                    return false;
                                }
                                if (Config.isSuperAdmin) {
                                    return true;
                                }
                                return !!Config.canApprove1 || !!Config.canApprove2;
                            }
                        }, {
                            name: 'detail',
                            text: '详情',
                            title: '采购计划',
                            classname: 'btn btn-xs btn-info btn-plan-detail-dlg',
                            icon: 'fa fa-list',
                            url: 'purchase/plan/detail',
                            extend: 'data-area=\'["100%","100%"]\'',
                            visible: function (row) {
                                if (row.status === 'draft' || row.status === 'rejected') {
                                    return false;
                                }
                                var isOwner = !Config.isSuperAdmin && parseInt(row.buyer_admin_id, 10) === parseInt(Config.adminId, 10);
                                if (row.status === 'pending1' && Config.canApprove1 && !isOwner) {
                                    return false;
                                }
                                if (row.status === 'pending2' && Config.canApprove2 && !isOwner) {
                                    return false;
                                }
                                return true;
                            }
                        }, {
                            name: 'pay',
                            text: '付款',
                            title: '提交付款申请',
                            classname: 'btn btn-xs btn-danger btn-plan-pay',
                            icon: 'fa fa-rmb',
                            visible: function (row) {
                                if (!Config.canAddPayment) {
                                    return false;
                                }
                                if (row.status !== 'approved') {
                                    return false;
                                }
                                var total = parseFloat(row.total_amount) || 0;
                                // 累计申请（待审批+已审批+已付款）+ 抹零 已达总额则隐藏
                                var applied = parseFloat(row.applied_amount);
                                if (isNaN(applied)) {
                                    applied = parseFloat(row.paid_amount) || 0;
                                }
                                var waive = parseFloat(row.waive_amount) || 0;
                                return total <= 0 || applied + waive + 0.001 < total;
                            }
                        }],
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
            setTimeout(syncPlanTopHScroll, 50);
            $(window).off('resize.planTopH').on('resize.planTopH', function () {
                setTimeout(syncPlanTopHScroll, 50);
            });
            $(document).off('click.planBatchPay', '.btn-batch-pay').on('click.planBatchPay', '.btn-batch-pay', function (e) {
                e.preventDefault();
                if (!Config.canAddPayment) {
                    Layer.msg('无付款申请权限');
                    return false;
                }
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                var rows = Table.api.selecteddata(table) || [];
                if (!rows.length) {
                    Layer.msg('请先勾选采购计划');
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
                    var total = parseFloat(row.total_amount) || 0;
                    var applied = parseFloat(row.applied_amount);
                    if (isNaN(applied)) {
                        applied = parseFloat(row.paid_amount) || 0;
                    }
                    var waive = parseFloat(row.waive_amount) || 0;
                    if (total > 0 && applied + waive + 0.001 >= total) {
                        skipped.push((row.sn || ('#' + id)) + '（申请已满）');
                        return;
                    }
                    ids.push(id);
                });
                if (!ids.length) {
                    Layer.msg(skipped.length ? ('勾选的计划均不可付款：' + skipped.slice(0, 3).join('、')) : '没有可付款的计划');
                    return false;
                }
                Backend.api.open(
                    'purchase/payment/batchadd?ids=' + ids.join(','),
                    '批量付款（' + ids.length + '）',
                    {
                        area: ['960px', '90%'],
                        end: function () {
                            table.bootstrapTable('refresh');
                        }
                    }
                );
                return false;
            });
            $(document).off('click.planMarksView', '.btn-plan-marks-view').on('click.planMarksView', '.btn-plan-marks-view', function (e) {
                e.preventDefault();
                var raw = $(this).attr('data-marks') || '';
                var parts = String(raw).split(/\s*,\s*/).filter(function (s) {
                    return $.trim(s) !== '';
                });
                if (!parts.length) {
                    return false;
                }
                var html = '<div class="plan-marks-view-list">';
                parts.forEach(function (m, i) {
                    html += '<div class="plan-marks-view-item"><span class="n">' + (i + 1) + '</span><span class="t">' + Fast.api.escape(m) + '</span></div>';
                });
                html += '</div>';
                var winH = $(window).height() || 640;
                var layerH = Math.min(560, Math.max(320, winH - 140));
                Layer.open({
                    type: 1,
                    title: '唛头（' + parts.length + '）',
                    area: ['520px', layerH + 'px'],
                    btn: ['关闭'],
                    btnAlign: 'c',
                    content: html,
                    success: function (layero) {
                        var $content = layero.find('.layui-layer-content');
                        var h = $content.height();
                        layero.find('.plan-marks-view-list').css({
                            height: h + 'px',
                            overflowY: 'auto'
                        });
                    },
                    yes: function (index) {
                        Layer.close(index);
                    }
                });
                return false;
            });
            $(document).off('click.planDetailDlg', '.btn-plan-detail-dlg').on('click.planDetailDlg', '.btn-plan-detail-dlg', function (e) {
                e.preventDefault();
                var that = this;
                var options = $.extend({}, $(that).data() || {});
                var url = Backend.api.replaceids(that, $(that).data('url') || $(that).attr('href'));
                var title = $(that).attr('title') || $(that).data('title') || $(that).data('original-title') || '采购计划';
                Backend.api.open(url, title, $.extend({}, options, {
                    end: function () {
                        table.bootstrapTable('refresh');
                    }
                }));
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
            $(document).off('click.planPay', '.btn-plan-pay').on('click.planPay', '.btn-plan-pay', function () {
                var id = $(this).data('id') || ($(this).closest('tr').data('index') !== undefined
                    ? (table.bootstrapTable('getData')[$(this).closest('tr').data('index')] || {}).id
                    : 0);
                id = parseInt(id, 10) || 0;
                if (!id) {
                    Layer.msg('未找到采购计划');
                    return;
                }
                Backend.api.open('purchase/payment/add?plan_id=' + id, '提交付款申请', {area: ['960px', '100%'], offset: '0'});
            });
            $(document).off('click.planPays', '.btn-plan-pays').on('click.planPays', '.btn-plan-pays', function () {
                var id = $(this).data('id');
                Backend.api.open('purchase/plan/payrecords?ids=' + id, '付款申请 / 审批', {area: ['95%', '85%']});
            });
            $(document).off('click.planInvoice', '.btn-plan-invoice').on('click.planInvoice', '.btn-plan-invoice', function () {
                var id = $(this).data('id');
                Backend.api.open('purchase/plan/itemlist/ids/' + id + '?invoice=1', '发票物品清单', {area: ['96%', '90%']});
            });
            var openContractUpload = function (planId, exist) {
                Layer.open({
                    type: 1,
                    title: exist ? '更换/补传合同' : '提交合同',
                    area: ['560px', '480px'],
                    maxHeight: 720,
                    btn: ['确认保存', '取消'],
                    btnAlign: 'c',
                    content: Template('plan-contract-tpl', {}),
                    success: function (layero) {
                        if (exist) {
                            layero.find('#c-plan-list-contract').val(exist);
                        }
                        Form.events.plupload(layero);
                    },
                    yes: function (index, layero) {
                        var contract = $.trim(layero.find('#c-plan-list-contract').val() || '');
                        if (!contract) {
                            Layer.msg('请先上传合同附件');
                            return;
                        }
                        Backend.api.ajax({
                            url: 'purchase/plan/savecontract/ids/' + planId,
                            data: {contract: contract}
                        }, function () {
                            Layer.close(index);
                            table.bootstrapTable('refresh');
                        });
                    }
                });
            };
            $(document).off('click.planContractView', '.btn-plan-contract-view').on('click.planContractView', '.btn-plan-contract-view', function () {
                var planId = $(this).data('id');
                var exist = $(this).attr('data-contract') || '';
                var canEdit = $(this).attr('data-can-edit') === '1';
                var files = String(exist).split(/[,，]/).map(function (s) {
                    return $.trim(s);
                }).filter(Boolean);
                var html = '<div class="plan-contract-view-list">';
                files.forEach(function (p, i) {
                    var name = p.split('/').pop() || ('合同' + (i + 1));
                    try {
                        name = decodeURIComponent(name);
                    } catch (e) {
                    }
                    html += '<a class="plan-contract-view-item" href="' + Fast.api.cdnurl(p) + '" target="_blank">'
                        + '<i class="fa fa-file-text-o"></i><span>' + Fast.api.escape(name) + '</span><i class="fa fa-external-link"></i></a>';
                });
                html += '</div>';
                Layer.open({
                    type: 1,
                    title: '合同附件（' + files.length + '）',
                    area: ['480px', 'auto'],
                    maxHeight: 520,
                    btn: canEdit ? ['补传 / 更换', '关闭'] : ['关闭'],
                    btnAlign: 'c',
                    content: html,
                    yes: function (index) {
                        if (canEdit) {
                            Layer.close(index);
                            openContractUpload(planId, exist);
                            return;
                        }
                        Layer.close(index);
                    }
                });
            });
            $(document).off('click.planContract', '.btn-plan-contract').on('click.planContract', '.btn-plan-contract', function () {
                openContractUpload($(this).data('id'), $(this).attr('data-contract') || '');
            });
            var formatMoney = function (n) {
                var v = parseFloat(n);
                if (isNaN(v)) {
                    v = 0;
                }
                return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            };
            table.on('load-success.bs.table', function (e, data) {
                $('#plan-sum-total').text(formatMoney(data && data.sum_total));
                $('#plan-sum-paid').text(formatMoney(data && data.sum_paid));
            });
        },
        add: function () {
            Form.api.bindevent($("form[role=form]"), function (data, ret) {
                var id = (data && data.id) ? data.id : (ret.data && ret.data.id);
                var index = parent.Layer.getFrameIndex(window.name);
                parent.Layer.close(index);
                if (id) {
                    parent.Backend.api.open('purchase/plan/fillquote?ids=' + id, '录入报价', {area: ['92%', '72%']});
                    if (parent.$ && parent.$("#table").length) {
                        parent.$("#table").bootstrapTable('refresh');
                    }
                }
                return false;
            });
        },
        edit: function () {
            var $wrap = $('#edit-pay-schedule');
            if ($wrap.length) {
                var canEdit = String($wrap.attr('data-can-edit')) === '1';
                var paidFixed = Math.max(0, parseFloat($wrap.attr('data-paid')) || 0);
                var fmt = function (n) {
                    n = parseFloat(n);
                    return isNaN(n) ? '0.00' : n.toFixed(2);
                };
                var readWaive = function () {
                    return Math.max(0, Math.round((parseFloat($('#c-waive_amount').val()) || 0) * 100) / 100);
                };
                var readTotal = function () {
                    return Math.round((parseFloat($('#c-total_amount').val()) || 0) * 100) / 100;
                };
                var syncWaiveUi = function () {
                    var total = readTotal();
                    var waive = readWaive();
                    var maxWaive = Math.max(0, Math.round((total - paidFixed) * 100) / 100);
                    var unpaid = Math.max(0, Math.round((total - paidFixed - waive) * 100) / 100);
                    $('#edit-max-waive').text(fmt(maxWaive));
                    $('#c-waive_amount').attr('data-max', maxWaive).attr('max', maxWaive);
                    $('#edit-unpaid-text').text(fmt(unpaid));
                    $('#edit-waive-hint-amt, .edit-waive-sum-amt').text(fmt(waive));
                    $('#edit-waive-hint, .edit-waive-sum-tip').toggle(waive > 0.001);
                    $wrap.attr('data-waive', waive);
                };
                var today = function () {
                    var d = new Date();
                    var m = d.getMonth() + 1;
                    var day = d.getDate();
                    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
                };
                var addDays = function (base, days) {
                    var d = base ? new Date(String(base).replace(/-/g, '/')) : new Date();
                    if (isNaN(d.getTime())) {
                        d = new Date();
                    }
                    d.setDate(d.getDate() + (days || 0));
                    var m = d.getMonth() + 1;
                    var day = d.getDate();
                    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
                };
                var splitEqual = function (total, n) {
                    total = Math.round((parseFloat(total) || 0) * 100) / 100;
                    n = parseInt(n, 10) || 1;
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
                var dummyRatios = function (n) {
                    n = parseInt(n, 10) || 1;
                    if (n <= 1) {
                        return [100];
                    }
                    return n === 2 ? [50, 50] : [34, 33, 33];
                };
                var readAmounts = function () {
                    var amounts = [];
                    $('#edit-pay-schedule-body tr').each(function () {
                        var v = parseFloat($(this).find('.sch-amount').val());
                        if (isNaN(v)) {
                            v = parseFloat($(this).find('.sch-amount').text());
                        }
                        if (!isNaN(v)) {
                            amounts.push(Math.round(v * 100) / 100);
                        }
                    });
                    return amounts;
                };
                var readDates = function () {
                    var dates = [];
                    $('#edit-pay-schedule-body tr').each(function () {
                        var v = $.trim($(this).find('.sch-date').val() || $(this).find('.sch-date-text').text() || '');
                        dates.push(v || today());
                    });
                    return dates;
                };
                var buildRows = function (total, paid, waive, dates, amounts) {
                    // amounts 为净应付款（总额−抹零）；抹零已从金额中扣除，不再二次扣待付
                    total = Math.round((parseFloat(total) || 0) * 100) / 100;
                    paid = Math.max(0, Math.round((parseFloat(paid) || 0) * 100) / 100);
                    waive = Math.max(0, Math.round((parseFloat(waive) || 0) * 100) / 100);
                    var netBase = Math.max(0, Math.round((total - waive) * 100) / 100);
                    amounts = (amounts || []).map(function (a) {
                        return Math.round((parseFloat(a) || 0) * 100) / 100;
                    });
                    var n = amounts.length || 1;
                    var amtSum = amounts.reduce(function (a, b) { return a + b; }, 0);
                    amtSum = Math.round(amtSum * 100) / 100;
                    // 库内多为毛额拆分，显示前先转净额
                    if (waive > 0.001 && Math.abs(amtSum - total) <= 0.02 && Math.abs(amtSum - netBase) > 0.02) {
                        amounts = grossToNetAmounts(amounts, waive);
                    }
                    dates = dates || [];
                    while (dates.length < n) {
                        dates.push(addDays(today(), dates.length * 30));
                    }
                    dates = dates.slice(0, n);
                    var remainPaid = paid;
                    var schedule = [];
                    for (var i = 0; i < n; i++) {
                        var amount = amounts[i];
                        var covered = 0;
                        if (remainPaid >= amount - 0.001) {
                            covered = amount;
                            remainPaid = Math.round((remainPaid - amount) * 100) / 100;
                        } else if (remainPaid > 0.001) {
                            covered = remainPaid;
                            remainPaid = 0;
                        }
                        var due = Math.max(0, Math.round((amount - covered) * 100) / 100);
                        schedule.push({
                            index: i + 1,
                            label: n <= 1 ? '分一期（全款）' : ('第' + (i + 1) + '期'),
                            pay_date: dates[i],
                            amount: amount,
                            paid: covered,
                            due: due
                        });
                    }
                    return schedule;
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
                var getNetBase = function () {
                    return Math.max(0, Math.round((readTotal() - readWaive()) * 100) / 100);
                };
                var updateSumTip = function (amounts, netBase) {
                    amounts = amounts || readAmounts();
                    netBase = netBase != null ? netBase : getNetBase();
                    var sum = amounts.reduce(function (a, b) { return a + b; }, 0);
                    sum = Math.round(sum * 100) / 100;
                    $wrap.find('.edit-pay-total').text(fmt(netBase));
                    $wrap.find('.edit-pay-sum').text(fmt(sum));
                    $wrap.find('.edit-pay-sum-bad').toggle(Math.abs(sum - netBase) > 0.02);
                };
                var syncHidden = function (dates, amounts) {
                    if (!canEdit) {
                        updateSumTip(amounts, getNetBase());
                        return;
                    }
                    dates = dates || readDates();
                    amounts = amounts || readAmounts();
                    var n = amounts.length || 1;
                    var waive = readWaive();
                    var gross = netToGrossAmounts(amounts, waive);
                    $('#c-edit-pay-term').val(n <= 1 ? 'full' : 'ratio');
                    $('#c-edit-pay-ratios').val(dummyRatios(n).join('/'));
                    $('#c-edit-pay-dates').val(dates.join('/'));
                    // 入库仍写毛额（合计=采购总额）
                    $('#c-edit-pay-amounts').val(gross.map(function (a) { return fmt(a); }).join('/'));
                    updateSumTip(amounts, getNetBase());
                };
                var renderRows = function (list) {
                    var $body = $('#edit-pay-schedule-body');
                    $body.empty();
                    $.each(list || [], function (i, sch) {
                        var due = parseFloat(sch.due) || 0;
                        var dateCell = canEdit
                            ? '<input type="date" class="form-control input-sm sch-date" value="' + (sch.pay_date || today()) + '">'
                            : '<span class="sch-date-text">' + (sch.pay_date || '-') + '</span>';
                        var amountCell = canEdit
                            ? '<input type="number" class="form-control input-sm sch-amount" min="0" step="0.01" value="' + fmt(sch.amount) + '">'
                            : '<span class="sch-amount">' + fmt(sch.amount) + '</span>';
                        $body.append(
                            '<tr data-index="' + (sch.index || (i + 1)) + '">' +
                            '<td>' + dateCell + '</td>' +
                            '<td class="sch-label">' + (sch.label || '') + '</td>' +
                            '<td>' + amountCell + '</td>' +
                            '<td class="sch-paid">' + fmt(sch.paid) + '</td>' +
                            '<td class="sch-due ' + (due > 0 ? 'text-warning' : '') + '"><strong>' + fmt(due) + '</strong></td>' +
                            '</tr>'
                        );
                    });
                };
                var applyPeriods = function (n, dates, amounts, resetAmounts) {
                    n = parseInt(n, 10) || 1;
                    if (n < 1) {
                        n = 1;
                    }
                    if (n > 3) {
                        n = 3;
                    }
                    if (canEdit) {
                        $wrap.find('input[name="edit_pay_periods"][value="' + n + '"]').prop('checked', true);
                    }
                    var total = readTotal();
                    var waive = readWaive();
                    var netBase = Math.max(0, Math.round((total - waive) * 100) / 100);
                    dates = dates || [];
                    while (dates.length < n) {
                        dates.push(addDays(today(), dates.length * 30));
                    }
                    dates = dates.slice(0, n);
                    if (resetAmounts || !amounts || amounts.length !== n) {
                        amounts = splitEqual(netBase, n);
                    } else {
                        var sumIn = amounts.reduce(function (a, b) { return a + b; }, 0);
                        sumIn = Math.round(sumIn * 100) / 100;
                        if (waive > 0.001 && Math.abs(sumIn - total) <= 0.02) {
                            amounts = grossToNetAmounts(amounts, waive);
                        }
                    }
                    var list = buildRows(total, paidFixed, waive, dates, amounts);
                    renderRows(list);
                    syncHidden(dates, amounts);
                    updateSumTip(amounts, netBase);
                    syncWaiveUi();
                };
                var refreshKeepInputs = function () {
                    var dates = readDates();
                    var amounts = readAmounts();
                    if (!amounts.length) {
                        return;
                    }
                    var list = buildRows(readTotal(), paidFixed, readWaive(), dates, amounts);
                    $('#edit-pay-schedule-body tr').each(function (i) {
                        var sch = list[i];
                        if (!sch) {
                            return;
                        }
                        $(this).find('.sch-label').text(sch.label);
                        $(this).find('.sch-paid').text(fmt(sch.paid));
                        $(this).find('.sch-due').toggleClass('text-warning', sch.due > 0).html('<strong>' + fmt(sch.due) + '</strong>');
                    });
                    syncHidden(dates, amounts);
                    syncWaiveUi();
                };

                var initPeriods = parseInt($wrap.attr('data-periods'), 10) || 1;
                var initDates = String($wrap.attr('data-dates') || '').split(/[\/,，、|]+/).map(function (x) {
                    return $.trim(x);
                }).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); });
                var initAmounts = String($wrap.attr('data-amounts') || '').split(/[\/,，、|]+/).map(function (x) {
                    return parseFloat($.trim(x));
                }).filter(function (n) { return !isNaN(n); });

                var onTotalOrWaiveChange = function (resetAmounts) {
                    syncWaiveUi();
                    var n = canEdit
                        ? (parseInt($wrap.find('input[name="edit_pay_periods"]:checked').val(), 10) || initPeriods)
                        : initPeriods;
                    if (resetAmounts) {
                        applyPeriods(n, readDates(), null, true);
                    } else {
                        refreshKeepInputs();
                    }
                };

                // 改抹零后按新净额重摊应付款
                $('#c-waive_amount').on('input change', function () {
                    onTotalOrWaiveChange(true);
                });

                if (canEdit) {
                    $wrap.find('input[name="edit_pay_periods"]').on('change', function () {
                        applyPeriods(parseInt($(this).val(), 10) || 1, null, null, true);
                    });
                    $wrap.on('input change', '.sch-amount, .sch-date', refreshKeepInputs);
                    $('#c-total_amount').on('input change', function () {
                        onTotalOrWaiveChange(true);
                    });
                    $('#edit-form').on('submit', function () {
                        syncHidden();
                        var total = readTotal();
                        var waive = readWaive();
                        var netBase = Math.max(0, Math.round((total - waive) * 100) / 100);
                        var maxWaive = Math.max(0, Math.round((total - paidFixed) * 100) / 100);
                        if (waive - maxWaive > 0.001) {
                            Layer.msg('抹零金额不能超过 ' + fmt(maxWaive) + '（总额−已付）');
                            return false;
                        }
                        var n = parseInt($wrap.find('input[name="edit_pay_periods"]:checked').val(), 10) || 1;
                        var dates = readDates();
                        var amounts = readAmounts();
                        for (var i = 0; i < dates.length; i++) {
                            if (!/^\d{4}-\d{2}-\d{2}$/.test(dates[i])) {
                                Layer.msg('请填写第' + (i + 1) + '期付款日期');
                                return false;
                            }
                        }
                        if (amounts.length !== n) {
                            Layer.msg('请填写各期应付款');
                            return false;
                        }
                        var sum = amounts.reduce(function (a, b) { return a + b; }, 0);
                        sum = Math.round(sum * 100) / 100;
                        if (Math.abs(sum - netBase) > 0.02) {
                            Layer.msg('各期应付款合计须等于净额（总额−抹零）' + netBase.toFixed(2));
                            return false;
                        }
                    });
                } else {
                    $('#c-total_amount').on('input change', function () {
                        onTotalOrWaiveChange(true);
                    });
                    $('#edit-form').on('submit', function () {
                        var total = readTotal();
                        var waive = readWaive();
                        var maxWaive = Math.max(0, Math.round((total - paidFixed) * 100) / 100);
                        if (waive - maxWaive > 0.001) {
                            Layer.msg('抹零金额不能超过 ' + fmt(maxWaive) + '（总额−已付）');
                            return false;
                        }
                    });
                }

                applyPeriods(
                    initPeriods,
                    initDates,
                    initAmounts.length >= initPeriods ? initAmounts : null,
                    !(initAmounts.length >= initPeriods)
                );
                syncWaiveUi();
            }
            Controller.api.bindevent();
        },
        fillquote: function () {
            var mode = $('#quote-mode').val();
            initQuoteTableUi();

            if (mode === 'create') {
                Form.events.plupload($('body'));
                Form.events.faselect($('body'));

                $('.check-all').on('change', function () {
                    $('.item-check').prop('checked', $(this).prop('checked'));
                });

                // 同一合同共用供应商：改一行同步到空行
                $(document).on('blur.quoteFactory', '.fld-factory', function () {
                    var name = $.trim($(this).val() || '');
                    if (!name) {
                        return;
                    }
                    $('tr[data-order-item-id] .fld-factory').each(function () {
                        if (!$.trim($(this).val() || '')) {
                            $(this).val(name);
                        }
                    });
                });

                $(document).on('click', '.btn-close-plan', function () {
                    var index = parent.Layer.getFrameIndex(window.name);
                    parent.Layer.close(index);
                    if (parent.$ && parent.$("#table").length) {
                        parent.$("#table").bootstrapTable('refresh');
                    }
                });

                $(document).on('click', '.btn-create-quote', function () {
                    var items = [];
                    var missingPrice = false;
                    var factoryName = '';
                    $('tr[data-order-item-id]').each(function () {
                        var tr = $(this);
                        var oid = parseInt(tr.data('order-item-id'), 10);
                        if (!oid) {
                            return;
                        }
                        var rowFactory = $.trim(tr.find('.fld-factory').val() || '');
                        if (rowFactory && !factoryName) {
                            factoryName = rowFactory;
                        }
                        var price = tr.find('.fld-price').val();
                        if (!price || parseFloat(price) <= 0) {
                            missingPrice = true;
                        }
                        items.push({
                            order_item_id: oid,
                            qty: tr.find('.fld-qty').val(),
                            price: price,
                            factory_name: rowFactory,
                            description: tr.find('.fld-desc').val(),
                            image: tr.find('.fld-image').val(),
                            contract: tr.find('.fld-contract').val()
                        });
                    });
                    if (!items.length) {
                        Layer.msg('没有可保存的明细');
                        return;
                    }
                    if (!factoryName) {
                        Layer.msg('请填写供应商');
                        return;
                    }
                    var doSave = function () {
                        Backend.api.ajax({
                            url: 'purchase/plan/fillquote',
                            data: {
                                factory_name: factoryName,
                                contract: $('#c-plan-contract').val() || '',
                                items_json: JSON.stringify(items)
                            }
                        }, function (data) {
                            var id = data && data.id;
                            Layer.msg('已保存，计划已自动创建');
                            if (id) {
                                setTimeout(function () {
                                    location.href = Fast.api.fixurl('purchase/plan/fillquote?ids=' + id);
                                }, 500);
                            }
                            return false;
                        });
                    };
                    if (missingPrice) {
                        Layer.confirm('有物品尚未填写单价，仍要保存并创建计划吗？', function (index) {
                            Layer.close(index);
                            doSave();
                        });
                    } else {
                        doSave();
                    }
                });
                return;
            }

            bindQuoteForm({withApprove: false});
        },
        payrecords: function () {
            $(document).on('click', '.btn-refresh-pays', function () {
                location.reload();
            });
            var planId = parseInt(Config.planId, 10) || 0;
            var submitWaive = function (amount, remark) {
                if (!planId) {
                    Layer.msg('未找到采购计划');
                    return;
                }
                Backend.api.ajax({
                    url: 'purchase/plan/waive/ids/' + planId,
                    data: {amount: amount, remark: remark || ''}
                }, function () {
                    location.reload();
                    return false;
                });
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
            $(document).off('click.planWaive', '.btn-waive-settle-rec').on('click.planWaive', '.btn-waive-settle-rec', function (e) {
                e.preventDefault();
                var maxWaive = parseFloat($(this).data('max-waive'));
                if (isNaN(maxWaive)) {
                    maxWaive = parseFloat(Config.unpaidAmount) || 0;
                    var curWaive = parseFloat(Config.waiveAmount) || 0;
                    maxWaive = Math.round((maxWaive + curWaive) * 100) / 100;
                }
                if (maxWaive <= 0.001) {
                    Layer.msg('当前已无需抹零');
                    return;
                }
                var existingRemark = String($(this).attr('data-remark') || $(this).data('remark') || '');
                openWaiveForm(maxWaive, existingRemark, function (amt, remark) {
                    submitWaive(amt, remark);
                });
            });
            $(document).off('click.planWaiveClear', '.btn-waive-clear-rec').on('click.planWaiveClear', '.btn-waive-clear-rec', function (e) {
                e.preventDefault();
                Layer.confirm('确认撤销抹零？撤销后未付将恢复。', function (index) {
                    Layer.close(index);
                    submitWaive(0, '');
                });
            });
            $(document).off('click.planPayWithdraw', '.btn-withdraw-payrec').on('click.planPayWithdraw', '.btn-withdraw-payrec', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var id = parseInt($(this).data('id'), 10) || 0;
                var sn = $(this).data('sn') || '';
                if (!id) {
                    return;
                }
                Layer.confirm('确认撤销删除付款申请' + (sn ? '「' + sn + '」' : '') + '？撤销后可重新提交。', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'purchase/payment/withdraw/ids/' + id
                    }, function () {
                        location.reload();
                        return false;
                    });
                });
            });
            $(document).off('click.planPayDeleteRejected', '.btn-delete-rejected-payrec').on('click.planPayDeleteRejected', '.btn-delete-rejected-payrec', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var id = parseInt($(this).data('id'), 10) || 0;
                var sn = $(this).data('sn') || '';
                if (!id) {
                    return;
                }
                Layer.confirm('确认删除已驳回的付款申请' + (sn ? '「' + sn + '」' : '') + '？', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'purchase/payment/withdraw/ids/' + id
                    }, function () {
                        location.reload();
                        return false;
                    });
                });
            });
            $(document).off('click.planPayReject', '.btn-reject-pay').on('click.planPayReject', '.btn-reject-pay', function () {
                var $btn = $(this);
                var id = parseInt($btn.data('id'), 10) || 0;
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
                        location.reload();
                        return false;
                    });
                });
            });
        },
        itemlist: function () {
            if (!Config.forInvoice) {
                return;
            }
            var planId = parseInt(Config.planId, 10) || 0;
            var refreshSelectedCount = function () {
                var n = $('#plan-invoice-item-table tbody .inv-row-check:checked').length;
                $('#inv-selected-count').text(n);
                var total = $('#plan-invoice-item-table tbody .inv-row-check').length;
                var checked = $('#plan-invoice-item-table tbody .inv-row-check:checked').length;
                $('#inv-check-all').prop('checked', total > 0 && total === checked);
            };
            var readRow = function ($tr) {
                return {
                    order_item_id: parseInt($tr.data('oid'), 10) || 0,
                    name: $.trim($tr.attr('data-name') || $tr.data('name') || ''),
                    origin_place: $.trim($tr.find('.inv-origin-place').val() || ''),
                    invoice_name: $.trim($tr.find('.inv-invoice-name').val() || ''),
                    unit: $.trim($tr.find('.inv-unit').val() || ''),
                    qty: parseFloat($tr.find('.inv-qty').val()),
                    invoice_status: $tr.attr('data-invoice-status') || 'none',
                    invoice_times: parseInt($tr.attr('data-invoice-times'), 10) || 0
                };
            };
            var validateItem = function (item) {
                if (!item.invoice_name) {
                    return '请填写开票品名';
                }
                if (!item.unit) {
                    return '请填写开票单位：' + item.invoice_name;
                }
                if (isNaN(item.qty) || item.qty <= 0) {
                    return '请填写大于 0 的开票数量：' + item.invoice_name;
                }
                if (item.order_item_id <= 0) {
                    return '明细未关联采购物品，无法提交：' + item.invoice_name;
                }
                if (!item.name) {
                    item.name = item.invoice_name;
                }
                return '';
            };
            var submitItems = function (items) {
                if (!items.length) {
                    Layer.msg('请先勾选要开票的物品');
                    return;
                }
                for (var i = 0; i < items.length; i++) {
                    var err = validateItem(items[i]);
                    if (err) {
                        Layer.msg(err);
                        return;
                    }
                }
                var file = $.trim($('#c-invoice-file').val() || '');
                if (!file) {
                    Layer.msg('请先上传发票文件');
                    return;
                }
                var ids = items.map(function (it) { return it.order_item_id; });
                Backend.api.ajax({
                    url: 'purchase/invoice/submit',
                    data: {
                        plan_id: planId,
                        ids: ids.join(','),
                        items: JSON.stringify(items),
                        file: file
                    }
                }, function (data, ret) {
                    var sn = (data && data.batch_sn) ? data.batch_sn : '';
                    Toastr.success((ret && ret.msg) ? ret.msg : ('已提交一张发票' + (sn ? '：' + sn : '')));
                    setTimeout(function () {
                        location.reload();
                    }, 500);
                    return false;
                });
            };
            if ($('.faupload').length) {
                Upload.api.upload($('.faupload'), function (data, ret) {
                    var url = (data && (data.url || data.fullurl)) ? (data.url || data.fullurl) : '';
                    if (url) {
                        $('#c-invoice-file').val(url);
                    }
                    return true;
                });
            }
            refreshSelectedCount();
            $(document).off('change.planInvCheck', '#inv-check-all,.inv-row-check')
                .on('change.planInvCheck', '#inv-check-all', function () {
                    var on = $(this).prop('checked');
                    $('#plan-invoice-item-table tbody .inv-row-check').prop('checked', on);
                    refreshSelectedCount();
                })
                .on('change.planInvCheck', '.inv-row-check', function () {
                    refreshSelectedCount();
                });
            $(document).off('click.planInvPick', '.btn-check-uninvoiced,.btn-check-all-rows,.btn-uncheck-all-rows')
                .on('click.planInvPick', '.btn-check-uninvoiced', function () {
                    $('#plan-invoice-item-table tbody tr[data-oid]').each(function () {
                        var $tr = $(this);
                        var $ck = $tr.find('.inv-row-check');
                        if (!$ck.length) {
                            return;
                        }
                        $ck.prop('checked', ($tr.attr('data-invoice-status') || 'none') !== 'done');
                    });
                    refreshSelectedCount();
                })
                .on('click.planInvPick', '.btn-check-all-rows', function () {
                    $('#plan-invoice-item-table tbody .inv-row-check').prop('checked', true);
                    refreshSelectedCount();
                })
                .on('click.planInvPick', '.btn-uncheck-all-rows', function () {
                    $('#plan-invoice-item-table tbody .inv-row-check').prop('checked', false);
                    refreshSelectedCount();
                });
            $(document).off('click.planInvSel', '.btn-submit-selected-invoice').on('click.planInvSel', '.btn-submit-selected-invoice', function () {
                var items = [];
                $('#plan-invoice-item-table tbody .inv-row-check:checked').each(function () {
                    items.push(readRow($(this).closest('tr')));
                });
                submitItems(items);
            });
        },
        detail: function () {
            bindQuoteForm({withApprove: true});
            bindRefreshParentOnClose();
            // 审批二组：终审详情中可改客户价
            if (Config.canEditCustomerPrice) {
                var saveCprice = function ($input) {
                    var oid = parseInt($input.data('oid'), 10) || 0;
                    if (oid <= 0) {
                        return;
                    }
                    var raw = $.trim($input.val() || '');
                    var n = parseFloat(raw);
                    if (raw !== '' && isNaN(n)) {
                        Toastr.error('客户价格式不正确');
                        $input.val($input.attr('data-orig') || '');
                        return;
                    }
                    var val = raw === '' || isNaN(n) ? '0' : (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
                    if (val !== '') {
                        $input.val(val);
                    }
                    var orig = String($input.attr('data-orig') || '');
                    if (String(val || '0') === String(orig || '0') || (val === '' && orig === '')) {
                        return;
                    }
                    Backend.api.ajax({
                        url: 'purchase/order/savequote/ids/' + oid,
                        data: {customer_price: val === '' ? '0' : val}
                    }, function () {
                        $input.attr('data-orig', val);
                        Toastr.success('客户价已保存');
                        return false;
                    });
                };
                $(document).off('blur.planCprice').on('blur.planCprice', '.fld-customer-price', function () {
                    saveCprice($(this));
                });
                $(document).off('keydown.planCprice').on('keydown.planCprice', '.fld-customer-price', function (e) {
                    if (e.key === 'Enter' || e.which === 13 || e.keyCode === 13) {
                        e.preventDefault();
                        $(this).blur();
                    }
                });
            }
        },
        api: { bindevent: function () { Form.api.bindevent($("form[role=form]")); } }
    };
    return Controller;
});
