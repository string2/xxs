define(['jquery', 'bootstrap', 'backend', 'form', 'echarts', 'echarts-theme'], function ($, undefined, Backend, Form, Echarts, undefined) {

    var state = {
        range: '7d',
        start_date: '',
        end_date: ''
    };
    var charts = {
        trend: null,
        pie: null,
        factory: null,
        buyer: null
    };
    var colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var numRaf = {};

    var parseDisplayNumber = function (str) {
        str = String(str == null ? '' : str).trim();
        var suffix = '';
        if (/万$/.test(str)) {
            suffix = '万';
            str = str.replace(/万$/, '');
        }
        var decimals = 0;
        var m = str.match(/\.(\d+)/);
        if (m) {
            decimals = m[1].length;
        }
        var num = parseFloat(str.replace(/,/g, ''));
        if (isNaN(num)) {
            num = 0;
        }
        return {num: num, suffix: suffix, decimals: decimals};
    };

    var formatCount = function (n, meta) {
        var s;
        if (meta.decimals > 0) {
            s = n.toFixed(meta.decimals);
        } else {
            s = String(Math.round(n));
        }
        var parts = s.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.') + meta.suffix;
    };

    var animateNum = function ($el, toText) {
        toText = String(toText == null ? '' : toText);
        var id = $el.attr('id') || '';
        if (numRaf[id]) {
            cancelAnimationFrame(numRaf[id]);
            delete numRaf[id];
        }
        var toMeta = parseDisplayNumber(toText);
        var fromText = $el.data('biz-num');
        var from = 0;
        if (fromText !== undefined && fromText !== null) {
            var fromMeta = parseDisplayNumber(fromText);
            from = fromMeta.suffix === toMeta.suffix ? fromMeta.num : 0;
        }
        $el.data('biz-num', toText);
        if (reduceMotion || from === toMeta.num) {
            $el.text(toText);
            return;
        }
        var start = (window.performance && performance.now) ? performance.now() : Date.now();
        var duration = 720;
        var tick = function (now) {
            var t = Math.min(1, (now - start) / duration);
            var ease = 1 - Math.pow(1 - t, 3);
            var cur = from + (toMeta.num - from) * ease;
            $el.text(formatCount(cur, toMeta));
            if (t < 1) {
                numRaf[id] = requestAnimationFrame(tick);
            } else {
                delete numRaf[id];
                $el.text(toText);
            }
        };
        numRaf[id] = requestAnimationFrame(tick);
    };

    var lastChartsData = null;
    var paintTimer = null;
    var paintTries = 0;
    var resizeObserver = null;

    var chartsReady = function () {
        return !!(charts.trend && charts.factory && charts.buyer && charts.pie);
    };

    var ensureChart = function (key, elId) {
        var el = document.getElementById(elId);
        if (!el) {
            return null;
        }
        // addtabs/iframe 首开时容器宽高常为 0，此时不可 init，否则会空白
        if (el.clientWidth < 40 || el.clientHeight < 40) {
            if (charts[key]) {
                try {
                    charts[key].dispose();
                } catch (e) {
                }
                charts[key] = null;
            }
            return null;
        }
        if (charts[key]) {
            try {
                var dom = charts[key].getDom && charts[key].getDom();
                if (dom !== el) {
                    charts[key].dispose();
                    charts[key] = null;
                }
            } catch (e) {
                charts[key] = null;
            }
        }
        if (!charts[key]) {
            charts[key] = Echarts.init(el, 'walden');
        }
        return charts[key];
    };

    var resizeAll = function () {
        $.each(charts, function (k, c) {
            if (c) {
                try {
                    c.resize();
                } catch (e) {
                }
            }
        });
    };

    var scheduleResize = function () {
        setTimeout(resizeAll, 50);
        setTimeout(resizeAll, 200);
        setTimeout(resizeAll, 500);
        setTimeout(resizeAll, 1000);
    };

    var paintCharts = function () {
        if (!lastChartsData) {
            return false;
        }
        renderTrend(lastChartsData);
        renderPie(lastChartsData);
        renderBar('factory', 'echart-factory', lastChartsData.factoryTop, '采购额');
        renderBar('buyer', 'echart-buyer', lastChartsData.buyerTop, '采购额');
        resizeAll();
        return chartsReady();
    };

    var schedulePaint = function () {
        if (paintTimer) {
            clearTimeout(paintTimer);
            paintTimer = null;
        }
        paintTries = 0;
        var delays = [0, 100, 250, 500, 900, 1500, 2500, 4000];
        var tick = function () {
            paintTimer = null;
            if (paintCharts() || paintTries >= delays.length - 1) {
                if (chartsReady()) {
                    scheduleResize();
                }
                return;
            }
            paintTries += 1;
            paintTimer = setTimeout(tick, delays[paintTries] - delays[paintTries - 1]);
        };
        tick();
    };

    var bindChartObservers = function () {
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        if (resizeObserver) {
            try {
                resizeObserver.disconnect();
            } catch (e) {
            }
        }
        var debounceTimer = null;
        resizeObserver = new ResizeObserver(function () {
            if (!lastChartsData) {
                return;
            }
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(function () {
                if (!chartsReady()) {
                    schedulePaint();
                } else {
                    resizeAll();
                }
            }, 60);
        });
        ['echart-factory', 'echart-buyer', 'echart-trend', 'echart-pie'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                resizeObserver.observe(el);
            }
        });
    };

    var setRangeActive = function (range) {
        $('#biz-range-btns .btn').removeClass('active');
        if (range) {
            $('#biz-range-btns .btn[data-range="' + range + '"]').addClass('active');
        }
    };

    var applyCards = function (cards) {
        if (!cards) {
            return;
        }
        $.each(cards, function (k, v) {
            var $el = $('#' + k);
            if (!$el.length) {
                return;
            }
            if ($el.hasClass('num')) {
                animateNum($el, v);
            } else {
                $el.text(v);
            }
        });
    };

    var renderTrend = function (chartsData) {
        var chart = ensureChart('trend', 'echart-trend');
        if (!chart) {
            return;
        }
        chart.setOption({
            color: ['#3b82f6', '#10b981'],
            animation: !reduceMotion,
            animationDuration: 900,
            animationDurationUpdate: 600,
            animationEasing: 'cubicOut',
            tooltip: {trigger: 'axis'},
            legend: {data: ['新建计划金额', '确认付款金额'], top: 0},
            grid: {left: 16, right: 24, top: 40, bottom: 28, containLabel: true},
            xAxis: {type: 'category', boundaryGap: false, data: chartsData.days || []},
            yAxis: {type: 'value', scale: true, splitLine: {lineStyle: {type: 'dashed'}}},
            series: [
                {
                    name: '新建计划金额',
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    areaStyle: {opacity: 0.15},
                    data: chartsData.planAmount || []
                },
                {
                    name: '确认付款金额',
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    areaStyle: {opacity: 0.12},
                    data: chartsData.payAmount || []
                }
            ]
        }, true);
    };

    var renderPie = function (chartsData) {
        var chart = ensureChart('pie', 'echart-pie');
        if (!chart) {
            return;
        }
        var data = (chartsData.planStatusPie || []).filter(function (i) {
            return parseInt(i.value, 10) > 0;
        });
        if (!data.length) {
            data = [{name: '暂无数据', value: 0}];
        }
        chart.setOption({
            color: colors,
            animation: !reduceMotion,
            animationDuration: 800,
            animationDurationUpdate: 500,
            animationEasing: 'cubicOut',
            tooltip: {trigger: 'item', formatter: '{b}: {c} ({d}%)'},
            legend: {bottom: 0, left: 'center'},
            series: [{
                type: 'pie',
                radius: ['42%', '68%'],
                center: ['50%', '46%'],
                animationType: reduceMotion ? 'expansion' : 'scale',
                animationEasing: 'cubicOut',
                itemStyle: {borderRadius: 4, borderColor: '#fff', borderWidth: 2},
                label: {show: false},
                data: data
            }]
        }, true);
    };

    var renderBar = function (key, elId, rows, seriesName) {
        var chart = ensureChart(key, elId);
        if (!chart) {
            return;
        }
        // ECharts 类目轴自下而上：反转后金额大的在上方
        rows = (rows || []).slice().reverse();
        var names = [];
        var values = [];
        $.each(rows, function (i, r) {
            names.push(r.name || '-');
            values.push(parseFloat(r.amount) || 0);
        });
        if (!names.length) {
            names = ['暂无数据'];
            values = [0];
        }
        chart.setOption({
            color: ['#3b82f6'],
            animation: !reduceMotion,
            animationDuration: 700,
            animationDurationUpdate: 500,
            animationEasing: 'cubicOut',
            tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}},
            grid: {left: 12, right: 48, top: 16, bottom: 16, containLabel: true},
            xAxis: {type: 'value', splitLine: {lineStyle: {type: 'dashed'}}},
            yAxis: {
                type: 'category',
                data: names,
                axisLabel: {
                    width: 100,
                    overflow: 'truncate',
                    interval: 0
                }
            },
            series: [{
                name: seriesName,
                type: 'bar',
                barWidth: 16,
                itemStyle: {borderRadius: [0, 6, 6, 0]},
                label: {show: true, position: 'right'},
                animationDelay: function (idx) {
                    return reduceMotion ? 0 : (names.length - 1 - idx) * 70;
                },
                data: values
            }]
        }, true);
    };

    var renderCharts = function (chartsData) {
        lastChartsData = chartsData || {};
        schedulePaint();
    };

    var renderAll = function (payload) {
        if (!payload) {
            return;
        }
        state.range = payload.range || state.range;
        state.start_date = payload.start_date || '';
        state.end_date = payload.end_date || '';
        setRangeActive(state.range === 'custom' ? '' : state.range);
        if (state.start_date) {
            $('#biz-start').val(state.start_date);
        }
        if (state.end_date) {
            $('#biz-end').val(state.end_date);
        }
        applyCards(payload.cards);
        renderCharts(payload.charts || {});
    };

    var fetchStats = function (extra) {
        var params = $.extend({
            range: state.range,
            start_date: state.start_date,
            end_date: state.end_date
        }, extra || {});
        $.ajax({
            url: Fast.api.fixurl('purchase/stats/index'),
            type: 'GET',
            dataType: 'json',
            data: params,
            success: function (res) {
                if (res && (res.code === 1 || res.code === '1') && res.data) {
                    renderAll(res.data);
                }
            }
        });
    };

    var Controller = {
        index: function () {
            Form.events.datetimepicker($('.biz-wrap'));
            var init = Config.statsPayload || {};
            state.range = init.range || '7d';
            state.start_date = init.start_date || '';
            state.end_date = init.end_date || '';
            if (!reduceMotion) {
                $('.biz-cards .num').each(function () {
                    var $n = $(this);
                    $n.data('biz-num', null);
                    $n.text('0');
                });
            }
            // 等布局完成再画图，避免首页固定页 / addtabs 宽度为 0
            bindChartObservers();
            setTimeout(function () {
                renderAll(init);
            }, 80);

            $('#biz-range-btns').on('click', '.btn', function () {
                var range = $(this).data('range');
                state.range = range;
                state.start_date = '';
                state.end_date = '';
                setRangeActive(range);
                fetchStats({range: range, start_date: '', end_date: ''});
            });

            $('#biz-search').on('click', function () {
                var s = $.trim($('#biz-start').val() || '');
                var e = $.trim($('#biz-end').val() || '');
                if (s && e) {
                    state.range = 'custom';
                    state.start_date = s;
                    state.end_date = e;
                    setRangeActive('');
                }
                fetchStats();
            });

            $('#biz-refresh').on('click', function () {
                fetchStats();
            });

            $(window).on('resize', function () {
                if (lastChartsData && !chartsReady()) {
                    schedulePaint();
                } else {
                    scheduleResize();
                }
            });
            // 侧栏折叠 / 标签切换后重算尺寸
            $(document).on('click', '.sidebar-toggle,.btn-refresh', function () {
                schedulePaint();
            });
            $(document).on('shown.bs.tab', function () {
                schedulePaint();
            });
            // FastAdmin 顶栏切换标签时，iframe 内未必收到 shown.bs.tab，用可见性兜底
            $(document).on('visibilitychange', function () {
                if (document.visibilityState === 'visible') {
                    schedulePaint();
                }
            });
            try {
                if (window.parent && window.parent !== window && window.parent.$) {
                    window.parent.$(window.parent.document).on('shown.bs.tab.bizstats', function () {
                        schedulePaint();
                    });
                }
            } catch (e) {
            }

            // 卡片跳转到对应业务列表
            $('.biz-cards').on('click', '.card.is-link', function () {
                var url = $(this).data('url');
                var title = $(this).data('title') || '';
                if (!url) {
                    return;
                }
                Backend.api.addtabs(url, title);
            });

            var fmtMoney = function (n) {
                n = parseFloat(n);
                if (isNaN(n)) {
                    n = 0;
                }
                return n.toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            };
            var openFactoryMore = function () {
                var rows = (lastChartsData && lastChartsData.factoryAll) ? lastChartsData.factoryAll : [];
                if (!rows.length && lastChartsData && lastChartsData.factoryTop) {
                    rows = lastChartsData.factoryTop;
                }
                var rangeTip = '';
                if (state.start_date && state.end_date) {
                    rangeTip = state.start_date + ' ~ ' + state.end_date;
                } else if (state.range) {
                    var map = {today: '今天', '7d': '近7天', '30d': '近30天', month: '本月', custom: '自定义'};
                    rangeTip = map[state.range] || state.range;
                }
                var totalAmt = 0;
                var totalNums = 0;
                $.each(rows, function (i, r) {
                    totalAmt += parseFloat(r.amount) || 0;
                    totalNums += parseInt(r.nums, 10) || 0;
                });
                var html = '<div class="biz-factory-more">';
                html += '<div class="fm-head">'
                    + '<div class="fm-chip is-range"><span class="k">统计区间</span><span class="v">' + Fast.api.escape(rangeTip || '-') + '</span></div>'
                    + '<div class="fm-chip"><span class="k">供应商数</span><span class="v">' + rows.length + ' 家</span></div>'
                    + '<div class="fm-chip is-amt"><span class="k">合计采购额</span><span class="v">' + fmtMoney(totalAmt) + '</span></div>'
                    + '<div class="fm-chip"><span class="k">计划单数</span><span class="v">' + totalNums + ' 单</span></div>'
                    + '</div>';
                if (!rows.length) {
                    html += '<div class="fm-empty"><i class="fa fa-inbox"></i>暂无供应商采购数据</div>';
                } else {
                    html += '<div class="biz-factory-more-scroll">';
                    html += '<table class="table table-striped table-hover">';
                    html += '<thead><tr>'
                        + '<th class="rank">排名</th>'
                        + '<th>供应商</th>'
                        + '<th class="amt">采购额</th>'
                        + '<th class="nums">计划数</th>'
                        + '<th style="width:130px;">占比</th>'
                        + '</tr></thead><tbody>';
                    $.each(rows, function (i, r) {
                        var amt = parseFloat(r.amount) || 0;
                        var nums = parseInt(r.nums, 10) || 0;
                        var pct = totalAmt > 0 ? (amt / totalAmt * 100) : 0;
                        var rankCls = i < 3 ? (' r' + (i + 1)) : '';
                        var barW = Math.max(0, Math.min(100, pct));
                        html += '<tr>'
                            + '<td class="rank"><span class="rank-badge' + rankCls + '">' + (i + 1) + '</span></td>'
                            + '<td class="name-cell" title="' + Fast.api.escape(r.name || '未指定') + '">' + Fast.api.escape(r.name || '未指定') + '</td>'
                            + '<td class="amt">' + fmtMoney(amt) + '</td>'
                            + '<td class="nums">' + nums + '</td>'
                            + '<td class="pct-wrap">'
                            + '<div class="pct-bar"><i style="width:' + barW.toFixed(1) + '%"></i></div>'
                            + '<div class="pct-txt">' + pct.toFixed(1) + '%</div>'
                            + '</td>'
                            + '</tr>';
                    });
                    html += '</tbody></table></div>';
                }
                html += '</div>';
                Layer.open({
                    type: 1,
                    title: '<i class="fa fa-industry" style="margin-right:6px;"></i>全部供应商采购额',
                    area: ['70%', '100%'],
                    shadeClose: true,
                    content: html,
                    btn: ['关闭'],
                    success: function (layero) {
                        var $scroll = layero.find('.biz-factory-more-scroll');
                        if ($scroll.length) {
                            var headH = layero.find('.biz-factory-more .fm-head').outerHeight(true) || 0;
                            var h = layero.find('.layui-layer-content').height() - headH - 28;
                            if (h > 160) {
                                $scroll.css('max-height', h + 'px');
                            }
                        }
                    },
                    yes: function (index) {
                        Layer.close(index);
                    }
                });
            };
            $(document).off('click.bizFactoryMore', '#biz-factory-more').on('click.bizFactoryMore', '#biz-factory-more', function (e) {
                e.preventDefault();
                openFactoryMore();
            });
        }
    };
    return Controller;
});

