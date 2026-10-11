define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            // 初始化表格参数配置
            Table.api.init({
                extend: {
                    index_url: 'trade/quote_history/index' + location.search,
                    add_url: 'trade/quote_history/add',
                    edit_url: 'trade/quote_history/edit',
                    del_url: 'trade/quote_history/del',
                    multi_url: 'trade/quote_history/multi',
                    import_url: 'trade/quote_history/import',
                    table: 'quote_history',
                }
            });

            var table = $("#table");

            // 初始化表格
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'id',
                fixedColumns: true,
                fixedRightNumber: 1,
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: __('Id')},
                        {field: 'product_id', title: __('Product_id')},
                        {field: 'factory_id', title: __('Factory_id')},
                        {field: 'customer_id', title: __('Customer_id')},
                        {field: 'factory_price', title: __('Factory_price'), operate:'BETWEEN'},
                        {field: 'currency', title: __('Currency'), operate: 'LIKE'},
                        {field: 'valid_days', title: __('Valid_days')},
                        {field: 'quoted_at', title: __('Quoted_at')},
                        {field: 'expire_at', title: __('Expire_at')},
                        {field: 'source', title: __('Source'), searchList: {"manual":__('Manual'),"inquiry":__('Inquiry')}, formatter: Table.api.formatter.normal},
                        {field: 'inquiry_item_id', title: __('Inquiry_item_id')},
                        {field: 'admin_id', title: __('Admin_id')},
                        {field: 'remark', title: __('Remark'), operate: 'LIKE', table: table, class: 'autocontent', formatter: Table.api.formatter.content},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'updatetime', title: __('Updatetime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });

            // 为表格绑定事件
            Table.api.bindevent(table);
        },
        add: function () {
            Controller.api.bindevent();
        },
        edit: function () {
            Controller.api.bindevent();
        },
        api: {
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
