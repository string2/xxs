define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'warehouse/stock/index' + location.search,
                    del_url: 'warehouse/stock/del',
                    multi_url: 'warehouse/stock/multi',
                    table: 'warehouse_stock',
                }
            });

            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                sortOrder: 'desc',
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: 'ID', sortable: true, width: 60},
                    {field: 'warehouse_name', title: '仓库', operate: 'LIKE', width: 90},
                    {field: 'inbound_no', title: '进仓编号', operate: 'LIKE', width: 140},
                    {field: 'mark', title: '唛头', operate: 'LIKE', width: 100},
                    {field: 'goods_name', title: '货名', operate: 'LIKE', width: 100},
                    {field: 'cell', title: '库位', operate: false, width: 90},
                    {field: 'location_raw', title: '原始库位', operate: 'LIKE', width: 140},
                    {field: 'qty', title: '件数', operate: false, sortable: true, width: 70},
                    {field: 'volume', title: '体积', operate: false, width: 70},
                    {field: 'package_type', title: '包装', operate: 'LIKE', width: 70},
                    {field: 'storage_days', title: '堆存天', operate: false, sortable: true, width: 70},
                    {field: 'inbound_time', title: '入库时间', operate: 'LIKE', width: 140},
                    {field: 'is_rack', title: '类型', searchList: {"1": "货架", "0": "非货架"}, formatter: Table.api.formatter.normal, width: 70},
                    {field: 'import_batch', title: '批次', operate: 'LIKE', width: 120},
                    {
                        field: 'operate',
                        title: __('Operate'),
                        table: table,
                        events: Table.api.events.operate,
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
        },

        import: function () {
            var $btn = $('#btn-import');
            var $file = $('#stock-file');
            var $result = $('#import-result');
            var $meta = $('#import-meta');

            function tip(ok, msg) {
                if (typeof Toastr !== 'undefined') {
                    ok ? Toastr.success(msg) : Toastr.error(msg);
                } else if (typeof Layer !== 'undefined') {
                    Layer.msg(msg);
                } else {
                    alert(msg);
                }
            }

            $btn.off('click.whImport').on('click.whImport', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var input = $file[0];
                if (!input || !input.files || !input.files[0]) {
                    tip(false, '请选择要上传的 Excel 文件');
                    return false;
                }
                var file = input.files[0];
                var fname = String(file.name || '').toLowerCase();
                if (!/\.(xls|xlsx|csv)$/.test(fname)) {
                    tip(false, '仅支持 .xls / .xlsx / .csv 文件');
                    return false;
                }

                var fd = new FormData();
                fd.append('file', file);
                try {
                    var token = $('input[name="__token__"]').val()
                        || (typeof Config !== 'undefined' && (Config.formtoken || Config.token))
                        || '';
                    if (token) {
                        fd.append('__token__', token);
                    }
                } catch (err) {}

                $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> 导入中…');
                $result.removeClass('hide').html('<div class="alert alert-info">正在上传并解析，请稍候…</div>');

                $.ajax({
                    url: Fast.api.fixurl('warehouse/stock/import'),
                    type: 'POST',
                    data: fd,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    headers: {'X-Requested-With': 'XMLHttpRequest'},
                    success: function (ret) {
                        $btn.prop('disabled', false).html('<i class="fa fa-upload"></i> 开始导入');
                        if (!ret) {
                            tip(false, '服务器无返回');
                            return;
                        }
                        // FastAdmin 成功码为 1
                        if (parseInt(ret.code, 10) === 1) {
                            tip(true, ret.msg || '导入成功');
                            var d = ret.data || {};
                            $result.html(
                                '<div class="alert alert-success">' +
                                'Excel 行数 <strong>' + (d.excel_rows || 0) + '</strong>，' +
                                '写入 <strong>' + (d.db_rows || 0) + '</strong> 条（货架 ' + (d.rack || 0) +
                                ' / 非货架 ' + (d.offgrid || 0) + '），' +
                                '批次 <code>' + (d.batch || '') + '</code>' +
                                '</div>'
                            );
                            if ($meta.length) {
                                $meta.html(
                                    '当前批次：<code>' + (d.batch || '') + '</code> · 刚导入 · 共 ' +
                                    (d.db_rows || 0) + ' 条'
                                );
                            }
                        } else {
                            tip(false, ret.msg || '导入失败');
                            $result.html('<div class="alert alert-danger">' + (ret.msg || '导入失败') + '</div>');
                        }
                    },
                    error: function (xhr) {
                        $btn.prop('disabled', false).html('<i class="fa fa-upload"></i> 开始导入');
                        var msg = '请求失败';
                        try {
                            if (xhr.responseJSON && xhr.responseJSON.msg) {
                                msg = xhr.responseJSON.msg;
                            } else if (xhr.responseText) {
                                var parsed = null;
                                try { parsed = JSON.parse(xhr.responseText); } catch (e2) {}
                                if (parsed && parsed.msg) {
                                    msg = parsed.msg;
                                } else if (xhr.status === 413) {
                                    msg = '文件太大，请调大服务器 upload_max_filesize / post_max_size';
                                } else if (xhr.status) {
                                    msg = '请求失败 HTTP ' + xhr.status + '（请确认已上传最新代码，并开放 runtime/warehouse 写权限）';
                                }
                            }
                        } catch (e3) {}
                        tip(false, msg);
                        $result.html('<div class="alert alert-danger">' + msg + '</div>');
                    }
                });
                return false;
            });

            $('.btn-dialog-map').off('click.whMap').on('click.whMap', function (e) {
                e.preventDefault();
                Backend.api.addtabs('warehouse/stock/map', '仓储平面图');
            });
        },

        map: function () {
            var ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
            var COLS = 27;
            var gridData = {};
            var offgrid = [];
            var highlighted = null;
            var selected = null;

            var $grid = $('#wh-grid');
            var $detail = $('#wh-detail');
            var $stats = $('#wh-stats');
            var $meta = $('#wh-meta');
            var $q = $('#wh-q');

            function esc(s) {
                return String(s == null ? '' : s)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            function cellItems(letter, col) {
                if (!gridData[letter] || !gridData[letter][col]) return [];
                return gridData[letter][col];
            }

            function primaryLabel(items) {
                if (!items || !items.length) return '';
                var marks = [];
                var qty = 0;
                items.forEach(function (it) {
                    var m = it.mark || it.inbound_no || it.goods_name || '货';
                    if (marks.indexOf(m) < 0) marks.push(m);
                    qty += parseFloat(it.qty) || 0;
                });
                return {
                    name: marks.length === 1 ? marks[0] : (marks[0] + '等' + marks.length + '批'),
                    qty: qty,
                    count: items.length
                };
            }

            function renderGrid() {
                var used = 0;
                ROWS.forEach(function (letter) {
                    for (var c = 1; c <= COLS; c++) {
                        if (cellItems(letter, c).length) used++;
                    }
                });
                var total = ROWS.length * COLS;
                $stats.html(
                    '总货位 <strong>' + total + '</strong> · 已用 <strong>' + used +
                    '</strong> · 空置 <strong>' + (total - used) +
                    '</strong> · 非货架 <strong>' + offgrid.length + '</strong>'
                );

                var html = '<div class="row-label"></div>';
                for (var displayCol = COLS; displayCol >= 1; displayCol--) {
                    html += '<div class="col-label">' + displayCol + '</div>';
                }

                ROWS.forEach(function (letter, ri) {
                    html += '<div class="row-label">' + letter + '</div>';
                    for (var displayCol = COLS; displayCol >= 1; displayCol--) {
                        var items = cellItems(letter, displayCol);
                        var occupied = items.length > 0;
                        var isHi = highlighted && highlighted.row === letter && highlighted.col === displayCol;
                        var isSel = selected && selected.row === letter && selected.col === displayCol;
                        var cls = 'wh-cell' + (occupied ? ' occupied' : ' empty');
                        if (isHi) cls += ' highlight';
                        if (isSel && !isHi) cls += ' selected';

                        var content = '<span>·</span>';
                        var title = '空位 ' + letter + displayCol;
                        if (occupied) {
                            var info = primaryLabel(items);
                            var name = info.name;
                            if (name.length > 8) name = name.slice(0, 7) + '…';
                            content = '<span class="item-name">' + esc(name) + '</span>' +
                                '<span class="qty-badge">×' + esc(String(info.qty)) + '</span>';
                            title = letter + displayCol + ' · ' + info.name + ' · ' + info.count + ' 批 / ' + info.qty + ' 件';
                        }

                        html += '<div class="' + cls + '" data-row="' + letter + '" data-col="' + displayCol +
                            '" title="' + esc(title) + '">' + content + '</div>';
                    }
                });
                $grid.html(html);
            }

            function showDetail(letter, col) {
                var items = cellItems(letter, col);
                var loc = letter + col;
                if (!items.length) {
                    $detail.html('<div class="hint">货位 <strong>' + loc + '</strong> · 空位</div>');
                    return;
                }
                var html = '<div class="di"><span class="lbl">货位</span><span class="val">' + loc + '</span></div>';
                items.forEach(function (it, idx) {
                    html += '<div class="di">' +
                        '<span class="lbl">' + (items.length > 1 ? ('#' + (idx + 1)) : '唛头') + '</span>' +
                        '<span class="val hot">' + esc(it.mark || '-') + '</span>' +
                        '<span class="lbl">编号</span><span class="val">' + esc(it.inbound_no || '-') + '</span>' +
                        '<span class="lbl">件数</span><span class="val">' + esc(String(it.qty)) + '</span>' +
                        '<span class="lbl">堆存</span><span class="val">' + esc(String(it.storage_days)) + ' 天</span>' +
                        '<span class="lbl">包装</span><span class="val">' + esc(it.package_type || '-') + '</span>' +
                        '</div>';
                });
                $detail.html(html);
            }

            function searchAndLocate(query) {
                var q = String(query || '').trim().toLowerCase();
                if (!q) {
                    highlighted = null;
                    renderGrid();
                    $detail.html('<div class="hint">输入唛头 / 进仓编号 / 库位后点击「定位」</div>');
                    return;
                }

                // 直接库位如 A12 / a01
                var m = q.toUpperCase().match(/^([A-G])0*(\d{1,2})$/);
                if (m) {
                    var letter = m[1];
                    var col = parseInt(m[2], 10);
                    if (col >= 1 && col <= COLS) {
                        highlighted = {row: letter, col: col};
                        selected = highlighted;
                        renderGrid();
                        showDetail(letter, col);
                        scrollToCell(letter, col);
                        return;
                    }
                }

                var found = null;
                for (var ri = 0; ri < ROWS.length && !found; ri++) {
                    var letter = ROWS[ri];
                    for (var c = 1; c <= COLS; c++) {
                        var items = cellItems(letter, c);
                        for (var i = 0; i < items.length; i++) {
                            var it = items[i];
                            var hay = [it.mark, it.inbound_no, it.goods_name, it.location_raw].join(' ').toLowerCase();
                            if (hay.indexOf(q) >= 0) {
                                found = {row: letter, col: c};
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                if (found) {
                    highlighted = found;
                    selected = found;
                    renderGrid();
                    showDetail(found.row, found.col);
                    scrollToCell(found.row, found.col);
                    $('.wh-off-item').removeClass('active');
                } else {
                    // 非货架
                    var offHit = null;
                    for (var oi = 0; oi < offgrid.length; oi++) {
                        var o = offgrid[oi];
                        var oh = [o.mark, o.inbound_no, o.goods_name, o.location_raw].join(' ').toLowerCase();
                        if (oh.indexOf(q) >= 0) {
                            offHit = o;
                            break;
                        }
                    }
                    highlighted = null;
                    renderGrid();
                    if (offHit) {
                        $detail.html(
                            '<div class="hint">非货架库位 · <strong class="text-warning">' + esc(offHit.location_raw) + '</strong>' +
                            ' · 唛头 <strong>' + esc(offHit.mark) + '</strong>' +
                            ' · 编号 ' + esc(offHit.inbound_no) +
                            ' · 件数 ' + esc(String(offHit.qty)) + '</div>'
                        );
                        $('.wh-off-item').removeClass('active');
                        $('.wh-off-item[data-id="' + offHit.id + '"]').addClass('active')[0] &&
                            $('.wh-off-item[data-id="' + offHit.id + '"]')[0].scrollIntoView({block: 'nearest', behavior: 'smooth'});
                    } else {
                        $detail.html('<div class="hint" style="color:#d9534f;">未找到「' + esc(query) + '」</div>');
                    }
                }
            }

            function scrollToCell(letter, col) {
                setTimeout(function () {
                    var el = document.querySelector('.wh-cell[data-row="' + letter + '"][data-col="' + col + '"]');
                    if (el) el.scrollIntoView({block: 'center', inline: 'center', behavior: 'smooth'});
                }, 80);
            }

            function renderOffgrid() {
                var $box = $('#wh-offgrid-box');
                var $list = $('#wh-off-list');
                if (!offgrid.length) {
                    $box.prop('hidden', true);
                    return;
                }
                $box.prop('hidden', false);
                $('#wh-off-count').text('（' + offgrid.length + '）');
                var html = '';
                offgrid.forEach(function (o) {
                    html += '<div class="wh-off-item" data-id="' + o.id + '">' +
                        '<div class="mk">' + esc(o.mark || o.inbound_no || '-') +
                        ' <span class="text-muted">×' + esc(String(o.qty)) + '</span></div>' +
                        '<div class="lc">' + esc(o.location_raw || '未填库位') +
                        (o.inbound_no ? (' · ' + esc(o.inbound_no)) : '') + '</div></div>';
                });
                $list.html(html);
            }

            $grid.on('click', '.wh-cell', function () {
                var letter = $(this).data('row');
                var col = parseInt($(this).data('col'), 10);
                selected = {row: letter, col: col};
                if (highlighted && highlighted.row === letter && highlighted.col === col) {
                    highlighted = null;
                }
                renderGrid();
                showDetail(letter, col);
            });

            $('#wh-off-list').on('click', '.wh-off-item', function () {
                var id = parseInt($(this).data('id'), 10);
                var hit = null;
                offgrid.forEach(function (o) { if (o.id === id) hit = o; });
                $('.wh-off-item').removeClass('active');
                $(this).addClass('active');
                if (hit) {
                    highlighted = null;
                    selected = null;
                    renderGrid();
                    $detail.html(
                        '<div class="hint">非货架 · <strong>' + esc(hit.location_raw) + '</strong>' +
                        ' · 唛头 <strong class="text-warning">' + esc(hit.mark) + '</strong>' +
                        ' · 编号 ' + esc(hit.inbound_no) +
                        ' · 件数 ' + esc(String(hit.qty)) +
                        ' · 堆存 ' + esc(String(hit.storage_days)) + ' 天</div>'
                    );
                }
            });

            $('#wh-search').on('click', function () { searchAndLocate($q.val()); });
            $q.on('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchAndLocate($q.val());
                }
            });
            $('#wh-clear').on('click', function () {
                highlighted = null;
                selected = null;
                $q.val('');
                $('.wh-off-item').removeClass('active');
                renderGrid();
                $detail.html('<div class="hint">点击货位或搜索物品，查看详细信息</div>');
            });

            $.getJSON('warehouse/stock/mapdata', function (ret) {
                if (!ret || ret.code !== 1) {
                    $meta.text('加载失败');
                    return;
                }
                if (ret.rows && ret.rows.length) ROWS = ret.rows;
                if (ret.cols) COLS = ret.cols;
                gridData = ret.grid || {};
                offgrid = ret.offgrid || [];
                var meta = ret.meta || {};
                $meta.text(
                    (meta.count ? ('库存 ' + meta.count + ' 条') : '暂无数据') +
                    (meta.time ? (' · 更新 ' + meta.time) : '') +
                    ' · ' + ROWS.length + ' 行 × ' + COLS + ' 列'
                );
                // rebuild grid columns CSS
                $grid.css('grid-template-columns', '44px repeat(' + COLS + ', minmax(34px, 1fr))');
                renderGrid();
                renderOffgrid();
            }).fail(function () {
                $meta.text('数据加载失败');
            });
        }
    };
    return Controller;
});
