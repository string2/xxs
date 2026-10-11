define(['jquery', 'bootstrap', 'backend'], function ($, undefined, Backend) {
    var Controller = {
        index: function () {
            var currentYear = parseInt(Config.paymonthYear, 10) || (new Date()).getFullYear();
            var currentMonth = 0;
            var currentDay = '';
            var detailRows = [];
            var dayRows = [];
            var statusFilter = '';
            var now = new Date();
            var nowY = now.getFullYear();
            var nowM = now.getMonth() + 1;

            var fmt = function (n) {
                n = parseFloat(n);
                if (isNaN(n)) {
                    n = 0;
                }
                return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            };
            var esc = function (s) {
                return Fast.api.escape(s == null ? '' : String(s));
            };

            var fillYears = function (list, keepYear) {
                var $sel = $('#pm-year');
                var cur = keepYear != null ? String(keepYear) : $sel.val();
                $sel.empty();
                $.each(list || [], function (i, y) {
                    $sel.append($('<option>').val(y).text(y + '年'));
                });
                if (cur && $sel.find('option[value="' + cur + '"]').length) {
                    $sel.val(cur);
                } else if ($sel.find('option').length) {
                    $sel.prop('selectedIndex', $sel.find('option').length - 1);
                }
            };

            var fillFactories = function (list, keepId) {
                var $sel = $('#pm-factory');
                var cur = keepId != null ? String(keepId) : $sel.val();
                $sel.find('option:not([value="0"])').remove();
                $.each(list || [], function (i, f) {
                    $sel.append($('<option>').val(f.id).text(f.name || ('#' + f.id)));
                });
                if (cur && $sel.find('option[value="' + cur + '"]').length) {
                    $sel.val(cur);
                }
            };

            var pickDefaultMonth = function (months) {
                var hit = 0;
                $.each(months || [], function (i, r) {
                    if (r.month === nowM && r.count > 0) {
                        hit = r.month;
                        return false;
                    }
                });
                if (hit) {
                    return hit;
                }
                $.each(months || [], function (i, r) {
                    if (r.count > 0) {
                        hit = r.month;
                        return false;
                    }
                });
                return hit;
            };

            var renderMonths = function (data) {
                var t = data.total || {};
                $('#pm-sum-payable').text(fmt(t.payable));
                $('#pm-sum-paid').text(fmt(t.paid));
                $('#pm-sum-unpaid').text(fmt(t.unpaid));

                var undated = data.undated || {};
                var $undated = $('#pm-undated');
                if (undated.count > 0) {
                    $undated.removeClass('hide').text(
                        '另有 ' + undated.plan_count + ' 个计划、' + undated.count
                        + ' 期未填写分期付款日，金额 ' + fmt(undated.payable) + ' 未计入月份。'
                    );
                } else {
                    $undated.addClass('hide').text('');
                }

                var html = '';
                $.each(data.months || [], function (i, r) {
                    if (!(r.count > 0)) {
                        return;
                    }
                    var cls = ['pm-m'];
                    if (data.year === nowY && r.month === nowM) {
                        cls.push('is-now');
                    }
                    if (r.month === currentMonth) {
                        cls.push('is-active');
                    }
                    html += '<div class="' + cls.join(' ') + '" data-month="' + r.month + '" data-count="' + (r.count || 0) + '">'
                        + '<div class="hd">'
                        + '<span class="n">' + esc(r.label) + '</span>'
                        + (data.year === nowY && r.month === nowM ? '<span class="tag-now">本月</span>' : '')
                        + '<span class="c">' + (r.count || 0) + ' 期</span>'
                        + '</div>'
                        + '<div class="amts">'
                        + '<div class="item"><span class="k">应付</span><span class="v" title="' + fmt(r.payable) + '">' + fmt(r.payable) + '</span></div>'
                        + '<div class="item"><span class="k">已付</span><span class="v is-paid" title="' + fmt(r.paid) + '">' + fmt(r.paid) + '</span></div>'
                        + '<div class="item"><span class="k">未付</span><span class="v' + ((parseFloat(r.unpaid) || 0) > 0.001 ? ' is-due' : ' is-ok') + '" title="' + fmt(r.unpaid) + '">' + fmt(r.unpaid) + '</span></div>'
                        + '</div>'
                        + '</div>';
                });
                if (!html) {
                    html = '<div class="pm-months-empty">本年没有填写分期付款日的到期账期</div>';
                }
                $('#pm-months').html(html);
            };

            var matchRow = function (r, kw) {
                if (currentDay && String(r.pay_date || '') !== currentDay) {
                    return false;
                }
                if (statusFilter && r.status !== statusFilter) {
                    return false;
                }
                if (!kw) {
                    return true;
                }
                var blob = [r.sn, r.factory_name, r.buyer_name, r.pay_term_text, r.label, r.pay_date].join(' ').toLowerCase();
                return blob.indexOf(kw) !== -1;
            };

            var shortAmt = function (n) {
                n = parseFloat(n);
                if (isNaN(n) || Math.abs(n) < 0.005) {
                    return '0';
                }
                if (Math.abs(n) >= 10000) {
                    return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 2) + '万';
                }
                return fmt(n);
            };

            var renderDays = function (days) {
                dayRows = days || [];
                var html = '';
                $.each(dayRows, function (i, d) {
                    var payable = parseFloat(d.payable) || 0;
                    var cls = ['pm-day'];
                    if (payable > 0.001) {
                        cls.push('has-amt');
                    } else {
                        cls.push('is-zero');
                    }
                    if (currentDay && currentDay === d.date) {
                        cls.push('is-active');
                    }
                    html += '<div class="' + cls.join(' ') + '" data-date="' + esc(d.date) + '" title="'
                        + esc(d.date) + ' 应付 ' + fmt(payable)
                        + (d.count ? (' · ' + d.count + ' 期') : '') + '">'
                        + '<span class="d">' + esc(d.label) + '</span>'
                        + '<span class="a">' + esc(shortAmt(payable)) + '</span>'
                        + '</div>';
                });
                $('#pm-days').html(html || '<div class="text-muted" style="padding:8px;">暂无日期</div>');
            };

            var renderDetailRows = function () {
                var kw = $.trim($('#pm-kw').val() || '').toLowerCase();
                var html = '';
                var n = 0;
                $.each(detailRows, function (i, r) {
                    if (!matchRow(r, kw)) {
                        return;
                    }
                    n++;
                    var due = parseFloat(r.due) || 0;
                    var files = r.files || [];
                    var fileBtn = files.length
                        ? '<a href="javascript:;" class="pm-file btn-pm-files" title="合同附件"><i class="fa fa-paperclip"></i></a>'
                        : '';
                    html += '<tr data-files="' + esc(JSON.stringify(files)) + '">'
                        + '<td class="pm-sn" title="' + esc(r.sn) + '"><span class="sn">' + esc(r.sn || '-') + '</span>' + fileBtn + '</td>'
                        + '<td class="pm-fac" title="' + esc(r.factory_name) + '">' + esc(r.factory_name) + '</td>'
                        + '<td>' + esc(r.buyer_name) + '</td>'
                        + '<td>' + esc(r.pay_term_text) + '</td>'
                        + '<td>' + esc(r.label || ('第' + r.period_no + '期')) + '</td>'
                        + '<td>' + esc(r.pay_date) + '</td>'
                        + '<td class="num">' + fmt(r.amount) + '</td>'
                        + '<td class="num">' + fmt(r.paid) + '</td>'
                        + '<td class="num' + (due > 0.001 ? ' pm-due' : '') + '">' + fmt(r.due) + '</td>'
                        + '<td><span class="pm-st pm-st-' + esc(r.status || 'pending') + '">' + esc(r.status_text) + '</span></td>'
                        + '<td><a href="javascript:;" class="btn-pm-plan" data-id="' + (r.plan_id || 0) + '">计划</a></td>'
                        + '</tr>';
                });
                if (!html) {
                    html = '<tr><td colspan="11" class="text-center text-muted">' + (detailRows.length ? '没有匹配的记录' : '该月没有到期账期') + '</td></tr>';
                }
                $('#pm-detail-box tbody').html(html);
                var title = $('#pm-detail-title').data('base') || '月明细';
                if (currentDay) {
                    title += ' · ' + currentDay;
                }
                if (n !== detailRows.length) {
                    title += ' · 显示 ' + n + '/' + detailRows.length;
                }
                $('#pm-detail-title').text(title);
            };

            var loadYear = function () {
                var year = parseInt($('#pm-year').val(), 10) || currentYear;
                var factoryId = parseInt($('#pm-factory').val(), 10) || 0;
                Fast.api.ajax({
                    url: 'purchase/paymonth/index',
                    loading: true,
                    data: {year: year, factory_id: factoryId}
                }, function (data) {
                    currentYear = data.year;
                    fillYears(data.year_list, data.year);
                    fillFactories(data.factories, factoryId);
                    renderMonths(data);
                    var month = currentMonth;
                    if (!month) {
                        month = pickDefaultMonth(data.months);
                    }
                    var exists = false;
                    $.each(data.months || [], function (i, r) {
                        if (r.month === month && r.count > 0) {
                            exists = true;
                            return false;
                        }
                    });
                    if (exists) {
                        loadDetail(month);
                    } else {
                        currentMonth = 0;
                        currentDay = '';
                        detailRows = [];
                        dayRows = [];
                        $('#pm-detail-box').addClass('hide');
                    }
                    return false;
                });
            };

            var loadDetail = function (month) {
                month = parseInt(month, 10) || 0;
                if (month < 1) {
                    return;
                }
                currentMonth = month;
                currentDay = '';
                $('#pm-months .pm-m').removeClass('is-active')
                    .filter('[data-month="' + month + '"]').addClass('is-active');
                Fast.api.ajax({
                    url: 'purchase/paymonth/detail',
                    data: {
                        year: parseInt($('#pm-year').val(), 10) || currentYear,
                        month: month,
                        factory_id: parseInt($('#pm-factory').val(), 10) || 0
                    }
                }, function (data) {
                    var base = data.year + '年' + data.month + '月到期明细';
                    $('#pm-detail-title').data('base', base).text(base);
                    detailRows = data.rows || [];
                    $('#pm-detail-box').removeClass('hide');
                    renderDays(data.days || []);
                    renderDetailRows();
                    return false;
                });
            };

            $(document).on('click', '#pm-query', function () {
                currentMonth = 0;
                loadYear();
            });
            $(document).on('change', '#pm-year, #pm-factory', function () {
                currentMonth = 0;
                loadYear();
            });
            $(document).on('click', '#pm-months .pm-m', function () {
                var cnt = parseInt($(this).data('count'), 10) || 0;
                if (cnt > 0) {
                    loadDetail($(this).data('month'));
                }
            });
            $(document).on('click', '#pm-days .pm-day', function () {
                var date = String($(this).data('date') || '');
                if (currentDay === date) {
                    currentDay = '';
                } else {
                    currentDay = date;
                }
                $('#pm-days .pm-day').removeClass('is-active');
                if (currentDay) {
                    $(this).addClass('is-active');
                }
                renderDetailRows();
            });
            $(document).on('click', '#pm-st-filter .btn', function () {
                $('#pm-st-filter .btn').removeClass('active');
                $(this).addClass('active');
                statusFilter = $(this).data('st') || '';
                renderDetailRows();
            });
            $(document).on('input', '#pm-kw', function () {
                renderDetailRows();
            });
            $(document).on('click', '.btn-pm-files', function () {
                var raw = $(this).closest('tr').attr('data-files') || '[]';
                var files = [];
                try {
                    files = JSON.parse(raw);
                } catch (e) {
                    files = [];
                }
                if (!files.length) {
                    return;
                }
                var html = '<div class="pay-contract-view-list">';
                $.each(files, function (i, p) {
                    var name = String(p).split('/').pop() || ('附件' + (i + 1));
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
                    content: html
                });
            });
            $(document).on('click', '.btn-pm-plan', function () {
                var id = parseInt($(this).data('id'), 10) || 0;
                if (!id) {
                    return;
                }
                Backend.api.open('purchase/plan/detail/ids/' + id, '采购计划', {area: ['95%', '95%']});
            });

            loadYear();
        }
    };
    return Controller;
});
