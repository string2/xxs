<?php
/**
 * 创建演示教师账号（可重复执行，已存在则跳过或更新班级绑定）
 *
 * 用法：php application/admin/command/Install/seed_demo_teacher.php
 */
$pdo = new PDO('mysql:host=127.0.0.1;dbname=xxs_wallsu_com;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$mobile = '13700000001';
$name = '张老师';
$password = '123456';
$classId = 1;
$subject = '语文';
$now = time();

$group = $pdo->query("SELECT id FROM fa_auth_group WHERE name='教师组'")->fetch(PDO::FETCH_ASSOC);
if (!$group) {
    echo "请先执行 setup_campus_auth.php 创建教师组\n";
    exit(1);
}

$class = $pdo->query("SELECT id, name FROM fa_school_class WHERE id=" . (int)$classId)->fetch(PDO::FETCH_ASSOC);
if (!$class) {
    echo "班级 id={$classId} 不存在，请先在后台创建班级\n";
    exit(1);
}

$admin = $pdo->query("SELECT id FROM fa_admin WHERE username=" . $pdo->quote($mobile))->fetch(PDO::FETCH_ASSOC);
if ($admin) {
    $adminId = (int)$admin['id'];
    echo "后台账号已存在：{$mobile} (admin_id={$adminId})\n";
} else {
    $salt = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6);
    $hash = md5(md5($password) . $salt);
    $pdo->prepare('INSERT INTO fa_admin (username,nickname,password,salt,avatar,email,mobile,loginfailure,createtime,updatetime,status) VALUES (?,?,?,?,?,?,?,0,?,?,?)')
        ->execute([$mobile, $name, $hash, $salt, '', $mobile . '@school.local', $mobile, $now, $now, 'normal']);
    $adminId = (int)$pdo->lastInsertId();
    echo "已创建后台账号：{$mobile} / {$password} (admin_id={$adminId})\n";
}

$access = $pdo->query("SELECT uid FROM fa_auth_group_access WHERE uid={$adminId} AND group_id=" . (int)$group['id'])->fetch();
if (!$access) {
    $pdo->prepare('INSERT INTO fa_auth_group_access (uid, group_id) VALUES (?,?)')->execute([$adminId, $group['id']]);
    echo "已加入教师组\n";
}

$teacher = $pdo->query("SELECT id FROM fa_teacher WHERE admin_id={$adminId}")->fetch(PDO::FETCH_ASSOC);
if ($teacher) {
    $pdo->prepare('UPDATE fa_teacher SET name=?, mobile=?, class_id=?, subject=?, status=?, updatetime=? WHERE admin_id=?')
        ->execute([$name, $mobile, $classId, $subject, 'normal', $now, $adminId]);
    echo "已更新教师资料 fa_teacher\n";
} else {
    $pdo->prepare('INSERT INTO fa_teacher (admin_id,name,mobile,class_id,subject,status,createtime,updatetime) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$adminId, $name, $mobile, $classId, $subject, 'normal', $now, $now]);
    echo "已创建教师资料 fa_teacher\n";
}

$pdo->prepare('UPDATE fa_school_class SET admin_id=?, updatetime=? WHERE id=?')->execute([$adminId, $now, $classId]);
$pdo->prepare('UPDATE fa_student SET admin_id=?, updatetime=? WHERE class_id=?')->execute([$adminId, $now, $classId]);

echo "\n=== 演示教师账号 ===\n";
echo "后台地址：http://127.0.0.1:8082/fs.php\n";
echo "登录账号：{$mobile}\n";
echo "登录密码：{$password}\n";
echo "教师姓名：{$name}\n";
echo "负责班级：{$class['name']}\n";
echo "可见菜单：学生管理、考试/成绩、排名、请假审核、进出记录\n";
echo "OK\n";
