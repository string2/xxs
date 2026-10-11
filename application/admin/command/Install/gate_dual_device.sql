-- 门禁双设备模板：出门码(离校) + 进门码(归校)
-- 请把 device_no / qrcode_no 改成现场小麦实际值后再执行，或直接在后台「门禁设备」中编辑。
SET NAMES utf8mb4;

-- 出门码（校门内侧，学生离校扫）
INSERT INTO `fa_gate_device`
(`name`,`token`,`device_no`,`qrcode_no`,`scene_name`,`vendor`,`location`,`direction`,`status`,`createtime`,`updatetime`)
SELECT '校门-出门码','GATE_OUT_001','','','学校门禁-出门','xiaomai','正门内侧','out','normal',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `fa_gate_device` WHERE `token`='GATE_OUT_001' OR `name`='校门-出门码');

-- 进门码（校门外侧，学生归校扫）
INSERT INTO `fa_gate_device`
(`name`,`token`,`device_no`,`qrcode_no`,`scene_name`,`vendor`,`location`,`direction`,`status`,`createtime`,`updatetime`)
SELECT '校门-进门码','GATE_IN_001','','','学校门禁-进门','xiaomai','正门外侧','in','normal',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `fa_gate_device` WHERE `token`='GATE_IN_001' OR `name`='校门-进门码');

-- 若仍有旧的双向设备，建议改为隐藏，避免方向冲突
UPDATE `fa_gate_device`
SET `status`='hidden', `updatetime`=UNIX_TIMESTAMP()
WHERE `direction`='both' AND `status`='normal'
  AND `token` NOT IN ('GATE_OUT_001','GATE_IN_001');
