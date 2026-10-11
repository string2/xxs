<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=xxs_wallsu_com;charset=utf8mb4", "root", "", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$pdo->exec("UPDATE fa_auth_rule SET title='智慧校园', icon='fa fa-university', weigh=200 WHERE id=85");

// Hide unused parentuser entry if still exists
$pdo->exec("UPDATE fa_auth_rule SET status='hidden' WHERE name='campus/parent' OR name LIKE 'campus/parent/%'");

$names = [
    'campus',
    'campus/student', 'campus/student/index', 'campus/student/add', 'campus/student/edit', 'campus/student/del', 'campus/student/multi', 'campus/student/import',
    'campus/exam', 'campus/exam/index', 'campus/exam/add', 'campus/exam/edit', 'campus/exam/del', 'campus/exam/multi',
    'campus/examscore', 'campus/examscore/index', 'campus/examscore/add', 'campus/examscore/edit', 'campus/examscore/del', 'campus/examscore/multi', 'campus/examscore/import',
    'campus/examrank', 'campus/examrank/index',
    'campus/leave', 'campus/leave/index', 'campus/leave/edit', 'campus/leave/multi', 'campus/leave/approve', 'campus/leave/reject',
    'campus/gaterecord', 'campus/gaterecord/index',
    'dashboard', 'dashboard/index',
    'general', 'general/profile', 'general/profile/index', 'general/profile/update',
];

$placeholders = implode(',', array_fill(0, count($names), '?'));
$stmt = $pdo->prepare("SELECT id FROM fa_auth_rule WHERE name IN ($placeholders)");
$stmt->execute($names);
$ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

// Ensure approve/reject menu nodes exist
$leavePid = $pdo->query("SELECT id FROM fa_auth_rule WHERE name='campus/leave'")->fetchColumn();
foreach (['approve' => '同意请假', 'reject' => '拒绝请假'] as $act => $title) {
    $name = "campus/leave/$act";
    $exists = $pdo->query("SELECT id FROM fa_auth_rule WHERE name=" . $pdo->quote($name))->fetchColumn();
    if (!$exists && $leavePid) {
        $pdo->prepare("INSERT INTO fa_auth_rule (type,pid,name,title,icon,url,`condition`,remark,ismenu,menutype,extend,py,pinyin,createtime,updatetime,weigh,status) VALUES ('file',?,?,?,'fa fa-circle-o','','','',0,NULL,'','','',?,?,0,'normal')")
            ->execute([$leavePid, $name, $title, time(), time()]);
        $ids[] = $pdo->lastInsertId();
        echo "Added rule $name\n";
    } elseif ($exists) {
        $ids[] = $exists;
    }
}

$rules = implode(',', array_unique($ids));
$row = $pdo->query("SELECT id FROM fa_auth_group WHERE name='教师组'")->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    $pdo->prepare("INSERT INTO fa_auth_group (pid,name,rules,createtime,updatetime,status) VALUES (1,'教师组',?,?,?,'normal')")
        ->execute([$rules, time(), time()]);
    echo "Created teacher group id=" . $pdo->lastInsertId() . "\n";
} else {
    $pdo->prepare("UPDATE fa_auth_group SET rules=?, updatetime=? WHERE id=?")->execute([$rules, time(), $row['id']]);
    echo "Updated teacher group id={$row['id']}\n";
}
echo "Teacher rule count: " . count(array_unique($ids)) . "\n";

// Super admin already has *
echo "OK\n";
