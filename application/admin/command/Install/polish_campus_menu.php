<?php
/**
 * 整理智慧校园后台菜单标题，并补充权限节点
 */
$pdo = new PDO("mysql:host=127.0.0.1;dbname=xxs_wallsu_com;charset=utf8mb4", "root", "", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$titles = [
    'campus'                 => '智慧校园',
    'campus/student'         => '学生管理',
    'campus/teacher'         => '教师管理',
    'campus/schoolclass'     => '班级管理',
    'campus/exam'            => '考试管理',
    'campus/examscore'       => '成绩管理',
    'campus/examrank'        => '排名管理',
    'campus/leave'           => '请假管理',
    'campus/gaterecord'      => '进出记录',
    'campus/gatedevice'      => '门禁设备',
    'campus/dormbuilding'    => '寝室楼栋',
    'campus/dormroom'        => '寝室房间',
    'campus/dormadmin'       => '寝室管理员',
    'campus/dormcheck'       => '寝室查房',
    'campus/dormcheckitem'   => '查房明细',
    'campus/content'         => '内容管理',
    'campus/agreement'       => '协议管理',
    'campus/agreementsign'   => '签署记录',
    'campus/parentuser'      => '家长管理',
    'campus/parentstudent'   => '家长绑定',
    'campus/scoreread'       => '成绩阅读',
    'campus/leavelog'        => '请假日志',
];

foreach ($titles as $name => $title) {
    $stmt = $pdo->prepare("UPDATE fa_auth_rule SET title=? WHERE name=?");
    $stmt->execute([$title, $name]);
}

function ensureRule(PDO $pdo, $parentName, $name, $title)
{
    $pid = $pdo->query("SELECT id FROM fa_auth_rule WHERE name=" . $pdo->quote($parentName))->fetchColumn();
    if (!$pid) {
        echo "skip $name parent missing\n";
        return null;
    }
    $exists = $pdo->query("SELECT id FROM fa_auth_rule WHERE name=" . $pdo->quote($name))->fetchColumn();
    if ($exists) {
        return (int)$exists;
    }
    $pdo->prepare("INSERT INTO fa_auth_rule (type,pid,name,title,icon,url,`condition`,remark,ismenu,menutype,extend,py,pinyin,createtime,updatetime,weigh,status) VALUES ('file',?,?,?,'fa fa-circle-o','','','',0,NULL,'','','',?,?,0,'normal')")
        ->execute([$pid, $name, $title, time(), time()]);
    echo "Added $name\n";
    return (int)$pdo->lastInsertId();
}

ensureRule($pdo, 'campus/student', 'campus/student/export', '导出');
ensureRule($pdo, 'campus/examscore', 'campus/examscore/export', '导出');
ensureRule($pdo, 'campus/examscore', 'campus/examscore/recalculate', '重算排名');
ensureRule($pdo, 'campus/leave', 'campus/leave/statistics', '统计人数');
ensureRule($pdo, 'campus/leave', 'campus/leave/approve', '同意请假');
ensureRule($pdo, 'campus/leave', 'campus/leave/reject', '拒绝请假');
ensureRule($pdo, 'campus/agreement', 'campus/agreement/progress', '签署进度');

// 隐藏次要菜单，减少干扰（管理员仍可通过规则访问）
$pdo->exec("UPDATE fa_auth_rule SET ismenu=0 WHERE name IN ('campus/scoreread','campus/leavelog','campus/parentstudent','campus/dormcheckitem','campus/gatedevice')");

// 刷新教师组权限
$teacherNames = [
    'campus',
    'campus/student', 'campus/student/index', 'campus/student/add', 'campus/student/edit', 'campus/student/del', 'campus/student/multi', 'campus/student/import', 'campus/student/export',
    'campus/exam', 'campus/exam/index', 'campus/exam/add', 'campus/exam/edit', 'campus/exam/del', 'campus/exam/multi',
    'campus/examscore', 'campus/examscore/index', 'campus/examscore/add', 'campus/examscore/edit', 'campus/examscore/del', 'campus/examscore/multi', 'campus/examscore/import', 'campus/examscore/export', 'campus/examscore/recalculate',
    'campus/examrank', 'campus/examrank/index',
    'campus/leave', 'campus/leave/index', 'campus/leave/edit', 'campus/leave/multi', 'campus/leave/approve', 'campus/leave/reject', 'campus/leave/statistics',
    'campus/gaterecord', 'campus/gaterecord/index',
    'dashboard', 'dashboard/index',
    'general', 'general/profile', 'general/profile/index', 'general/profile/update',
];
$ph = implode(',', array_fill(0, count($teacherNames), '?'));
$stmt = $pdo->prepare("SELECT id FROM fa_auth_rule WHERE name IN ($ph)");
$stmt->execute($teacherNames);
$ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
$rules = implode(',', array_unique($ids));
$gid = $pdo->query("SELECT id FROM fa_auth_group WHERE name='教师组'")->fetchColumn();
if ($gid) {
    $pdo->prepare("UPDATE fa_auth_group SET rules=?, updatetime=? WHERE id=?")->execute([$rules, time(), $gid]);
    echo "Updated teacher group rules count=" . count($ids) . "\n";
}

// 清缓存
echo "OK\n";
