-- 微信小程序 openid 与会员关联
CREATE TABLE IF NOT EXISTS `fa_wx_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '会员ID',
  `openid` varchar(64) NOT NULL DEFAULT '' COMMENT '微信openid',
  `unionid` varchar(64) NOT NULL DEFAULT '' COMMENT '微信unionid',
  `session_key` varchar(128) NOT NULL DEFAULT '' COMMENT 'session_key',
  `createtime` bigint(16) DEFAULT NULL,
  `updatetime` bigint(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `openid` (`openid`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信小程序用户';
