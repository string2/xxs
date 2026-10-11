-- 智慧校园业务表
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `fa_school_class`;
CREATE TABLE `fa_school_class` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '班级名称',
  `grade` varchar(30) NOT NULL DEFAULT '' COMMENT '年级',
  `admin_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '班主任ID',
  `weigh` int(10) NOT NULL DEFAULT '0' COMMENT '权重',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级';

DROP TABLE IF EXISTS `fa_teacher`;
CREATE TABLE `fa_teacher` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '后台账号ID',
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '姓名',
  `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '手机号',
  `class_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '负责班级',
  `subject` varchar(50) NOT NULL DEFAULT '' COMMENT '任教科目',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_id` (`admin_id`),
  KEY `mobile` (`mobile`),
  KEY `class_id` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教师';

DROP TABLE IF EXISTS `fa_dorm_building`;
CREATE TABLE `fa_dorm_building` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '楼栋名称',
  `floors` int(10) unsigned NOT NULL DEFAULT '1' COMMENT '楼层数',
  `weigh` int(10) NOT NULL DEFAULT '0' COMMENT '权重',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='寝室楼栋';

DROP TABLE IF EXISTS `fa_dorm_room`;
CREATE TABLE `fa_dorm_room` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `building_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '楼栋ID',
  `floor` int(10) unsigned NOT NULL DEFAULT '1' COMMENT '楼层',
  `room_no` varchar(20) NOT NULL DEFAULT '' COMMENT '房间号',
  `beds` int(10) unsigned NOT NULL DEFAULT '4' COMMENT '床位数',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `building_id` (`building_id`),
  KEY `room_no` (`room_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='寝室房间';

DROP TABLE IF EXISTS `fa_student`;
CREATE TABLE `fa_student` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '前台会员ID',
  `admin_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '所属班主任',
  `class_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '班级ID',
  `room_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '寝室ID',
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '姓名',
  `student_no` varchar(50) NOT NULL DEFAULT '' COMMENT '学号',
  `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '手机号',
  `gender` enum('male','female','unknown') NOT NULL DEFAULT 'unknown' COMMENT '性别',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `class_id` (`class_id`),
  KEY `mobile` (`mobile`),
  KEY `admin_id` (`admin_id`),
  KEY `room_id` (`room_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生';

DROP TABLE IF EXISTS `fa_parent`;
CREATE TABLE `fa_parent` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '前台会员ID',
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '姓名',
  `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '手机号',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `mobile` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家长';

DROP TABLE IF EXISTS `fa_parent_student`;
CREATE TABLE `fa_parent_student` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '家长ID',
  `student_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '学生ID',
  `relation` varchar(20) NOT NULL DEFAULT '家长' COMMENT '关系',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `parent_student` (`parent_id`,`student_id`),
  KEY `student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家长学生绑定';

DROP TABLE IF EXISTS `fa_dorm_admin`;
CREATE TABLE `fa_dorm_admin` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '前台会员ID',
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '姓名',
  `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '手机号',
  `building_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '负责楼栋',
  `floors` varchar(100) NOT NULL DEFAULT '' COMMENT '负责楼层,逗号分隔',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `mobile` (`mobile`),
  KEY `building_id` (`building_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='寝室管理员';

DROP TABLE IF EXISTS `fa_exam`;
CREATE TABLE `fa_exam` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL DEFAULT '' COMMENT '考试名称',
  `exam_date` date DEFAULT NULL COMMENT '考试日期',
  `exam_type` varchar(50) NOT NULL DEFAULT '平时' COMMENT '考试类型',
  `subjects` varchar(255) NOT NULL DEFAULT '' COMMENT '科目列表逗号分隔',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试';

DROP TABLE IF EXISTS `fa_exam_score`;
CREATE TABLE `fa_exam_score` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `exam_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '考试ID',
  `student_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '学生ID',
  `class_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '班级ID',
  `admin_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '录入教师',
  `subject` varchar(50) NOT NULL DEFAULT '' COMMENT '科目',
  `score` decimal(6,2) NOT NULL DEFAULT '0.00' COMMENT '分数',
  `is_total` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否总分行',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `exam_id` (`exam_id`),
  KEY `student_id` (`student_id`),
  KEY `class_id` (`class_id`),
  KEY `admin_id` (`admin_id`),
  KEY `subject` (`subject`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试成绩';

DROP TABLE IF EXISTS `fa_exam_rank`;
CREATE TABLE `fa_exam_rank` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `exam_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '考试ID',
  `student_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '学生ID',
  `class_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '班级ID',
  `subject` varchar(50) NOT NULL DEFAULT '' COMMENT '科目或总分',
  `score` decimal(6,2) NOT NULL DEFAULT '0.00' COMMENT '分数',
  `class_rank` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '班级排名',
  `school_rank` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '全校排名',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_student_subject` (`exam_id`,`student_id`,`subject`),
  KEY `class_id` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试排名';

DROP TABLE IF EXISTS `fa_score_read`;
CREATE TABLE `fa_score_read` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `exam_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '考试ID',
  `student_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '学生ID',
  `parent_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '家长ID',
  `readtime` bigint(16) DEFAULT NULL COMMENT '阅读时间',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_student_parent` (`exam_id`,`student_id`,`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成绩阅读记录';

DROP TABLE IF EXISTS `fa_leave`;
CREATE TABLE `fa_leave` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `student_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '学生ID',
  `class_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '班级ID',
  `admin_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '班主任ID',
  `room_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '寝室ID',
  `leave_type` enum('affair','sick') NOT NULL DEFAULT 'affair' COMMENT '请假类型',
  `reason` varchar(500) NOT NULL DEFAULT '' COMMENT '请假原因',
  `start_time` bigint(16) DEFAULT NULL COMMENT '开始时间',
  `end_time` bigint(16) DEFAULT NULL COMMENT '结束时间',
  `days` decimal(5,1) NOT NULL DEFAULT '1.0' COMMENT '请假天数',
  `status` enum('pending_parent','pending_teacher','approved','rejected','left','returned') NOT NULL DEFAULT 'pending_parent' COMMENT '状态',
  `parent_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '审核家长',
  `parent_time` bigint(16) DEFAULT NULL COMMENT '家长审核时间',
  `parent_sign_image` varchar(255) NOT NULL DEFAULT '' COMMENT '家长签字图片',
  `teacher_time` bigint(16) DEFAULT NULL COMMENT '教师审核时间',
  `leave_time` bigint(16) DEFAULT NULL COMMENT '离校时间',
  `return_time` bigint(16) DEFAULT NULL COMMENT '回校时间',
  `remark` varchar(255) NOT NULL DEFAULT '' COMMENT '备注',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `class_id` (`class_id`),
  KEY `admin_id` (`admin_id`),
  KEY `room_id` (`room_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='请假单';

DROP TABLE IF EXISTS `fa_subject`;
CREATE TABLE `fa_subject` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '科目名称',
  `weigh` int(10) NOT NULL DEFAULT '0' COMMENT '排序',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试科目';

DROP TABLE IF EXISTS `fa_leave_log`;
CREATE TABLE `fa_leave_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `leave_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '请假ID',
  `action` varchar(50) NOT NULL DEFAULT '' COMMENT '动作',
  `operator_type` varchar(20) NOT NULL DEFAULT '' COMMENT '操作者类型',
  `operator_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '操作者ID',
  `content` varchar(255) NOT NULL DEFAULT '' COMMENT '内容',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `leave_id` (`leave_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='请假日志';

DROP TABLE IF EXISTS `fa_gate_device`;
CREATE TABLE `fa_gate_device` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT '设备名称',
  `token` varchar(64) NOT NULL DEFAULT '' COMMENT '二维码Token',
  `device_no` varchar(32) NOT NULL DEFAULT '' COMMENT '小麦设备号(14位+)',
  `qrcode_no` varchar(64) NOT NULL DEFAULT '' COMMENT '小麦二维码编号',
  `scene_name` varchar(100) NOT NULL DEFAULT '' COMMENT '小麦场景名称',
  `vendor` enum('local','xiaomai') NOT NULL DEFAULT 'xiaomai' COMMENT '门禁厂商',
  `location` varchar(100) NOT NULL DEFAULT '' COMMENT '位置',
  `direction` enum('both','out','in') NOT NULL DEFAULT 'both' COMMENT '方向',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `device_no` (`device_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门禁设备';

DROP TABLE IF EXISTS `fa_gate_record`;
CREATE TABLE `fa_gate_record` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `device_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '设备ID',
  `student_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '学生ID',
  `leave_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '关联请假',
  `direction` enum('out','in') NOT NULL DEFAULT 'out' COMMENT '方向',
  `mobile` varchar(20) NOT NULL DEFAULT '' COMMENT '核验手机号',
  `passtime` bigint(16) DEFAULT NULL COMMENT '通行时间',
  `vendor_sn` varchar(64) NOT NULL DEFAULT '' COMMENT '小麦开门Sn(幂等)',
  `source` enum('miniapp','xiaomai') NOT NULL DEFAULT 'xiaomai' COMMENT '记录来源',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `device_id` (`device_id`),
  KEY `student_id` (`student_id`),
  KEY `leave_id` (`leave_id`),
  KEY `vendor_sn` (`vendor_sn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门禁进出记录';

DROP TABLE IF EXISTS `fa_dorm_check`;
CREATE TABLE `fa_dorm_check` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `dorm_admin_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '查寝员',
  `building_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '楼栋',
  `check_date` date DEFAULT NULL COMMENT '查寝日期',
  `remark` varchar(255) NOT NULL DEFAULT '' COMMENT '备注',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `building_id` (`building_id`),
  KEY `check_date` (`check_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日查寝';

DROP TABLE IF EXISTS `fa_dorm_check_item`;
CREATE TABLE `fa_dorm_check_item` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `check_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '查寝ID',
  `room_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '房间ID',
  `result` enum('normal','abnormal','leave') NOT NULL DEFAULT 'normal' COMMENT '结果',
  `remark` varchar(255) NOT NULL DEFAULT '' COMMENT '异常说明',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `check_id` (`check_id`),
  KEY `room_id` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='查寝明细';

DROP TABLE IF EXISTS `fa_campus_content`;
CREATE TABLE `fa_campus_content` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `category` enum('intro','feature','rule','notice','other') NOT NULL DEFAULT 'intro' COMMENT '分类',
  `title` varchar(200) NOT NULL DEFAULT '' COMMENT '标题',
  `image` varchar(255) NOT NULL DEFAULT '' COMMENT '封面图',
  `content` text COMMENT '内容',
  `weigh` int(10) NOT NULL DEFAULT '0' COMMENT '权重',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园内容';

DROP TABLE IF EXISTS `fa_agreement`;
CREATE TABLE `fa_agreement` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL DEFAULT '' COMMENT '标题',
  `content` text COMMENT '内容',
  `need_sign` tinyint(1) unsigned NOT NULL DEFAULT '1' COMMENT '是否需签字',
  `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='协议';

DROP TABLE IF EXISTS `fa_agreement_sign`;
CREATE TABLE `fa_agreement_sign` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `agreement_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '协议ID',
  `parent_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '家长ID',
  `student_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '学生ID',
  `sign_image` varchar(255) NOT NULL DEFAULT '' COMMENT '签名图',
  `signtime` bigint(16) DEFAULT NULL COMMENT '签署时间',
  `createtime` bigint(16) DEFAULT NULL COMMENT '创建时间',
  `updatetime` bigint(16) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `agreement_parent_student` (`agreement_id`,`parent_id`,`student_id`),
  KEY `parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='协议签署';

-- 示例门禁设备
INSERT INTO `fa_gate_device` (`name`,`token`,`device_no`,`qrcode_no`,`scene_name`,`vendor`,`location`,`direction`,`status`,`createtime`,`updatetime`)
VALUES
('校门-出门码','GATE_OUT_001','','','学校门禁-出门','xiaomai','正门内侧','out','normal',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('校门-进门码','GATE_IN_001','','','学校门禁-进门','xiaomai','正门外侧','in','normal',UNIX_TIMESTAMP(),UNIX_TIMESTAMP());

-- 示例内容
INSERT INTO `fa_campus_content` (`category`,`title`,`image`,`content`,`weigh`,`status`,`createtime`,`updatetime`) VALUES
('intro','学校简介','','欢迎来到智慧校园，这里是学校简介内容。',100,'normal',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('feature','办学特色','','注重全面发展，培养创新人才。',90,'normal',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('rule','学生管理制度','','请家长认真阅读并遵守相关制度。',80,'normal',UNIX_TIMESTAMP(),UNIX_TIMESTAMP());

SET FOREIGN_KEY_CHECKS = 1;
