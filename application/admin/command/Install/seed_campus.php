<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=xxs_wallsu_com;charset=utf8mb4", "root", "", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
$now = time();

if (!$pdo->query("SELECT id FROM fa_school_class LIMIT 1")->fetchColumn()) {
    $pdo->exec("INSERT INTO fa_school_class(name,grade,admin_id,weigh,status,createtime,updatetime) VALUES ('高一(1)班','高一',1,100,'normal',{$now},{$now})");
}
$classId = (int)$pdo->query("SELECT id FROM fa_school_class ORDER BY id LIMIT 1")->fetchColumn();

if (!$pdo->query("SELECT id FROM fa_dorm_building LIMIT 1")->fetchColumn()) {
    $pdo->exec("INSERT INTO fa_dorm_building(name,floors,weigh,status,createtime,updatetime) VALUES ('一号楼',3,100,'normal',{$now},{$now})");
}
$bid = (int)$pdo->query("SELECT id FROM fa_dorm_building ORDER BY id LIMIT 1")->fetchColumn();

$roomCount = (int)$pdo->query("SELECT COUNT(*) FROM fa_dorm_room WHERE building_id={$bid}")->fetchColumn();
if ($roomCount == 0) {
    for ($f = 1; $f <= 2; $f++) {
        for ($r = 1; $r <= 4; $r++) {
            $no = sprintf('%d%02d', $f, $r);
            $pdo->exec("INSERT INTO fa_dorm_room(building_id,floor,room_no,beds,status,createtime,updatetime) VALUES ({$bid},{$f},'{$no}',4,'normal',{$now},{$now})");
        }
    }
}
$roomId = (int)$pdo->query("SELECT id FROM fa_dorm_room WHERE building_id={$bid} ORDER BY id LIMIT 1")->fetchColumn();

if (!(int)$pdo->query("SELECT COUNT(*) FROM fa_student")->fetchColumn()) {
    $pdo->exec("INSERT INTO fa_student(user_id,admin_id,class_id,room_id,name,student_no,mobile,gender,status,createtime,updatetime) VALUES
    (0,1,{$classId},{$roomId},'张三','2026001','13800000001','male','normal',{$now},{$now}),
    (0,1,{$classId},{$roomId},'李四','2026002','13800000002','female','normal',{$now},{$now})");
}

if (!(int)$pdo->query("SELECT COUNT(*) FROM fa_dorm_admin")->fetchColumn()) {
    $pdo->exec("INSERT INTO fa_dorm_admin(user_id,name,mobile,building_id,floors,status,createtime,updatetime) VALUES (0,'王宿管','13900000001',{$bid},'1,2','normal',{$now},{$now})");
}

if (!(int)$pdo->query("SELECT COUNT(*) FROM fa_exam")->fetchColumn()) {
    $pdo->exec("INSERT INTO fa_exam(name,exam_date,exam_type,subjects,status,createtime,updatetime) VALUES ('第一次月考','2026-07-01','月考','语文,数学,英语','normal',{$now},{$now})");
}
$examId = (int)$pdo->query("SELECT id FROM fa_exam ORDER BY id LIMIT 1")->fetchColumn();

if (!(int)$pdo->query("SELECT COUNT(*) FROM fa_exam_score WHERE exam_id={$examId}")->fetchColumn()) {
    $sids = $pdo->query("SELECT id FROM fa_student")->fetchAll(PDO::FETCH_COLUMN);
    $subjects = ['语文' => [90, 85], '数学' => [88, 92], '英语' => [80, 78]];
    foreach ($sids as $i => $sid) {
        foreach ($subjects as $sub => $scores) {
            $sc = $scores[$i] ?? 80;
            $pdo->exec("INSERT INTO fa_exam_score(exam_id,student_id,class_id,admin_id,subject,score,is_total,createtime,updatetime) VALUES ({$examId},{$sid},{$classId},1,'{$sub}',{$sc},0,{$now},{$now})");
        }
    }
}

if (!(int)$pdo->query("SELECT COUNT(*) FROM fa_agreement")->fetchColumn()) {
    $pdo->exec("INSERT INTO fa_agreement(title,content,need_sign,status,createtime,updatetime) VALUES ('家长须知','请认真阅读并签字确认学校相关规章制度。',1,'normal',{$now},{$now})");
}

echo "class={$classId} building={$bid} room={$roomId} exam={$examId}\n";
