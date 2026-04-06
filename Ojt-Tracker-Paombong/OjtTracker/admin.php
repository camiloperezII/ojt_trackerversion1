<?php
session_start();
include 'includes/database.php';

// 1. Security Check
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit();
}

$search = $_GET['search'] ?? '';
$filter_date = $_GET['filter_date'] ?? '';

/**
 * DATABASE LOGIC
 */
if (!empty($filter_date)) {
    // Logic for specific date view - Added role check
    $sql = "SELECT logs.*, users.full_name, users.total_required 
            FROM logs 
            JOIN users ON logs.user_id = users.id 
            WHERE users.role != 'admin' AND logs.log_date = ? " . (!empty($search) ? "AND users.full_name LIKE ?" : "") . " 
            ORDER BY logs.time_in ASC";
            
    $stmt = $conn->prepare($sql);
    if (!empty($search)) {
        $search_param = "%$search%";
        $stmt->bind_param("ss", $filter_date, $search_param);
    } else {
        $stmt->bind_param("s", $filter_date);
    }
} else {
    // Logic for overall summary - Added role check AND first_active logic
    $sql = "SELECT users.id as user_id, users.full_name, users.total_required, 
            COALESCE(SUM(logs.hours_rendered), 0) as total_done,
            COUNT(DISTINCT logs.log_date) as days_worked,
            MIN(logs.log_date) as first_active
            FROM users 
            LEFT JOIN logs ON users.id = logs.user_id 
            WHERE users.role != 'admin'"; // Excludes Admin from the list
            
    if (!empty($search)) {
        $sql .= " AND users.full_name LIKE ? ";
    }
    
    $sql .= " GROUP BY users.id, users.full_name, users.total_required";
    $stmt = $conn->prepare($sql);
    
    if (!empty($search)) {
        $search_param = "%$search%";
        $stmt->bind_param("s", $search_param);
    }
}

$stmt->execute();
$result = $stmt->get_result();

// --- QUICK KPI STATS ---
$kpi_trainees = $conn->query("SELECT COUNT(*) as count FROM users WHERE role != 'admin'")->fetch_assoc()['count'];
$today = date('Y-m-d');
$kpi_active = $conn->query("SELECT COUNT(DISTINCT user_id) as count FROM logs WHERE log_date = '$today'")->fetch_assoc()['count'];
$kpi_hours_query = $conn->query("SELECT SUM(hours_rendered) as total FROM logs JOIN users ON logs.user_id = users.id WHERE users.role != 'admin'");
$kpi_hours = $kpi_hours_query->fetch_assoc()['total'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - OJT Tracker</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/material_blue.css">
    
    <style>
        :root { 
            --primary: #3498db; --success: #27ae60; --warning: #f1c40f; 
            --danger: #e74c3c; --dark: #2c3e50; --reset: #e74c3c; --bg-light: #fdfdfd;
        }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; }
        
        /* --- INTEGRATED TOAST CSS --- */
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; }
        .alert-toast { 
            background: #ffffff; border-left: 5px solid var(--dark); box-shadow: 0 10px 25px rgba(0,0,0,0.1); 
            border-radius: 12px; padding: 18px 25px; min-width: 320px; position: relative; overflow: hidden; 
            animation: slideInRight 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        .alert-content { display: flex; align-items: center; gap: 15px; }
        .alert-icon { color: var(--primary); font-size: 1.8rem; }
        .alert-text strong { display: block; color: var(--dark); font-size: 1.05rem; }
        .alert-text span { color: #7f8c8d; font-size: 0.9rem; }
        .alert-progress { position: absolute; bottom: 0; left: 0; height: 4px; background: linear-gradient(to right, var(--primary), var(--dark)); width: 100%; animation: progressShrink 5s linear forwards; }
        .alert-close { background: none; border: none; color: #ccc; cursor: pointer; margin-left: auto; }
        @keyframes slideInRight { from { transform: translateX(120%); } to { transform: translateX(0); } }
        @keyframes progressShrink { from { width: 100%; } to { width: 0%; } }
        /* --------------------------- */

        .header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; flex-wrap: wrap; gap: 20px; }
        .kpi-container { display: flex; gap: 20px; margin-bottom: 25px; flex-wrap: wrap; }
        .kpi-card { flex: 1; min-width: 200px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid var(--primary); display: flex; align-items: center; gap: 15px; }
        .kpi-card.success { border-left-color: var(--success); }
        .kpi-card.warning { border-left-color: var(--warning); }
        .kpi-icon { background: rgba(52, 152, 219, 0.1); color: var(--primary); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .kpi-icon.success { background: rgba(39, 174, 96, 0.1); color: var(--success); }
        .kpi-icon.warning { background: rgba(241, 196, 15, 0.1); color: #d4ac0d; }
        .kpi-details h4 { margin: 0; font-size: 13px; color: #7f8c8d; text-transform: uppercase; }
        .kpi-details h2 { margin: 5px 0 0; font-size: 26px; color: var(--dark); }
        .filter-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 11px; font-weight: 700; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px; }
        .modern-input { padding: 10px 15px; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 14px; background: var(--bg-light); transition: all 0.2s; width: 100%; box-sizing: border-box; }
        .modern-input:focus { border-color: var(--primary); outline: none; background: #fff; box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1); }
        .btn-reset { color: var(--reset); text-decoration: none; font-size: 13px; font-weight: 600; white-space: nowrap; }
        .btn-reset:hover { text-decoration: underline; }
        .action-buttons { display: flex; gap: 10px; }
        .btn { padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: opacity 0.2s; border: none; cursor: pointer; }
        .btn:hover { opacity: 0.9; }
        .btn-csv { background: var(--success); color: white; }
        .btn-school { background: #9b59b6; color: white; }
        .progress-wrapper { width: 120px; }
        .badge-progress { padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px; display: inline-block; margin-bottom: 4px; }
        .bg-low { background: #fdeded; color: var(--danger); }
        .bg-mid { background: #fef9e7; color: #9a7d0a; }
        .bg-high { background: #eafaf1; color: var(--success); }
        .progress-container { background: #eee; border-radius: 10px; height: 6px; width: 100%; overflow: hidden; }
        .progress-bar { height: 100%; transition: width 0.4s ease; }
        .bar-low { background: var(--danger); }
        .bar-mid { background: var(--warning); }
        .bar-high { background: var(--success); }
        .link-view { color: var(--primary); text-decoration: none; font-weight: bold; }
        .modern-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .modern-table th { background: #f8f9fa; padding: 15px; text-align: left; font-size: 13px; color: #7f8c8d; text-transform: uppercase; }
        .modern-table td { padding: 15px; border-top: 1px solid #f1f2f6; font-size: 14px; }
        .edc-badge { font-size: 0.85rem; font-weight: 600; color: #2c3e50; display: block; margin-top: 2px;}
        .edc-sub { display: block; font-size: 0.75rem; color: #95a5a6; font-weight: 400; }
        .timeline-cell { display: flex; flex-direction: column; gap: 6px; }
    </style>
</head>
<body>
    <div class="toast-container">
        <?php if (isset($_SESSION['login_success'])): ?>
            <div id="admin-toast" class="alert-toast">
                <div class="alert-content">
                    <div class="alert-icon"><i class="fas fa-user-shield"></i></div>
                    <div class="alert-text">
                        <strong>Administrative Access</strong>
                        <span>Welcome back, <?= htmlspecialchars($_SESSION['full_name']); ?>.</span>
                    </div>
                    <button class="alert-close" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>
                <div class="alert-progress"></div>
            </div>
            <?php unset($_SESSION['login_success']); ?>
        <?php endif; ?>
    </div>

    <?php include 'includes/navbar.php'; ?>

    <div class="container" style="max-width: 1200px; margin: 40px auto; padding: 0 20px;">
        <div class="header-section">
            <div>
                <h1 style="margin:0; color: var(--dark);">Admin Dashboard</h1>
                <p style="color: #7f8c8d; margin: 5px 0 0;">Monitoring trainees & activity logs</p>
            </div>
            <div class="action-buttons">
                <a href="export_csv.php" class="btn btn-csv">📥 Download CSV</a>
                <a href="manage_schools.php" class="btn btn-school">🏫 Schools</a>
            </div>
        </div>
        
        <div class="kpi-container">
            <div class="kpi-card">
                <div class="kpi-icon"><i class="fas fa-users"></i></div>
                <div class="kpi-details">
                    <h4>Total Trainees</h4>
                    <h2><?php echo $kpi_trainees; ?></h2>
                </div>
            </div>
            <div class="kpi-card success">
                <div class="kpi-icon success"><i class="fas fa-user-check"></i></div>
                <div class="kpi-details">
                    <h4>Active Today</h4>
                    <h2><?php echo $kpi_active; ?></h2>
                </div>
            </div>
            <div class="kpi-card warning">
                <div class="kpi-icon warning"><i class="fas fa-clock"></i></div>
                <div class="kpi-details">
                    <h4>Total Hours Logged</h4>
                    <h2><?php echo number_format($kpi_hours ?? 0, 1); ?></h2>
                </div>
            </div>
        </div>
        
        <div class="filter-card">
            <form id="filterForm" method="GET" style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 15px; width: 100%;">
                <div class="form-group" style="flex: 2; min-width: 200px;">
                    <label>Search Trainee</label>
                    <input type="text" name="search" class="modern-input" placeholder="Type name and press Enter..." value="<?php echo htmlspecialchars($search); ?>">
                </div>
                <div class="form-group" style="flex: 1; min-width: 150px;">
                    <label>Date Filter</label>
                    <input type="text" name="filter_date" id="calendar" class="modern-input" placeholder="All Time" value="<?php echo htmlspecialchars($filter_date); ?>">
                </div>
                <button type="submit" style="display: none;"></button>
                <?php if(!empty($search) || !empty($filter_date)): ?>
                    <a href="admin.php" class="btn-reset" style="margin-bottom: 12px;">Reset Filters</a>
                <?php endif; ?>
            </form>
        </div>

        <h3 style="margin-bottom: 20px; color: var(--dark);">
            <?php echo empty($filter_date) ? "Overall Progress Summary" : "Daily Logs: " . date('F d, Y', strtotime($filter_date)); ?>
        </h3>
        
        <table class="modern-table">
            <thead>
                <tr>
                    <th>Full Name</th>
                    <?php if (!empty($filter_date)): ?>
                        <th>Time In</th><th>Time Out</th><th>Hours</th><th>Tasks</th>
                    <?php else: ?>
                        <th>Required</th><th>Rendered</th><th>Progress</th>
                        <th>Timeline</th>
                        <th>Actions</th>
                    <?php endif; ?>
                </tr>
            </thead>
            <tbody>
                <?php while($row = $result->fetch_assoc()): ?>
                <tr>
                    <td style="font-weight: 600;"><?php echo htmlspecialchars($row['full_name']); ?></td>
                    
                    <?php if (!empty($filter_date)): ?>
                        <td><?php echo date('h:i A', strtotime($row['time_in'])); ?></td>
                        <td><?php echo $row['time_out'] ? date('h:i A', strtotime($row['time_out'])) : '<span style="color:#e67e22; font-weight:bold;">Active</span>'; ?></td>
                        <td style="color: var(--success); font-weight: bold;"><?php echo number_format($row['hours_rendered'] ?? 0, 2); ?></td>
                        <td><?php echo htmlspecialchars($row['task_description'] ?? 'No task recorded'); ?></td>
                        
                    <?php else: ?>
                        <td><?php echo (int)$row['total_required']; ?>h</td>
                        <td><?php echo number_format($row['total_done'], 2); ?>h</td>
                        <td>
                            <?php 
                                $percent = ($row['total_required'] > 0) ? ($row['total_done'] / $row['total_required']) * 100 : 0;
                                $display_percent = min(round($percent, 1), 100);
                                if ($display_percent < 40) { $color_class = "bar-low"; $bg_class = "bg-low"; } 
                                elseif ($display_percent < 80) { $color_class = "bar-mid"; $bg_class = "bg-mid"; } 
                                else { $color_class = "bar-high"; $bg_class = "bg-high"; }
                            ?>
                            <div class="progress-wrapper">
                                <span class="badge-progress <?php echo $bg_class; ?>"><?php echo $display_percent; ?>%</span>
                                <div class="progress-container">
                                    <div class="progress-bar <?php echo $color_class; ?>" style="width: <?php echo $display_percent; ?>%;"></div>
                                </div>
                            </div>
                        </td>

                        <td>
                            <div class="timeline-cell">
                                <?php 
                                    // Start Date
                                    $start_date = $row['first_active'] ? date('M d, Y', strtotime($row['first_active'])) : 'Not started';
                                    echo '<div style="font-size:12px; color:#7f8c8d;"><i class="fas fa-play" style="width:14px; color:var(--primary);"></i> ' . $start_date . '</div>';

                                    // EDC Calculation
                                    $remaining = $row['total_required'] - $row['total_done'];
                                    
                                    if ($remaining <= 0) {
                                        echo '<div><i class="fas fa-flag-checkered" style="width:14px; color:var(--success);"></i> <span style="color:var(--success); font-weight:bold; font-size:13px;">COMPLETED</span></div>';
                                    } else {
                                        $days_worked = (int)$row['days_worked'];
                                        $avg_pace = ($days_worked > 0 && $row['total_done'] > 0) ? ($row['total_done'] / $days_worked) : 8;
                                        $days_needed = ceil($remaining / $avg_pace);
                                        
                                        $target_date = new DateTime();
                                        $days_added = 0;
                                        while ($days_added < $days_needed) {
                                            $target_date->modify('+1 day');
                                            if ($target_date->format('N') < 6) {
                                                $days_added++;
                                            }
                                        }
                                        
                                        echo '<div><i class="fas fa-flag-checkered" style="width:14px; color:#95a5a6;"></i> <span class="edc-badge" style="display:inline;">' . $target_date->format('M d, Y') . '</span></div>';
                                        echo '<span class="edc-sub" style="margin-left: 18px;">~' . $days_needed . ' days left</span>';
                                    }
                                ?>
                            </div>
                        </td>

                        <td>
                            <a href="view_user_logs.php?id=<?php echo $row['user_id']; ?>" class="link-view">View Logs</a>
                        </td>
                    <?php endif; ?>
                </tr>
                <?php endwhile; ?>
                
                <?php if($result->num_rows == 0): ?>
                    <tr><td colspan="10" style="text-align:center; padding: 40px; color: #999;">No records found.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script>
        // Existing Flatpickr logic
        flatpickr("#calendar", {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "F j, Y",
            allowInput: true,
            onChange: function(selectedDates, dateStr) {
                if(dateStr || dateStr === "") {
                    document.getElementById('filterForm').submit();
                }
            }
        });

        // INTEGRATED TOAST LOGIC
        window.addEventListener('load', function() {
            const adminToast = document.getElementById('admin-toast');
            if (adminToast) {
                setTimeout(() => {
                    adminToast.style.transition = "all 0.6s ease";
                    adminToast.style.transform = "translateX(120%)";
                    adminToast.style.opacity = "0";
                    setTimeout(() => adminToast.remove(), 600);
                }, 5000);
            }
        });
    </script>
</body>
</html>