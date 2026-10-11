<?php
/**
 * 智慧校园全模块演示数据（可重复执行，按业务键补全缺失数据）
 *
 * 用法：php application/admin/command/Install/seed_campus_demo.php
 */
$root = dirname(__DIR__, 4);
$pdo = new PDO('mysql:host=127.0.0.1;dbname=xxs_wallsu_com;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
$now = time();
$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));

function logLine($msg)
{
    echo $msg . "\n";
}

function adminPasswordHash($password)
{
    $salt = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6);
    return [$salt, md5(md5($password) . $salt)];
}

function ensureAdmin(PDO $pdo, $mobile, $name, $groupName, $now)
{
    $row = $pdo->query('SELECT id FROM fa_admin WHERE username=' . $pdo->quote($mobile))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return (int)$row['id'];
    }
    [$salt, $hash] = adminPasswordHash('123456');
    $pdo->prepare('INSERT INTO fa_admin (username,nickname,password,salt,avatar,email,mobile,loginfailure,createtime,updatetime,status) VALUES (?,?,?,?,?,?,?,0,?,?,?)')
        ->execute([$mobile, $name, $hash, $salt, '', $mobile . '@school.local', $mobile, $now, $now, 'normal']);
    $adminId = (int)$pdo->lastInsertId();
    $gid = $pdo->query("SELECT id FROM fa_auth_group WHERE name=" . $pdo->quote($groupName))->fetchColumn();
    if ($gid) {
        $pdo->prepare('INSERT IGNORE INTO fa_auth_group_access (uid, group_id) VALUES (?,?)')->execute([$adminId, $gid]);
    }
    logLine("创建后台账号 {$mobile} / 123456 ({$name})");
    return $adminId;
}

function ensureClass(PDO $pdo, $name, $grade, $adminId, $now)
{
    $row = $pdo->query('SELECT id FROM fa_school_class WHERE name=' . $pdo->quote($name))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $pdo->prepare('UPDATE fa_school_class SET grade=?, admin_id=?, status=?, updatetime=? WHERE id=?')
            ->execute([$grade, $adminId, 'normal', $now, $row['id']]);
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_school_class (name,grade,admin_id,weigh,status,createtime,updatetime) VALUES (?,?,?,?,?,?,?)')
        ->execute([$name, $grade, $adminId, 100, 'normal', $now, $now]);
    logLine("创建班级 {$name}");
    return (int)$pdo->lastInsertId();
}

function ensureTeacher(PDO $pdo, $adminId, $name, $mobile, $classId, $subject, $now)
{
    $row = $pdo->query('SELECT id FROM fa_teacher WHERE admin_id=' . (int)$adminId)->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $pdo->prepare('UPDATE fa_teacher SET name=?, mobile=?, class_id=?, subject=?, status=?, updatetime=? WHERE admin_id=?')
            ->execute([$name, $mobile, $classId, $subject, 'normal', $now, $adminId]);
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_teacher (admin_id,name,mobile,class_id,subject,status,createtime,updatetime) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$adminId, $name, $mobile, $classId, $subject, 'normal', $now, $now]);
    logLine("创建教师 {$name}");
    return (int)$pdo->lastInsertId();
}

function ensureBuilding(PDO $pdo, $name, $floors, $now)
{
    $row = $pdo->query('SELECT id FROM fa_dorm_building WHERE name=' . $pdo->quote($name))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_dorm_building (name,floors,weigh,status,createtime,updatetime) VALUES (?,?,?,?,?,?)')
        ->execute([$name, $floors, 100, 'normal', $now, $now]);
    logLine("创建楼栋 {$name}");
    return (int)$pdo->lastInsertId();
}

function ensureRooms(PDO $pdo, $buildingId, $floors, $roomsPerFloor, $now)
{
    $roomIds = [];
    for ($f = 1; $f <= $floors; $f++) {
        for ($r = 1; $r <= $roomsPerFloor; $r++) {
            $no = sprintf('%d%02d', $f, $r);
            $row = $pdo->query("SELECT id FROM fa_dorm_room WHERE building_id={$buildingId} AND room_no=" . $pdo->quote($no))->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $roomIds[] = (int)$row['id'];
                continue;
            }
            $pdo->prepare('INSERT INTO fa_dorm_room (building_id,floor,room_no,beds,status,createtime,updatetime) VALUES (?,?,?,?,?,?,?)')
                ->execute([$buildingId, $f, $no, 4, 'normal', $now, $now]);
            $roomIds[] = (int)$pdo->lastInsertId();
        }
    }
    return $roomIds;
}

function ensureStudent(PDO $pdo, $data, $now)
{
    $studentNo = $data['student_no'] ?? ($data['no'] ?? '');
    $row = $pdo->query('SELECT id FROM fa_student WHERE mobile=' . $pdo->quote($data['mobile']))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $pdo->prepare('UPDATE fa_student SET name=?, student_no=?, class_id=?, admin_id=?, room_id=?, gender=?, status=?, updatetime=? WHERE id=?')
            ->execute([$data['name'], $studentNo, $data['class_id'], $data['admin_id'], $data['room_id'], $data['gender'], 'normal', $now, $row['id']]);
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_student (user_id,admin_id,class_id,room_id,name,student_no,mobile,gender,status,createtime,updatetime) VALUES (0,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$data['admin_id'], $data['class_id'], $data['room_id'], $data['name'], $studentNo, $data['mobile'], $data['gender'], 'normal', $now, $now]);
    logLine("创建学生 {$data['name']} ({$data['mobile']})");
    return (int)$pdo->lastInsertId();
}

function ensureParent(PDO $pdo, $mobile, $name, $now)
{
    $row = $pdo->query('SELECT id FROM fa_parent WHERE mobile=' . $pdo->quote($mobile))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $pdo->prepare('UPDATE fa_parent SET name=?, status=?, updatetime=? WHERE id=?')->execute([$name, 'normal', $now, $row['id']]);
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_parent (user_id,name,mobile,status,createtime,updatetime) VALUES (0,?,?,?,?,?)')
        ->execute([$name, $mobile, 'normal', $now, $now]);
    return (int)$pdo->lastInsertId();
}

function linkParentStudent(PDO $pdo, $parentId, $studentId, $relation, $now)
{
    $row = $pdo->query("SELECT id FROM fa_parent_student WHERE parent_id={$parentId} AND student_id={$studentId}")->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_parent_student (parent_id,student_id,relation,createtime,updatetime) VALUES (?,?,?,?,?)')
        ->execute([$parentId, $studentId, $relation, $now, $now]);
    return (int)$pdo->lastInsertId();
}

function ensureDormAdmin(PDO $pdo, $mobile, $name, $buildingId, $floors, $now)
{
    $row = $pdo->query('SELECT id FROM fa_dorm_admin WHERE mobile=' . $pdo->quote($mobile))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $pdo->prepare('UPDATE fa_dorm_admin SET name=?, building_id=?, floors=?, status=?, updatetime=? WHERE id=?')
            ->execute([$name, $buildingId, $floors, 'normal', $now, $row['id']]);
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_dorm_admin (user_id,name,mobile,building_id,floors,status,createtime,updatetime) VALUES (0,?,?,?,?,?,?,?)')
        ->execute([$name, $mobile, $buildingId, $floors, 'normal', $now, $now]);
    logLine("创建宿管 {$name}");
    return (int)$pdo->lastInsertId();
}

function ensureExam(PDO $pdo, $name, $date, $type, $subjects, $now)
{
    $row = $pdo->query('SELECT id FROM fa_exam WHERE name=' . $pdo->quote($name))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_exam (name,exam_date,exam_type,subjects,status,createtime,updatetime) VALUES (?,?,?,?,?,?,?)')
        ->execute([$name, $date, $type, $subjects, 'normal', $now, $now]);
    logLine("创建考试 {$name}");
    return (int)$pdo->lastInsertId();
}

function ensureExamScore(PDO $pdo, $examId, $studentId, $classId, $adminId, $subject, $score, $isTotal, $now)
{
    $row = $pdo->query("SELECT id FROM fa_exam_score WHERE exam_id={$examId} AND student_id={$studentId} AND subject=" . $pdo->quote($subject))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $pdo->prepare('UPDATE fa_exam_score SET score=?, class_id=?, admin_id=?, is_total=?, updatetime=? WHERE id=?')
            ->execute([$score, $classId, $adminId, $isTotal, $now, $row['id']]);
        return;
    }
    $pdo->prepare('INSERT INTO fa_exam_score (exam_id,student_id,class_id,admin_id,subject,score,is_total,createtime,updatetime) VALUES (?,?,?,?,?,?,?,?,?)')
        ->execute([$examId, $studentId, $classId, $adminId, $subject, $score, $isTotal, $now, $now]);
}

function ensureGateDevice(PDO $pdo, $token, $name, $location, $now)
{
    $row = $pdo->query('SELECT id FROM fa_gate_device WHERE token=' . $pdo->quote($token))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_gate_device (name,token,location,direction,status,createtime,updatetime) VALUES (?,?,?,?,?,?,?)')
        ->execute([$name, $token, $location, 'both', 'normal', $now, $now]);
    return (int)$pdo->lastInsertId();
}

function ensureContent(PDO $pdo, $category, $title, $content, $weigh, $now)
{
    $row = $pdo->query('SELECT id FROM fa_campus_content WHERE title=' . $pdo->quote($title))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_campus_content (category,title,image,content,weigh,status,createtime,updatetime) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$category, $title, '', $content, $weigh, 'normal', $now, $now]);
    return (int)$pdo->lastInsertId();
}

function ensureAgreement(PDO $pdo, $title, $content, $now)
{
    $row = $pdo->query('SELECT id FROM fa_agreement WHERE title=' . $pdo->quote($title))->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return (int)$row['id'];
    }
    $pdo->prepare('INSERT INTO fa_agreement (title,content,need_sign,status,createtime,updatetime) VALUES (?,?,1,?,?,?)')
        ->execute([$title, $content, 'normal', $now, $now]);
    return (int)$pdo->lastInsertId();
}

logLine('=== 智慧校园演示数据填充 ===');

// 教师与班级
$admin1 = ensureAdmin($pdo, '13700000001', '张老师', '教师组', $now);
$admin2 = ensureAdmin($pdo, '13700000002', '李老师', '教师组', $now);
$class1 = ensureClass($pdo, '高一(1)班', '高一', $admin1, $now);
$class2 = ensureClass($pdo, '高一(2)班', '高一', $admin2, $now);
ensureTeacher($pdo, $admin1, '张老师', '13700000001', $class1, '语文', $now);
ensureTeacher($pdo, $admin2, '李老师', '13700000002', $class2, '数学', $now);

// 寝室
$building1 = ensureBuilding($pdo, '一号楼', 3, $now);
$building2 = ensureBuilding($pdo, '二号楼', 3, $now);
$rooms1 = ensureRooms($pdo, $building1, 2, 4, $now);
$rooms2 = ensureRooms($pdo, $building2, 2, 4, $now);
$dormAdmin1 = ensureDormAdmin($pdo, '13900000001', '王宿管', $building1, '1,2', $now);
ensureDormAdmin($pdo, '13900000002', '刘宿管', $building2, '1,2,3', $now);

// 学生
$students = [];
$studentDefs = [
    ['name' => '张三', 'mobile' => '13800000001', 'no' => '2026001', 'class_id' => $class1, 'admin_id' => $admin1, 'room_id' => $rooms1[0], 'gender' => 'male'],
    ['name' => '李四', 'mobile' => '13800000002', 'no' => '2026002', 'class_id' => $class1, 'admin_id' => $admin1, 'room_id' => $rooms1[0], 'gender' => 'female'],
    ['name' => '王五', 'mobile' => '13800000003', 'no' => '2026003', 'class_id' => $class1, 'admin_id' => $admin1, 'room_id' => $rooms1[1], 'gender' => 'male'],
    ['name' => '赵六', 'mobile' => '13800000004', 'no' => '2026004', 'class_id' => $class1, 'admin_id' => $admin1, 'room_id' => $rooms1[1], 'gender' => 'female'],
    ['name' => '孙七', 'mobile' => '13800000011', 'no' => '2026011', 'class_id' => $class2, 'admin_id' => $admin2, 'room_id' => $rooms2[0], 'gender' => 'male'],
    ['name' => '周八', 'mobile' => '13800000012', 'no' => '2026012', 'class_id' => $class2, 'admin_id' => $admin2, 'room_id' => $rooms2[0], 'gender' => 'female'],
    ['name' => '吴九', 'mobile' => '13800000013', 'no' => '2026013', 'class_id' => $class2, 'admin_id' => $admin2, 'room_id' => $rooms2[1], 'gender' => 'male'],
    ['name' => '郑十', 'mobile' => '13800000014', 'no' => '2026014', 'class_id' => $class2, 'admin_id' => $admin2, 'room_id' => $rooms2[1], 'gender' => 'female'],
];
foreach ($studentDefs as $def) {
    $students[$def['mobile']] = ensureStudent($pdo, $def, $now);
}

// 家长绑定
$parentLinks = [
    ['13800000001', '张家长', '13800000001', '父亲'],
    ['13800000002', '李家长', '13800000002', '母亲'],
    ['13800000003', '王家长', '13800000003', '父亲'],
    ['13800000004', '赵家长', '13800000004', '母亲'],
    ['13800000011', '孙家长', '13800000011', '父亲'],
    ['13800000012', '周家长', '13800000012', '母亲'],
];
foreach ($parentLinks as [$pMobile, $pName, $sMobile, $rel]) {
    $pid = ensureParent($pdo, $pMobile, $pName, $now);
    if (isset($students[$sMobile])) {
        linkParentStudent($pdo, $pid, $students[$sMobile], $rel, $now);
    }
}

// 考试与成绩
$exam1 = ensureExam($pdo, '第一次月考', '2026-07-01', '月考', '语文,数学,英语', $now);
$exam2 = ensureExam($pdo, '期中考试', '2026-05-15', '期中', '语文,数学,英语', $now);
$scoreMap = [
    '13800000001' => ['语文' => 92, '数学' => 88, '英语' => 85],
    '13800000002' => ['语文' => 85, '数学' => 95, '英语' => 78],
    '13800000003' => ['语文' => 78, '数学' => 82, '英语' => 88],
    '13800000004' => ['语文' => 90, '数学' => 86, '英语' => 91],
    '13800000011' => ['语文' => 88, '数学' => 90, '英语' => 82],
    '13800000012' => ['语文' => 76, '数学' => 88, '英语' => 80],
    '13800000013' => ['语文' => 83, '数学' => 79, '英语' => 86],
    '13800000014' => ['语文' => 91, '数学' => 93, '英语' => 89],
];
foreach ($studentDefs as $def) {
    $sid = $students[$def['mobile']];
    $scores = $scoreMap[$def['mobile']];
    foreach ([$exam1, $exam2] as $examId) {
        $offset = ($examId === $exam2) ? 3 : 0;
        foreach ($scores as $sub => $base) {
            $sc = min(100, $base + $offset + rand(-2, 2));
            ensureExamScore($pdo, $examId, $sid, $def['class_id'], $def['admin_id'], $sub, $sc, 0, $now);
        }
    }
}

// 请假（多种状态）
$leaveDefs = [
    ['13800000001', 'affair', '回家处理事务', 'pending_teacher', -2, 1],
    ['13800000002', 'sick', '感冒发烧就医', 'pending_parent', -1, 1],
    ['13800000003', 'affair', '参加亲戚婚礼', 'approved', -3, 2],
    ['13800000004', 'sick', '牙疼请假', 'rejected', -5, 1],
    ['13800000011', 'affair', '校外竞赛', 'left', -1, 2],
    ['13800000012', 'sick', '急性肠胃炎', 'returned', -4, 2],
];
foreach ($leaveDefs as [$sMobile, $type, $reason, $status, $startDay, $days]) {
    $sid = $students[$sMobile];
    $def = null;
    foreach ($studentDefs as $d) {
        if ($d['mobile'] === $sMobile) {
            $def = $d;
            break;
        }
    }
    if (!$def) {
        continue;
    }
    $start = strtotime($startDay . ' day 08:00:00');
    $end = strtotime('+' . ($days - 1) . ' day', $start);
    $exists = $pdo->query("SELECT id FROM fa_leave WHERE student_id={$sid} AND reason=" . $pdo->quote($reason))->fetchColumn();
    if ($exists) {
        continue;
    }
    $parentId = (int)$pdo->query('SELECT parent_id FROM fa_parent_student WHERE student_id=' . $sid . ' LIMIT 1')->fetchColumn();
    $pdo->prepare('INSERT INTO fa_leave (student_id,class_id,admin_id,room_id,leave_type,reason,start_time,end_time,days,status,parent_id,createtime,updatetime) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$sid, $def['class_id'], $def['admin_id'], $def['room_id'], $type, $reason, $start, $end, $days, $status, $parentId, $now - 86400, $now]);
    $leaveId = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO fa_leave_log (leave_id,action,operator_type,operator_id,content,createtime) VALUES (?,?,?,?,?,?)')
        ->execute([$leaveId, 'apply', 'student', $sid, '学生提交请假', $now - 86400]);
}

// 门禁
$device1 = ensureGateDevice($pdo, 'GATE_MAIN_001', '校门口闸机', '学校正门', $now);
$device2 = ensureGateDevice($pdo, 'GATE_DORM_001', '宿舍区闸机', '一号楼入口', $now);
$gateRows = [
    [$device1, '13800000001', 'out', -1],
    [$device1, '13800000001', 'in', 0],
    [$device2, '13800000011', 'out', -2],
    [$device2, '13800000012', 'in', -1],
];
foreach ($gateRows as [$dev, $sMobile, $dir, $dayOffset]) {
    $sid = $students[$sMobile];
    $pt = $now + $dayOffset * 86400;
    $exists = $pdo->query("SELECT id FROM fa_gate_record WHERE student_id={$sid} AND direction=" . $pdo->quote($dir) . " AND passtime BETWEEN " . ($pt - 3600) . ' AND ' . ($pt + 3600))->fetchColumn();
    if ($exists) {
        continue;
    }
    $pdo->prepare('INSERT INTO fa_gate_record (device_id,student_id,leave_id,direction,mobile,passtime,createtime,updatetime) VALUES (?,?,0,?,?,?,?,?)')
        ->execute([$dev, $sid, $dir, $sMobile, $pt, $pt, $pt]);
}

// 查寝
foreach ([$today, $yesterday] as $idx => $checkDate) {
    $exists = $pdo->query("SELECT id FROM fa_dorm_check WHERE dorm_admin_id={$dormAdmin1} AND check_date=" . $pdo->quote($checkDate))->fetchColumn();
    if ($exists) {
        $checkId = (int)$exists;
    } else {
        $pdo->prepare('INSERT INTO fa_dorm_check (dorm_admin_id,building_id,check_date,remark,createtime,updatetime) VALUES (?,?,?,?,?,?)')
            ->execute([$dormAdmin1, $building1, $checkDate, $checkDate === $today ? '今日例行查寝' : '昨日补查', $now, $now]);
        $checkId = (int)$pdo->lastInsertId();
    }
    $results = ['normal', 'normal', 'leave', 'abnormal'];
    foreach (array_slice($rooms1, 0, 4) as $i => $roomId) {
        $existsItem = $pdo->query("SELECT id FROM fa_dorm_check_item WHERE check_id={$checkId} AND room_id={$roomId}")->fetchColumn();
        if ($existsItem) {
            continue;
        }
        $result = $results[$i % 4];
        $remark = $result === 'abnormal' ? '卫生待整改' : ($result === 'leave' ? '学生请假' : '');
        $pdo->prepare('INSERT INTO fa_dorm_check_item (check_id,room_id,result,remark,createtime,updatetime) VALUES (?,?,?,?,?,?)')
            ->execute([$checkId, $roomId, $result, $remark, $now, $now]);
    }
}

// 校园内容
ensureContent($pdo, 'intro', '学校简介', '我校创办于1998年，是一所注重全面发展的现代化学校。', 100, $now);
ensureContent($pdo, 'feature', '办学特色', '小班化教学、科创实验室、双语课程是我们的三大特色。', 90, $now);
ensureContent($pdo, 'rule', '学生管理制度', '请全体学生遵守校纪校规，按时到校，诚信考试。', 80, $now);
ensureContent($pdo, 'notice', '关于暑假安排的通知', '2026年暑假将于7月10日开始，8月25日报到注册。', 70, $now);
ensureContent($pdo, 'notice', '校园安全提醒', '近期多雨，请同学们注意出行安全，远离危险水域。', 60, $now);

// 协议
$agreement1 = ensureAgreement($pdo, '家长须知', '请家长配合学校管理，关注孩子身心健康，及时沟通。', $now);
$agreement2 = ensureAgreement($pdo, '假期安全协议', '假期期间请注意交通安全、用电安全与网络安全。', $now);
$agreement3 = ensureAgreement($pdo, '考试诚信承诺书', '学生应诚信应考，杜绝作弊行为。', $now);
$firstParent = (int)$pdo->query('SELECT id FROM fa_parent ORDER BY id LIMIT 1')->fetchColumn();
$firstStudent = (int)$pdo->query('SELECT id FROM fa_student ORDER BY id LIMIT 1')->fetchColumn();
if ($firstParent && $firstStudent) {
    $existsSign = $pdo->query("SELECT id FROM fa_agreement_sign WHERE agreement_id={$agreement1} AND parent_id={$firstParent} AND student_id={$firstStudent}")->fetchColumn();
    if (!$existsSign) {
        $pdo->prepare('INSERT INTO fa_agreement_sign (agreement_id,parent_id,student_id,sign_image,signtime,createtime,updatetime) VALUES (?,?,?,?,?,?,?)')
            ->execute([$agreement1, $firstParent, $firstStudent, 'signed', $now - 3600, $now, $now]);
    }
}

// 成绩阅读
if ($firstParent && $firstStudent) {
    $existsRead = $pdo->query("SELECT id FROM fa_score_read WHERE exam_id={$exam1} AND student_id={$firstStudent} AND parent_id={$firstParent}")->fetchColumn();
    if (!$existsRead) {
        $pdo->prepare('INSERT INTO fa_score_read (exam_id,student_id,parent_id,readtime,createtime,updatetime) VALUES (?,?,?,?,?,?)')
            ->execute([$exam1, $firstStudent, $firstParent, $now - 7200, $now, $now]);
    }
}

// 重算排名
define('APP_PATH', $root . '/application/');
require $root . '/thinkphp/base.php';
\think\App::initCommon();
\app\common\library\campus\RankService::recalculate($exam1);
\app\common\library\campus\RankService::recalculate($exam2);
logLine('已重算考试排名');

logLine('');
logLine('=== 填充完成 ===');
logLine('班级：2 个 | 教师：13700000001 / 13700000002 (密码 123456)');
logLine('学生：8 人 | 宿管：13900000001 / 13900000002');
logLine('考试：2 场 | 请假/门禁/查寝/内容/协议 已补全');
logLine('OK');
