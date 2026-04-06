<?php
session_start();
include 'includes/database.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../index.php");
    exit();
}

$school_name = trim($_GET['school'] ?? '');
$search_name = trim($_GET['search'] ?? '');
$sort_by = $_GET['sort'] ?? 'name_asc';

// Redirect if no school is provided
if (empty($school_name)) {
    header("Location: manage_schools.php");
    exit();
}

// --- QUICK STATS FOR THIS SCHOOL ---
$stat_sql = "SELECT COUNT(*) as total_students,
             COALESCE(SUM(total_required), 0) as total_req,
             (SELECT SUM(hours_rendered) FROM logs l JOIN users u2 ON l.user_id = u2.id WHERE u2.school = ? AND u2.role = 'user') as total_rendered
             FROM users WHERE school = ? AND role = 'user'";
$stmt_stat = $conn->prepare($stat_sql);
$stmt_stat->bind_param("ss", $school_name, $school_name);
$stmt_stat->execute();
$stats = $stmt_stat->get_result()->fetch_assoc();

$total_school_students = $stats['total_students'];
$total_school_rendered = $stats['total_rendered'] ?? 0;
$total_school_req = $stats['total_req'] > 0 ? $stats['total_req'] : 1;
$avg_school_progress = min(round(($total_school_rendered / $total_school_req) * 100), 100);

// --- PAGINATION ---
$limit = 10;
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

// 1. GET TOTAL STUDENT COUNT (For search & pagination)
$count_sql = "SELECT COUNT(*) as total FROM users WHERE school = ? AND role = 'user'";
if (!empty($search_name)) $count_sql .= " AND (full_name LIKE ? OR username LIKE ?)";

$stmt_c = $conn->prepare($count_sql);
$search_param = "%$search_name%";
if (!empty($search_name)) {
    $stmt_c->bind_param("sss", $school_name, $search_param, $search_param);
} else {
    $stmt_c->bind_param("s", $school_name);
}
$stmt_c->execute();
$total_students_filtered = $stmt_c->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_students_filtered / $limit);

// 2. FETCH STUDENTS (Added MIN(log_date) and COUNT(DISTINCT log_date) for timeline logic)
$query = "SELECT u.id, u.full_name, u.username, u.total_required,
          (SELECT COALESCE(SUM(hours_rendered), 0) FROM logs WHERE user_id = u.id) as total_done,
          (SELECT MIN(log_date) FROM logs WHERE user_id = u.id) as first_active,
          (SELECT COUNT(DISTINCT log_date) FROM logs WHERE user_id = u.id) as days_worked
          FROM users u
          WHERE u.school = ? AND u.role = 'user'";

if (!empty($search_name)) {
    $query .= " AND (u.full_name LIKE ? OR u.username LIKE ?)";
}

// Sorting Logic
if ($sort_by === 'progress_desc') {
    $query .= " ORDER BY total_done DESC, u.full_name ASC";
} elseif ($sort_by === 'progress_asc') {
    $query .= " ORDER BY total_done ASC, u.full_name ASC";
} else {
    $query .= " ORDER BY u.full_name ASC";
}

$query .= " LIMIT ? OFFSET ?";

$stmt = $conn->prepare($query);
if (!empty($search_name)) {
    $stmt->bind_param("sssii", $school_name, $search_param, $search_param, $limit, $offset);
} else {
    $stmt->bind_param("sii", $school_name, $limit, $offset);
}
$stmt->execute();
$result = $stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title>Trainees - <?php echo htmlspecialchars($school_name); ?></title>
    <style>
        :root { --primary: #3498db; --success: #27ae60; --warning: #f1c40f; --danger: #e74c3c; --dark: #2c3e50; --bg: #f4f7f6; }
        body { background: var(--bg); font-family: 'Segoe UI', sans-serif; margin: 0; }
        .container { max-width: 1100px; margin: 30px auto; padding: 0 20px; }
        
        .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;}
        
        /* Stats Cards */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); border-left: 5px solid var(--primary); }
        .stat-card.success { border-left-color: var(--success); }
        .stat-card.warning { border-left-color: var(--warning); }
        .stat-card h4 { margin: 0 0 5px 0; font-size: 13px; color: #7f8c8d; text-transform: uppercase; }
        .stat-card h2 { margin: 0; font-size: 24px; color: var(--dark); }

        /* Controls */
        .controls-box { background: white; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; gap: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); flex-wrap: wrap; }
        .controls-box input, .controls-box select { flex-grow: 1; padding: 10px 15px; border: 1px solid #dfe6e9; border-radius: 6px; font-size: 14px; outline: none; }
        .controls-box input:focus, .controls-box select:focus { border-color: var(--primary); }
        .btn-search { background: var(--dark); color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: opacity 0.2s; }
        .btn-search:hover { opacity: 0.9; }

        /* Table Styles */
        .student-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .student-table th { background: #f8f9fa; padding: 15px; text-align: left; color: #7f8c8d; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #eee; }
        .student-table td { padding: 15px; border-bottom: 1px solid #f1f2f6; vertical-align: middle; }
        .student-table tr:last-child td { border-bottom: none; }

        /* Progress Bar */
        .prog-container { background: #eee; border-radius: 10px; height: 8px; width: 100%; max-width: 250px; overflow: hidden; margin-bottom: 5px; }
        .prog-bar { height: 100%; transition: width 0.4s ease; }
        .prog-label { font-size: 12px; font-weight: 600; color: #7f8c8d; }

        /* Timeline Info */
        .timeline-info { font-size: 13px; color: #34495e; display: flex; flex-direction: column; gap: 4px; }
        .timeline-info i { width: 16px; color: #95a5a6; }

        .btn-view { background: rgba(52, 152, 219, 0.1); color: var(--primary); padding: 8px 15px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; transition: all 0.2s; display: inline-block; }
        .btn-view:hover { background: var(--primary); color: white; }
        
        .pagination { display: flex; justify-content: center; gap: 5px; margin-top: 25px; }
        .pagination a { padding: 8px 14px; background: white; border: 1px solid #ddd; text-decoration: none; color: var(--dark); border-radius: 4px; font-weight: 600; font-size: 14px; }
        .pagination a.active { background: var(--primary); color: white; border-color: var(--primary); }

        .bg-success { background: var(--success); }
        .bg-warning { background: var(--warning); }
        .bg-danger { background: var(--danger); }
        .badge-completed { background: #eafaf1; color: var(--success); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 8px; vertical-align: middle; display: inline-block;}
    </style>
</head>
<body>
    <?php include 'includes/navbar.php'; ?>

    <div class="container">
        <div class="header-flex">
            <div>
                <a href="manage_schools.php" style="color: #7f8c8d; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 10px;"><i class="fas fa-arrow-left"></i> Back to Schools</a>
                <h1 style="margin:0; color: var(--dark); display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-school" style="color: var(--primary);"></i> <?php echo htmlspecialchars($school_name); ?>
                </h1>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h4>Total Trainees</h4>
                <h2><?php echo number_format($total_school_students); ?></h2>
            </div>
            <div class="stat-card warning">
                <h4>Total Hours Rendered</h4>
                <h2><?php echo number_format($total_school_rendered, 1); ?> <span style="font-size: 14px; color: #95a5a6;">hrs</span></h2>
            </div>
            <div class="stat-card success">
                <h4>Average Completion</h4>
                <h2><?php echo $avg_school_progress; ?>%</h2>
            </div>
        </div>

        <form method="GET" class="controls-box">
            <input type="hidden" name="school" value="<?php echo htmlspecialchars($school_name); ?>">
            
            <input type="text" name="search" placeholder="Search by student name or username..." value="<?php echo htmlspecialchars($search_name); ?>" style="flex: 2; min-width: 200px;">
            
            <select name="sort" style="flex: 1; min-width: 150px;">
                <option value="name_asc" <?php if($sort_by == 'name_asc') echo 'selected'; ?>>Sort by: Name (A-Z)</option>
                <option value="progress_desc" <?php if($sort_by == 'progress_desc') echo 'selected'; ?>>Sort by: Highest Progress</option>
                <option value="progress_asc" <?php if($sort_by == 'progress_asc') echo 'selected'; ?>>Sort by: Lowest Progress</option>
            </select>

            <button type="submit" class="btn-search"><i class="fas fa-search"></i> Filter</button>
            
            <?php if(!empty($search_name) || $sort_by !== 'name_asc'): ?>
                <a href="?school=<?php echo urlencode($school_name); ?>" class="btn-search" style="background: #e74c3c; text-decoration: none; text-align: center;">Reset</a>
            <?php endif; ?>
        </form>

        <table class="student-table">
            <thead>
                <tr>
                    <th>Student Details</th>
                    <th>Progress</th>
                    <th>Timeline & Completion</th>
                    <th style="text-align: right;">Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if($result->num_rows > 0): ?>
                    <?php while($row = $result->fetch_assoc()): 
                        $req = ($row['total_required'] > 0) ? $row['total_required'] : 1;
                        $done = $row['total_done'] ?? 0;
                        $perc = min(round(($done / $req) * 100), 100);
                        
                        $color = 'bg-danger';
                        if($perc >= 100) $color = 'bg-success';
                        elseif($perc >= 50) $color = 'bg-warning';

                        // Timeline Logic
                        $remaining = $req - $done;
                        $days_worked = (int)$row['days_worked'];
                        $start_date = $row['first_active'] ? date('M d, Y', strtotime($row['first_active'])) : 'Not started yet';
                        
                        $est_completion = '<span style="color:#95a5a6; font-size:12px;">Needs more data</span>';
                        if ($remaining <= 0) {
                            $est_completion = '<span style="color: var(--success); font-weight: bold;">Finished</span>';
                        } elseif ($days_worked > 0 && $done > 0) {
                            $avg_pace = $done / $days_worked;
                            $days_needed = ceil($remaining / $avg_pace);
                            
                            $target_date = new DateTime();
                            $days_added = 0;
                            while ($days_added < $days_needed) {
                                $target_date->modify('+1 day');
                                if ($target_date->format('N') < 6) { // Skip weekends
                                    $days_added++;
                                }
                            }
                            $est_completion = '<b>' . $target_date->format('M d, Y') . '</b> <span style="font-size:11px; color:#95a5a6;">(~'.$days_needed.' days)</span>';
                        }
                    ?>
                    <tr>
                        <td>
                            <div style="font-weight: bold; color: var(--dark); font-size: 15px;">
                                <?php echo htmlspecialchars(!empty($row['full_name']) ? $row['full_name'] : $row['username']); ?>
                                <?php if($perc >= 100): ?>
                                    <span class="badge-completed"><i class="fas fa-check-circle"></i> Done</span>
                                <?php endif; ?>
                            </div>
                            <small style="color: #95a5a6;">@<?php echo htmlspecialchars($row['username']); ?></small>
                        </td>
                        <td>
                            <div class="prog-container">
                                <div class="prog-bar <?php echo $color; ?>" style="width: <?php echo $perc; ?>%;"></div>
                            </div>
                            <span class="prog-label">
                                <?php echo $perc; ?>% (<?php echo number_format($done, 1); ?> / <?php echo $req; ?>h)
                            </span>
                        </td>
                        <td>
                            <div class="timeline-info">
                                <div><i class="fas fa-play-circle"></i> Start: <b><?php echo $start_date; ?></b></div>
                                <div><i class="fas fa-flag-checkered"></i> Est: <?php echo $est_completion; ?></div>
                            </div>
                        </td>
                        <td style="text-align: right;">
                            <a href="view_user_logs.php?id=<?php echo $row['id']; ?>&school=<?php echo urlencode($school_name); ?>" class="btn-view">
                                View Logs <i class="fas fa-chevron-right" style="font-size: 10px; margin-left: 5px;"></i>
                            </a>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 50px; color: #95a5a6;">
                            <i class="fas fa-folder-open" style="font-size: 40px; color: #dfe6e9; margin-bottom: 15px; display: block;"></i>
                            No students found for <b><?php echo htmlspecialchars($school_name); ?></b> based on your filters.
                        </td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>

        <?php if ($total_pages > 1): ?>
        <div class="pagination">
            <?php $params = "&school=" . urlencode($school_name) . "&search=" . urlencode($search_name) . "&sort=" . urlencode($sort_by); ?>
            
            <?php if($page > 1): ?>
                <a href="?page=<?php echo ($page - 1) . $params; ?>">&laquo; Prev</a>
            <?php endif; ?>

            <?php for($i = 1; $i <= $total_pages; $i++): ?>
                <a href="?page=<?php echo $i . $params; ?>" class="<?php echo ($i == $page) ? 'active' : ''; ?>"><?php echo $i; ?></a>
            <?php endfor; ?>

            <?php if($page < $total_pages): ?>
                <a href="?page=<?php echo ($page + 1) . $params; ?>">Next &raquo;</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>