-- 小麦门禁对接字段扩展
SET NAMES utf8mb4;

ALTER TABLE `fa_gate_device`
  ADD COLUMN `device_no` varchar(32) NOT NULL DEFAULT '' COMMENT '小麦设备号(14位+)' AFTER `token`,
  ADD COLUMN `qrcode_no` varchar(64) NOT NULL DEFAULT '' COMMENT '小麦二维码编号' AFTER `device_no`,
  ADD COLUMN `scene_name` varchar(100) NOT NULL DEFAULT '' COMMENT '小麦场景名称' AFTER `qrcode_no`,
  ADD COLUMN `vendor` enum('local','xiaomai') NOT NULL DEFAULT 'xiaomai' COMMENT '门禁厂商' AFTER `scene_name`;

ALTER TABLE `fa_gate_record`
  ADD COLUMN `vendor_sn` varchar(64) NOT NULL DEFAULT '' COMMENT '小麦开门Sn(幂等)' AFTER `passtime`,
  ADD COLUMN `source` enum('miniapp','xiaomai') NOT NULL DEFAULT 'xiaomai' COMMENT '记录来源' AFTER `vendor_sn`;

ALTER TABLE `fa_gate_record` ADD KEY `vendor_sn` (`vendor_sn`);
