-- 小麦回调日志表
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `fa_gate_callback` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `action` varchar(32) NOT NULL DEFAULT '' COMMENT 'verify/openRecord',
  `phone` varchar(20) NOT NULL DEFAULT '' COMMENT '手机号',
  `device` varchar(64) NOT NULL DEFAULT '' COMMENT '设备号',
  `qrcode` varchar(64) NOT NULL DEFAULT '' COMMENT '二维码编号',
  `scene_name` varchar(100) NOT NULL DEFAULT '' COMMENT '场景名称',
  `sn` varchar(64) NOT NULL DEFAULT '' COMMENT '小麦Sn',
  `allow` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否放行:0否1是',
  `msg` varchar(255) NOT NULL DEFAULT '' COMMENT '返回说明',
  `raw_data` text COMMENT '原始请求',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `action` (`action`),
  KEY `phone` (`phone`),
  KEY `device` (`device`),
  KEY `createtime` (`createtime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小麦门禁回调日志';
