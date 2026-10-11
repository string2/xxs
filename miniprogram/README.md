# 智慧校园微信小程序

## 小麦门禁对接（请假离校 / 归校）

### 业务规则

1. **学生本人**用微信扫码，授权手机号须与学籍 `fa_student.mobile` 一致
2. **离校**：请假审批完成（状态 `approved`）且在请假起止时间内 → 扫**出门码**开门，写入 `leave_time`，状态变为 `left`
3. **归校**：已离校（状态 `left`）→ 扫**进门码**开门（**超时也允许**），写入 `return_time`，状态变为 `returned`
4. 无有效请假 / 手机号不一致 / 审批中 → 拒绝开门

### 小麦场景配置

场景模式选择：**数据接口 → 校验过程 → 自行校验**（不要选「上报验证」）

| 配置项 | 地址 |
|--------|------|
| 第三方校验 | `https://xxs.wallsu.com/api/xiaomai/verify` |
| 下发开门记录 | `https://xxs.wallsu.com/api/xiaomai/openRecord` |

官方校验返回格式（不可弄反）：

- 通过：`{"code":1,"msg":"success"}`
- 拒绝：`{"code":0,"msg":"error"}`（`code=1` 才通过，其余不通过）


建议建 **两个场景**（或同一场景绑两台设备），分别对应出门码、进门码。

### 后台门禁设备

菜单：智慧校园 → 门禁设备。

**一个大门只需一台**：方向选「双向(单门推荐)」。系统按请假状态自动判断：
- 请假已批准 → 本次扫码记为离校
- 已离校 → 再扫同一台记为归校

`device_no` 或 `qrcode_no` 须与小麦回调里的 Device / QRcode 一致（例如屏幕底部 `QR code: n386433637`）。

若以后里外各有一台码，再分别设「离校」「归校」。

### 联调日志

回调会写 `runtime/log`，搜索 `[XIAOMAI]`。

### 接口自测（不依赖真机）

把 `DEVICE_OUT` / `DEVICE_IN` / 手机号换成后台真实值：

```bash
# 离校校验（应 code=1，前提：该手机号学生有 approved 请假且在有效期内）
curl -X POST "https://xxs.wallsu.com/api/xiaomai/verify" -d "phone=13800000001&device=DEVICE_OUT"

# 模拟开门记录（离校）
curl -X POST "https://xxs.wallsu.com/api/xiaomai/openRecord" -d "phone=13800000001&device=DEVICE_OUT&sn=test-out-1"

# 归校校验（应 code=1，前提：上一步后请假已变为 left）
curl -X POST "https://xxs.wallsu.com/api/xiaomai/verify" -d "phone=13800000001&device=DEVICE_IN"

# 模拟开门记录（归校，超时也应成功）
curl -X POST "https://xxs.wallsu.com/api/xiaomai/openRecord" -d "phone=13800000001&device=DEVICE_IN&sn=test-in-1"
```

后台「请假管理」可看离校/回校时间；「门禁进出记录」可看通行明细。

---

## 审核相关说明

1. 登录页、身份绑定页已增加《用户服务协议》《隐私政策》勾选授权
2. 「我的」页可再次查看协议
3. 正式环境请在微信公众平台配置 request 合法域名：`xxs.wallsu.com`
4. 正式环境请在服务器 `.env` 配置微信 AppSecret：

```
[wxapp]
app_id = wx9fa378251ee8d2f1
app_secret = 你的密钥
```

未配置 AppSecret 时开发模式可用，但真机/审核环境登录可能异常。

## 使用方式

1. 用微信开发者工具打开本目录 `miniprogram/`（不要打开上级整个 PHP 项目目录）
2. 详情 → 本地设置 → 勾选「不校验合法域名、web-view…」
3. 详情 → 本地设置 → **调试基础库** 建议选 `3.7.x`（避免 3.17 与旧配置不兼容）
4. 确认 `app.js` 中 `baseUrl`：正式环境为 `https://xxs.wallsu.com`；本地调试可改回 `http://127.0.0.1:8082`
5. 正式发布前，在微信公众平台配置 request / uploadFile / downloadFile 合法域名：`xxs.wallsu.com`

### 若模拟器报 `subPackages of undefined`

1. 确认打开的是 `miniprogram/` 文件夹（左侧能看到 `app.json`、`app.js`）
2. 工具 → **清除缓存** → 清除全部，然后重新编译
3. 关闭项目后重新导入（不要打开别的示例项目如 `miniprogram-1`）
4. 若仍失败，开发者工具切回 **Stable 1.x** 版本再试

## 演示账号流程

1. **微信一键登录**：授权头像 + 填写昵称 → 点击「微信一键登录」
2. **绑定手机号**：输入手机号 → 获取短信验证码 → 确认绑定
3. **绑定身份**：
   - 家长：学生手机号 `13800000001`
   - 学生：学籍手机号 `13800000001`
   - 宿管：`13900000001`

> 本地演示未接短信网关时，验证码会写入后端 `runtime/log`，搜索 `[SMS-DEMO]` 查看。

## 微信小程序配置

在 `application/extra/wxapp.php` 填写正式 **AppSecret**（与 `project.config.json` 的 AppID 一致）。未配置时开发模式可用模拟 openid 调试。

## 后台

- 地址：`http://127.0.0.1:8082/fs.php`
- 菜单：智慧校园
- 教师组已创建；添加教师时会自动开通后台账号（默认密码 123456）
