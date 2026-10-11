define(['jquery', 'bootstrap', 'backend', 'echarts'], function ($, undefined, Backend, Echarts) {

    var Controller = {
        index: function () {
            var cfg = Config.campusDashboard || {};
            var colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
            var barColor = colors[0];
            var charts = {};
            var currentPreset = '7';
            var moment = window.Moment || window.moment;

            function initChart(id) {
                var el = document.getElementById(id);
                if (!el) return null;
                if (!charts[id]) {
                    charts[id] = Echarts.init(el);
                }
                return charts[id];
            }

            function renderTrend(trend, range) {
                var chart = initChart('chart-leave-trend');
                if (!chart) return;
                var title = '请假申请趋势';
                if (range && range.label) {
                    title += '（' + range.label + '）';
                }
                $('#chart-trend-title').text(title);
                chart.setOption({
                    color: ['#3b82f6'],
                    tooltip: {trigger: 'axis'},
                    grid: {left: 44, right: 20, top: 36, bottom: 30},
                    xAxis: {
                        type: 'category',
                        boundaryGap: false,
                        data: trend.columns || [],
                        axisLine: {lineStyle: {color: '#cbd5e1'}},
                        axisLabel: {color: '#64748b', rotate: (trend.columns || []).length > 10 ? 35 : 0}
                    },
                    yAxis: {
                        type: 'value',
                        minInterval: 1,
                        splitLine: {lineStyle: {color: '#f1f5f9'}},
                        axisLabel: {color: '#64748b'}
                    },
                    series: [{
                        name: '请假申请',
                        type: 'line',
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 8,
                        lineStyle: {width: 3, color: '#2563eb'},
                        itemStyle: {color: '#3b82f6', borderWidth: 2, borderColor: '#fff'},
                        areaStyle: {
                            color: new Echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                {offset: 0, color: 'rgba(59, 130, 246, 0.45)'},
                                {offset: 1, color: 'rgba(59, 130, 246, 0.05)'}
                            ])
                        },
                        data: trend.values || []
                    }]
                }, true);
            }

            function renderPie(items) {
                var chart = initChart('chart-leave-pie');
                if (!chart) return;
                chart.setOption({
                    color: colors,
                    tooltip: {trigger: 'item', formatter: '{b}: {c} ({d}%)'},
                    legend: {bottom: 0, type: 'scroll', textStyle: {color: '#475569'}},
                    series: [{
                        name: '请假状态',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        center: ['50%', '44%'],
                        data: items || [],
                        label: {formatter: '{b}\n{c}', color: '#334155'},
                        itemStyle: {borderRadius: 6, borderColor: '#fff', borderWidth: 2},
                        emphasis: {scale: true, scaleSize: 8}
                    }]
                }, true);
            }

            function renderScore(score) {
                var chart = initChart('chart-score-bar');
                if (!chart) return;
                chart.setOption({
                    title: {
                        text: score.exam_name || '',
                        left: 'center',
                        top: 0,
                        textStyle: {fontSize: 13, color: '#64748b', fontWeight: '600'}
                    },
                    tooltip: {trigger: 'axis'},
                    grid: {left: 44, right: 20, top: 44, bottom: 30},
                    xAxis: {
                        type: 'category',
                        data: score.subjects || [],
                        axisLabel: {interval: 0, color: '#475569'},
                        axisLine: {lineStyle: {color: '#cbd5e1'}}
                    },
                    yAxis: {
                        type: 'value',
                        max: 100,
                        splitLine: {lineStyle: {color: '#f1f5f9'}},
                        axisLabel: {color: '#64748b'}
                    },
                    series: [{
                        name: '平均分',
                        type: 'bar',
                        barWidth: '46%',
                        data: score.averages || [],
                        itemStyle: {color: barColor, borderRadius: [4, 4, 0, 0]},
                        label: {show: true, position: 'top', color: '#1e293b', fontWeight: '700'}
                    }]
                }, true);
            }

            function renderClass(cls) {
                var chart = initChart('chart-class-bar');
                if (!chart) return;
                if (cls.title) {
                    $('#chart-class-bar').closest('.chart-box').find('.chart-title').first().text(cls.title);
                }
                chart.setOption({
                    tooltip: {trigger: 'axis'},
                    grid: {left: 44, right: 20, top: 24, bottom: 44},
                    xAxis: {
                        type: 'category',
                        data: cls.names || [],
                        axisLabel: {
                            interval: 0,
                            rotate: (cls.names || []).length > 4 ? 28 : 0,
                            color: '#475569'
                        },
                        axisLine: {lineStyle: {color: '#cbd5e1'}}
                    },
                    yAxis: {
                        type: 'value',
                        minInterval: 1,
                        splitLine: {lineStyle: {color: '#f1f5f9'}},
                        axisLabel: {color: '#64748b'}
                    },
                    series: [{
                        name: cls.title || '人数',
                        type: 'bar',
                        barWidth: '52%',
                        data: cls.values || [],
                        itemStyle: {color: barColor, borderRadius: [4, 4, 0, 0]},
                        label: {show: true, position: 'top', color: '#1e293b', fontWeight: '700'}
                    }]
                }, true);
            }

            function renderSummary(summary, range) {
                if (!summary) return;
                $('#val-period-leave').text(summary.period_leave != null ? summary.period_leave : 0);
                $('#val-period-gate').text(summary.period_gate != null ? summary.period_gate : 0);
                if ($('#val-period-dorm').length) {
                    $('#val-period-dorm').text(summary.period_dorm_check != null ? summary.period_dorm_check : 0);
                }
                if (range && range.label) {
                    $('#dash-range-text').text(range.label);
                }
            }

            function renderLeaveTable(rows) {
                var html = '';
                if (!rows || !rows.length) {
                    html = '<tr><td colspan="5" class="text-center text-muted">该时段暂无请假记录</td></tr>';
                } else {
                    $.each(rows, function (_, item) {
                        var cls = item.status_class ? ' ' + item.status_class : '';
                        html += '<tr>' +
                            '<td>' + Fast.api.escape(item.student_name || '') + '</td>' +
                            '<td>' + Fast.api.escape(item.range_text || '') + '</td>' +
                            '<td>' + Fast.api.escape(item.reason || '') + '</td>' +
                            '<td><span class="status-tag' + cls + '">' + Fast.api.escape(item.status_text || '') + '</span></td>' +
                            '<td>' + Fast.api.escape(item.createtime_text || '') + '</td>' +
                            '</tr>';
                    });
                }
                $('#dash-leave-tbody').html(html);
            }

            function renderAll(data) {
                data = data || cfg;
                renderSummary(data.summary, data.dateRange);
                renderTrend(data.leaveTrend || {}, data.dateRange);
                renderPie(data.leaveStatus || []);
                renderScore(data.scoreChart || {});
                renderClass(data.classChart || {});
                renderLeaveTable(data.recentLeaves || []);
                setTimeout(resizeAll, 50);
            }

            function parseRangeInput() {
                var val = $.trim($('#dash-date-range').val());
                if (!val || val.indexOf(' - ') === -1) {
                    return null;
                }
                var parts = val.split(' - ');
                return {start: $.trim(parts[0]), end: $.trim(parts[1])};
            }

            function presetRange(preset) {
                if (!moment) return null;
                var start, end;
                var today = moment().format('YYYY-MM-DD');
                end = today;
                if (preset === 'today') {
                    start = today;
                } else if (preset === '7') {
                    start = moment().subtract(6, 'days').format('YYYY-MM-DD');
                } else if (preset === '30') {
                    start = moment().subtract(29, 'days').format('YYYY-MM-DD');
                } else if (preset === 'month') {
                    start = moment().startOf('month').format('YYYY-MM-DD');
                } else {
                    return null;
                }
                return {start: start, end: end};
            }

            function setRangeInput(range) {
                if (!range) return;
                $('#dash-date-range').val(range.start + ' - ' + range.end);
            }

            function loadData(range) {
                if (!range) {
                    range = parseRangeInput();
                }
                if (!range) {
                    range = presetRange(currentPreset) || presetRange('7');
                }
                if (!range) {
                    Toastr.error('日期组件未加载');
                    return;
                }
                setRangeInput(range);
                Backend.api.ajax({
                    url: 'dashboard/stats',
                    type: 'GET',
                    data: {start: range.start, end: range.end}
                }, function (data, ret) {
                    var payload = ret.data || data || {};
                    renderAll(payload);
                    return false;
                });
            }

            function resizeAll() {
                $.each(charts, function (_, chart) {
                    if (chart) chart.resize();
                });
            }

            function bindDateFilter() {
                if (!moment) {
                    Toastr.error('日期组件加载失败，请刷新页面');
                    return;
                }
                require(['bootstrap-daterangepicker', 'css!../libs/bootstrap-daterangepicker/daterangepicker.css'], function () {
                    var $input = $('#dash-date-range');
                    if (!$input.length) return;

                    $input.daterangepicker({
                        autoUpdateInput: true,
                        locale: {
                            format: 'YYYY-MM-DD',
                            applyLabel: '确定',
                            cancelLabel: '清除',
                            customRangeLabel: '自定义',
                            daysOfWeek: ['日', '一', '二', '三', '四', '五', '六'],
                            monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
                        },
                        ranges: {
                            '今天': [moment(), moment()],
                            '近7天': [moment().subtract(6, 'days'), moment()],
                            '近30天': [moment().subtract(29, 'days'), moment()],
                            '本月': [moment().startOf('month'), moment()]
                        }
                    });

                    $input.off('apply.daterangepicker cancel.daterangepicker');
                    $input.on('apply.daterangepicker', function (ev, picker) {
                        $(this).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));
                        $('.dash-preset .btn').removeClass('active');
                        currentPreset = '';
                        loadData({
                            start: picker.startDate.format('YYYY-MM-DD'),
                            end: picker.endDate.format('YYYY-MM-DD')
                        });
                    }).on('cancel.daterangepicker', function () {
                        $(this).val('');
                    });
                });

                $(document).off('click.dashboard', '.dash-preset .btn').on('click.dashboard', '.dash-preset .btn', function (e) {
                    e.preventDefault();
                    var preset = $(this).data('preset');
                    $('.dash-preset .btn').removeClass('active');
                    $(this).addClass('active');
                    currentPreset = preset;
                    var range = presetRange(preset);
                    setRangeInput(range);
                    loadData(range);
                });

                $(document).off('click.dashboard', '.btn-dash-query').on('click.dashboard', '.btn-dash-query', function (e) {
                    e.preventDefault();
                    var range = parseRangeInput();
                    if (!range) {
                        Toastr.warning('请选择日期范围');
                        return;
                    }
                    $('.dash-preset .btn').removeClass('active');
                    currentPreset = '';
                    loadData(range);
                });
            }

            renderAll(cfg);
            bindDateFilter();
            $(window).resize(resizeAll);
            $(document).on('click', '.btn-refresh', function () {
                setTimeout(resizeAll, 0);
            });
        }
    };

    return Controller;
});
