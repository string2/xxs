<?php

namespace app\common\library\campus;

use think\Db;

/**
 * 考试排名计算
 */
class RankService
{
    /**
     * 根据某次考试成绩重算排名（含总分）
     * @param int $examId
     */
    public static function recalculate($examId)
    {
        $examId = (int)$examId;
        if ($examId <= 0) {
            return;
        }

        // 汇总每个学生各科成绩，写入/更新总分行
        $scores = Db::name('exam_score')
            ->where('exam_id', $examId)
            ->where('is_total', 0)
            ->select();

        $byStudent = [];
        foreach ($scores as $row) {
            $sid = (int)$row['student_id'];
            if (!isset($byStudent[$sid])) {
                $byStudent[$sid] = [
                    'class_id' => (int)$row['class_id'],
                    'admin_id' => (int)$row['admin_id'],
                    'total'    => 0,
                    'subjects' => [],
                ];
            }
            $byStudent[$sid]['total'] += (float)$row['score'];
            $byStudent[$sid]['subjects'][$row['subject']] = (float)$row['score'];
            $byStudent[$sid]['class_id'] = (int)$row['class_id'] ?: $byStudent[$sid]['class_id'];
            $byStudent[$sid]['admin_id'] = (int)$row['admin_id'] ?: $byStudent[$sid]['admin_id'];
        }

        $now = time();
        foreach ($byStudent as $studentId => $info) {
            $exist = Db::name('exam_score')
                ->where(['exam_id' => $examId, 'student_id' => $studentId, 'is_total' => 1])
                ->find();
            $data = [
                'exam_id'    => $examId,
                'student_id' => $studentId,
                'class_id'   => $info['class_id'],
                'admin_id'   => $info['admin_id'],
                'subject'    => '总分',
                'score'      => $info['total'],
                'is_total'   => 1,
                'updatetime' => $now,
            ];
            if ($exist) {
                Db::name('exam_score')->where('id', $exist['id'])->update($data);
            } else {
                $data['createtime'] = $now;
                Db::name('exam_score')->insert($data);
            }
        }

        // 删除旧排名
        Db::name('exam_rank')->where('exam_id', $examId)->delete();

        // 收集所有科目（含总分）
        $allRows = Db::name('exam_score')->where('exam_id', $examId)->select();
        $bySubject = [];
        foreach ($allRows as $row) {
            $subject = $row['subject'];
            if (!isset($bySubject[$subject])) {
                $bySubject[$subject] = [];
            }
            $bySubject[$subject][] = $row;
        }

        foreach ($bySubject as $subject => $list) {
            // 全校排名
            usort($list, function ($a, $b) {
                return (float)$b['score'] <=> (float)$a['score'];
            });
            $schoolRankMap = [];
            $prevScore = null;
            $rank = 0;
            $index = 0;
            foreach ($list as $item) {
                $index++;
                if ($prevScore === null || (float)$item['score'] !== (float)$prevScore) {
                    $rank = $index;
                    $prevScore = $item['score'];
                }
                $schoolRankMap[$item['student_id']] = $rank;
            }

            // 班级排名
            $byClass = [];
            foreach ($list as $item) {
                $byClass[$item['class_id']][] = $item;
            }
            $classRankMap = [];
            foreach ($byClass as $classId => $classList) {
                usort($classList, function ($a, $b) {
                    return (float)$b['score'] <=> (float)$a['score'];
                });
                $prevScore = null;
                $rank = 0;
                $index = 0;
                foreach ($classList as $item) {
                    $index++;
                    if ($prevScore === null || (float)$item['score'] !== (float)$prevScore) {
                        $rank = $index;
                        $prevScore = $item['score'];
                    }
                    $classRankMap[$item['student_id']] = $rank;
                }
            }

            foreach ($list as $item) {
                Db::name('exam_rank')->insert([
                    'exam_id'     => $examId,
                    'student_id'  => $item['student_id'],
                    'class_id'    => $item['class_id'],
                    'subject'     => $subject,
                    'score'       => $item['score'],
                    'class_rank'  => $classRankMap[$item['student_id']] ?? 0,
                    'school_rank' => $schoolRankMap[$item['student_id']] ?? 0,
                    'createtime'  => $now,
                    'updatetime'  => $now,
                ]);
            }
        }
    }
}
