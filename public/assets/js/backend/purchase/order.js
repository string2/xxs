define(['jquery', 'bootstrap', 'backend', 'table', 'form', 'template'], function ($, undefined, Backend, Table, Form, Template) {
    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/order/index' + location.search,
                    add_url: 'purchase/order/add',
                    del_url: 'purchase/order/del',
                    table: 'purchase_order',
                }
            });
            var canDeleteCustomerOrder = !!(Config.canDeleteCustomerOrder);
            var table = $("#table");
            var escHtml = function (s) {
                return String(s == null ? '' : s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            };
            var CONFIRM_KEYWORD = '确认删除';
            var openDangerDeleteDialog = function (rows, onOk) {
                rows = rows || [];
                if (!rows.length) {
                    Layer.msg('请先勾选要删除的客户订单');
                    return;
                }
                var listHtml = '';
                var totalItems = 0;
                $.each(rows, function (i, r) {
                    var mark = escHtml(r.title || r.mark || r.sn || ('#' + r.id));
                    var cnt = parseInt(r.item_count, 10) || 0;
                    totalItems += cnt;
                    listHtml += '<li style="margin:2px 0;"><strong>' + mark + '</strong>'
                        + ' <span style="color:#888;">（ID ' + escHtml(r.id) + '，明细 ' + cnt + ' 条）</span></li>';
                });
                var html = ''
                    + '<div class="order-danger-del" style="padding:16px 18px 8px;line-height:1.6;">'
                    + '  <div style="background:#fff5f5;border:1px solid #f5c2c7;border-radius:4px;padding:10px 12px;margin-bottom:12px;color:#842029;">'
                    + '    <div style="font-size:15px;font-weight:700;margin-bottom:6px;"><i class="fa fa-exclamation-triangle"></i> 高危操作 · 不可恢复</div>'
                    + '    <div>将永久删除所选 <strong>' + rows.length + '</strong> 个客户订单，并同步清理：</div>'
                    + '    <ul style="margin:6px 0 0 18px;padding:0;">'
                    + '      <li>采购物品清单全部明细（约 ' + totalItems + ' 条）</li>'
                    + '      <li>关联采购计划 / 付款申请 / 装箱 / 集装箱 / 发票</li>'
                    + '      <li>关联财务账单与回款记录</li>'
                    + '    </ul>'
                    + '  </div>'
                    + '  <div style="margin-bottom:10px;max-height:120px;overflow:auto;border:1px solid #eee;border-radius:4px;padding:8px 10px;background:#fafafa;">'
                    + '    <div style="color:#666;margin-bottom:4px;">即将删除：</div>'
                    + '    <ul style="margin:0;padding-left:18px;">' + listHtml + '</ul>'
                    + '  </div>'
                    + '  <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;font-weight:normal;cursor:pointer;">'
                    + '    <input type="checkbox" class="danger-ack" style="margin-top:3px;">'
                    + '    <span>我已知晓此操作<strong style="color:#c0392b;">不可撤销</strong>，且会影响采购、付款、装箱等下游数据。</span>'
                    + '  </label>'
                    + '  <div style="margin-bottom:4px;">请输入 <code style="color:#c0392b;font-weight:700;">' + CONFIRM_KEYWORD + '</code> 以继续：</div>'
                    + '  <input type="text" class="form-control danger-confirm-input" placeholder="请完整输入：' + CONFIRM_KEYWORD + '" autocomplete="off">'
                    + '  <div class="text-muted" style="margin-top:8px;font-size:12px;">误删无法自动找回，请再次核对唛头后再操作。</div>'
                    + '</div>';
                Layer.open({
                    type: 1,
                    title: '<span style="color:#c0392b;font-weight:700;"><i class="fa fa-bomb"></i> 危险删除确认</span>',
                    area: ['560px', 'auto'],
                    shadeClose: false,
                    content: html,
                    btn: ['永久删除，不可恢复', '取消'],
                    success: function (layero) {
                        var $ok = layero.find('.layui-layer-btn0');
                        $ok.css({
                            background: '#c0392b',
                            borderColor: '#a93226',
                            opacity: 0.45,
                            pointerEvents: 'none'
                        });
                        var sync = function () {
                            var okAck = layero.find('.danger-ack').prop('checked');
                            var okText = $.trim(layero.find('.danger-confirm-input').val() || '') === CONFIRM_KEYWORD;
                            if (okAck && okText) {
                                $ok.css({opacity: 1, pointerEvents: 'auto'});
                            } else {
                                $ok.css({opacity: 0.45, pointerEvents: 'none'});
                            }
                        };
                        layero.on('change keyup input', '.danger-ack, .danger-confirm-input', sync);
                        setTimeout(function () {
                            layero.find('.danger-confirm-input').focus();
                        }, 100);
                        sync();
                    },
                    yes: function (index, layero) {
                        var okAck = layero.find('.danger-ack').prop('checked');
                        var text = $.trim(layero.find('.danger-confirm-input').val() || '');
                        if (!okAck) {
                            Layer.msg('请先勾选「我已知晓此操作不可撤销」');
                            return false;
                        }
                        if (text !== CONFIRM_KEYWORD) {
                            Layer.msg('请完整输入「' + CONFIRM_KEYWORD + '」');
                            return false;
                        }
                        Layer.close(index);
                        if (typeof onOk === 'function') {
                            onOk(CONFIRM_KEYWORD);
                        }
                    }
                });
            };
            var doDeleteOrders = function (ids, confirmText) {
                Backend.api.ajax({
                    url: 'purchase/order/del',
                    data: {ids: ids, confirm_text: confirmText}
                }, function () {
                    table.trigger('uncheckbox');
                    table.bootstrapTable('refresh');
                });
            };
            var operateButtons = [{
                name: 'detail',
                text: '总览',
                title: '采购单详情',
                classname: 'btn btn-xs btn-info btn-purchase-detail',
                icon: 'fa fa-list',
                url: 'purchase/order/detail'
            }];
            if (canDeleteCustomerOrder) {
                operateButtons.push({
                    name: 'del',
                    text: '危险删除',
                    title: '高危：删除客户订单及全部关联数据',
                    classname: 'btn btn-xs btn-danger btn-order-danger-delone',
                    icon: 'fa fa-exclamation-triangle'
                });
            }
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                sortOrder: 'desc',
                escape: false,
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: __('Id'), sortable: true},
                    {field: 'title', title: '唛头', operate: 'LIKE'},
                    {field: 'item_count', title: '明细数', operate: false},
                    {field: 'status', title: '状态', searchList: {"imported":"已导入","preview":"待分发","dispatched":"已分发","closed":"已关闭"}, formatter: Table.api.formatter.status},
                    {field: 'createtime', title: __('Createtime'), operate: 'RANGE', addclass: 'datetimerange', autocomplete: false, formatter: Table.api.formatter.datetime},
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate,
                        buttons: operateButtons,
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
            table.on('load-success.bs.table', function (e, data) {
                var sum = data && (data.sum_item_count != null ? data.sum_item_count : data.sumItemCount);
                var n = parseInt(sum, 10);
                if (isNaN(n)) {
                    n = 0;
                }
                $('#order-sum-item-count').text(n.toLocaleString('en-US'));
            });
            if (canDeleteCustomerOrder) {
                $(document).off('click.orderDangerDel', '.btn-order-danger-del').on('click.orderDangerDel', '.btn-order-danger-del', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var rows = Table.api.selecteddata(table) || [];
                    if (!rows.length) {
                        Layer.msg('请先勾选要删除的客户订单');
                        return false;
                    }
                    openDangerDeleteDialog(rows, function (confirmText) {
                        var ids = $.map(rows, function (r) { return r.id; }).join(',');
                        doDeleteOrders(ids, confirmText);
                    });
                    return false;
                });
                table.off('click.orderDangerDelOne', '.btn-order-danger-delone').on('click.orderDangerDelOne', '.btn-order-danger-delone', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var $tr = $(this).closest('tr');
                    var index = $tr.data('index');
                    var row = table.bootstrapTable('getData')[index] || Table.api.getrowbyid(table, $(this).data('id'));
                    if (!row) {
                        Layer.msg('未找到该订单，请刷新后重试');
                        return false;
                    }
                    openDangerDeleteDialog([row], function (confirmText) {
                        doDeleteOrders(row.id, confirmText);
                    });
                    return false;
                });
                // 勾选时启用工具栏危险删除按钮
                table.on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
                    var ids = Table.api.selectedids(table);
                    $('.toolbar .btn-order-danger-del').toggleClass('btn-disabled disabled', ids.length === 0);
                });
            }
            table.on('click', '.btn-purchase-detail', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var url = $(this).attr('href');
                if (!url || url === 'javascript:;') {
                    return false;
                }
                Fast.api.open(url, '采购单详情', {
                    area: ['95%', '95%'],
                    end: function () {
                        table.bootstrapTable('refresh');
                    }
                });
                return false;
            });
        },
        add: function () {
            var previewReady = false;
            var canViewCustomerPrice = !!(Config.canViewCustomerPrice);
            if (!canViewCustomerPrice) {
                $('#th-customer-price').hide();
            }
            var esc = function (s) {
                return String(s == null ? '' : s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            };
            var markDuplicated = false;
            var setMarkDupTip = function (exists, mark) {
                markDuplicated = !!exists;
                var $tip = $('#mark-dup-tip');
                if (exists && mark) {
                    $tip.text('唛头「' + mark + '」已存在，请勿重复').show();
                    $('#c-title').css('border-color', '#dd4b39');
                } else {
                    $tip.hide().text('');
                    $('#c-title').css('border-color', '');
                }
            };
            var checkMarkUnique = function (mark, silent) {
                mark = $.trim(mark || '');
                if (!mark) {
                    setMarkDupTip(false, '');
                    return;
                }
                Backend.api.ajax({
                    url: 'purchase/order/checkmark',
                    data: {title: mark}
                }, function (data) {
                    var exists = !!(data && data.exists);
                    setMarkDupTip(exists, mark);
                    if (exists && !silent) {
                        Layer.msg('唛头「' + mark + '」已存在，请勿重复');
                    }
                    return false;
                }, function () {
                    return false;
                });
            };
            var previewColspan = canViewCustomerPrice ? 13 : 12;
            var renderPreview = function (data) {
                var $body = $('#import-preview-body');
                $body.empty();
                $('#import-preview-empty').hide();
                $('#preview-meta').show();
                if (!data || !data.items || !data.items.length) {
                    $body.html('<tr><td colspan="' + previewColspan + '" class="text-muted text-center">未解析到明细</td></tr>');
                    $('#import-preview-table-box').show();
                    previewReady = false;
                    return;
                }
                $('#preview-table-name').text(data.table_name || '-');
                $('#preview-count').text(data.count || data.items.length);
                $('#preview-image-count').text(data.image_count || 0);
                var statusText = '确认无误后点击确定导入';
                var unmatched = data.unmatched_buyers || [];
                if (unmatched.length) {
                    statusText += '；未匹配采购人：' + unmatched.join('、') + '（需与「采购负责人组」账号昵称一致）';
                } else if ((data.matched_buyer_count || 0) > 0) {
                    statusText += '；已按采购人匹配负责人 ' + data.matched_buyer_count + ' 条';
                }
                $('#preview-status').text(statusText);
                // 唛头输入框为空时，用 Excel 提取结果回填
                if (data.table_name && !$.trim($('#c-title').val() || '')) {
                    $('#c-title').val(data.table_name);
                } else if ($.trim($('#c-title').val() || '')) {
                    $('#preview-table-name').text($.trim($('#c-title').val()));
                }
                var curMark = $.trim($('#c-title').val() || data.table_name || '');
                if (data.mark_duplicated || false) {
                    setMarkDupTip(true, curMark);
                } else {
                    checkMarkUnique(curMark, true);
                }
                var cellMore = function (cls, text, label) {
                    var t = text == null ? '' : String(text);
                    var extra = t.length > 12 ? ' cell-more' : '';
                    var tip = t ? (' title="点击查看完整' + label + '"') : '';
                    return '<td class="' + cls + extra + '"' + tip + ' data-full="' + esc(t) + '" data-label="' + esc(label) + '">' + (t ? esc(t) : '-') + '</td>';
                };
                var html = [];
                $.each(data.items, function (i, it) {
                    var img = '-';
                    if (it.image) {
                        var url = Fast.api.cdnurl(it.image);
                        img = '<a href="' + url + '" target="_blank"><img src="' + url + '" style="max-height:36px;max-width:48px;"></a>';
                    }
                    var cprice = parseFloat(it.customer_price);
                    var cpriceText = (!isNaN(cprice) && cprice > 0) ? cprice.toFixed(2) : '-';
                    var cpriceTd = canViewCustomerPrice ? ('<td class="col-cprice">' + esc(cpriceText) + '</td>') : '';
                    var buyer = $.trim(it.buyer_name || '');
                    var buyerAdmin = $.trim(it.buyer_admin_name || '');
                    var buyerAdminTd = buyerAdmin
                        ? ('<td class="col-buyer-admin" style="color:#3c8dbc;">' + esc(buyerAdmin) + '</td>')
                        : '<td class="col-buyer-admin text-muted">-</td>';
                    html.push('<tr>' +
                        '<td class="col-line">' + esc(it.line_no) + '</td>' +
                        '<td class="col-mark" title="' + esc(it.mark) + '">' + esc(it.mark) + '</td>' +
                        '<td class="col-cat" title="' + esc(it.category_name) + '">' + esc(it.category_name) + '</td>' +
                        cellMore('col-name', it.name, '名称') +
                        cellMore('col-spec', it.spec, '规格型号') +
                        '<td class="col-unit">' + esc(it.unit) + '</td>' +
                        '<td class="col-qty">' + esc(it.qty) + '</td>' +
                        cpriceTd +
                        '<td class="col-img">' + img + '</td>' +
                        '<td class="col-buyer">' + (buyer ? esc(buyer) : '-') + '</td>' +
                        buyerAdminTd +
                        cellMore('col-remark', it.remark, '备注') +
                        cellMore('col-export', it.export_require, '出口监管') +
                        '</tr>');
                });
                $body.html(html.join(''));
                $('#import-preview-table-box').show();
                previewReady = true;
            };
            var clearPreview = function () {
                previewReady = false;
                $('#import-preview-table-box').hide();
                $('#import-preview-empty').show();
                $('#preview-meta').hide();
                $('#import-preview-body').empty();
                $('#preview-table-name').text('-');
                $('#preview-count').text('0');
                $('#preview-image-count').text('0');
                $('#preview-status').text('');
            };
            var loadPreview = function (path) {
                path = $.trim(path || '');
                if (!path) {
                    clearPreview();
                    return;
                }
                $('#import-preview-empty').hide();
                $('#preview-meta').show();
                $('#preview-status').text('正在解析…');
                $('#import-preview-table-box').show();
                $('#import-preview-body').html('<tr><td colspan="' + previewColspan + '" class="text-muted text-center">正在解析，请稍候…</td></tr>');
                Backend.api.ajax({
                    url: 'purchase/order/previewimport',
                    data: {attachment: path}
                }, function (data) {
                    renderPreview(data);
                    return false;
                }, function () {
                    previewReady = false;
                    $('#preview-status').text('解析失败，请检查文件');
                    $('#import-preview-body').html('<tr><td colspan="' + previewColspan + '" class="text-danger text-center">解析失败</td></tr>');
                    return false;
                });
            };

            Form.api.bindevent($("form[role=form]"), function (data, ret) {
                var id = (data && data.id) ? data.id : (ret.data && ret.data.id);
                if (window.parent && window.parent.$ && window.parent.$("#table").length) {
                    window.parent.$("#table").bootstrapTable('refresh');
                }
                if (id) {
                    setTimeout(function () {
                        var openWin = (window.parent && window.parent.Backend) ? window.parent : window;
                        openWin.Backend.api.open('purchase/order/detail?ids=' + id, '采购单详情', {
                            area: ['95%', '95%'],
                            end: function () {
                                if (window.parent && window.parent.$ && window.parent.$("#table").length) {
                                    window.parent.$("#table").bootstrapTable('refresh');
                                }
                            }
                        });
                    }, 300);
                }
                return true;
            }, function () {
                // before submit
                if (!previewReady) {
                    Layer.msg('请先上传文件并等待预览完成');
                    return false;
                }
                var mark = $.trim($('#c-title').val() || '');
                if (!mark) {
                    Layer.msg('请填写唛头');
                    return false;
                }
                if (markDuplicated) {
                    Layer.msg('唛头「' + mark + '」已存在，请勿重复');
                    return false;
                }
                return true;
            });

            // 手改唛头时，同步预览区并校验唯一
            var markCheckTimer = null;
            $(document).on('input', '#c-title', function () {
                var v = $.trim($(this).val() || '');
                if (v) {
                    $('#preview-table-name').text(v);
                }
                clearTimeout(markCheckTimer);
                markCheckTimer = setTimeout(function () {
                    checkMarkUnique(v, true);
                }, 400);
            });
            $(document).on('blur', '#c-title', function () {
                checkMarkUnique($(this).val(), false);
            });

            // 点击备注/规格等查看完整内容
            $(document).off('click.importCellMore', '#import-preview-body td.cell-more')
                .on('click.importCellMore', '#import-preview-body td.cell-more', function () {
                    var full = $(this).attr('data-full') || '';
                    var label = $(this).attr('data-label') || '详情';
                    if (!full) {
                        return;
                    }
                    Layer.open({
                        type: 1,
                        title: label,
                        area: ['520px', '360px'],
                        shadeClose: true,
                        content: '<div style="padding:16px;line-height:1.7;word-break:break-all;white-space:pre-wrap;">' + esc(full) + '</div>'
                    });
                });

            // 上传成功 / 路径变化后拉预览
            $(document).on('change', '#c-attachment', function () {
                loadPreview($(this).val());
            });
            // faupload 成功后有时只改 value 不触发 change
            var lastPath = '';
            setInterval(function () {
                var v = $('#c-attachment').val() || '';
                if (v !== lastPath) {
                    lastPath = v;
                    loadPreview(v);
                }
            }, 600);
        },
        detail: function () {
            var refreshParentList = function () {
                try {
                    if (window.parent && window.parent.$ && window.parent.$("#table").length) {
                        window.parent.$("#table").bootstrapTable('refresh');
                    }
                } catch (e) {
                }
            };
            $(window).on('unload', refreshParentList);
            $(document).on('click', '.btn-close-detail', function () {
                refreshParentList();
                if (window.parent && window.parent.Layer) {
                    var index = parent.Layer.getFrameIndex(window.name);
                    parent.Layer.close(index);
                } else {
                    location.href = Fast.api.fixurl('purchase/order');
                }
            });
            $(document).on('click', '.btn-dispatch', function () {
                var id = $(this).data('id');
                var assign = {};
                var missing = [];
                $('.assign-buyer').each(function () {
                    var $sel = $(this);
                    var $item = $sel.closest('.po-assign-item');
                    var cid = $sel.data('category-id');
                    var uid = parseInt($sel.val(), 10) || 0;
                    assign[cid] = uid;
                    if (!uid) {
                        var name = $item.find('[data-cat-name]').data('cat-name') || $item.find('.cat-name').text() || '';
                        missing.push($.trim(String(name)));
                        $item.addClass('is-unset');
                    } else {
                        $item.removeClass('is-unset');
                    }
                });
                if (missing.length) {
                    Layer.msg('请先为分类选择采购负责人：' + missing.join('、'));
                    return;
                }
                Layer.confirm('确认按当前安排分发给各采购负责人？', function (index) {
                    Backend.api.ajax({
                        url: 'purchase/order/dispatch/ids/' + id,
                        data: {assign: assign}
                    }, function () {
                        Layer.close(index);
                        refreshParentList();
                        setTimeout(function () {
                            if (window.parent && window.parent.Layer) {
                                var frameIndex = parent.Layer.getFrameIndex(window.name);
                                parent.Layer.close(frameIndex);
                            } else {
                                location.reload();
                            }
                        }, 500);
                        return false;
                    });
                });
            });
            $(document).on('change', '.assign-buyer', function () {
                var $item = $(this).closest('.po-assign-item');
                if (parseInt($(this).val(), 10) > 0) {
                    $item.removeClass('is-unset');
                } else {
                    $item.addClass('is-unset');
                }
            });
            $(document).on('change', '.btn-change-cat', function () {
                var id = $(this).data('id');
                var category_id = $(this).val();
                Backend.api.ajax({url: 'purchase/order/updateitem/ids/' + id, data: {category_id: category_id}});
            });
        },
        myitems: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/order/myitems',
                    table: 'purchase_order_item',
                }
            });
            var table = $("#table");

            var canEdit = function (row) {
                return !!row.quote_editable;
            };
            var canViewCustomerPrice = !!(Config.canViewCustomerPrice);
            // 能查看客户价的组即可修改
            var canEditCustomerPrice = canViewCustomerPrice || !!(Config.canEditCustomerPrice);
            var canEditExportRequire = !!(Config.canEditExportRequire);
            var esc = function (v) {
                return Fast.api.escape(v === null || v === undefined ? '' : String(v));
            };
            var disp = function (value) {
                return value === null || value === undefined || value === '' ? '-' : esc(value);
            };
            var fmtQty = function (value) {
                if (value === null || value === undefined || value === '') {
                    return '';
                }
                var n = parseFloat(value);
                if (isNaN(n)) {
                    return '';
                }
                return String(Math.round(n));
            };
            var fmtPrice = function (value) {
                if (value === null || value === undefined || value === '') {
                    return '';
                }
                var n = parseFloat(value);
                if (isNaN(n)) {
                    return '';
                }
                return n.toFixed(2);
            };
            // 采购价：最多 6 位小数，保证大数量商品按总价反算时仍可精确到分
            var fmtPriceInput = function (value) {
                if (value === null || value === undefined || value === '') {
                    return '';
                }
                var n = parseFloat(value);
                if (isNaN(n)) {
                    return '';
                }
                var s = n.toFixed(6);
                return s.replace(/\.?0+$/, '');
            };
            // 客户价 / 附加费 / 采购总价：最多 2 位小数，去尾零
            var fmtMoneyInput = function (value) {
                if (value === null || value === undefined || value === '') {
                    return '';
                }
                var n = parseFloat(value);
                if (isNaN(n)) {
                    return '';
                }
                var s = n.toFixed(2);
                return s.replace(/\.?0+$/, '');
            };

            var updateStatusTabs = function (counts) {
                counts = counts || {};
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
                    $a.html($a.data('label') + ' <span class="badge">' + n + '</span>');
                });
            };

            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                escape: false,
                clickToSelect: true,
                pageList: [10, 15, 20, 25, 50, 100, 200],
                // 不用插件固定列（与横向滚动条叠加会错位/露出附件列），改用 CSS sticky 钉住操作列
                fixedColumns: false,
                responseHandler: function (res) {
                    if (res && res.extend && res.extend.statusCount) {
                        updateStatusTabs(res.extend.statusCount);
                    }
                    return res;
                },
                rowStyle: function (row) {
                    if (row.purchase_status === 'approve1' || row.purchase_status === 'approve2') {
                        return {classes: 'text-muted'};
                    }
                    return {};
                },
                columns: [[
                    {
                        checkbox: true
                        // 可勾选：提交审批 / 标记入仓 / 录入打包 等操作由各自按钮校验状态
                    },
                    {field: 'id', title: 'ID', width: 52, class: 'col-myitems-id'},
                    {
                        field: 'line_no', title: '序号', operate: false, sortable: true, width: 56, class: 'col-myitems-lineno',
                        formatter: function (value) {
                            var lineNo = parseInt(value, 10);
                            return (!isNaN(lineNo) && lineNo > 0) ? String(lineNo) : '-';
                        }
                    },
                    {
                        field: 'export_require', title: '出口监管', operate: 'LIKE', clickToSelect: false, width: 88,
                        class: 'col-myitems-export',
                        formatter: function (value, row) {
                            var text = value == null ? '' : String(value);
                            var short = text.length > 8 ? text.substr(0, 8) + '…' : text;
                            if (canEditExportRequire) {
                                if (!text) {
                                    return '<a href="javascript:;" class="btn-edit-export-require" data-id="' + row.id + '" title="编辑出口监管"><span class="text-muted">填写</span> <i class="fa fa-pencil"></i></a>';
                                }
                                return '<a href="javascript:;" class="btn-edit-export-require" data-id="' + row.id + '" title="' + esc(text) + '">' + esc(short) + ' <i class="fa fa-pencil"></i></a>';
                            }
                            if (!text) {
                                return '-';
                            }
                            var more = text.length > 8 ? ' cell-export-more' : '';
                            return '<span class="myitems-export-text' + more + '" title="' + esc(text) + '" data-full="' + esc(text) + '">' + esc(short) + '</span>';
                        }
                    },
                    {
                        field: 'mark', title: '唛头', operate: 'LIKE', width: 180, class: 'col-myitems-mark',
                        formatter: function (value) {
                            var mark = value == null ? '' : String(value);
                            if (!mark) {
                                return '-';
                            }
                            return '<span class="myitems-mark-text">' + esc(mark) + '</span>';
                        }
                    },
                    {
                        field: 'batch_contract_no', title: '合同编号', operate: 'LIKE', width: 130, class: 'col-myitems-contract',
                        formatter: function (value) {
                            var no = value == null ? '' : String(value);
                            return no ? '<span class="myitems-ellip" title="' + esc(no) + '">' + esc(no) + '</span>' : '-';
                        }
                    },
                    {
                        field: 'category_name', title: '分类', operate: 'LIKE', width: 56, class: 'col-myitems-cat',
                        formatter: function (value) {
                            var text = value == null ? '' : String(value);
                            if (!text) {
                                return '-';
                            }
                            return '<span class="myitems-ellip" title="' + esc(text) + '">' + esc(text) + '</span>';
                        }
                    },
                    {
                        field: 'name', title: '名称', operate: 'LIKE', width: 100, class: 'col-myitems-name',
                        formatter: function (value) {
                            var text = value == null ? '' : String(value);
                            if (!text) {
                                return '-';
                            }
                            return '<span class="myitems-ellip cell-name-more" title="点击查看完整名称" data-full="' + esc(text) + '">' + esc(text) + '</span>';
                        }
                    },
                    {
                        field: 'spec', title: '规格', operate: 'LIKE', width: 120, class: 'col-myitems-spec',
                        cellStyle: function () {
                            return {css: {'max-width': '120px', 'width': '120px', 'white-space': 'normal', 'word-break': 'break-all'}};
                        },
                        formatter: function (value) {
                            var text = value == null ? '' : String(value);
                            if (!text) {
                                return '-';
                            }
                            var short = text.length > 22 ? text.substr(0, 22) + '…' : text;
                            var more = text.length > 22 ? ' cell-spec-more' : '';
                            return '<span class="myitems-spec-text' + more + '" title="' + esc(text) + '" data-full="' + esc(text) + '">' + esc(short) + '</span>';
                        }
                    },
                    {
                        field: 'image', title: '图片', operate: false, clickToSelect: false, width: 52, class: 'col-myitems-img',
                        formatter: function (value) {
                            if (!value) {
                                return '-';
                            }
                            var url = Fast.api.cdnurl(value);
                            return '<a href="javascript:" class="myitems-img-preview" title="预览图片">' +
                                '<img src="' + url + '" alt="" style="max-height:36px;max-width:48px;object-fit:cover;border-radius:2px;vertical-align:middle;cursor:pointer;">' +
                                '</a>';
                        }
                    },
                    {
                        field: 'purchase_status', title: '物品状态', width: 80, class: 'col-myitems-status',
                        searchList: {
                            "tosubmit": "待提交",
                            "pending": "未报价",
                            "quoted": "已报价",
                            "approve1": "初审中",
                            "approve2": "终审中",
                            "rejected": "已驳回",
                            "approved": "已审批",
                            "boxed": "已装箱",
                            "inbound": "已入仓"
                        },
                        formatter: function (value) {
                            var map = {
                                pending: ['default', '未报价'],
                                quoted: ['warning', '已报价'],
                                approve1: ['primary', '初审中'],
                                approve2: ['primary', '终审中'],
                                rejected: ['danger', '已驳回'],
                                approved: ['info', '已审批'],
                                inbound: ['success', '已入仓'],
                                boxed: ['success', '已装箱']
                            };
                            var item = map[value] || map.pending;
                            return '<span class="label label-' + item[0] + '">' + item[1] + '</span>';
                        }
                    },
                    {
                        field: 'qty', title: '数量', operate: false, clickToSelect: false, width: 56, class: 'col-myitems-qty',
                        formatter: function (value) {
                            var q = fmtQty(value);
                            return q === '' ? '-' : q;
                        }
                    },
                    {field: 'unit', title: '单位', width: 56, class: 'col-myitems-unit'},
                    {
                        field: 'factory_name', title: '供应商', operate: 'LIKE', clickToSelect: false, width: 140, class: 'col-myitems-factory',
                        formatter: function (value, row) {
                            var name = value == null ? '' : String(value);
                            var fid = parseInt(row.factory_id, 10) > 0 ? String(row.factory_id) : '';
                            if (!canEdit(row)) {
                                return name ? ('<span class="myitems-ellip" title="' + esc(name) + '">' + esc(name) + '</span>') : '-';
                            }
                            return '<input type="text" class="form-control input-sm selectpage fld-factory" ' +
                                'data-source="trade/factory/index" data-primary-key="id" data-field="name" ' +
                                'data-search-field="name" data-and-or="OR" ' +
                                'data-params=\'{"custom[status]":"normal"}\' data-pagination="true" data-page-size="20" ' +
                                'data-no-result-clean="true" ' +
                                'data-row-id="' + row.id + '" data-orig-factory-id="' + esc(fid) + '" data-orig-factory="' + esc(name) + '" ' +
                                'value="' + esc(fid) + '" style="min-width:120px;max-width:140px;" placeholder="搜索供应商">';
                        }
                    },
                    {
                        field: 'purchase_image', title: '采购图片', operate: false, clickToSelect: false, width: 88, class: 'col-myitems-pimg',
                        formatter: function (value, row) {
                            var path = value || '';
                            var preview = '-';
                            if (path) {
                                var url = Fast.api.cdnurl(path);
                                preview = '<a href="javascript:" class="myitems-img-preview" title="预览采购图片">' +
                                    '<img src="' + url + '" alt="" style="max-height:36px;max-width:48px;object-fit:cover;border-radius:2px;vertical-align:middle;cursor:pointer;">' +
                                    '</a>';
                            }
                            if (!canEdit(row)) {
                                return preview;
                            }
                            return '<div class="fld-pimg-wrap" style="min-width:72px;white-space:nowrap;">' +
                                '<input type="hidden" class="fld-purchase-image" data-row-id="' + row.id + '" data-orig-purchase-image="' + esc(path) + '" value="' + esc(path) + '">' +
                                '<span class="fld-pimg-preview">' + preview + '</span> ' +
                                '<a href="javascript:;" class="btn btn-xs btn-default btn-upload-pimg" data-row-id="' + row.id + '" title="上传采购图片"><i class="fa fa-upload"></i></a>' +
                                (path ? ' <a href="javascript:;" class="btn btn-xs btn-default btn-clear-pimg" data-row-id="' + row.id + '" title="清除"><i class="fa fa-times"></i></a>' : '') +
                                '</div>';
                        }
                    },
                    {
                        field: 'purchase_note', title: '采购说明', operate: false, clickToSelect: false, width: 110, class: 'col-myitems-note',
                        formatter: function (value, row) {
                            if (!canEdit(row)) {
                                if (!value) {
                                    return '-';
                                }
                                var text = String(value);
                                var short = text.length > 16 ? text.substr(0, 16) + '…' : text;
                                return '<span class="myitems-ellip" title="' + esc(text) + '">' + esc(short) + '</span>';
                            }
                            return '<input type="text" class="form-control input-sm fld-purchase-note" data-row-id="' + row.id + '" ' +
                                'data-orig-purchase-note="' + esc(value || '') + '" value="' + esc(value || '') + '" style="min-width:90px;max-width:110px;" placeholder="采购说明">';
                        }
                    },
                    {
                        field: 'price', title: '采购价', operate: false, clickToSelect: false, width: 80, class: 'col-myitems-price',
                        formatter: function (value, row) {
                            var p = fmtPriceInput(value);
                            if (!canEdit(row)) {
                                return p === '' ? '-' : p;
                            }
                            return '<input type="text" class="form-control input-sm fld-price" data-row-id="' + row.id + '" ' +
                                'data-orig-price="' + esc(p) + '" value="' + esc(p) + '" style="width:72px;" placeholder="采购价">';
                        }
                    },
                    {
                        field: 'history_price', title: '历史价', operate: false, clickToSelect: false, width: 70, class: 'col-myitems-hprice',
                        formatter: function (value, row) {
                            var p = fmtPrice(value);
                            var name = row.name || '';
                            if (p === '' || !name) {
                                return '-';
                            }
                            var hist = parseFloat(value);
                            var cur = parseFloat(row.price);
                            var warn = !isNaN(hist) && hist > 0 && !isNaN(cur) && cur > hist;
                            return '<a href="javascript:;" class="fld-history-price btn-history-price" ' +
                                'data-row-id="' + row.id + '" data-name="' + esc(name) + '" data-history="' + hist + '"' +
                                ' title="点击查看同名称历史采购价"' +
                                (warn ? ' style="color:#dd4b39;font-weight:600;"' : '') + '>' + p + '</a>';
                        }
                    },
                    {
                        field: 'customer_price', title: '客户价', operate: false, clickToSelect: false, width: 80, class: 'col-myitems-cprice',
                        visible: canViewCustomerPrice || canEditCustomerPrice,
                        formatter: function (value, row) {
                            var p = fmtMoneyInput(value);
                            if (canEditCustomerPrice) {
                                return '<input type="text" class="form-control input-sm fld-customer-price" data-row-id="' + row.id + '" ' +
                                    'data-orig-customer-price="' + esc(p) + '" value="' + esc(p) + '" style="width:72px;" placeholder="客户价">';
                            }
                            var show = fmtPrice(value);
                            return show === '' ? '-' : show;
                        }
                    },
                    {
                        field: 'purchase_amount', title: '采购总价', operate: false, clickToSelect: false, width: 88, class: 'col-myitems-amount',
                        formatter: function (value, row) {
                            var price = parseFloat(row.price);
                            var qty = parseFloat(row.qty);
                            var total = (!isNaN(price) && !isNaN(qty)) ? price * qty : NaN;
                            var p = isNaN(total) ? '' : fmtMoneyInput(Math.round(total * 100) / 100);
                            if (!canEdit(row)) {
                                var text = isNaN(total) ? '-' : fmtPrice(total);
                                return text === '' ? '-' : text;
                            }
                            return '<input type="text" class="form-control input-sm fld-purchase-amount" data-row-id="' + row.id + '" ' +
                                'data-orig-purchase-amount="' + esc(p) + '" value="' + esc(p) + '" style="width:84px;" placeholder="采购总价">';
                        }
                    },
                    {
                        field: 'extra_fee', title: '附加费', operate: false, clickToSelect: false, width: 80, class: 'col-myitems-xfee',
                        formatter: function (value, row) {
                            var p = fmtMoneyInput(value);
                            if (!canEdit(row)) {
                                return p === '' || p === '0' ? '-' : p;
                            }
                            return '<input type="text" class="form-control input-sm fld-extra-fee" data-row-id="' + row.id + '" ' +
                                'data-orig-extra-fee="' + esc(p) + '" value="' + esc(p) + '" style="width:72px;" placeholder="附加费">';
                        }
                    },
                    {
                        field: 'extra_fee_reason', title: '附加原因', operate: false, clickToSelect: false, width: 100, class: 'col-myitems-xreason',
                        formatter: function (value, row) {
                            if (!canEdit(row)) {
                                if (!value) {
                                    return '-';
                                }
                                var text = String(value);
                                var short = text.length > 12 ? text.substr(0, 12) + '…' : text;
                                return '<span class="myitems-ellip" title="' + esc(text) + '">' + esc(short) + '</span>';
                            }
                            return '<input type="text" class="form-control input-sm fld-extra-fee-reason" data-row-id="' + row.id + '" ' +
                                'data-orig-extra-fee-reason="' + esc(value || '') + '" value="' + esc(value || '') + '" style="min-width:80px;max-width:100px;" placeholder="附加原因">';
                        }
                    },
                    {
                        field: 'contract', title: '附件', operate: false, clickToSelect: false, width: 56, class: 'col-myitems-attach',
                        formatter: function (value) {
                            if (!value) {
                                return '-';
                            }
                            var parts = String(value).split(',').map(function (s) {
                                return $.trim(s);
                            }).filter(Boolean);
                            if (!parts.length) {
                                return '-';
                            }
                            return parts.map(function (path, idx) {
                                var url = Fast.api.cdnurl(path);
                                var isImg = /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(path);
                                if (isImg) {
                                    return '<a href="javascript:" class="myitems-img-preview" title="预览附件' + (parts.length > 1 ? (idx + 1) : '') + '" style="margin-right:4px;">' +
                                        '<img src="' + url + '" alt="" style="max-height:36px;max-width:48px;object-fit:cover;border-radius:2px;vertical-align:middle;cursor:pointer;">' +
                                        '</a>';
                                }
                                return '<a href="' + url + '" target="_blank" title="打开附件' + (parts.length > 1 ? (idx + 1) : '') + '" class="text-info" style="margin-right:6px;"><i class="fa fa-file-o"></i>' +
                                    (parts.length > 1 ? (' ' + (idx + 1)) : '') + '</a>';
                            }).join('');
                        }
                    },
                    {
                        field: 'remark', title: '备注', operate: false, clickToSelect: false,
                        width: 90, class: 'col-myitems-remark',
                        cellStyle: function () {
                            return {css: {'max-width': '90px', 'width': '90px', 'white-space': 'nowrap'}};
                        },
                        formatter: function (value) {
                            var text = value == null ? '' : String(value);
                            if (!text) {
                                return '-';
                            }
                            var short = text.length > 10 ? text.substr(0, 10) + '…' : text;
                            return '<span class="myitems-remark-text cell-remark-more" title="点击查看完整备注" data-full="' + esc(text) + '">' + esc(short) + '</span>';
                        }
                    },
                    {
                        field: 'buyer_admin_id', title: '采购人', width: 64, class: 'col-myitems-buyer',
                        searchList: Config.buyerSearchList || {},
                        formatter: function (value, row) {
                            return row.buyer_name ? ('<span class="myitems-ellip" title="' + esc(row.buyer_name) + '">' + esc(row.buyer_name) + '</span>') : '-';
                        }
                    },
                    {
                        field: 'createtime', title: '创建时间', operate: 'RANGE', addclass: 'datetimerange', width: 128, class: 'col-myitems-time',
                        autocomplete: false, formatter: Table.api.formatter.datetime
                    },
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate,
                        clickToSelect: false,
                        width: 50,
                        buttons: [{
                            name: 'edititem',
                            text: '',
                            title: '编辑明细',
                            classname: 'btn btn-xs btn-success btn-dialog',
                            icon: 'fa fa-pencil',
                            url: 'purchase/order/edititem',
                            extend: 'data-area=\'["900px","100%"]\'',
                            visible: function (row) {
                                return !!row.quote_editable;
                            }
                        }],
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
            // 首屏按默认「待提交」页签筛选
            setTimeout(function () {
                var $tab = $('.panel-heading [data-field] li.active a[data-toggle="tab"]');
                if ($tab.length && String($tab.data('value') || '') !== '') {
                    $tab.trigger('shown.bs.tab');
                }
            }, 0);

            var getRowById = function (rowId) {
                var rows = table.bootstrapTable('getData') || [];
                for (var i = 0; i < rows.length; i++) {
                    if (String(rows[i].id) === String(rowId)) {
                        return rows[i];
                    }
                }
                return null;
            };

            var resolveRowId = function (el) {
                var $el = $(el);
                var rowId = $el.data('row-id');
                if (rowId) {
                    return rowId;
                }
                rowId = $el.closest('.sp_container').find('[data-row-id]').first().data('row-id');
                if (rowId) {
                    return rowId;
                }
                return $el.closest('td').find('[data-row-id]').first().data('row-id');
            };

            // 取主表体内的输入（排除右侧固定列克隆）
            var findRowField = function (cls, rowId) {
                var $all = $(cls + '[data-row-id="' + rowId + '"]');
                if (!$all.length) {
                    return $();
                }
                var $main = $all.filter(function () {
                    return $(this).closest('.fixed-columns-right').length === 0;
                });
                var $set = $main.length ? $main : $all;
                var $focus = $set.filter(':focus');
                if ($focus.length) {
                    return $focus.first();
                }
                var $vis = $set.filter(':visible');
                return ($vis.length ? $vis : $set).last();
            };

            var normPrice = function (v) {
                return fmtPriceInput(v);
            };
            var normMoney = function (v) {
                return fmtMoneyInput(v);
            };

            // 供应商：selectpage 可按关键字搜索；允许清空（空=未选供应商）
            var getFactoryValue = function (rowId) {
                var $factory = findRowField('.fld-factory', rowId);
                var id = '';
                var name = '';
                if ($factory.length) {
                    id = $.trim($factory.val() || '');
                    var $wrap = $factory.next('.sp_container');
                    if (!$wrap.length) {
                        $wrap = $factory.closest('td').find('.sp_container').first();
                    }
                    var $spInput = $wrap.find('.sp_input');
                    if ($spInput.length) {
                        name = $.trim($spInput.val() || '');
                    }
                    // 有控件时以控件为准：清空后不要回退到行上旧供应商
                    if (!id) {
                        name = '';
                    }
                    return {id: id, name: name};
                }
                var row = getRowById(rowId);
                if (row) {
                    if (parseInt(row.factory_id, 10) > 0) {
                        id = String(row.factory_id);
                    }
                    if (row.factory_name) {
                        name = String(row.factory_name);
                    }
                }
                return {id: id, name: name};
            };

            var readRowInputs = function (rowId) {
                var row = getRowById(rowId) || {};
                var $price = findRowField('.fld-price', rowId);
                var $note = findRowField('.fld-purchase-note', rowId);
                var $pimg = findRowField('.fld-purchase-image', rowId);
                var $factory = findRowField('.fld-factory', rowId);
                var $extraFee = findRowField('.fld-extra-fee', rowId);
                var $extraReason = findRowField('.fld-extra-fee-reason', rowId);
                var $exportReq = findRowField('.fld-export-require', rowId);
                var $cprice = findRowField('.fld-customer-price', rowId);
                var priceRaw = $price.length ? $price.val() : '';
                var price = normPrice(priceRaw);
                var customerPrice = '';
                if (canEditCustomerPrice && $cprice.length) {
                    customerPrice = normMoney($cprice.val());
                } else if (canViewCustomerPrice || canEditCustomerPrice) {
                    customerPrice = normMoney(row.customer_price);
                }
                var factoryVal = getFactoryValue(rowId);
                var factoryId = factoryVal.id || '';
                var factoryName = factoryVal.name || '';
                var purchaseNote = $note.length ? $note.val() : String(row.purchase_note || '');
                var purchaseImage = $pimg.length ? $.trim($pimg.val() || '') : String(row.purchase_image || '');
                var extraFee = $extraFee.length ? normMoney($extraFee.val()) : normMoney(row.extra_fee);
                var extraFeeReason = $extraReason.length ? $extraReason.val() : String(row.extra_fee_reason || '');
                var exportRequire = $exportReq.length ? $exportReq.val() : String(row.export_require || '');
                var origPrice = $price.length ? normPrice($price.attr('data-orig-price')) : normPrice(row.price);
                var origCprice = $cprice.length
                    ? normMoney($cprice.attr('data-orig-customer-price'))
                    : normMoney(row.customer_price);
                var origFactoryId = $factory.length
                    ? $.trim($factory.attr('data-orig-factory-id') || '')
                    : (parseInt(row.factory_id, 10) > 0 ? String(row.factory_id) : '');
                var origNote = $note.length ? String($note.attr('data-orig-purchase-note') || '') : String(row.purchase_note || '');
                var origPimg = $pimg.length ? String($pimg.attr('data-orig-purchase-image') || '') : String(row.purchase_image || '');
                var origExtraFee = $extraFee.length ? normMoney($extraFee.attr('data-orig-extra-fee')) : normMoney(row.extra_fee);
                var origExtraReason = $extraReason.length
                    ? String($extraReason.attr('data-orig-extra-fee-reason') || '')
                    : String(row.extra_fee_reason || '');
                var origExport = $exportReq.length
                    ? String($exportReq.attr('data-orig-export-require') || '')
                    : String(row.export_require || '');
                return {
                    factory_id: factoryId,
                    factory_name: factoryName,
                    price: price,
                    customer_price: customerPrice,
                    purchase_note: purchaseNote,
                    purchase_image: purchaseImage,
                    extra_fee: extraFee,
                    extra_fee_reason: extraFeeReason,
                    export_require: exportRequire,
                    priceDirty: price !== origPrice,
                    customerPriceDirty: String(customerPrice || '') !== String(origCprice || ''),
                    factoryDirty: String(factoryId || '') !== String(origFactoryId || ''),
                    noteDirty: String(purchaseNote || '') !== origNote,
                    pimgDirty: String(purchaseImage || '') !== origPimg,
                    extraFeeDirty: String(extraFee || '') !== String(origExtraFee || ''),
                    extraReasonDirty: String(extraFeeReason || '') !== origExtraReason,
                    exportDirty: String(exportRequire || '') !== origExport
                };
            };

            var editableKey = function (vals) {
                return [String(vals.factory_id || ''), String(vals.factory_name || ''), String(vals.price || ''), String(vals.customer_price || ''), String(vals.purchase_note || ''), String(vals.purchase_image || ''), String(vals.extra_fee || ''), String(vals.extra_fee_reason || ''), String(vals.export_require || '')].join('|');
            };

            var rowBaselineKey = function (row) {
                var price = fmtPriceInput(row.price);
                if (price === '' && (row.price === 0 || row.price === '0')) {
                    price = '0';
                }
                var cprice = fmtMoneyInput(row.customer_price);
                var fid = parseInt(row.factory_id, 10) > 0 ? String(row.factory_id) : '';
                var efee = fmtMoneyInput(row.extra_fee);
                if (efee === '' && (row.extra_fee === 0 || row.extra_fee === '0')) {
                    efee = '0';
                }
                return [fid, String(row.factory_name || ''), String(price || ''), String(cprice || ''), String(row.purchase_note || ''), String(row.purchase_image || ''), String(efee || ''), String(row.extra_fee_reason || ''), String(row.export_require || '')].join('|');
            };

            var buildSavePayload = function (rowId, vals, row) {
                var data = {};
                var baseFid = parseInt(row.factory_id, 10) > 0 ? String(row.factory_id) : '';
                var basePrice = normPrice(row.price);
                var baseCprice = normMoney(row.customer_price);
                var baseNote = String(row.purchase_note || '');
                var basePimg = String(row.purchase_image || '');
                var baseExtraFee = normMoney(row.extra_fee);
                var baseExtraReason = String(row.extra_fee_reason || '');
                var baseExport = String(row.export_require || '');
                var curFid = String(vals.factory_id || '');
                var curPrice = String(vals.price || '');
                var curCprice = String(vals.customer_price || '');
                var curNote = String(vals.purchase_note || '');
                var curPimg = String(vals.purchase_image || '');
                var curExtraFee = String(vals.extra_fee || '');
                var curExtraReason = String(vals.extra_fee_reason || '');
                var curExport = String(vals.export_require || '');
                if (vals.factoryDirty || curFid !== baseFid) {
                    data.factory_id = curFid || 0;
                    data.factory_name = vals.factory_name || '';
                }
                if (vals.priceDirty || curPrice !== basePrice) {
                    data.price = curPrice;
                }
                if (canEditCustomerPrice && (vals.customerPriceDirty || curCprice !== baseCprice)) {
                    data.customer_price = curCprice;
                }
                if (vals.noteDirty || curNote !== baseNote) {
                    data.purchase_note = curNote;
                }
                if (vals.pimgDirty || curPimg !== basePimg) {
                    data.purchase_image = curPimg;
                }
                if (vals.extraFeeDirty || curExtraFee !== baseExtraFee) {
                    data.extra_fee = curExtraFee || '0';
                }
                if (vals.extraReasonDirty || curExtraReason !== baseExtraReason) {
                    data.extra_fee_reason = curExtraReason;
                }
                if (canEditExportRequire && (vals.exportDirty || curExport !== baseExport)) {
                    data.export_require = curExport;
                }
                return data;
            };

            var markInputsSaved = function (rowId, vals) {
                var $price = findRowField('.fld-price', rowId);
                var $cprice = findRowField('.fld-customer-price', rowId);
                var $factory = findRowField('.fld-factory', rowId);
                var $note = findRowField('.fld-purchase-note', rowId);
                var $pimg = findRowField('.fld-purchase-image', rowId);
                if ($price.length) {
                    $price.attr('data-orig-price', vals.price || '');
                    // 同步同 id 的克隆
                    $('.fld-price[data-row-id="' + rowId + '"]').attr('data-orig-price', vals.price || '').val(vals.price || '');
                }
                if ($cprice.length) {
                    $('.fld-customer-price[data-row-id="' + rowId + '"]').attr('data-orig-customer-price', vals.customer_price || '').val(vals.customer_price || '');
                }
                if ($factory.length) {
                    $('.fld-factory[data-row-id="' + rowId + '"]').each(function () {
                        var $el = $(this);
                        var fid = vals.factory_id || '';
                        var name = vals.factory_name || '';
                        $el.attr('data-orig-factory-id', fid).attr('data-orig-factory', name).val(fid);
                        var obj = $el.data('selectPageObject');
                        if (obj && obj.elem) {
                            if (obj.elem.hidden) {
                                obj.elem.hidden.val(fid);
                            }
                            if (obj.elem.combo_input) {
                                obj.elem.combo_input.val(name);
                            }
                        }
                    });
                }
                if ($note.length) {
                    $('.fld-purchase-note[data-row-id="' + rowId + '"]').attr('data-orig-purchase-note', vals.purchase_note || '').val(vals.purchase_note || '');
                }
                if ($pimg.length) {
                    $('.fld-purchase-image[data-row-id="' + rowId + '"]').attr('data-orig-purchase-image', vals.purchase_image || '').val(vals.purchase_image || '');
                }
                $('.fld-extra-fee[data-row-id="' + rowId + '"]').attr('data-orig-extra-fee', vals.extra_fee || '').val(vals.extra_fee || '');
                $('.fld-extra-fee-reason[data-row-id="' + rowId + '"]').attr('data-orig-extra-fee-reason', vals.extra_fee_reason || '').val(vals.extra_fee_reason || '');
                $('.fld-export-require[data-row-id="' + rowId + '"]').attr('data-orig-export-require', vals.export_require || '').val(vals.export_require || '');
            };

            var renderPurchaseImagePreview = function (rowId, path) {
                var preview = '-';
                if (path) {
                    var url = Fast.api.cdnurl(path);
                    preview = '<a href="javascript:" class="myitems-img-preview" title="预览采购图片">' +
                        '<img src="' + url + '" alt="" style="max-height:36px;max-width:48px;object-fit:cover;border-radius:2px;vertical-align:middle;cursor:pointer;">' +
                        '</a>';
                }
                $('.fld-pimg-wrap').has('.fld-purchase-image[data-row-id="' + rowId + '"]').each(function () {
                    var $wrap = $(this);
                    $wrap.find('.fld-pimg-preview').html(preview);
                    $wrap.find('.btn-clear-pimg').remove();
                    if (path) {
                        $wrap.append(' <a href="javascript:;" class="btn btn-xs btn-default btn-clear-pimg" data-row-id="' + rowId + '" title="清除"><i class="fa fa-times"></i></a>');
                    }
                });
            };

            var setPurchaseImage = function (rowId, path) {
                path = $.trim(path || '');
                $('.fld-purchase-image[data-row-id="' + rowId + '"]').val(path);
                var row = getRowById(rowId);
                if (row) {
                    row.purchase_image = path;
                }
                renderPurchaseImagePreview(rowId, path);
                delete lastSaved[rowId];
                scheduleAutoSave(rowId, true, true);
            };

            var applyFactoryToRow = function (rowId, factoryId, factoryName) {
                var row = getRowById(rowId);
                var fid = factoryId ? String(factoryId) : '';
                var name = typeof factoryName !== 'undefined' ? (factoryName || '') : '';
                if (row) {
                    row.factory_id = fid ? parseInt(fid, 10) : 0;
                    if (typeof factoryName !== 'undefined') {
                        row.factory_name = name;
                    }
                }
                $('.fld-factory[data-row-id="' + rowId + '"]').each(function () {
                    var $el = $(this);
                    $el.val(fid).attr('data-orig-factory-id', fid).attr('data-orig-factory', name);
                    var obj = $el.data('selectPageObject');
                    if (obj && obj.elem) {
                        if (obj.elem.hidden) {
                            obj.elem.hidden.val(fid);
                        }
                        if (obj.elem.combo_input) {
                            obj.elem.combo_input.val(name);
                        }
                    } else {
                        $el.closest('.sp_container').find('.sp_input').val(name);
                    }
                });
            };

            var setRowStatus = function () {
                // 已改为批量保存，行内状态不再展示
            };

            var refreshPurchaseAmount = function (rowId) {
                var row = getRowById(rowId) || {};
                var $price = findRowField('.fld-price', rowId);
                var price = $price.length ? parseFloat($price.val()) : parseFloat(row.price);
                var qty = parseFloat(row.qty);
                var total = (!isNaN(price) && !isNaN(qty)) ? price * qty : NaN;
                var $amts = $('.fld-purchase-amount[data-row-id="' + rowId + '"]');
                if (!$amts.length) {
                    return;
                }
                if ($amts.filter(function () { return this === document.activeElement; }).length) {
                    return;
                }
                if ($amts.first().is('input')) {
                    var p = isNaN(total) ? '' : fmtMoneyInput(Math.round(total * 100) / 100);
                    $amts.val(p).attr('data-orig-purchase-amount', p);
                } else {
                    var text = isNaN(total) ? '-' : (fmtPrice(total) || '-');
                    if (text === '') {
                        text = '-';
                    }
                    $amts.text(text);
                }
            };

            var applyAmountToPrice = function (rowId) {
                var row = getRowById(rowId) || {};
                var qty = parseFloat(row.qty);
                var $amt = findRowField('.fld-purchase-amount', rowId);
                var $prices = $('.fld-price[data-row-id="' + rowId + '"]');
                if (!$amt.length || !$prices.length) {
                    return true;
                }
                var raw = $.trim($amt.val() || '');
                if (raw === '') {
                    $prices.val('');
                    return true;
                }
                var amount = parseFloat(raw);
                if (isNaN(amount)) {
                    return false;
                }
                if (isNaN(qty) || qty <= 0) {
                    Toastr.error('数量无效，无法按总价反算采购价');
                    return false;
                }
                var unit = fmtPriceInput(amount / qty);
                $prices.val(unit);
                refreshHistoryWarn(rowId);
                return true;
            };

            var refreshHistoryWarn = function (rowId) {
                var $hist = $('.fld-history-price[data-row-id="' + rowId + '"]');
                if (!$hist.length) {
                    return;
                }
                var hist = parseFloat($hist.attr('data-history'));
                var cur = parseFloat(findRowField('.fld-price', rowId).val());
                if (!isNaN(hist) && hist > 0 && !isNaN(cur) && cur > hist) {
                    $hist.css({color: '#dd4b39', fontWeight: '600'});
                } else {
                    $hist.css({color: '', fontWeight: ''});
                }
            };

            var syncPlanItemId = function (row, data) {
                if (!row || !data) {
                    return;
                }
                if (parseInt(data.id, 10) > 0) {
                    row.plan_id = data.id;
                }
                var savedPrice = parseFloat(row.price);
                if (row.purchase_status === 'pending' && !isNaN(savedPrice) && savedPrice > 0) {
                    row.purchase_status = 'quoted';
                } else if ((row.purchase_status === 'quoted' || row.purchase_status === 'pending') && (isNaN(savedPrice) || savedPrice <= 0)) {
                    row.purchase_status = 'pending';
                }
                var items = data.items || {};
                var pid = items[row.id] || items[String(row.id)];
                if (pid) {
                    row.plan_item_id = pid;
                    row.quote_editable = true;
                }
            };

            var saveTimers = {};
            var savingMap = {};
            var lastSaved = {};

            var valsKey = function (vals) {
                return editableKey(vals);
            };

            var autoSaveRow = function (rowId, force, done, fullPayload) {
                var row = getRowById(rowId);
                if (!row) {
                    if (force && !done) {
                        Toastr.error('未找到明细，请刷新后重试');
                    }
                    if (done) {
                        done(false, '未找到明细');
                    }
                    return;
                }
                // 非采购负责人：仅允许持「修改客户价」权限改客户价
                if (!canEdit(row)) {
                    if (!canEditCustomerPrice && !canEditExportRequire) {
                        if (force && !done) {
                            Toastr.error('当前状态不可编辑');
                        }
                        if (done) {
                            done(false, '当前状态不可编辑');
                        }
                        return;
                    }
                    fullPayload = false;
                }
                if (savingMap[rowId]) {
                    if (force && !done) {
                        Toastr.info('正在保存中…');
                    }
                    if (done) {
                        done(false, '正在保存中');
                    }
                    return;
                }
                var vals = readRowInputs(rowId);
                var key = valsKey(vals);
                if (!force && lastSaved[rowId] === key) {
                    if (done) {
                        done(true);
                    }
                    return;
                }
                // 相对库内/行数据无变化则跳过请求（批量强制提交除外）
                if (!fullPayload && key === rowBaselineKey(row) && lastSaved[rowId] === key) {
                    if (done) {
                        done(true);
                    }
                    return;
                }
                var payload;
                if (!canEdit(row) && (canEditCustomerPrice || canEditExportRequire)) {
                    payload = {};
                    var baseCpriceOnly = normMoney(row.customer_price);
                    var curCpriceOnly = String(vals.customer_price || '');
                    if (canEditCustomerPrice && (vals.customerPriceDirty || curCpriceOnly !== baseCpriceOnly)) {
                        payload.customer_price = curCpriceOnly;
                    }
                    if (canEditExportRequire && (vals.exportDirty || String(vals.export_require || '') !== String(row.export_require || ''))) {
                        payload.export_require = vals.export_require || '';
                    }
                } else if (fullPayload) {
                    payload = {
                        factory_id: vals.factory_id || 0,
                        factory_name: vals.factory_name || '',
                        price: vals.price || '',
                        purchase_note: vals.purchase_note || '',
                        purchase_image: vals.purchase_image || '',
                        extra_fee: vals.extra_fee || '0',
                        extra_fee_reason: vals.extra_fee_reason || ''
                    };
                    if (canEditCustomerPrice) {
                        payload.customer_price = vals.customer_price || '';
                    }
                    if (canEditExportRequire) {
                        payload.export_require = vals.export_require || '';
                    }
                } else {
                    payload = buildSavePayload(rowId, vals, row);
                }
                // 已有计划但未改供应商时，若改了单价/采购说明仍需带上 factory 以外字段
                if ($.isEmptyObject(payload)) {
                    lastSaved[rowId] = key;
                    if (done) {
                        done(true);
                    }
                    return;
                }
                if (canEdit(row) && !(parseInt(row.plan_item_id, 10) > 0) && !payload.factory_id && vals.factory_id) {
                    payload.factory_id = vals.factory_id;
                    payload.factory_name = vals.factory_name || '';
                }

                savingMap[rowId] = true;
                setRowStatus(rowId, 'saving');

                var onOk = function (data) {
                    savingMap[rowId] = false;
                    lastSaved[rowId] = key;
                    setRowStatus(rowId, 'saved');
                    syncPlanItemId(row, data);
                    if (data && data.plan_item_id) {
                        row.plan_item_id = data.plan_item_id;
                    }
                    if (data && typeof data.factory_id !== 'undefined') {
                        applyFactoryToRow(rowId, data.factory_id, data.factory_name || '');
                        vals.factory_id = data.factory_id || '';
                        vals.factory_name = data.factory_name || '';
                        lastSaved[rowId] = valsKey(vals);
                    } else if (vals.factory_id) {
                        row.factory_id = vals.factory_id;
                        row.factory_name = vals.factory_name || '';
                    }
                    row.price = vals.price;
                    row.customer_price = vals.customer_price;
                    row.purchase_note = vals.purchase_note;
                    row.purchase_image = vals.purchase_image;
                    row.extra_fee = vals.extra_fee;
                    row.extra_fee_reason = vals.extra_fee_reason;
                    row.export_require = vals.export_require;
                    if (data && typeof data.customer_price !== 'undefined' && data.customer_price !== null) {
                        row.customer_price = data.customer_price;
                        vals.customer_price = fmtMoneyInput(data.customer_price);
                    }
                    if (data && typeof data.purchase_note !== 'undefined') {
                        row.purchase_note = data.purchase_note;
                        vals.purchase_note = data.purchase_note;
                    }
                    if (data && typeof data.purchase_image !== 'undefined') {
                        row.purchase_image = data.purchase_image;
                        vals.purchase_image = data.purchase_image;
                    }
                    if (data && typeof data.extra_fee !== 'undefined') {
                        row.extra_fee = data.extra_fee;
                        vals.extra_fee = fmtMoneyInput(data.extra_fee);
                    }
                    if (data && typeof data.extra_fee_reason !== 'undefined') {
                        row.extra_fee_reason = data.extra_fee_reason;
                        vals.extra_fee_reason = data.extra_fee_reason;
                    }
                    if (data && typeof data.export_require !== 'undefined') {
                        row.export_require = data.export_require;
                        vals.export_require = data.export_require;
                    }
                    markInputsSaved(rowId, vals);
                    renderPurchaseImagePreview(rowId, row.purchase_image || '');
                    if (data) {
                        if (typeof data.history_price !== 'undefined') {
                            row.history_price = data.history_price;
                            var $hist = $('.fld-history-price[data-row-id="' + rowId + '"]');
                            if ($hist.length) {
                                var hp = fmtPrice(data.history_price);
                                var histVal = parseFloat(data.history_price) || 0;
                                $hist.attr('data-history', histVal).attr('data-name', row.name || '');
                                $hist.text(hp === '' ? '-' : hp);
                            }
                        }
                        if (typeof data.price_warn !== 'undefined') {
                            row.price_warn = data.price_warn;
                        }
                    }
                    refreshHistoryWarn(rowId);
                    refreshPurchaseAmount(rowId);
                    if (force && !done) {
                        Toastr.success('保存成功');
                    }
                    if (done) {
                        done(true);
                    }
                    return false;
                };
                var onFail = function (data, ret) {
                    savingMap[rowId] = false;
                    var msg = (ret && ret.msg) ? ret.msg : '保存失败';
                    setRowStatus(rowId, 'error', msg);
                    if (force && !done) {
                        Toastr.error(msg);
                    }
                    if (done) {
                        done(false, msg);
                    }
                    return false;
                };

                Backend.api.ajax({
                    url: 'purchase/order/savequote/ids/' + rowId,
                    data: payload,
                    loading: !!force && !done
                }, onOk, onFail);
            };

            var scheduleAutoSave = function (rowId, immediate, force) {
                if (!rowId) {
                    return;
                }
                if (saveTimers[rowId]) {
                    clearTimeout(saveTimers[rowId]);
                    saveTimers[rowId] = null;
                }
                if (immediate) {
                    autoSaveRow(rowId, !!force);
                    return;
                }
                saveTimers[rowId] = setTimeout(function () {
                    saveTimers[rowId] = null;
                    autoSaveRow(rowId, false);
                }, 600);
            };

            var bindSelectPage = function () {
                var $targets = table.find('input.fld-factory.selectpage').filter(function () {
                    return !$(this).data('selectPageObject');
                });
                if (!$targets.length) {
                    return;
                }
                require(['selectpage'], function () {
                    $targets.each(function () {
                        var $el = $(this);
                        if ($el.data('selectPageObject')) {
                            return;
                        }
                        var rowId = $el.data('row-id');
                        $el.selectPage({
                            showField: 'name',
                            keyField: 'id',
                            searchField: 'name',
                            andOr: 'OR',
                            orderBy: 'name ASC',
                            pageSize: 20,
                            params: function () {
                                return {custom: {status: 'normal'}};
                            },
                            eAjaxSuccess: function (data) {
                                data.list = typeof data.rows !== 'undefined' ? data.rows : (typeof data.list !== 'undefined' ? data.list : []);
                                data.totalRow = typeof data.total !== 'undefined' ? data.total : (typeof data.totalRow !== 'undefined' ? data.totalRow : data.list.length);
                                return data;
                            },
                            eSelect: function () {
                                delete lastSaved[rowId];
                                scheduleAutoSave(rowId, true);
                            },
                            eClear: function () {
                                // 清空后立即同步内存，避免保存时回退旧供应商
                                var row = getRowById(rowId);
                                if (row) {
                                    row.factory_id = 0;
                                    row.factory_name = '';
                                }
                                $el.val('').attr('data-orig-factory-id', '').attr('data-orig-factory', '');
                                delete lastSaved[rowId];
                                scheduleAutoSave(rowId, true);
                            },
                            // 必须为 false：selectOnly=true 会把输入框设成 readonly，无法打字搜索
                            selectOnly: false,
                            noResultClean: true,
                            pagination: true,
                            listSize: 20,
                            multiple: false
                        });
                        // 确保可输入搜索
                        var $spInput = $el.next('.sp_container').find('.sp_input');
                        if (!$spInput.length) {
                            $spInput = $el.closest('td').find('.sp_input');
                        }
                        if ($spInput.length) {
                            $spInput.prop('readonly', false).attr('placeholder', '输入关键字搜索供应商');
                            $spInput.off('compositionend.myitemsFactory').on('compositionend.myitemsFactory', function () {
                                var obj = $el.data('selectPageObject');
                                if (obj && typeof obj.checkValue === 'function') {
                                    obj.checkValue(obj);
                                }
                            });
                        }
                    });
                });
            };

            window.__purchaseMyitemsSave = function (rowId) {
                if (!rowId) {
                    return;
                }
                delete lastSaved[rowId];
                scheduleAutoSave(rowId, true, true);
            };

            $(document).off('click.myitemsAddItem', '.btn-additem').on('click.myitemsAddItem', '.btn-additem', function () {
                if (!Config.canManagePurchaseItems) {
                    Layer.msg('仅审批人一组 / 审批人二组可新增采购物品');
                    return;
                }
                Backend.api.open('purchase/order/additem', '新增采购物品', {
                    area: ['720px', '100%'],
                    callback: function () {
                        table.bootstrapTable('refresh');
                    }
                });
            });

            $(document).off('click.myitemsBatchDel', '.btn-batch-delitem').on('click.myitemsBatchDel', '.btn-batch-delitem', function () {
                if (!Config.canManagePurchaseItems) {
                    Layer.msg('仅审批人一组 / 审批人二组可批量删除采购物品');
                    return;
                }
                var selected = Table.api.selecteddata(table);
                if (!selected.length) {
                    Layer.msg('请先勾选要删除的明细');
                    return;
                }
                var allowStatus = {pending: 1, quoted: 1, rejected: 1};
                var blocked = selected.filter(function (r) {
                    return !allowStatus[r.purchase_status];
                });
                if (blocked.length) {
                    Layer.msg('仅「待提交」状态可删除，请去掉初审/终审或已完成的明细');
                    return;
                }
                Layer.confirm('确认删除勾选的 ' + selected.length + ' 条明细？删除后不可恢复。', function (index) {
                    Layer.close(index);
                    var ids = selected.map(function (r) { return r.id; });
                    Backend.api.ajax({
                        url: 'purchase/order/delitem',
                        data: {ids: ids.join(',')}
                    }, function () {
                        table.bootstrapTable('refresh');
                    });
                });
            });

            $(document).off('click.myitemsBatchSave', '.btn-batch-save').on('click.myitemsBatchSave', '.btn-batch-save', function () {
                // 批量保存：优先勾选行，否则当前页全部可编辑行（不要求先改过）
                var pageRows = (table.bootstrapTable('getData') || []).filter(canEdit);
                if (!pageRows.length) {
                    var rawSelected = Table.api.selecteddata(table);
                    if (rawSelected && rawSelected.length) {
                        Layer.msg('勾选的明细当前状态不可编辑（初审/终审/已审批等），无法保存报价');
                    } else {
                        Layer.msg('当前页没有可保存的明细');
                    }
                    return;
                }
                var selectedEditable = (Table.api.selecteddata(table) || []).filter(canEdit);
                var toSave = selectedEditable.length ? selectedEditable : pageRows;
                var i = 0;
                var ok = 0;
                var fail = 0;
                var failMsg = '';
                var selected = toSave;
                Layer.load(1);
                var next = function () {
                    if (i >= selected.length) {
                        Layer.closeAll('loading');
                        if (fail) {
                            Toastr.warning('批量保存完成：成功 ' + ok + ' 条，失败 ' + fail + ' 条' + (failMsg ? '（' + failMsg + '）' : ''));
                        } else {
                            Toastr.success('已批量保存 ' + ok + ' 条明细');
                        }
                        if (ok) {
                            table.bootstrapTable('refresh');
                        }
                        return;
                    }
                    var row = selected[i++];
                    delete lastSaved[row.id];
                    autoSaveRow(row.id, true, function (success, msg) {
                        if (success) {
                            ok++;
                        } else {
                            fail++;
                            if (msg && !failMsg) {
                                failMsg = msg;
                            }
                        }
                        next();
                    }, true);
                };
                next();
            });

            // 导出物品清单：勾选优先；未勾选时由用户选择当前页或当前页签全部数据
            $(document).off('click.myitemsExportItems', '.btn-export-items').on('click.myitemsExportItems', '.btn-export-items', function () {
                var ids = Table.api.selectedids(table) || [];
                var status = '';
                var $tab = $('.panel-heading .nav-tabs li.active a');
                if ($tab.length) {
                    status = $tab.data('value');
                    if (status === undefined || status === null) {
                        status = '';
                    }
                    status = String(status);
                }
                var tip = ids.length
                    ? ('将导出勾选的 <b>' + ids.length + '</b> 条明细。图片用 IMAGE 公式联网显示缩略图（不嵌实体图；需 Excel365/支持 IMAGE 的 WPS）。')
                    : ('<div style="margin-bottom:12px;">当前未勾选明细，请选择导出范围：</div>' +
                        '<label style="display:block;margin:8px 0;cursor:pointer;">' +
                        '<input type="radio" name="myitems_export_scope" value="page" checked> 导出当前页' +
                        '</label>' +
                        '<label style="display:block;margin:8px 0;cursor:pointer;">' +
                        '<input type="radio" name="myitems_export_scope" value="all"> 导出全部数据' +
                        (status ? '（当前状态筛选）' : '') +
                        '</label>' +
                        '<div class="text-muted" style="margin-top:12px;">图片使用 IMAGE 公式联网显示（需支持 IMAGE 的表格软件）。</div>');
                Layer.confirm(tip, {title: '导出物品清单', btn: ['开始导出', '取消']}, function (idx) {
                    var exportIds = ids.slice(0);
                    var scope = ids.length ? 'selected' : $('input[name="myitems_export_scope"]:checked').val();
                    if (!ids.length && scope === 'page') {
                        exportIds = $.map(table.bootstrapTable('getData') || [], function (row) {
                            return row && row.id ? row.id : null;
                        });
                        if (!exportIds.length) {
                            Layer.msg('当前页没有可导出的明细');
                            return false;
                        }
                    }
                    Layer.close(idx);
                    var url = Fast.api.fixurl('purchase/order/exportitems');
                    var params = [];
                    if (exportIds.length) {
                        params.push('ids=' + encodeURIComponent(exportIds.join(',')));
                    } else if (scope === 'all' && status !== '') {
                        params.push('purchase_status=' + encodeURIComponent(status));
                    }
                    if (params.length) {
                        url += (url.indexOf('?') >= 0 ? '&' : '?') + params.join('&');
                    }
                    var $frame = $('#myitems-export-frame');
                    if (!$frame.length) {
                        $frame = $('<iframe id="myitems-export-frame" style="display:none;width:0;height:0;border:0;"></iframe>').appendTo(document.body);
                    }
                    $frame.attr('src', 'about:blank');
                    setTimeout(function () {
                        $frame.attr('src', url);
                    }, 30);
                    Toastr.success('正在导出，请稍候…');
                });
            });
            // 导入更新：上传 → 预览确认 → 再写库
            $(document).off('click.myitemsImportUpdate', '.btn-import-update').on('click.myitemsImportUpdate', '.btn-import-update', function () {
                var importState = {file: '', previewed: false, okCount: 0};
                var escHtml = function (v) {
                    return Fast.api.escape(v === null || v === undefined ? '' : String(v));
                };
                var renderPreview = function (layero, data) {
                    var summary = (data && data.summary) || {};
                    var rows = (data && data.rows) || [];
                    var ok = parseInt(summary.ok, 10) || 0;
                    var skip = parseInt(summary.skip, 10) || 0;
                    var err = parseInt(summary.error, 10) || 0;
                    var unmatched = parseInt(summary.unmatched, 10) || 0;
                    importState.okCount = ok;
                    importState.previewed = true;
                    var $sum = $('#myitems-import-summary', layero);
                    $sum.html('共 <b>' + (summary.total || rows.length) + '</b> 行：' +
                        '<span class="text-success">将更新 ' + ok + '</span>，' +
                        '<span class="text-muted">跳过 ' + skip + '</span>，' +
                        '<span class="text-danger">异常 ' + err + '</span>' +
                        (unmatched > 0 ? '，<span style="color:#c0392b;font-weight:600;">未匹配 ' + unmatched + '</span>（红底行）' : '')
                    ).show();
                    var html = [];
                    $.each(rows, function (i, r) {
                        var matchOk = r.match_ok !== false && r.match_ok !== 0 && r.match_ok !== '0';
                        // 兼容旧接口：结果文案为「未匹配」也视为未预匹配
                        if (r.status_text === '未匹配' || /未匹配到|缺少唛头或名称/.test(String(r.message || ''))) {
                            matchOk = false;
                        }
                        var cls = !matchOk ? 'danger' : (r.status === 'ok' ? 'success' : (r.status === 'error' ? 'warning' : 'default'));
                        if (matchOk && r.status === 'ok' && r.message) {
                            cls = 'warning';
                        }
                        var imgHtml = '-';
                        var pimg = String(r.purchase_image || '').trim();
                        var pimgOk = pimg && (pimg.indexOf('/uploads/') === 0 || /^https?:\/\//i.test(pimg))
                            && pimg.indexOf('DISPIMG') < 0 && pimg.charAt(0) !== '#' && pimg.charAt(0) !== '=';
                        if (pimgOk) {
                            var imgUrl = Fast.api.cdnurl(pimg);
                            imgHtml = '<a href="' + escHtml(imgUrl) + '" target="_blank" title="' + escHtml(pimg) + '">' +
                                '<img src="' + escHtml(imgUrl) + '" style="max-height:36px;max-width:48px;object-fit:cover;border-radius:2px;vertical-align:middle;">' +
                                '</a>';
                        }
                        var rowStyle = '';
                        if (!matchOk) {
                            rowStyle = 'background:#ffd6d6;';
                        } else if (r.status === 'error') {
                            rowStyle = 'background:#fff3cd;';
                        } else if (r.status === 'ok' && r.message) {
                            rowStyle = 'background:#e8f4ff;';
                        }
                        var statusLabel = !matchOk ? '未匹配' : (r.status === 'ok' && r.message ? '更新(有提示)' : r.status_text);
                        html.push('<tr style="' + rowStyle + '">' +
                            '<td>' + escHtml(r.line) + '</td>' +
                            '<td>' + escHtml(matchOk ? r.id : '-') + '</td>' +
                            '<td title="' + escHtml(r.mark) + '">' + escHtml(r.mark) + '</td>' +
                            '<td title="' + escHtml(r.name) + '">' + escHtml(r.name) + '</td>' +
                            '<td title="' + escHtml(r.factory_name) + '">' + escHtml(r.factory_name) + '</td>' +
                            '<td>' + imgHtml + '</td>' +
                            '<td>' + escHtml(r.price) + '</td>' +
                            '<td>' + escHtml(r.extra_fee) + '</td>' +
                            '<td title="' + escHtml(r.purchase_note) + '">' + escHtml((r.purchase_note || '').length > 20 ? (String(r.purchase_note).substr(0, 20) + '…') : r.purchase_note) + '</td>' +
                            '<td><span class="label label-' + cls + '">' + escHtml(statusLabel) + '</span></td>' +
                            '<td title="' + escHtml(r.message) + '" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(r.message || '-') + '</td>' +
                            '</tr>');
                    });
                    $('#myitems-import-preview-body', layero).html(html.join('') || '<tr><td colspan="11" class="text-center text-muted">无数据</td></tr>');
                    $('#myitems-import-preview-wrap', layero).show();
                    var $btn = layero.find('.layui-layer-btn0');
                    if (ok > 0) {
                        $btn.text('确认更新（' + ok + '）').removeClass('btn-default').addClass('btn-success');
                    } else {
                        $btn.text('无可更新数据').addClass('btn-default');
                    }
                };
                var runPreview = function (layero, file) {
                    if (!file) {
                        return;
                    }
                    importState.file = file;
                    importState.previewed = false;
                    importState.okCount = 0;
                    Layer.load(1);
                    Fast.api.ajax({
                        url: 'purchase/order/importpreview',
                        data: {file: file}
                    }, function (data) {
                        Layer.closeAll('loading');
                        renderPreview(layero, data || {});
                        return false;
                    }, function (data, ret) {
                        Layer.closeAll('loading');
                        importState.previewed = false;
                        $('#myitems-import-preview-wrap', layero).hide();
                        Layer.msg((ret && ret.msg) ? ret.msg : '预览失败');
                        return false;
                    });
                };
                var html = '<div class="sa-section myitems-import-dialog" style="padding:16px 18px 8px;">' +
                    '<div class="alert alert-warning" style="margin:0 0 12px;padding:8px 12px;">按表格的 <b>唛头 + 名称</b> 匹配已有明细并更新，<b>不会新增</b>（暂不按 ID）。请先预览确认，再点「确认更新」。</div>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:12px 16px;align-items:flex-end;margin-bottom:10px;">' +
                    '<div style="width:200px;flex:0 0 200px;">' +
                    '<label class="sa-label" for="c-myitems-contract-no">合同编号 <span class="text-danger">*</span></label>' +
                    '<input id="c-myitems-contract-no" class="form-control" type="text" placeholder="不可与已有编号重复" maxlength="100">' +
                    '</div>' +
                    '<div style="width:340px;flex:0 0 340px;">' +
                    '<label class="sa-label">上传 Excel（.xlsx / .xls）</label>' +
                    '<div class="input-group">' +
                    '<input id="c-myitems-import-file" class="form-control" type="text" readonly placeholder="请上传导出后改好的表格">' +
                    '<div class="input-group-addon no-border no-padding">' +
                    '<button type="button" id="faupload-myitems-import" class="btn btn-danger faupload" data-input-id="c-myitems-import-file" data-mimetype="xlsx,xls" data-multiple="false"><i class="fa fa-upload"></i> 上传</button>' +
                    '</div></div></div></div>' +
                    '<div style="margin-top:2px;">' +
                    '<button type="button" class="btn btn-info btn-sm" id="btn-myitems-import-preview"><i class="fa fa-eye"></i> 解析预览</button>' +
                    '<span id="myitems-import-summary" style="margin-left:12px;display:none;"></span>' +
                    '</div>' +
                    '<div id="myitems-import-preview-wrap" style="display:none;margin-top:12px;">' +
                    '<div style="max-height:calc(100vh - 400px);min-height:420px;overflow:auto;border:1px solid #eee;">' +
                    '<table class="table table-bordered table-condensed" style="margin:0;font-size:12px;">' +
                    '<thead><tr>' +
                    '<th>行</th><th>匹配ID</th><th>唛头</th><th>名称</th><th>供应商</th><th>采购图片</th><th>采购价</th><th>附加费</th><th>采购说明</th><th>结果</th><th>说明</th>' +
                    '</tr></thead><tbody id="myitems-import-preview-body"></tbody></table></div></div>' +
                    '<p class="text-muted" style="margin:10px 0 0;font-size:12px;">流程：导出 → 线下修改 → 上传 → 预览 → 确认更新。合同编号不可与系统已有编号重复；同批再次导入可沿用原编号。未匹配行会标红底。</p>' +
                    '</div>';
                Layer.open({
                    type: 1,
                    title: '导入更新数据',
                    area: ['96%', '92%'],
                    btn: ['确认更新', '取消'],
                    content: html,
                    success: function (layero) {
                        require(['upload'], function (Upload) {
                            Upload.api.upload($('#faupload-myitems-import', layero), function (data, ret) {
                                var path = (data && (data.url || data.fullurl)) || $('#c-myitems-import-file', layero).val();
                                if (path) {
                                    $('#c-myitems-import-file', layero).val(path);
                                    runPreview(layero, path);
                                }
                            });
                        });
                        // 上传控件有时只改 value，轮询一下触发预览
                        var lastFile = '';
                        var timer = setInterval(function () {
                            if (!layero.closest('body').length) {
                                clearInterval(timer);
                                return;
                            }
                            var v = $.trim($('#c-myitems-import-file', layero).val() || '');
                            if (v && v !== lastFile) {
                                lastFile = v;
                                runPreview(layero, v);
                            }
                        }, 800);
                        layero.data('importPollTimer', timer);
                        $('#btn-myitems-import-preview', layero).on('click', function () {
                            var file = $.trim($('#c-myitems-import-file', layero).val() || '');
                            if (!file) {
                                Layer.msg('请先上传 Excel 文件');
                                return;
                            }
                            runPreview(layero, file);
                        });
                        layero.find('.layui-layer-btn0').text('确认更新');
                    },
                    end: function () {
                        // no-op; timer cleared when layero removed via poll check
                    },
                    yes: function (index, layero) {
                        var file = $.trim($('#c-myitems-import-file', layero).val() || importState.file || '');
                        var contractNo = $.trim($('#c-myitems-contract-no', layero).val() || '');
                        if (!contractNo) {
                            Layer.msg('请填写合同编号');
                            $('#c-myitems-contract-no', layero).focus();
                            return;
                        }
                        if (!file) {
                            Layer.msg('请先上传 Excel 文件');
                            return;
                        }
                        if (!importState.previewed) {
                            Layer.msg('请先点击「解析预览」确认数据');
                            runPreview(layero, file);
                            return;
                        }
                        if (!(importState.okCount > 0)) {
                            Layer.msg('没有可更新的行，请检查预览结果');
                            return;
                        }
                        Layer.confirm('确认将预览中「将更新」的 ' + importState.okCount + ' 条写入系统？\n合同编号：' + contractNo, {title: '确认更新'}, function (cidx) {
                            Layer.close(cidx);
                            Layer.load(1);
                            Fast.api.ajax({
                                url: 'purchase/order/importupdate',
                                data: {file: file, contract_no: contractNo}
                            }, function (data, ret) {
                                Layer.closeAll('loading');
                                Layer.close(index);
                                var msg = (ret && ret.msg) ? ret.msg : '导入完成';
                                Layer.alert(msg, {title: '导入结果', area: ['520px', 'auto']}, function (i2) {
                                    Layer.close(i2);
                                    table.bootstrapTable('refresh');
                                });
                                return false;
                            }, function (data, ret) {
                                Layer.closeAll('loading');
                                Layer.alert((ret && ret.msg) ? ret.msg : '导入失败', {title: '导入失败'});
                                return false;
                            });
                        });
                    }
                });
            });

            var syncFixedOperateHeights = function () {
                var $container = table.closest('.bootstrap-table');
                var $mainBody = $container.find('> .fixed-table-container > .fixed-table-body');
                var $right = $container.find('.fixed-columns-right');
                if (!$right.length || !$mainBody.length) {
                    return;
                }
                var $mainRows = $mainBody.find('table tbody tr');
                var $rightRows = $right.find('.fixed-table-body table tbody tr');
                $mainRows.each(function (i) {
                    var h = $(this).outerHeight();
                    var $r = $rightRows.eq(i);
                    if (!$r.length) {
                        return;
                    }
                    $r.css('height', h);
                    $r.children('td').css({
                        height: h + 'px',
                        'vertical-align': 'middle'
                    });
                });
                var $mainHead = $container.find('> .fixed-table-container > .fixed-table-header thead tr').first();
                var $rightHead = $right.find('.fixed-table-header thead tr').first();
                if ($mainHead.length && $rightHead.length) {
                    var hh = $mainHead.outerHeight();
                    $rightHead.css('height', hh);
                    $rightHead.children('th').css({
                        height: hh + 'px',
                        'vertical-align': 'middle'
                    });
                }
            };

            var syncHScroll = function () {
                var $wrap = table.closest('.myitems-table-wrap');
                var $bt = table.closest('.bootstrap-table');
                if (!$wrap.length || !$bt.length) {
                    return;
                }
                var $body = $bt.children('.fixed-table-container').children('.fixed-table-body');
                if (!$body.length) {
                    $body = $bt.find('> .fixed-table-container > .fixed-table-body');
                }
                var $top = $wrap.find('.myitems-hscroll-top').first();
                var $bottom = $wrap.find('.myitems-hscroll-bottom').first();
                var $toolbar = $bt.children('.fixed-table-toolbar');
                var $container = $bt.children('.fixed-table-container');
                var $pagination = $bt.children('.fixed-table-pagination').last();
                if (!$top.length && !$bottom.length) {
                    return;
                }
                // 目标顺序：工具栏 → 顶栏滚动条 → 表格 → 底栏滚动条 → 分页
                if ($toolbar.length && $top.length) {
                    $top.insertAfter($toolbar);
                }
                if ($container.length && $bottom.length) {
                    $bottom.insertAfter($container);
                }
                if ($pagination.length && $bottom.length) {
                    $pagination.insertAfter($bottom);
                } else if ($pagination.length && $container.length) {
                    $pagination.insertAfter($container);
                }
                if (!$body.length) {
                    $top.removeClass('is-needed');
                    $bottom.removeClass('is-needed');
                    return;
                }
                var bodyEl = $body[0];
                var w = Math.max(bodyEl.scrollWidth || 0, table[0].scrollWidth || 0);
                var viewW = bodyEl.clientWidth || $body.width() || 0;
                var need = w > viewW + 2;
                $top.toggleClass('is-needed', need);
                $bottom.toggleClass('is-needed', need);
                if (!need) {
                    $body.scrollLeft(0);
                    $top.scrollLeft(0);
                    $bottom.scrollLeft(0);
                    return;
                }
                $top.find('.myitems-hscroll-inner').width(w);
                $bottom.find('.myitems-hscroll-inner').width(w);
                var syncing = false;
                var bind = function ($from) {
                    $from.off('scroll.myitemsH').on('scroll.myitemsH', function () {
                        if (syncing) {
                            return;
                        }
                        syncing = true;
                        var left = $from.scrollLeft();
                        $body.scrollLeft(left);
                        $top.scrollLeft(left);
                        $bottom.scrollLeft(left);
                        syncing = false;
                    });
                };
                bind($top);
                bind($bottom);
                bind($body);
            };

            table.on('post-header.bs.table', function () {
                setTimeout(function () {
                    syncFixedOperateHeights();
                    syncHScroll();
                }, 30);
            });
            table.on('post-body.bs.table', function () {
                bindSelectPage();
                setTimeout(function () {
                    syncFixedOperateHeights();
                    syncHScroll();
                }, 50);
                setTimeout(function () {
                    syncFixedOperateHeights();
                    syncHScroll();
                }, 300);
            });
            $(window).off('resize.myitemsH').on('resize.myitemsH', function () {
                setTimeout(syncHScroll, 80);
            });
            table.on('click', 'input,button,.input-group,.sp_container,.sp_result_area', function (e) {
                e.stopPropagation();
            });
            // 固定列/行选中可能吞掉点击；委托预览缩略图
            $(document).off('click.myitemsImgPreview', '.myitems-table-wrap .myitems-img-preview')
                .on('click.myitemsImgPreview', '.myitems-table-wrap .myitems-img-preview', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var src = $(this).find('img').attr('src') || '';
                    Controller.api.previewImage(src);
                });
            $(document).off('click.myitemsNameMore', '.myitems-table-wrap .cell-name-more')
                .on('click.myitemsNameMore', '.myitems-table-wrap .cell-name-more', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var full = $(this).attr('data-full') || '';
                    if (!full) {
                        return;
                    }
                    Layer.open({
                        type: 1,
                        title: '名称',
                        area: ['520px', '300px'],
                        shadeClose: true,
                        content: '<div style="padding:16px;line-height:1.7;word-break:break-all;white-space:pre-wrap;">' + esc(full) + '</div>'
                    });
                });
            $(document).off('click.myitemsSpecMore', '.myitems-table-wrap .cell-spec-more')
                .on('click.myitemsSpecMore', '.myitems-table-wrap .cell-spec-more', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var full = $(this).attr('data-full') || $(this).attr('title') || '';
                    if (!full) {
                        return;
                    }
                    Layer.open({
                        type: 1,
                        title: '规格',
                        area: ['520px', '360px'],
                        shadeClose: true,
                        content: '<div style="padding:16px;line-height:1.7;word-break:break-all;white-space:pre-wrap;">' + esc(full) + '</div>'
                    });
                });
            $(document).off('click.myitemsExportEdit', '.myitems-table-wrap .btn-edit-export-require')
                .on('click.myitemsExportEdit', '.myitems-table-wrap .btn-edit-export-require', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!canEditExportRequire) {
                        return;
                    }
                    var rowId = parseInt($(this).data('id'), 10) || 0;
                    var row = getRowById(rowId) || {};
                    if (!rowId) {
                        return;
                    }
                    var current = String(row.export_require || '');
                    Layer.open({
                        type: 1,
                        title: '编辑出口监管',
                        area: ['640px', '420px'],
                        shadeClose: false,
                        content: '<div style="padding:16px 18px 8px;">' +
                            '<textarea id="c-export-require-edit" class="form-control" rows="10" placeholder="出口监管">' + esc(current) + '</textarea>' +
                            '</div>',
                        btn: ['保存'],
                        yes: function (index, layero) {
                            var $btn = layero.find('.layui-layer-btn0');
                            if ($btn.hasClass('disabled')) {
                                return;
                            }
                            $btn.addClass('disabled');
                            Backend.api.ajax({
                                url: 'purchase/order/savequote/ids/' + rowId,
                                data: {export_require: layero.find('#c-export-require-edit').val() || ''}
                            }, function () {
                                Layer.close(index);
                                table.bootstrapTable('refresh');
                            }, function () {
                                $btn.removeClass('disabled');
                            });
                        }
                    });
                });
            $(document).off('click.myitemsExportMore', '.myitems-table-wrap .cell-export-more')
                .on('click.myitemsExportMore', '.myitems-table-wrap .cell-export-more', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var full = $(this).attr('data-full') || $(this).attr('title') || '';
                    if (!full) {
                        return;
                    }
                    Layer.open({
                        type: 1,
                        title: '出口监管',
                        area: ['520px', '360px'],
                        shadeClose: true,
                        content: '<div style="padding:16px;line-height:1.7;word-break:break-all;white-space:pre-wrap;">' + esc(full) + '</div>'
                    });
                });
            $(document).off('click.myitemsRemarkMore', '.myitems-table-wrap .cell-remark-more')
                .on('click.myitemsRemarkMore', '.myitems-table-wrap .cell-remark-more', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var full = $(this).attr('data-full') || '';
                    if (!full) {
                        return;
                    }
                    Layer.open({
                        type: 1,
                        title: '备注',
                        area: ['560px', '380px'],
                        shadeClose: true,
                        content: '<div style="padding:16px;line-height:1.7;word-break:break-all;white-space:pre-wrap;">' + esc(full) + '</div>'
                    });
                });
            $(document).off('click.myitemsHistoryPrice', '.myitems-table-wrap .btn-history-price')
                .on('click.myitemsHistoryPrice', '.myitems-table-wrap .btn-history-price', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var name = $(this).attr('data-name') || '';
                    if (!name) {
                        Toastr.warning('名称为空，无法查询历史价');
                        return false;
                    }
                    Fast.api.open('purchase/order/pricehistory?name=' + encodeURIComponent(name), '历史采购价 - ' + name, {
                        area: ['900px', '80%']
                    });
                    return false;
                });
            // 提交审批弹窗里上传合同后的缩略图预览
            $(document).off('click.myitemsUploadPreview', '.faupload-preview a.thumbnail')
                .on('click.myitemsUploadPreview', '.faupload-preview a.thumbnail', function (e) {
                    var href = $(this).attr('href') || '';
                    var dataUrl = $(this).data('url') || '';
                    var check = href + ' ' + dataUrl;
                    if (!/\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(check) && !/^data:image\//i.test(href)) {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    Controller.api.previewImage(href || Fast.api.cdnurl(dataUrl));
                });

            table.on('input', '.fld-price', function () {
                var rowId = resolveRowId(this);
                refreshHistoryWarn(rowId);
                refreshPurchaseAmount(rowId);
                scheduleAutoSave(rowId, false);
            });
            table.on('input', '.fld-purchase-amount', function () {
                var rowId = resolveRowId(this);
                applyAmountToPrice(rowId);
                scheduleAutoSave(rowId, false);
            });
            table.on('input', '.fld-purchase-note,.fld-customer-price,.fld-extra-fee,.fld-extra-fee-reason', function () {
                scheduleAutoSave(resolveRowId(this), false);
            });
            table.on('blur', '.fld-price,.fld-purchase-amount,.fld-customer-price,.fld-purchase-note,.fld-extra-fee,.fld-extra-fee-reason', function () {
                var $el = $(this);
                if ($el.data('skip-blur-save')) {
                    $el.removeData('skip-blur-save');
                    return;
                }
                // 采购价最多 6 位；客户价/总价/附加费最多 2 位
                if ($el.hasClass('fld-price') || $el.hasClass('fld-purchase-amount') || $el.hasClass('fld-extra-fee') || $el.hasClass('fld-customer-price')) {
                    var raw = $.trim($el.val() || '');
                    if (raw !== '') {
                        var formatted = $el.hasClass('fld-price') ? fmtPriceInput(raw) : fmtMoneyInput(raw);
                        if (formatted !== '') {
                            $el.val(formatted);
                        }
                    }
                }
                if ($el.hasClass('fld-purchase-amount')) {
                    applyAmountToPrice(resolveRowId(this));
                } else if ($el.hasClass('fld-price')) {
                    refreshPurchaseAmount(resolveRowId(this));
                }
                scheduleAutoSave(resolveRowId(this), true);
            });
            // 回车立即保存当前行
            table.on('keydown', '.fld-price,.fld-purchase-amount,.fld-customer-price,.fld-purchase-note,.fld-extra-fee,.fld-extra-fee-reason', function (e) {
                if (e.key !== 'Enter' && e.which !== 13 && e.keyCode !== 13) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                var $el = $(this);
                if ($el.hasClass('fld-price') || $el.hasClass('fld-purchase-amount') || $el.hasClass('fld-extra-fee') || $el.hasClass('fld-customer-price')) {
                    var rawEnter = $.trim($el.val() || '');
                    if (rawEnter !== '') {
                        var formattedEnter = $el.hasClass('fld-price') ? fmtPriceInput(rawEnter) : fmtMoneyInput(rawEnter);
                        if (formattedEnter !== '') {
                            $el.val(formattedEnter);
                        }
                    }
                }
                var rowId = resolveRowId(this);
                if ($el.hasClass('fld-purchase-amount')) {
                    applyAmountToPrice(rowId);
                } else if ($el.hasClass('fld-price')) {
                    refreshPurchaseAmount(rowId);
                }
                $el.data('skip-blur-save', 1);
                scheduleAutoSave(rowId, true, true);
                $el.blur();
            });

            $(document).off('click.myitemsUploadPimg', '.btn-upload-pimg').on('click.myitemsUploadPimg', '.btn-upload-pimg', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var rowId = $(this).data('row-id') || resolveRowId(this);
                if (!rowId) {
                    return;
                }
                var cur = $.trim((findRowField('.fld-purchase-image', rowId).val() || '') || ((getRowById(rowId) || {}).purchase_image || ''));
                var html = '<div class="sa-section sa-upload" style="padding:24px 28px 16px;min-height:220px;">' +
                    '<label class="sa-label">采购图片</label>' +
                    '<div class="input-group">' +
                    '<input id="c-row-purchase-image" class="form-control" type="text" value="' + esc(cur) + '" readonly placeholder="上传采购图片">' +
                    '<div class="input-group-addon no-border no-padding">' +
                    '<button type="button" id="faupload-row-purchase-image" class="btn btn-upload faupload" ' +
                    'data-input-id="c-row-purchase-image" data-mimetype="jpg,jpeg,png,gif,webp,bmp" data-multiple="false" ' +
                    'data-preview-id="p-row-purchase-image"><i class="fa fa-upload"></i> 上传</button>' +
                    '</div></div>' +
                    '<ul class="list-inline faupload-preview" id="p-row-purchase-image" style="margin-top:12px;"></ul></div>';
                Layer.open({
                    type: 1,
                    title: '上传采购图片',
                    area: ['720px', '420px'],
                    btn: ['确定', '取消'],
                    content: html,
                    success: function (layero) {
                        Form.events.plupload(layero);
                    },
                    yes: function (index, layero) {
                        var path = $.trim(layero.find('#c-row-purchase-image').val() || '');
                        setPurchaseImage(rowId, path);
                        Layer.close(index);
                    }
                });
            });
            $(document).off('click.myitemsClearPimg', '.btn-clear-pimg').on('click.myitemsClearPimg', '.btn-clear-pimg', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var rowId = $(this).data('row-id') || resolveRowId(this);
                if (!rowId) {
                    return;
                }
                setPurchaseImage(rowId, '');
            });

            var SubmitPaySchedule = {
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
                    if (isNaN(n)) {
                        return '0.00';
                    }
                    return n.toFixed(2);
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
                    if (n === 2) {
                        return [50, 50];
                    }
                    return [34, 33, 33];
                },
                netToGrossAmounts: function (netAmounts, waive) {
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
                },
                readWaive: function (layero) {
                    return Math.max(0, Math.round((parseFloat(layero.find('#c-submit-waive-amount').val()) || 0) * 100) / 100);
                },
                getNetBase: function (layero, planTotal) {
                    planTotal = Math.round((parseFloat(planTotal) || 0) * 100) / 100;
                    return Math.max(0, Math.round((planTotal - this.readWaive(layero)) * 100) / 100);
                },
                syncWaiveUi: function (layero, planTotal) {
                    planTotal = Math.round((parseFloat(planTotal) || 0) * 100) / 100;
                    var waive = this.readWaive(layero);
                    if (waive - planTotal > 0.001) {
                        waive = planTotal;
                        layero.find('#c-submit-waive-amount').val(this.fmt(waive));
                    }
                    layero.find('#submit-max-waive').text(this.fmt(planTotal));
                    layero.find('#c-submit-waive-amount').attr('max', planTotal);
                    layero.find('.pay-waive-sum-amt').text(this.fmt(waive));
                    layero.find('.pay-waive-sum-tip').toggle(waive > 0.001);
                },
                bind: function (layero, planTotal, opts) {
                    opts = opts || {};
                    var self = this;
                    planTotal = Math.round((parseFloat(planTotal) || 0) * 100) / 100;
                    var updateSumTip = function () {
                        var netBase = self.getNetBase(layero, planTotal);
                        var amounts = self.readAmounts(layero);
                        var sum = amounts.reduce(function (a, b) {
                            return a + b;
                        }, 0);
                        sum = Math.round(sum * 100) / 100;
                        layero.find('.pay-total-sum').text(self.fmt(netBase));
                        layero.find('.pay-amount-sum').text(self.fmt(sum));
                        layero.find('.amount-sum-bad').toggle(Math.abs(sum - netBase) > 0.02);
                        self.syncWaiveUi(layero, planTotal);
                    };
                    // 改某一期应付款后，后面各期按「净额 − 已填」自动补齐
                    var autoFillRest = function ($input) {
                        var $rows = layero.find('.pay-period-row:visible');
                        var n = $rows.length;
                        if (n <= 1) {
                            updateSumTip();
                            return;
                        }
                        var idx = $rows.index($input.closest('.pay-period-row'));
                        if (idx < 0) {
                            updateSumTip();
                            return;
                        }
                        var netBase = self.getNetBase(layero, planTotal);
                        var used = 0;
                        $rows.each(function (i) {
                            if (i > idx) {
                                return;
                            }
                            var v = parseFloat($(this).find('.pay-amount-input').val());
                            if (isNaN(v) || v < 0) {
                                v = 0;
                            }
                            v = Math.round(v * 100) / 100;
                            if (i === idx) {
                                // 当前期不超过净额
                                if (v > netBase) {
                                    v = netBase;
                                    $input.val(self.fmt(v));
                                }
                            }
                            used = Math.round((used + v) * 100) / 100;
                        });
                        var restCount = n - idx - 1;
                        if (restCount <= 0) {
                            // 改的是最后一期：用净额反推，保证合计正确
                            var prevSum = 0;
                            $rows.each(function (i) {
                                if (i >= n - 1) {
                                    return;
                                }
                                var pv = parseFloat($(this).find('.pay-amount-input').val());
                                if (isNaN(pv) || pv < 0) {
                                    pv = 0;
                                }
                                prevSum = Math.round((prevSum + pv) * 100) / 100;
                            });
                            var lastAmt = Math.max(0, Math.round((netBase - prevSum) * 100) / 100);
                            $rows.eq(n - 1).find('.pay-amount-input').val(self.fmt(lastAmt));
                            updateSumTip();
                            return;
                        }
                        var remain = Math.max(0, Math.round((netBase - used) * 100) / 100);
                        var rest = self.splitEqual(remain, restCount);
                        $rows.each(function (i) {
                            if (i <= idx) {
                                return;
                            }
                            $(this).find('.pay-amount-input').val(self.fmt(rest[i - idx - 1] || 0));
                        });
                        updateSumTip();
                    };
                    var syncPeriods = function (resetAmounts) {
                        var n = parseInt(layero.find('input[name="submit_pay_periods"]:checked').val(), 10) || 1;
                        var netBase = self.getNetBase(layero, planTotal);
                        var amounts = resetAmounts ? self.splitEqual(netBase, n) : self.readAmounts(layero);
                        if (resetAmounts || amounts.length !== n) {
                            amounts = self.splitEqual(netBase, n);
                        }
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
                    layero.find('input[name="submit_pay_periods"]').off('change.submitPaySch').on('change.submitPaySch', function () {
                        syncPeriods(true);
                    });
                    layero.off('input.submitPayAmt change.submitPayAmt', '.pay-amount-input')
                        .on('input.submitPayAmt change.submitPayAmt', '.pay-amount-input', function () {
                            autoFillRest($(this));
                        });
                    layero.find('#c-submit-waive-amount').off('input.submitWaive change.submitWaive').on('input.submitWaive change.submitWaive', function () {
                        syncPeriods(true);
                    });
                    if (opts.defaultPeriods) {
                        layero.find('input[name="submit_pay_periods"][value="' + opts.defaultPeriods + '"]').prop('checked', true);
                    }
                    layero.find('#c-submit-waive-amount').val('0.00');
                    layero.find('#c-submit-waive-remark').val('');
                    syncPeriods(true);
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
                validate: function (layero, planTotal) {
                    planTotal = Math.round((parseFloat(planTotal) || 0) * 100) / 100;
                    var waive = this.readWaive(layero);
                    if (waive < 0) {
                        return {ok: false, msg: '抹零金额不能为负'};
                    }
                    if (waive - planTotal > 0.001) {
                        return {ok: false, msg: '抹零金额不能超过总金额 ' + planTotal.toFixed(2)};
                    }
                    var remark = $.trim(layero.find('#c-submit-waive-remark').val() || '');
                    if (waive <= 0.001) {
                        waive = 0;
                        remark = '';
                    }
                    var netBase = Math.max(0, Math.round((planTotal - waive) * 100) / 100);
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
                    var sum = amounts.reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    sum = Math.round(sum * 100) / 100;
                    if (Math.abs(sum - netBase) > 0.02) {
                        return {ok: false, msg: '各期应付款合计须等于净额（总额−抹零）' + netBase.toFixed(2) + '，当前为 ' + sum.toFixed(2)};
                    }
                    var gross = this.netToGrossAmounts(amounts, waive);
                    return {
                        ok: true,
                        pay_term: n <= 1 ? 'full' : 'ratio',
                        pay_ratios: this.dummyRatios(n).join('/'),
                        pay_dates: dates.join('/'),
                        pay_amounts: gross.map(function (a) {
                            return a.toFixed(2);
                        }).join('/'),
                        waive_amount: waive,
                        waive_remark: remark
                    };
                }
            };

            $(document).off('click.myitemsSubmitApprove', '.btn-submit-approve').on('click.myitemsSubmitApprove', '.btn-submit-approve', function () {
                var selected = Table.api.selecteddata(table);
                if (!selected.length) {
                    Layer.msg('请先勾选要提交采购计划的明细');
                    return;
                }
                var rows = [];
                var noPrice = [];
                var notEditable = [];
                selected.forEach(function (row) {
                    if (!canEdit(row)) {
                        notEditable.push(row.id);
                        return;
                    }
                    var vals = readRowInputs(row.id);
                    var price = parseFloat(vals.price);
                    if (isNaN(price) || price <= 0) {
                        noPrice.push(row.id);
                        return;
                    }
                    var qty = parseFloat(row.qty);
                    if (isNaN(qty) || qty < 0) {
                        qty = 0;
                    }
                    rows.push({
                        id: row.id,
                        factory_id: vals.factory_id || 0,
                        factory_name: vals.factory_name || '',
                        qty: qty,
                        price: vals.price,
                        purchase_note: vals.purchase_note,
                        purchase_image: vals.purchase_image,
                        extra_fee: vals.extra_fee || 0,
                        extra_fee_reason: vals.extra_fee_reason || '',
                        contract: vals.contract
                    });
                });
                if (notEditable.length) {
                    Layer.msg('含已提交审批或不可编辑的明细，请只勾选待提交（未报价/已报价/已驳回）的明细');
                    return;
                }
                if (noPrice.length) {
                    Layer.msg('请先填写单价后再提交');
                    return;
                }
                if (!rows.length) {
                    Layer.msg('没有可提交的明细');
                    return;
                }
                var winW = $(window).width() || 1280;
                var winH = $(window).height() || 800;
                var dlgW = Math.min(860, Math.max(680, winW - 48));
                Layer.open({
                    type: 1,
                    title: '提交采购计划',
                    area: [dlgW + 'px', '90%'],
                    maxWidth: winW - 24,
                    btn: ['确认提交'],
                    btnAlign: 'c',
                    content: Template('submit-approve-tpl', {}),
                    success: function (layero) {
                        // 固定 90% 高：内容区撑满，确认按钮贴弹窗底部
                        layero.css({
                            display: 'flex',
                            flexDirection: 'column'
                        });
                        layero.find('.layui-layer-title').css({flexShrink: 0});
                        layero.find('.layui-layer-content').css({
                            flex: '1 1 auto',
                            overflowY: 'auto',
                            height: 'auto'
                        });
                        layero.find('.layui-layer-btn').css({
                            flexShrink: 0,
                            marginTop: 'auto'
                        });
                        layero.find('#submit-count').text(rows.length);
                        // 总金额 = 单价×数量 + 附加费
                        var planTotal = 0;
                        rows.forEach(function (r) {
                            var price = parseFloat(r.price) || 0;
                            var qty = parseFloat(r.qty);
                            if (isNaN(qty)) {
                                qty = 0;
                            }
                            var extra = parseFloat(r.extra_fee) || 0;
                            planTotal += price * qty + extra;
                        });
                        planTotal = Math.round(planTotal * 100) / 100;
                        var fmtMoney = function (n) {
                            var v = parseFloat(n);
                            if (isNaN(v)) {
                                v = 0;
                            }
                            return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        };
                        layero.find('#submit-total-amount').text(fmtMoney(planTotal));
                        // 勾选明细若已有相同合同编号则预填
                        var marks = [];
                        selected.forEach(function (row) {
                            var m = $.trim(String(row.batch_contract_no || ''));
                            if (m && marks.indexOf(m) < 0) {
                                marks.push(m);
                            }
                        });
                        if (marks.length === 1) {
                            layero.find('#c-submit-contract-no').val(marks[0]);
                        }
                        Form.events.plupload(layero);
                        layero.data('planTotal', planTotal);
                        SubmitPaySchedule.bind(layero, planTotal);
                    },
                    yes: function (index, layero) {
                        var contract = $.trim(layero.find('#c-submit-contract').val() || '');
                        var contractNo = $.trim(layero.find('#c-submit-contract-no').val() || '');
                        if (!contractNo) {
                            Layer.msg('请填写合同编号');
                            layero.find('#c-submit-contract-no').focus();
                            return;
                        }
                        var planTotal = parseFloat(layero.data('planTotal')) || 0;
                        var sch = SubmitPaySchedule.validate(layero, planTotal);
                        if (!sch.ok) {
                            Layer.msg(sch.msg);
                            return;
                        }
                        rows.forEach(function (r) {
                            r.contract = contract;
                        });
                        Backend.api.ajax({
                            url: 'purchase/order/submitapprove',
                            data: {
                                rows: JSON.stringify(rows),
                                contract: contract,
                                contract_no: contractNo,
                                pay_term: sch.pay_term,
                                pay_ratios: sch.pay_ratios,
                                pay_dates: sch.pay_dates,
                                pay_amounts: sch.pay_amounts,
                                waive_amount: sch.waive_amount || 0,
                                waive_remark: sch.waive_remark || ''
                            }
                        }, function () {
                            Layer.close(index);
                            table.bootstrapTable('refresh');
                        });
                    }
                });
            });

            $(document).off('click.myitemsMarkInbound', '.btn-mark-inbound').on('click.myitemsMarkInbound', '.btn-mark-inbound', function () {
                var selected = Table.api.selecteddata(table);
                if (!selected.length) {
                    Layer.msg('请先勾选要入仓的明细');
                    return;
                }
                var ids = selected.map(function (r) { return r.id; });
                Layer.confirm('确认将勾选的 <strong>' + ids.length + '</strong> 条标记为已入仓？', function (index) {
                    Layer.close(index);
                    Backend.api.ajax({
                        url: 'purchase/order/markinbound',
                        data: {ids: ids.join(',')}
                    }, function () {
                        table.bootstrapTable('refresh');
                    });
                });
            });

            $(document).off('click.myitemsEnterPacking', '.btn-enter-packing').on('click.myitemsEnterPacking', '.btn-enter-packing', function () {
                var selected = Table.api.selecteddata(table);
                if (!selected.length) {
                    Layer.msg('请先勾选要录入打包信息的明细');
                    return;
                }
                var noPlan = [];
                var factoryMap = {};
                selected.forEach(function (r) {
                    var pid = parseInt(r.plan_id, 10) || 0;
                    if (pid <= 0) {
                        noPlan.push(r.id);
                        return;
                    }
                    var fid = parseInt(r.factory_id, 10) || 0;
                    if (fid > 0) {
                        factoryMap[fid] = true;
                    }
                });
                if (noPlan.length) {
                    Layer.msg('所选明细尚未关联采购计划，请先完成报价审批');
                    return;
                }
                var notApproved = selected.filter(function (r) {
                    return (r.plan_status || '') !== 'approved';
                });
                if (notApproved.length) {
                    Layer.msg('仅「已批准」采购计划可录入打包信息');
                    return;
                }
                var factoryIds = Object.keys(factoryMap);
                if (factoryIds.length > 1) {
                    Layer.msg('所选明细不属于同一供应商，无法装入同一包裹');
                    return;
                }
                var ids = selected.map(function (r) { return r.id; });
                Backend.api.ajax({
                    url: 'purchase/container/createpackfromitems',
                    data: {order_item_ids: ids.join(',')}
                }, function (data) {
                    var id = data && data.id;
                    if (!id) {
                        Layer.msg('创建失败');
                        return false;
                    }
                    Backend.api.open('purchase/container/detail/ids/' + id, '录入打包信息', {area: ['95%', '92%']});
                    table.bootstrapTable('refresh');
                    return false;
                });
            });

            $(document).off('click.myitemsSubmitPacking', '.btn-submit-packing').on('click.myitemsSubmitPacking', '.btn-submit-packing', function () {
                var selected = Table.api.selecteddata(table);
                if (!selected.length) {
                    Layer.msg('请先勾选要提交装箱记录的明细');
                    return;
                }
                var notApproved = selected.filter(function (r) {
                    return (r.plan_status || '') !== 'approved';
                });
                if (notApproved.length) {
                    Layer.msg('仅「已批准」采购计划下的明细可提交装箱记录');
                    return;
                }
                var duplicated = selected.filter(function (r) {
                    return parseInt(r.has_packing, 10) === 1 || r.purchase_status === 'boxed';
                });
                if (duplicated.length) {
                    var names = duplicated.map(function (r) {
                        var n = r.name || ('#' + r.id);
                        return r.mark ? (n + '（' + r.mark + '）') : n;
                    });
                    Layer.msg('以下明细已提交过装箱记录，请勿重复提交：' + names.join('、'));
                    return;
                }
                var ids = selected.map(function (r) { return r.id; });
                Layer.open({
                    type: 1,
                    title: '提交装箱记录',
                    area: ['720px', 'auto'],
                    maxHeight: 720,
                    btn: ['确认提交'],
                    btnAlign: 'c',
                    content: Template('submit-packing-tpl', {}),
                    success: function (layero) {
                        layero.find('#packing-count').text(ids.length);
                        Form.events.plupload(layero);
                    },
                    yes: function (index, layero) {
                        var place = $.trim(layero.find('#c-packing-place').val() || '');
                        var packQty = parseInt(layero.find('#c-packing-qty').val(), 10) || 0;
                        if (!place) {
                            Layer.msg('请填写送货地');
                            return;
                        }
                        if (packQty <= 0) {
                            Layer.msg('请填写包装数量');
                            return;
                        }
                        Backend.api.ajax({
                            url: 'purchase/packing/submit',
                            data: {
                                ids: ids.join(','),
                                delivery_place: place,
                                pack_spec: $.trim(layero.find('#c-packing-spec').val() || ''),
                                package_type: layero.find('#c-packing-type').val() || '编织袋',
                                pack_image: $.trim(layero.find('#c-packing-image').val() || ''),
                                pack_unit: layero.find('#c-packing-unit').val() || '袋',
                                pack_qty: packQty
                            }
                        }, function () {
                            Layer.close(index);
                            Toastr.success('装箱记录已提交');
                            table.bootstrapTable('refresh');
                        });
                    }
                });
            });

            $(document).off('click.myitemsTransferBuyer', '.btn-transfer-buyer').on('click.myitemsTransferBuyer', '.btn-transfer-buyer', function () {
                if (!Config.canUseTransferBuyer) {
                    Layer.msg('无权使用转移负责人');
                    return;
                }
                var selected = Table.api.selecteddata(table);
                if (!selected.length) {
                    Layer.msg('请先勾选要转移的明细');
                    return;
                }
                var allowStatus = {pending: 1, quoted: 1, rejected: 1};
                var blocked = selected.filter(function (r) {
                    return !allowStatus[r.purchase_status];
                });
                if (blocked.length) {
                    Layer.msg('仅「待提交」状态可转移，请去掉初审/终审或已完成的明细');
                    return;
                }
                var buyers = (Config.buyerAdmins || []);
                if (!buyers.length) {
                    Layer.msg('暂无其他采购负责人可转');
                    return;
                }
                var html = Template('transfer-buyer-tpl', {});
                Layer.open({
                    type: 1,
                    title: '转移负责人',
                    area: ['420px', '260px'],
                    content: html,
                    btn: ['确认转移', '取消'],
                    success: function (layero) {
                        layero.find('#transfer-count').text(selected.length);
                        var $sel = layero.find('#c-transfer-buyer');
                        buyers.forEach(function (b) {
                            $sel.append('<option value="' + b.id + '">' + Fast.api.escape(b.nickname) + '（' + Fast.api.escape(b.username) + '）</option>');
                        });
                    },
                    yes: function (index, layero) {
                        var toId = parseInt(layero.find('#c-transfer-buyer').val(), 10) || 0;
                        if (!toId) {
                            Layer.msg('请选择目标负责人');
                            return;
                        }
                        var ids = selected.map(function (r) { return r.id; });
                        Backend.api.ajax({
                            url: 'purchase/order/transferbuyer',
                            data: {ids: ids.join(','), to_admin_id: toId}
                        }, function () {
                            Layer.close(index);
                            table.bootstrapTable('refresh');
                        });
                    }
                });
            });
        },
        edititem: function () {
            require(['upload'], function (Upload) {
                if ($('.faupload').length) {
                    Upload.api.upload($('.faupload'));
                }
            });
            Form.api.bindevent($("#edititem-form"), function () {
                if (parent.$ && parent.$("#table").length) {
                    parent.$("#table").bootstrapTable('refresh');
                }
                return true;
            });
            // 采购价最多 4 位小数；客户价/附加费最多 2 位
            var fmtPrice4 = function (v) {
                var n = parseFloat(v);
                if (isNaN(n)) {
                    return '';
                }
                return n.toFixed(6).replace(/\.?0+$/, '');
            };
            var fmtMoney2 = function (v) {
                var n = parseFloat(v);
                if (isNaN(n)) {
                    return '';
                }
                return n.toFixed(2).replace(/\.?0+$/, '');
            };
            var $price = $('#c-price');
            if ($price.length && $price.val() !== '') {
                $price.val(fmtPrice4($price.val()));
            }
            $price.on('blur', function () {
                var p = fmtPrice4($(this).val());
                if (p !== '') {
                    $(this).val(p);
                }
            });
            var $cprice = $('#c-customer_price');
            if ($cprice.length && $cprice.val() !== '') {
                $cprice.val(fmtMoney2($cprice.val()));
            }
            $cprice.on('blur', function () {
                var p = fmtMoney2($(this).val());
                if (p !== '') {
                    $(this).val(p);
                }
            });
            var $extraFee = $('#c-extra_fee');
            if ($extraFee.length && $extraFee.val() !== '') {
                $extraFee.val(fmtMoney2($extraFee.val()));
            }
            $extraFee.on('blur', function () {
                var p = fmtMoney2($(this).val());
                if (p !== '') {
                    $(this).val(p);
                }
            });
            var fmtQty2 = function (v) {
                var n = parseFloat(v);
                if (isNaN(n)) {
                    return '';
                }
                return Math.abs(n - Math.round(n)) < 0.00001 ? String(Math.round(n)) : n.toFixed(2);
            };
            var $qty = $('#c-qty');
            $qty.on('blur', function () {
                var q = fmtQty2($(this).val());
                if (q !== '') {
                    $(this).val(q);
                }
            });
            // 弹层内 target=_blank 常被拦截，改为 Layer 预览
            $(document).off('click.edititemUploadPreview', '.faupload-preview a.thumbnail')
                .on('click.edititemUploadPreview', '.faupload-preview a.thumbnail', function (e) {
                    var href = $(this).attr('href') || '';
                    var dataUrl = $(this).data('url') || '';
                    var check = href + ' ' + dataUrl;
                    if (!/\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(check) && !/^data:image\//i.test(href)) {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    Controller.api.previewImage(href || Fast.api.cdnurl(dataUrl));
                });
        },
        additem: function () {
            require(['upload'], function (Upload) {
                if ($('.faupload').length) {
                    Upload.api.upload($('.faupload'));
                }
            });
            Form.api.bindevent($("#additem-form"), function (data, ret) {
                Toastr.success((ret && ret.msg) ? ret.msg : '已新增');
                try {
                    if (parent.$ && parent.$("#table").length) {
                        parent.$("#table").bootstrapTable('refresh');
                    }
                    parent.$('.btn-refresh').trigger('click');
                } catch (e) {}
                var frameIndex = parent.Layer.getFrameIndex(window.name);
                parent.Layer.close(frameIndex);
                return false;
            });
            $(document).off('click.additemUploadPreview', '.faupload-preview a.thumbnail')
                .on('click.additemUploadPreview', '.faupload-preview a.thumbnail', function (e) {
                    var href = $(this).attr('href') || '';
                    var dataUrl = $(this).data('url') || '';
                    var check = href + ' ' + dataUrl;
                    if (!/\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(check) && !/^data:image\//i.test(href)) {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    Controller.api.previewImage(href || Fast.api.cdnurl(dataUrl));
                });
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            },
            previewImage: function (url) {
                if (!url) {
                    return;
                }
                var src = Fast.api.cdnurl(String(url).split(',')[0]);
                var L = (window.parent && window.parent !== window && parent.Layer) ? parent.Layer : Layer;
                L.photos({
                    photos: {
                        start: 0,
                        data: [{src: src, thumb: src}]
                    },
                    anim: 5,
                    shade: 0.4
                });
            }
        }
    };
    return Controller;
});
