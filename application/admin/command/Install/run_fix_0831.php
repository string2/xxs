<?php
/**
 * 执行 0831 库表修复 + 注册科目管理菜单
 */
$pdo = new PDO('mysql:host=127.0.0.1;dbname=xxs.cc;charset=utf8mb4', 'root', 'root', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

function columnExists(PDO $pdo, $table, $column)
{
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
    $stmt->execute([$column]);
    return (bool)$stmt->fetch();
}

function tableExists(PDO $pdo, $table)
{
    $stmt = $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table));
    return (bool)$stmt->fetch();
}

if (!columnExists($pdo, 'fa_leave', 'parent_sign_image')) {
    $pdo->exec("ALTER TABLE `fa_leave` ADD COLUMN `parent_sign_image` varchar(255) NOT NULL DEFAULT '' COMMENT '家长签字图片' AFTER `parent_time`");
    echo "Added fa_leave.parent_sign_image\n";
} else {
    echo "fa_leave.parent_sign_image exists\n";
}

if (!tableExists($pdo, 'fa_subject')) {
    $pdo->exec("CREATE TABLE `fa_subject` (
      `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
      `name` varchar(50) NOT NULL DEFAULT '' COMMENT '科目名称',
      `weigh` int(10) NOT NULL DEFAULT '0' COMMENT '排序',
      `status` enum('normal','hidden') NOT NULL DEFAULT 'normal' COMMENT '状态',
      `createtime` bigint(16) DEFAULT NULL,
      `updatetime` bigint(16) DEFAULT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `name` (`name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试科目'");
    echo "Created fa_subject\n";
}

$now = time();
$subjects = [
    ['语文', 100], ['数学', 90], ['英语', 80], ['物理', 70], ['化学', 60],
    ['生物', 50], ['历史', 40], ['地理', 30], ['政治', 20],
];
$ins = $pdo->prepare('INSERT IGNORE INTO fa_subject (name,weigh,status,createtime,updatetime) VALUES (?,?,?,?,?)');
foreach ($subjects as $s) {
    $ins->execute([$s[0], $s[1], 'normal', $now, $now]);
}
echo "Seeded subjects\n";

$pdo->exec("UPDATE fa_exam SET subjects='语文,数学,英语,物理,化学' WHERE subjects='' OR subjects IS NULL OR subjects='总分'");
echo "Patched exam subjects\n";

function ensureRule(PDO $pdo, $parentName, $name, $title, $ismenu = 0, $weigh = 0, $icon = 'fa fa-circle-o')
{
    $pid = $pdo->query('SELECT id FROM fa_auth_rule WHERE name=' . $pdo->quote($parentName))->fetchColumn();
    if (!$pid) {
        echo "skip $name parent missing\n";
        return null;
    }
    $exists = $pdo->query('SELECT id FROM fa_auth_rule WHERE name=' . $pdo->quote($name))->fetchColumn();
    if ($exists) {
        $pdo->prepare('UPDATE fa_auth_rule SET title=?, ismenu=?, weigh=?, updatetime=? WHERE id=?')
            ->execute([$title, $ismenu, $weigh, time(), $exists]);
        return (int)$exists;
    }
    $pdo->prepare("INSERT INTO fa_auth_rule (type,pid,name,title,icon,url,`condition`,remark,ismenu,menutype,extend,py,pinyin,createtime,updatetime,weigh,status) VALUES ('file',?,?,?,?,?,'','',?,NULL,'','','',?,?,?,'normal')")
        ->execute([$pid, $name, $title, $icon, '', $ismenu, time(), time(), $weigh]);
    echo "Added menu $name\n";
    return (int)$pdo->lastInsertId();
}

$examWeigh = (int)$pdo->query("SELECT weigh FROM fa_auth_rule WHERE name='campus/exam'")->fetchColumn();
ensureRule($pdo, 'campus', 'campus/subject', '科目管理', 1, $examWeigh ? $examWeigh + 1 : 80, 'fa fa-book');
foreach (['index' => '查看', 'add' => '添加', 'edit' => '编辑', 'del' => '删除', 'multi' => '批量更新'] as $act => $title) {
    ensureRule($pdo, 'campus/subject', 'campus/subject/' . $act, $title, 0, 0);
}

echo "DONE\n";
