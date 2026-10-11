define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {
    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'purchase/container/index' + location.search,
                    add_url: 'purchase/container/add',
                    edit_url: 'purchase/container/edit',
                    del_url: 'purchase/container/del',
                    table: 'purchase_container',
                }
            });
            var table = $("#table");
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                columns: [[
                    {checkbox: true},
                    {field: 'id', title: __('Id')},
                    {field: 'sn', title: '装箱单号', operate: 'LIKE'},
                    {field: 'packing_no', title: '厂家单号', operate: 'LIKE'},
                    {field: 'tracking_no', title: '物流单号', operate: 'LIKE'},
                    {field: 'ship_date', title: '发货日', operate: 'RANGE', addclass: 'datetimerange'},
                    {field: 'container_no', title: '集装箱号', operate: 'LIKE'},
                    {field: 'factory.name', title: '供应商', operate: false},
                    {field: 'total_packages', title: '件数', operate: false},
                    {field: 'total_gross_weight', title: '毛重kg', operate: false},
                    {field: 'total_cbm', title: '体积CBM', operate: false},
                    {field: 'status', title: '状态', searchList: {"draft":"草稿","done":"已完成"}, formatter: Table.api.formatter.status},
                    {field: 'createtime', title: __('Createtime'), operate: 'RANGE', addclass: 'datetimerange', formatter: Table.api.formatter.datetime},
                    {
                        field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate,
                        buttons: [
                            {
                                name: 'detail',
                                text: '编辑',
                                title: '编辑装箱单（件数/尺寸/物流）',
                                classname: 'btn btn-xs btn-info btn-dialog',
                                icon: 'fa fa-edit',
                                url: 'purchase/container/detail',
                                extend: 'data-area=\'["95%","92%"]\''
                            },
                            {
                                name: 'export',
                                text: '导出',
                                title: '导出装箱单',
                                classname: 'btn btn-xs btn-success',
                                icon: 'fa fa-download',
                                url: 'purchase/container/export',
                                extend: 'target="_blank"'
                            },
                            {
                                name: 'inbound',
                                text: '进仓单',
                                title: '生成进仓单',
                                classname: 'btn btn-xs btn-warning',
                                icon: 'fa fa-file-text-o',
                                url: 'purchase/container/inbound?mode=merge',
                                extend: 'target="_blank"'
                            }
                        ],
                        formatter: Table.api.formatter.operate
                    }
                ]]
            });
            Table.api.bindevent(table);
        },
        add: function () {
            Form.api.bindevent($("form[role=form]"), function (data, ret) {
                var id = (data && data.id) ? data.id : (ret.data && ret.data.id);
                var index = parent.Layer.getFrameIndex(window.name);
                parent.Layer.close(index);
                if (id) {
                    parent.Backend.api.open('purchase/container/detail?ids=' + id, '打包信息录入', {area: ['95%', '92%']});
                    if (parent.$ && parent.$("#table").length) {
                        parent.$("#table").bootstrapTable('refresh');
                    }
                }
                return false;
            });
        },
        edit: function () { Controller.api.bindevent(); },
        planpacks: function () {
            var planId = (Config && Config.planId) ? Config.planId : $('#btn-create-pack').data('plan-id');

            $('#btn-toggle-new-pack').on('click', function () {
                $('#new-pack-panel').slideToggle(120);
            });
            $('#btn-cancel-new-pack').on('click', function () {
                $('#new-pack-panel').slideUp(120);
            });
            $('#btn-check-available').on('click', function () {
                $('.chk-plan-item:not(:disabled)').prop('checked', true);
            });
            $('#btn-uncheck-all').on('click', function () {
                $('.chk-plan-item').prop('checked', false);
            });
            $('#btn-create-pack').on('click', function () {
                var ids = [];
                $('.chk-plan-item:checked').each(function () {
                    ids.push($(this).val());
                });
                if (!ids.length) {
                    Layer.msg('请勾选要装入本包裹的商品');
                    return;
                }
                var pid = $(this).data('plan-id') || planId;
                Backend.api.ajax({
                    url: 'purchase/container/createpack',
                    data: {plan_id: pid, plan_item_ids: ids.join(',')}
                }, function (data) {
                    var id = data && data.id;
                    if (!id) {
                        Layer.msg('创建失败');
                        return false;
                    }
                    // 打开录入，并刷新本页
                    Backend.api.open('purchase/container/detail/ids/' + id, '录入打包信息', {area: ['95%', '92%']});
                    setTimeout(function () {
                        location.reload();
                    }, 400);
                    return false;
                });
            });
            $(document).on('click', '.btn-open-pack', function () {
                var id = $(this).data('id');
                Backend.api.open('purchase/container/detail/ids/' + id, '录入打包信息', {area: ['95%', '92%']});
            });
        },
        detail: function () {
            Form.events.datetimepicker($('body'));

            $(document).on('click', '.btn-save-header', function () {
                var box = $('#pack-header');
                Backend.api.ajax({
                    url: 'purchase/container/saveheader/ids/' + box.data('id'),
                    data: {
                        packing_no: box.find('.fld-h-packing_no').val(),
                        tracking_no: box.find('.fld-h-tracking_no').val(),
                        ship_date: box.find('.fld-h-ship_date').val(),
                        container_no: box.find('.fld-h-container_no').val(),
                        seal_no: box.find('.fld-h-seal_no').val(),
                        remark: box.find('.fld-h-remark').val()
                    }
                });
            });

            var rowPackages = function (tr) {
                return parseFloat(tr.find('.fld-packages').val()) || 0;
            };
            var calcRowCbm = function (tr) {
                var l = parseFloat(tr.find('.fld-length_cm').val()) || 0;
                var w = parseFloat(tr.find('.fld-width_cm').val()) || 0;
                var h = parseFloat(tr.find('.fld-height_cm').val()) || 0;
                var p = rowPackages(tr) || 1;
                if (l <= 0 || w <= 0 || h <= 0) {
                    return 0;
                }
                return Math.round(l * w * h * Math.max(1, p) / 1000000 * 10000) / 10000;
            };
            var refreshPackSums = function () {
                var tp = 0, tgw = 0, tnw = 0, tcbm = 0;
                $('tr[data-id]').each(function () {
                    var r = $(this);
                    tp += rowPackages(r);
                    tgw += parseFloat(r.find('.fld-gross_weight').val()) || 0;
                    tnw += parseFloat(r.find('.fld-net_weight').val()) || 0;
                    tcbm += parseFloat(r.find('.fld-volume_cbm').text()) || 0;
                });
                $('#sum-packages').text(tp);
                $('#sum-gw').text(tgw.toFixed(3));
                $('#sum-nw').text(tnw.toFixed(3));
                $('#sum-cbm').text(tcbm.toFixed(4));
            };

            $(document).on('input', '.fld-length_cm,.fld-width_cm,.fld-height_cm,.fld-packages', function () {
                var tr = $(this).closest('tr');
                tr.find('.fld-volume_cbm').text(calcRowCbm(tr));
            });

            $(document).on('click', '.btn-save-pack', function () {
                var tr = $(this).closest('tr');
                var id = tr.data('id');
                Backend.api.ajax({
                    url: 'purchase/container/saveitem/ids/' + id,
                    data: {
                        packages: tr.find('.fld-packages').val(),
                        package_type: tr.find('.fld-package_type').val(),
                        length_cm: tr.find('.fld-length_cm').val(),
                        width_cm: tr.find('.fld-width_cm').val(),
                        height_cm: tr.find('.fld-height_cm').val(),
                        gross_weight: tr.find('.fld-gross_weight').val(),
                        net_weight: tr.find('.fld-net_weight').val(),
                        unit_net_weight: tr.find('.fld-unit_net_weight').val()
                    }
                }, function (data) {
                    if (data && data.volume_cbm !== undefined) {
                        tr.find('.fld-volume_cbm').text(data.volume_cbm);
                    }
                    refreshPackSums();
                    return false;
                });
            });

            $(document).on('click', '.btn-remove-pack-item', function () {
                var tr = $(this).closest('tr');
                var id = tr.data('id');
                Layer.confirm('将此明细移出本包裹？移出后可在计划「打包信息」中重新勾选装入其他包裹。', {icon: 3, title: '移出包裹'}, function (index) {
                    Backend.api.ajax({
                        url: 'purchase/container/removeitem/ids/' + id
                    }, function () {
                        tr.remove();
                        refreshPackSums();
                        Layer.close(index);
                        return false;
                    });
                });
            });

            $(document).on('click', '.pack-img-preview', function () {
                var url = $(this).data('url') || $(this).find('img').attr('src');
                if (!url) {
                    return;
                }
                Layer.photos({
                    photos: {
                        title: '图片预览',
                        data: [{src: url}]
                    },
                    anim: 5
                });
            });

            $(document).on('click', '.btn-inbound-doc', function (e) {
                var hasPkg = false;
                $('tr[data-id] .fld-packages').each(function () {
                    if ((parseFloat($(this).val()) || 0) > 0) {
                        hasPkg = true;
                        return false;
                    }
                });
                if (!hasPkg) {
                    e.preventDefault();
                    Layer.msg('请先填写各明细「件数」并点每行「保存」，再生成进仓单');
                    return false;
                }
                window.open($(this).attr('href'), '_blank');
                return false;
            });
        },
        api: { bindevent: function () { Form.api.bindevent($("form[role=form]")); } }
    };
    return Controller;
});
