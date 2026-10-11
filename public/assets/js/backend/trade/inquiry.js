define(['jquery', 'bootstrap', 'backend', 'table', 'form', 'template'], function ($, undefined, Backend, Table, Form, Template) {

    var Controller = {
        index: function () {
            Table.api.init({
                extend: {
                    index_url: 'trade/inquiry/index' + location.search,
                    add_url: 'trade/inquiry/add',
                    edit_url: 'trade/inquiry/edit',
                    del_url: 'trade/inquiry/del',
                    multi_url: 'trade/inquiry/multi',
                    import_url: 'trade/inquiry/import',
                    table: 'inquiry',
                }
            });

            var table = $("#table");

            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                fixedColumns: true,
                fixedRightNumber: 1,
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: __('Id'), sortable: true},
                        {field: 'sn', title: '单号', operate: 'LIKE'},
                        {field: 'customer.name', title: '客户', operate: false},
                        {field: 'title', title: '标题', operate: 'LIKE'},
                        {field: 'status', title: '状态', searchList: {"draft":"草稿","parsed":"已解析","matched":"已匹配","quoting":"询价中","done":"已完成"}, formatter: Table.api.formatter.status},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {
                            field: 'operate',
                            title: __('Operate'),
                            table: table,
                            events: Table.api.events.operate,
                            buttons: [
                                {
                                    name: 'detail',
                                    text: '处理',
                                    title: '询价处理',
                                    classname: 'btn btn-xs btn-info btn-dialog',
                                    icon: 'fa fa-list',
                                    url: 'trade/inquiry/detail',
                                    extend: 'data-area=\'["95%","95%"]\''
                                }
                            ],
                            formatter: Table.api.formatter.operate
                        }
                    ]
                ]
            });

            Table.api.bindevent(table);
        },
        add: function () {
            Controller.api.bindevent();
        },
        edit: function () {
            Controller.api.bindevent();
        },
        detail: function () {
            var inquiryId = $('.btn-parse').data('id');

            $(document).on('click', '.btn-parse', function () {
                var id = $(this).data('id');
                Layer.confirm('确认解析附件清单？将覆盖已有明细。', function (index) {
                    Backend.api.ajax({url: 'trade/inquiry/parse/ids/' + id}, function () {
                        Layer.close(index);
                        setTimeout(function () {
                            location.reload();
                        }, 800);
                        return false;
                    });
                });
            });

            $(document).on('click', '.btn-match', function () {
                var id = $(this).data('id');
                Backend.api.ajax({url: 'trade/inquiry/match/ids/' + id}, function () {
                    setTimeout(function () {
                        location.reload();
                    }, 800);
                    return false;
                });
            });

            $(document).on('click', '.btn-generate', function () {
                var id = $(this).data('id');
                Layer.confirm('确认根据已定价明细生成客户报价单？', function (index) {
                    Backend.api.ajax({url: 'trade/inquiry/generatequote/ids/' + id}, function (data, ret) {
                        Layer.close(index);
                        var quoteId = (data && data.quote_id) ? data.quote_id : (ret.data && ret.data.quote_id);
                        Layer.alert(ret.msg, function (alertIndex) {
                            Layer.close(alertIndex);
                            if (quoteId) {
                                Backend.api.open('trade/customer_quote/detail?ids=' + quoteId, '客户报价单', {area: ['95%', '95%']});
                            } else {
                                Backend.api.addtabs('trade/customer_quote', '客户报价单');
                            }
                        });
                        return false;
                    });
                });
            });

            $(document).on('click', '.btn-factory-price', function () {
                var itemId = $(this).data('id');
                var price = $(this).data('price') || '';
                var factoryId = $(this).data('factory') || '';
                Layer.open({
                    type: 1,
                    title: '录入工厂回价',
                    area: ['420px', '360px'],
                    content: '<div style="padding:15px;">' +
                        '<div class="form-group"><label>工厂ID（可选）</label><input class="form-control" id="fp-factory" value="' + factoryId + '"></div>' +
                        '<div class="form-group"><label>工厂价</label><input class="form-control" id="fp-price" value="' + price + '"></div>' +
                        '<div class="form-group"><label>有效天数</label><input class="form-control" id="fp-days" value="90"></div>' +
                        '<div class="form-group"><label>币种</label><input class="form-control" id="fp-currency" value="USD"></div>' +
                        '</div>',
                    btn: ['保存', '取消'],
                    yes: function (index) {
                        Backend.api.ajax({
                            url: 'trade/inquiry/savefactoryprice/ids/' + inquiryId,
                            data: {
                                item_id: itemId,
                                factory_id: $('#fp-factory').val(),
                                factory_price: $('#fp-price').val(),
                                valid_days: $('#fp-days').val(),
                                currency: $('#fp-currency').val()
                            }
                        }, function () {
                            Layer.close(index);
                            setTimeout(function () {
                                location.reload();
                            }, 600);
                            return false;
                        });
                    }
                });
            });
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
