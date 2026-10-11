-- 0831 修改意见：家长关联学生、请假签字、科目管理
SET NAMES utf8mb4;

-- 1. 请假：家长签字图片
ALTER TABLE `fa_leave`
  ADD COLUMN `parent_sign_image` varchar(255) NOT NULL DEFAULT '' COMMENT '家长签字图片' AFTER `parent_time`;

-- 2. 科目字典表
CREATE TABLE IF NOT EXISTS `fa_subject` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '科目名称',
  `weigh` int(10) NOT NULL DEFAULT '0' COMMENT '排序',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL,
  `updatetime` bigint(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试科目';

INSERT IGNORE INTO `fa_subject` (`name`,`weigh`,`status`,`createtime`,`updatetime`) VALUES
('语文', 100, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('数学', 90, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('英语', 80, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('物理', 70, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('化学', 60, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('生物', 50, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('历史', 40, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('地理', 30, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('政治', 20, 'normal', UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 若考试尚未配置科目，补默认科目列表
UPDATE `fa_exam` SET `subjects`='语文,数学,英语,物理,化学'
WHERE `subjects`='' OR `subjects` IS NULL OR `subjects`='总分';
