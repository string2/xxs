define(['jquery', 'bootstrap', 'backend'], function ($, undefined, Backend) {
    var Controller = {
        index: function () {
            var $raw = $('#markprint-raw');
            var $preview = $('#markprint-preview');
            var $summary = $('#markprint-summary');
            var $copies = $('#markprint-copies');

            var esc = function (v) {
                return Fast.api.escape(v === null || v === undefined ? '' : String(v));
            };

            /**
             * 解析一行唛头原文，例如：
             * CN9x2026-02-123（1/20)(1PS）
             * CN9x2026-02-123 (1/20)(1PS)
             */
            var parseMarkLine = function (line) {
                var text = String(line || '')
                    .replace(/[\u200b\u00a0]/g, '')
                    .replace(/（/g, '(')
                    .replace(/）/g, ')')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (!text) {
                    return null;
                }

                var psMatch = text.match(/\((\d+)\s*PS\)/i);
                var ps = psMatch ? parseInt(psMatch[1], 10) : 1;
                var frac = text.match(/\((\d+)\s*\/\s*(\d+)\)/);
                if (!frac) {
                    return {
                        ok: true,
                        mark: text,
                        start: 1,
                        total: 1,
                        ps: ps,
                        raw: text,
                        hasFraction: false
                    };
                }
                var start = parseInt(frac[1], 10);
                var total = parseInt(frac[2], 10);
                if (!total || total < 1) {
                    return {ok: false, error: '分母无效：' + text};
                }
                if (!start || start < 1) {
                    start = 1;
                }
                if (start > total) {
                    return {ok: false, error: '分子不能大于分母：' + text};
                }

                // 唛头前缀：分子/分母括号之前的内容
                var mark = text.slice(0, frac.index).replace(/[\s\-–—]*$/, '').trim();
                if (!mark) {
                    return {ok: false, error: '未识别到唛头编号：' + text};
                }

                return {
                    ok: true,
                    mark: mark,
                    start: start,
                    total: total,
                    ps: ps,
                    raw: text,
                    hasFraction: true
                };
            };

            var parseRawInput = function (raw) {
                var text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
                if (!text) {
                    return {items: [], errors: ['请粘贴唛头原文']};
                }

                // 按空行分块；每块第1行唛头，第2行品名（可多行合并）
                var blocks = text.split(/\n\s*\n+/);
                var items = [];
                var errors = [];

                blocks.forEach(function (block, bi) {
                    var lines = block.split('\n').map(function (l) {
                        return $.trim(l);
                    }).filter(Boolean);
                    if (!lines.length) {
                        return;
                    }

                    // 兼容：整块挤在一行「唛头... 品名」时，仍用第一行解析唛头，其余当品名
                    var parsed = parseMarkLine(lines[0]);
                    if (!parsed || !parsed.ok) {
                        errors.push('第 ' + (bi + 1) + ' 组：' + (parsed && parsed.error ? parsed.error : '解析失败'));
                        return;
                    }
                    var name = lines.slice(1).join(' ').trim();
                    // 若品名写在同一行括号后（少见），尽量剥离
                    if (!name) {
                        var after = lines[0]
                            .replace(/（/g, '(')
                            .replace(/）/g, ')');
                        var m = after.match(/\)\s*([^\d(].*)$/);
                        if (m && m[1] && !/^\s*\(/i.test(m[1])) {
                            name = $.trim(m[1].replace(/^\s*[\-–—]\s*/, ''));
                        }
                    }
                    items.push({
                        mark: parsed.mark,
                        name: name,
                        start: parsed.start,
                        total: parsed.total,
                        ps: parsed.ps,
                        raw: parsed.raw,
                        hasFraction: parsed.hasFraction
                    });
                });

                return {items: items, errors: errors};
            };

            var buildLabels = function (items, copies) {
                var labels = [];
                var hints = [];
                copies = Math.max(1, parseInt(copies, 10) || 1);
                items.forEach(function (r, idx) {
                    if (r.hasFraction === false) {
                        for (var plainCopy = 0; plainCopy < copies; plainCopy++) {
                            labels.push({line1: r.raw || r.mark, line2: r.name || ''});
                        }
                        hints.push(
                            (idx + 1) + '. ' + r.mark +
                            ' → 无分子/分母 · 按打印份数 ' + copies + ' 份 · 展开 ' + copies + ' 张' +
                            (r.name ? (' · ' + r.name) : '')
                        );
                        return;
                    }
                    var start = Math.max(1, parseInt(r.start, 10) || 1);
                    var total = Math.max(start, parseInt(r.total, 10) || 1);
                    var psText = String(r.ps) + 'PS';
                    var count = 0;
                    for (var i = start; i <= total; i++) {
                        var line1 = r.mark + ' (' + i + '/' + total + ')(' + psText + ')';
                        for (var c = 0; c < copies; c++) {
                            labels.push({line1: line1, line2: r.name || ''});
                            count++;
                        }
                    }
                    hints.push(
                        (idx + 1) + '. ' + r.mark +
                        ' → 箱号 ' + start + '~' + total +
                        '（共 ' + (total - start + 1) + ' 箱）· ' + psText +
                        ' · 每箱 ' + copies + ' 份 · 展开 ' + count + ' 张' +
                        (r.name ? (' · ' + r.name) : '')
                    );
                });
                return {labels: labels, hints: hints};
            };

            var chunk = function (arr, size) {
                var pages = [];
                for (var i = 0; i < arr.length; i += size) {
                    pages.push(arr.slice(i, i + size));
                }
                return pages;
            };

            var renderPagesHtml = function (labels) {
                if (!labels.length) {
                    return '<div class="markprint-empty">暂无标签，请检查原文格式</div>';
                }
                var pages = chunk(labels, 3);
                var html = '<div class="markprint-pages">';
                pages.forEach(function (pageLabels) {
                    html += '<div class="markprint-a4">';
                    for (var i = 0; i < 3; i++) {
                        var lab = pageLabels[i];
                        if (lab) {
                            html += '<div class="markprint-cell">' +
                                '<div class="markprint-text">' +
                                '<div class="markprint-line1">' + esc(lab.line1) + '</div>' +
                                '<div class="markprint-line2">' + esc(lab.line2) + '</div>' +
                                '</div></div>';
                        } else {
                            html += '<div class="markprint-cell is-empty"></div>';
                        }
                    }
                    html += '</div>';
                });
                html += '</div>';
                return html;
            };

            var fitLines = function (root) {
                var $root = $(root || document);
                $root.find('.markprint-line1, .markprint-line2').each(function () {
                    var el = this;
                    el.style.fontSize = '';
                    var base = parseFloat(window.getComputedStyle(el).fontSize) || 24;
                    var size = base;
                    var min = 12;
                    var maxWidth = el.clientWidth || el.parentElement.clientWidth;
                    if (maxWidth <= 0) {
                        return;
                    }
                    var guard = 60;
                    while (el.scrollWidth > maxWidth && size > min && guard-- > 0) {
                        size -= 0.5;
                        el.style.fontSize = size + 'px';
                    }
                });
            };

            var lastLabels = [];

            var doPreview = function () {
                var parsed = parseRawInput($raw.val());
                if (parsed.errors.length && !parsed.items.length) {
                    Layer.msg(parsed.errors[0]);
                    $summary.text(parsed.errors.join('\n'));
                    return false;
                }
                if (!parsed.items.length) {
                    Layer.msg('未识别到有效唛头');
                    return false;
                }
                var built = buildLabels(parsed.items, $copies.val());
                lastLabels = built.labels;
                var tip = built.hints.join('\n');
                if (parsed.errors.length) {
                    tip += '\n\n部分未识别：\n' + parsed.errors.join('\n');
                }
                tip += '\n\n合计 ' + lastLabels.length + ' 张标签 · 约 ' + Math.ceil(lastLabels.length / 3) + ' 页 A4';
                $summary.text(tip);
                $preview.html(renderPagesHtml(lastLabels));
                window.requestAnimationFrame(function () {
                    fitLines($preview);
                });
                return true;
            };

            var printCss = [
                '*{box-sizing:border-box;}',
                'body{margin:0;padding:16px;font-family:"Microsoft YaHei",SimSun,Arial,sans-serif;background:#cfcfcf;color:#000;}',
                '.toolbar{position:sticky;top:0;z-index:9;width:fit-content;max-width:100%;margin:0 auto 14px;background:#fff;border:1px solid #ddd;padding:10px 14px;border-radius:4px;display:flex;align-items:center;gap:12px;}',
                '.toolbar .btn{display:inline-block;padding:8px 16px;border:1px solid #ccc;border-radius:3px;background:#3c8dbc;border-color:#367fa9;color:#fff;cursor:pointer;font-size:13px;}',
                '.toolbar-tip{color:#666;font-size:13px;}',
                '.markprint-pages{margin:0 auto;}',
                '.markprint-a4{width:210mm;height:297mm;margin:0 auto 16px;background:#fff;border:1px solid #999;box-shadow:0 2px 10px rgba(0,0,0,.12);display:flex;flex-direction:column;overflow:hidden;}',
                '.markprint-cell{flex:1 1 33.333%;min-height:0;display:flex;align-items:center;justify-content:center;padding:8mm 10mm;border-bottom:1px solid #000;text-align:center;overflow:hidden;}',
                '.markprint-a4 .markprint-cell:last-child{border-bottom:0;}',
                '.markprint-cell.is-empty{visibility:hidden;}',
                '.markprint-line1{display:block;width:100%;max-width:100%;font-family:"Microsoft YaHei","PingFang SC","SimHei",sans-serif;font-size:28px;font-weight:700;line-height:1.35;color:#111;white-space:nowrap;overflow:hidden;}',
                '.markprint-line2{display:block;margin-top:10px;font-family:SimSun,"Songti SC",serif;font-size:26px;font-weight:400;line-height:1.35;color:#111;white-space:nowrap;overflow:hidden;}',
                '@media print{',
                '@page{size:A4 portrait;margin:8mm;}',
                'html,body{width:100%!important;margin:0!important;padding:0!important;background:#fff!important;}',
                '.toolbar{display:none!important;}',
                '.markprint-pages{width:100%;margin:0!important;padding:0!important;}',
                '.markprint-a4{width:100%!important;max-width:100%!important;height:277mm;margin:0!important;border:0!important;box-shadow:none!important;page-break-after:always;break-after:page;}',
                '.markprint-a4:last-child{page-break-after:auto;break-after:auto;}',
                '}'
            ].join('');

            var unlockPage = function () {
                try {
                    document.body.style.pointerEvents = '';
                    document.documentElement.style.pointerEvents = '';
                    if (window.top && window.top.document) {
                        window.top.document.body.style.pointerEvents = '';
                    }
                    // 清理可能残留的 Layer 遮罩
                    $('.layui-layer-shade, .layui-layer-move').remove();
                    if (window.top && window.top.$) {
                        window.top.$('.layui-layer-shade, .layui-layer-move').remove();
                    }
                } catch (e) {
                }
            };

            var fitPrintLines = function (doc, win) {
                try {
                    var lines = doc.querySelectorAll('.markprint-line1, .markprint-line2');
                    for (var i = 0; i < lines.length; i++) {
                        var el = lines[i];
                        el.style.fontSize = '';
                        var base = parseFloat(win.getComputedStyle(el).fontSize) || 24;
                        var size = base;
                        var min = 12;
                        var maxWidth = el.clientWidth || (el.parentElement && el.parentElement.clientWidth) || 0;
                        var guard = 60;
                        while (maxWidth > 0 && el.scrollWidth > maxWidth && size > min && guard-- > 0) {
                            size -= 0.5;
                            el.style.fontSize = size + 'px';
                        }
                    }
                } catch (e) {
                }
            };

            var doPrint = function () {
                if (!lastLabels.length) {
                    if (!doPreview()) {
                        return;
                    }
                }
                if (!lastLabels.length) {
                    return;
                }
                unlockPage();
                var bodyHtml = renderPagesHtml(lastLabels);
                // 用隐藏 iframe 打印，避免 window.open + 自动 print 把后台页卡死（光标/点击失效）
                var iframe = document.getElementById('markprint-print-frame');
                if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.id = 'markprint-print-frame';
                    iframe.setAttribute('title', 'markprint');
                    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;';
                    document.body.appendChild(iframe);
                }
                var win = iframe.contentWindow;
                var doc = win.document;
                doc.open();
                doc.write(
                    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>唛头打印</title><style>' +
                    printCss +
                    '</style></head><body>' +
                    '<div class="toolbar"><span class="toolbar-tip">共 ' + lastLabels.length + ' 张 · A4 竖版 · 每页 3 张</span></div>' +
                    bodyHtml +
                    '</body></html>'
                );
                doc.close();

                var triggerPrint = function () {
                    fitPrintLines(doc, win);
                    var done = function () {
                        unlockPage();
                        try {
                            window.focus();
                        } catch (e) {
                        }
                    };
                    if (win.onafterprint !== undefined) {
                        win.onafterprint = done;
                    }
                    setTimeout(done, 1500);
                    try {
                        win.focus();
                        win.print();
                    } catch (e) {
                        // 回退：新窗口手动打印（不自动调 print，避免卡死原页）
                        var popup = window.open('', '_blank');
                        if (!popup) {
                            Layer.msg('无法打开打印页，请允许弹窗后重试');
                            done();
                            return;
                        }
                        popup.document.write(
                            '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>唛头打印</title><style>' +
                            printCss +
                            '</style></head><body>' +
                            '<div class="toolbar"><button type="button" class="btn" onclick="window.print()">打印</button>' +
                            '<span class="toolbar-tip">共 ' + lastLabels.length + ' 张 · 选好实体打印机后再打印</span></div>' +
                            bodyHtml +
                            '</body></html>'
                        );
                        popup.document.close();
                        setTimeout(function () {
                            fitPrintLines(popup.document, popup);
                        }, 200);
                        done();
                    }
                };
                setTimeout(triggerPrint, 320);
            };

            $raw.val('CN9x2026-02-123（1/2)(1PS）\n电暖器');
            $('#btn-preview').on('click', doPreview);
            $('#btn-print').on('click', doPrint);
            $(window).on('focus.markprint', unlockPage);
            $(document).on('visibilitychange.markprint', function () {
                if (!document.hidden) {
                    unlockPage();
                }
            });
        }
    };
    return Controller;
});
