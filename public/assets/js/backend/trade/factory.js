define(['jquery', 'bootstrap', 'backend', 'table', 'form'], function ($, undefined, Backend, Table, Form) {

    var Controller = {
        index: function () {
            // 初始化表格参数配置
            Table.api.init({
                extend: {
                    index_url: 'trade/factory/index' + location.search,
                    add_url: 'trade/factory/add',
                    edit_url: 'trade/factory/edit',
                    del_url: 'trade/factory/del',
                    multi_url: 'trade/factory/multi',
                    import_url: 'trade/factory/import',
                    table: 'factory',
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
                        {field: 'name', title: __('Name'), operate: 'LIKE'},
                        {field: 'buyer_name', title: '采购负责人', operate: false, sortable: false},
                        {field: 'code', title: __('Code'), operate: 'LIKE', escape: false, formatter: function (value) {
                            if (!value) {
                                return '-';
                            }
                            var tags = String(value).split(/[,，]/).map(function (s) {
                                return $.trim(s);
                            }).filter(Boolean);
                            if (!tags.length) {
                                return '-';
                            }
                            return tags.map(function (t) {
                                return '<span class="label label-info" style="display:inline-block;margin:1px 3px 1px 0;">' + Fast.api.escape(t) + '</span>';
                            }).join('');
                        }},
                        {field: 'contact', title: __('Contact'), operate: 'LIKE'},
                        {field: 'phone', title: __('Phone'), operate: 'LIKE'},
                        {field: 'address', title: __('Address'), operate: 'LIKE'},
                        {field: 'tax_no', title: '默认税号', operate: 'LIKE'},
                        {field: 'bank_name', title: __('Bank_name'), operate: 'LIKE'},
                        {field: 'bank_account_name', title: __('Bank_account_name'), operate: 'LIKE'},
                        {field: 'bank_account', title: __('Bank_account'), operate: 'LIKE'},
                        {field: 'remark', title: __('Remark'), operate: 'LIKE', table: table, class: 'autocontent', formatter: Table.api.formatter.content},
                        {field: 'status', title: __('Status'), searchList: {"normal":__('Normal'),"hidden":__('Hidden')}, formatter: Table.api.formatter.status},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'updatetime', title: __('Updatetime'), operate:'RANGE', addclass:'datetimerange', autocomplete:false, formatter: Table.api.formatter.datetime},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });

            // 为表格绑定事件
            Table.api.bindevent(table);
            // 新增/编辑弹窗加大，方便编辑多收款账户+税号
            var factoryDialogArea = ['880px', '88%'];
            $('.btn-add, .btn-edit').data('area', factoryDialogArea);
            table.on('post-body.bs.table', function () {
                $('.btn-editone', table).data('area', factoryDialogArea).attr('data-area', '["880px","88%"]');
            });
        },
        add: function () {
            Controller.api.initAccounts();
            Controller.api.bindevent();
        },
        edit: function () {
            Controller.api.initAccounts();
            Controller.api.bindevent();
        },
        api: {
            /**
             * 收款账户多行编辑（弹窗内由本 JS 初始化，避免内联 script 不执行）
             */
            initAccounts: function () {
                var $form = $("form[role=form]");
                var $body = $('#factory-accounts-body');
                if (!$body.length) {
                    return;
                }
                var idx = 0;
                var initial = (typeof Config !== 'undefined' && Config.factoryAccounts) ? Config.factoryAccounts : [];

                var escAttr = function (s) {
                    return String(s == null ? '' : s)
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/</g, '&lt;');
                };
                var syncDefault = function () {
                    if (!$body.find('.account-default:checked').length && $body.find('.account-row').length) {
                        $body.find('.account-default').first().prop('checked', true);
                    }
                    $body.find('.account-row').each(function () {
                        $(this).find('.account-is-default').val($(this).find('.account-default').prop('checked') ? '1' : '0');
                    });
                };
                var addRow = function (item) {
                    item = item || {};
                    var isDef = item.is_default == 1 || item.is_default === true || item.is_default === '1';
                    var i = idx++;
                    var html = '' +
                        '<div class="factory-account-card account-row">' +
                        '  <div class="card-top">' +
                        '    <label><input type="radio" name="account_default_pick" class="account-default"' + (isDef ? ' checked' : '') + '> 设为默认账户</label>' +
                        '    <a href="javascript:;" class="btn-remove-account" title="删除此账户"><i class="fa fa-trash"></i> 删除</a>' +
                        '    <input type="hidden" class="account-is-default" name="accounts[' + i + '][is_default]" value="' + (isDef ? '1' : '0') + '">' +
                        '  </div>' +
                        '  <div class="row">' +
                        '    <div class="col-sm-6"><div class="form-group-inner"><span class="fld-label">开户行</span>' +
                        '      <input type="text" class="form-control input-sm" name="accounts[' + i + '][bank_name]" value="' + escAttr(item.bank_name) + '" placeholder="如：中国银行">' +
                        '    </div></div>' +
                        '    <div class="col-sm-6"><div class="form-group-inner"><span class="fld-label">开户名称</span>' +
                        '      <input type="text" class="form-control input-sm" name="accounts[' + i + '][bank_account_name]" value="' + escAttr(item.bank_account_name) + '" placeholder="户名">' +
                        '    </div></div>' +
                        '    <div class="col-sm-6"><div class="form-group-inner"><span class="fld-label">开户账号</span>' +
                        '      <input type="text" class="form-control input-sm" name="accounts[' + i + '][bank_account]" value="' + escAttr(item.bank_account) + '" placeholder="银行卡号">' +
                        '    </div></div>' +
                        '    <div class="col-sm-6"><div class="form-group-inner"><span class="fld-label">税号</span>' +
                        '      <input type="text" class="form-control input-sm" name="accounts[' + i + '][tax_no]" value="' + escAttr(item.tax_no) + '" placeholder="纳税人识别号">' +
                        '    </div></div>' +
                        '  </div>' +
                        '</div>';
                    $body.append(html);
                    syncDefault();
                };

                $body.empty();
                if (initial && initial.length) {
                    $.each(initial, function (k, a) {
                        addRow(a);
                    });
                } else {
                    addRow({is_default: 1});
                }

                $(document).off('click.factoryAcc', '#btn-add-account')
                    .on('click.factoryAcc', '#btn-add-account', function (e) {
                        e.preventDefault();
                        addRow({is_default: 0});
                    });
                $body.off('click.factoryAcc', '.btn-remove-account')
                    .on('click.factoryAcc', '.btn-remove-account', function (e) {
                        e.preventDefault();
                        $(this).closest('.account-row').remove();
                        syncDefault();
                    });
                $body.off('change.factoryAcc', '.account-default')
                    .on('change.factoryAcc', '.account-default', syncDefault);
                $form.off('submit.factoryAcc').on('submit.factoryAcc', syncDefault);
            },
            bindevent: function () {
                Form.api.bindevent($("form[role=form]"));
            }
        }
    };
    return Controller;
});
