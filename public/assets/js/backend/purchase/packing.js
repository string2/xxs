define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {
    var Controller = {
        index: function () {
            var state = {page: 1, limit: 10, total: 0};
            var esc = function (v) {
                return Fast.api.escape(v === null || v === undefined ? '' : String(v));
            };
            var imgHtml = function (value) {
                if (!value) {
                    return '';
                }
                var url = Fast.api.cdnurl(value);
                return '<a href="javascript:" class="packing-img-preview" title="预览">' +
                    '<img class="packing-cell-img" src="' + url + '" ' +
                    'onerror="this.onerror=null;this.parentNode.outerHTML=\'\';">' +
                    '</a>';
            };
            var formatQty = function (v) {
                if (v === '' || v === null || v === undefined) {
                    return '';
                }
                var n = Number(v);
                if (isNaN(n)) {
                    return esc(v);
                }
                if (Math.abs(n - Math.round(n)) < 0.00001) {
                    return String(Math.round(n));
                }
                return String(parseFloat(n.toFixed(2)));
            };
            var selectedIds = function () {
                var ids = [];
                $('#packing-excel-body .packing-check:checked').each(function () {
                    ids.push(parseInt($(this).val(), 10));
                });
                return ids;
            };
            var syncToolbar = function () {
                var ids = selectedIds();
                $('.btn-export-packing, .btn-print-packing, .btn-del-packing').toggleClass('disabled', ids.length === 0);
            };
            var renderRows = function (rows) {
                var $body = $('#packing-excel-body');
                if (!rows || !rows.length) {
                    $body.html('<tr><td colspan="14" class="cell-empty">暂无装箱记录</td></tr>');
                    return;
                }
                var html = '';
                var packIdx = -1;
                rows.forEach(function (r) {
                    var showPack = parseInt(r.show_pack, 10) === 1;
                    var rowspan = parseInt(r.rowspan, 10) || 1;
                    if (showPack) {
                        packIdx++;
                    }
                    var rowClass = (packIdx % 2 === 1 ? 'pack-alt' : '') + (showPack ? ' pack-group-start' : '');
                    html += '<tr class="' + $.trim(rowClass) + '">';
                    if (showPack) {
                        html += '<td class="cell-pack" rowspan="' + rowspan + '"><input type="checkbox" class="packing-check" value="' + r.id + '"></td>';
                    }
                    html += '<td>' + esc(r.seq) + '</td>';
                    html += '<td class="cell-mark">' + esc(r.mark || '') + '</td>';
                    html += '<td>' + imgHtml(r.image) + '</td>';
                    html += '<td class="cell-left">' + esc(r.name || '') + '</td>';
                    html += '<td>' + esc(r.unit || '') + '</td>';
                    html += '<td>' + formatQty(r.qty) + '</td>';
                    if (showPack) {
                        html += '<td class="cell-pack" rowspan="' + rowspan + '">' + esc(r.delivery_place || '') + '</td>';
                        html += '<td class="cell-spec cell-pack" rowspan="' + rowspan + '">' + esc(r.pack_spec || '').replace(/\n/g, '<br>') + '</td>';
                        html += '<td class="cell-pack" rowspan="' + rowspan + '">' + esc(r.package_type || '') + '</td>';
                        html += '<td class="cell-pack" rowspan="' + rowspan + '">' + imgHtml(r.pack_image) + '</td>';
                        html += '<td class="cell-pack" rowspan="' + rowspan + '">' + esc(r.pack_unit || '') + '</td>';
                        html += '<td class="cell-pack" rowspan="' + rowspan + '">' + esc(r.pack_qty || '') + '</td>';
                        html += '<td class="cell-pack cell-ops" rowspan="' + rowspan + '">' +
                            '<a href="javascript:;" class="btn btn-xs btn-success btn-packing-edit" data-id="' + r.id + '">编辑</a>' +
                            '</td>';
                    }
                    html += '</tr>';
                });
                $body.html(html);
                $('.packing-check-all').prop('checked', false);
                syncToolbar();
            };
            var renderPager = function () {
                var pages = Math.max(1, Math.ceil(state.total / state.limit) || 1);
                if (state.page > pages) {
                    state.page = pages;
                }
                var from = state.total ? ((state.page - 1) * state.limit + 1) : 0;
                var to = Math.min(state.page * state.limit, state.total);
                $('.packing-excel-info').text('显示第 ' + from + ' 到第 ' + to + ' 条装箱记录，总共 ' + state.total + ' 条');
                $('.packing-page-num').text(state.page + ' / ' + pages);
                $('.packing-page-prev').prop('disabled', state.page <= 1).toggleClass('disabled', state.page <= 1);
                $('.packing-page-next').prop('disabled', state.page >= pages).toggleClass('disabled', state.page >= pages);
            };
            var loadSheet = function () {
                $('#packing-excel-body').html('<tr><td colspan="14" class="cell-empty">加载中…</td></tr>');
                $.ajax({
                    url: Fast.api.fixurl('purchase/packing/index'),
                    dataType: 'json',
                    data: {
                        offset: (state.page - 1) * state.limit,
                        limit: state.limit,
                        sort: 'id',
                        order: 'desc'
                    },
                    success: function (res) {
                        state.total = parseInt(res.total, 10) || 0;
                        renderRows(res.rows || []);
                        renderPager();
                    },
                    error: function () {
                        $('#packing-excel-body').html('<tr><td colspan="14" class="cell-empty">加载失败</td></tr>');
                    }
                });
            };

            $(document).off('click.packingSheetRefresh', '.btn-refresh').on('click.packingSheetRefresh', '.btn-refresh', loadSheet);
            $(document).off('click.packingPagePrev', '.packing-page-prev').on('click.packingPagePrev', '.packing-page-prev', function (e) {
                e.preventDefault();
                if ($(this).hasClass('disabled')) {
                    return;
                }
                if (state.page > 1) {
                    state.page--;
                    loadSheet();
                }
            });
            $(document).off('click.packingPageNext', '.packing-page-next').on('click.packingPageNext', '.packing-page-next', function (e) {
                e.preventDefault();
                if ($(this).hasClass('disabled')) {
                    return;
                }
                var pages = Math.max(1, Math.ceil(state.total / state.limit) || 1);
                if (state.page < pages) {
                    state.page++;
                    loadSheet();
                }
            });
            $(document).off('change.packingCheckAll', '.packing-check-all').on('change.packingCheckAll', '.packing-check-all', function () {
                $('#packing-excel-body .packing-check').prop('checked', $(this).prop('checked'));
                syncToolbar();
            });
            $(document).off('change.packingCheck', '.packing-check').on('change.packingCheck', '.packing-check', syncToolbar);

            $(document).off('click.packingExport', '.btn-export-packing').on('click.packingExport', '.btn-export-packing', function () {
                if ($(this).hasClass('disabled')) {
                    return;
                }
                var ids = selectedIds();
                if (!ids.length) {
                    Layer.msg('请先勾选要导出的装箱记录');
                    return;
                }
                window.open(Fast.api.fixurl('purchase/packing/export?ids=' + ids.join(',')), '_blank');
            });
            $(document).off('click.packingPrint', '.btn-print-packing').on('click.packingPrint', '.btn-print-packing', function () {
                if ($(this).hasClass('disabled')) {
                    return;
                }
                var ids = selectedIds();
                if (!ids.length) {
                    Layer.msg('请先勾选要打印的装箱记录');
                    return;
                }
                window.open(Fast.api.fixurl('purchase/packing/printsheet?ids=' + ids.join(',')), '_blank');
            });
            $(document).off('click.packingDel', '.btn-del-packing').on('click.packingDel', '.btn-del-packing', function () {
                if ($(this).hasClass('disabled')) {
                    return;
                }
                var ids = selectedIds();
                if (!ids.length) {
                    Layer.msg('请先勾选要删除的装箱记录');
                    return;
                }
                Layer.confirm(__('Are you sure you want to delete the %s selected item?', ids.length), function (index) {
                    Backend.api.ajax({
                        url: 'purchase/packing/del',
                        data: {ids: ids.join(',')}
                    }, function () {
                        Layer.close(index);
                        loadSheet();
                    });
                });
            });
            $(document).off('click.packingImg', '.packing-img-preview').on('click.packingImg', '.packing-img-preview', function (e) {
                e.preventDefault();
                var src = $(this).find('img').attr('src') || '';
                if (src) {
                    Layer.photos({photos: {data: [{src: src}]}, anim: 5});
                }
            });
            $(document).off('click.packingEdit', '.btn-packing-edit').on('click.packingEdit', '.btn-packing-edit', function () {
                Backend.api.open('purchase/packing/edit?ids=' + $(this).data('id'), '编辑装箱记录', {
                    area: ['800px', '90%'],
                    callback: function () {
                        loadSheet();
                    }
                });
            });

            loadSheet();
        },
        edit: function () {
            Controller.api.bindevent();
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
