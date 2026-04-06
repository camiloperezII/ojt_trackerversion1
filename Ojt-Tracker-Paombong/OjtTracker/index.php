<?php
session_start();
include 'includes/database.php';

// GATEKEEPER: If no session, send to login
if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php");
    exit(); 
}

$uid = $_SESSION['user_id'];

// 1. Fetch User Data
$stmt_user = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt_user->bind_param("i", $uid);
$stmt_user->execute();
$user_data = $stmt_user->get_result()->fetch_assoc();

// 2. OVERALL PROGRESS LOGIC
$stmt_total = $conn->prepare("SELECT SUM(hours_rendered) as total, COUNT(DISTINCT log_date) as days_worked, MIN(log_date) as first_active FROM logs WHERE user_id = ?");
$stmt_total->bind_param("i", $uid);
$stmt_total->execute();
$res_total = $stmt_total->get_result()->fetch_assoc();

$rendered = $res_total['total'] ?? 0;
$days_worked = $res_total['days_worked'] ?? 0;
$first_active = $res_total['first_active'] ?? null;
$start_date_display = $first_active ? date('M d, Y', strtotime($first_active)) : 'Not Started';

$required = ($user_data['total_required'] > 0) ? $user_data['total_required'] : 1; 
$remaining = max(0, $required - $rendered);

// --- START EDC CALCULATION ---
if ($remaining <= 0) {
    $est_finish_date = "Completed";
} else {
    $pace = ($days_worked > 0 && $rendered > 0) ? ($rendered / $days_worked) : 8;
    $days_needed = ceil($remaining / $pace);

    $target_date = new DateTime();
    $added = 0;
    while ($added < $days_needed) {
        $target_date->modify('+1 day');
        if ($target_date->format('N') < 6) { 
            $added++;
        }
    }
    $est_finish_date = $target_date->format('M d, Y');
}

$total_progress = ($required > 0) ? ($rendered / $required) * 100 : 0;
$total_progress = min($total_progress, 100);

$total_class = 'bg-low';
if ($total_progress > 30) $total_class = 'bg-mid';
if ($total_progress > 75) $total_class = 'bg-high';

// 3. WEEKLY PROGRESS LOGIC
$weekly_goal = 40; 
$start_of_week = date('Y-m-d', strtotime('monday this week'));
$end_of_week = date('Y-m-d', strtotime('sunday this week'));

$stmt_week = $conn->prepare("SELECT SUM(hours_rendered) as weekly_total FROM logs WHERE user_id = ? AND log_date BETWEEN ? AND ?");
$stmt_week->bind_param("iss", $uid, $start_of_week, $end_of_week);
$stmt_week->execute();
$weekly_rendered = $stmt_week->get_result()->fetch_assoc()['weekly_total'] ?? 0;

$weekly_progress = ($weekly_goal > 0) ? ($weekly_rendered / $weekly_goal) * 100 : 0;
$weekly_progress = min($weekly_progress, 100);

$weekly_class = 'bg-low';
if ($weekly_progress > 40) $weekly_class = 'bg-mid';
if ($weekly_progress > 85) $weekly_class = 'bg-high';

// 4. Recent Logs
$stmt_recent = $conn->prepare("SELECT * FROM logs WHERE user_id = ? ORDER BY log_date DESC, time_in DESC LIMIT 5");
$stmt_recent->bind_param("i", $uid);
$stmt_recent->execute();
$recent_logs = $stmt_recent->get_result();

$greeting = (date('H') < 12) ? "Good Morning" : ((date('H') < 17) ? "Good Afternoon" : "Good Evening");
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title>OJT Tracker - Dashboard</title>
    <style>
        :root { 
            --primary: #3498db; --success: #27ae60; --warning: #f1c40f; 
            --danger: #e74c3c; --dark: #2c3e50; --soft-bg: #f4f7f6; 
            --purple: #9b59b6;
        }

        body { background: var(--soft-bg); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; color: #333; }
        .container { max-width: 1100px; margin: 30px auto; padding: 0 20px; }
        .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
        
        /* Stats Cards */
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px; }
        .card { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.03); border-top: 5px solid var(--primary); text-align: center; }
        .card h3 { margin: 0; font-size: 0.8rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; }
        .card p { margin: 10px 0 0; font-size: 1.4rem; font-weight: 800; color: var(--dark); }
        .card small { color: #a4b0be; font-size: 0.75rem; font-weight: 600; }

        /* Progress Bar Styling */
        .progress-section { background: white; padding: 20px; border-radius: 15px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .progress-label { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 700; font-size: 0.9rem; color: var(--dark); }
        .progress-container { background: #e9ecef; border-radius: 50px; height: 30px; overflow: hidden; position: relative; }
        .progress-fill { 
            height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 800; 
            transition: width 1.5s cubic-bezier(0.22, 1, 0.36, 1); 
            background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent); 
            background-size: 30px 30px; animation: progress-bar-stripes 1s linear infinite;
        }
        .bg-low { background-color: var(--danger); }
        .bg-mid { background-color: var(--warning); }
        .bg-high { background-color: var(--success); }
        @keyframes progress-bar-stripes { from { background-position: 30px 0; } to { background-position: 0 0; } }

        /* Toast Notification Styles */
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; }
        .alert-toast { 
            background: white; border-left: 5px solid var(--success); box-shadow: 0 5px 15px rgba(0,0,0,0.1); 
            border-radius: 8px; padding: 15px 20px; min-width: 300px; position: relative; overflow: hidden; 
            animation: slideInRight 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
        }
        .alert-content { display: flex; align-items: center; gap: 15px; }
        .alert-icon { color: var(--success); font-size: 1.5rem; }
        .alert-text { flex: 1; display: flex; flex-direction: column; }
        .alert-text strong { color: var(--dark); font-size: 1rem; margin-bottom: 2px; }
        .alert-text span { color: #7f8c8d; font-size: 0.85rem; }
        .alert-close { background: none; border: none; color: #bdc3c7; cursor: pointer; font-size: 1.2rem; transition: 0.3s; padding: 0; }
        .alert-close:hover { color: var(--danger); }
        .alert-progress { position: absolute; bottom: 0; left: 0; height: 3px; background: var(--success); width: 100%; animation: progressShrink 5s linear forwards; }

        @keyframes slideInRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes progressShrink { from { width: 100%; } to { width: 0%; } }

        /* Grid Layout */
        .main-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 30px; }
        .section-box { background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
        .box-header { display: flex; align-items: center; gap: 12px; margin-bottom: 25px; border-bottom: 2px solid #f8f9fa; padding-bottom: 15px; }
        .box-header i { color: var(--primary); font-size: 1.4rem; }
        .box-header h3 { margin: 0; font-size: 1.2rem; color: var(--dark); }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; font-weight: 700; font-size: 0.85rem; margin-bottom: 8px; color: #57606f; }
        .form-control { width: 100%; padding: 12px 15px; border: 2px solid #edeff2; border-radius: 10px; box-sizing: border-box; background: #fafbfc; }
        .btn-submit { width: 100%; padding: 16px; background: var(--primary); color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .activity-item { display: flex; align-items: center; padding: 18px 0; border-bottom: 1px solid #f1f2f6; }
        .activity-date { text-align: center; min-width: 60px; padding-right: 15px; border-right: 2px solid #f1f2f6; }
        .activity-date .day { display: block; font-weight: 800; color: var(--dark); font-size: 1.1rem; }
        .activity-date .month { display: block; font-size: 0.7rem; color: #a4b0be; text-transform: uppercase; }
        .activity-info { flex: 1; padding: 0 20px; }
        .activity-info p { margin: 0; font-size: 0.85rem; color: #747d8c; }
        .badge-hours { background: #f1f2f6; color: var(--dark); padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; }

        @media (max-width: 768px) { .main-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="toast-container">
        <?php if (isset($_SESSION['login_success'])): ?>
            <div id="success-alert" class="alert-toast">
                <div class="alert-content">
                    <div class="alert-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="alert-text">
                        <strong>Login Successful!</strong>
                        <span>Welcome back, <?= htmlspecialchars($user_data['full_name']); ?>.</span>
                    </div>
                    <button class="alert-close" onclick="closeAlert('success-alert')"><i class="fas fa-times"></i></button>
                </div>
                <div class="alert-progress"></div>
            </div>
            <?php unset($_SESSION['login_success']); ?>
        <?php endif; ?>
    </div>

    <?php include 'includes/navbar.php'; ?>

    <div class="container">
        <div class="header-flex">
            <div>
                <h1 style="margin:0; font-weight: 900; color: var(--dark); font-size: 2rem;"><?= $greeting ?>, <?= htmlspecialchars($user_data['full_name']); ?>!</h1>
                <p style="color: #a4b0be; margin-top: 5px; font-weight: 600;">
                    <i class="far fa-calendar-alt"></i> Week of <?= date('M d', strtotime($start_of_week)) ?> — <?= date('M d', strtotime($end_of_week)) ?>
                </p>
            </div>
            <div style="text-align: right; color: #a4b0be; font-size: 0.9rem; font-weight: 600;">
                Today: <?= date('l, F d') ?>
            </div>
        </div>

        <div class="stats">
            <div class="card">
                <h3>Total Rendered</h3>
                <p><?= number_format($rendered, 1); ?> hrs</p>
            </div>
            <div class="card" style="border-top-color: var(--success);">
                <h3>This Week</h3>
                <p><?= number_format($weekly_rendered, 1); ?> hrs</p>
            </div>
            <div class="card" style="border-top-color: var(--danger);">
                <h3>Remaining</h3>
                <p><?= number_format($remaining, 1); ?> hrs</p>
            </div>
            <div class="card" style="border-top-color: var(--purple);">
                <h3>Est. Finish Date</h3>
                <p style="font-size: 1.2rem; color: var(--purple);"><?= $est_finish_date ?></p>
                <small><i class="fas fa-play" style="font-size: 10px;"></i> Started: <?= $start_date_display ?></small>
            </div>
        </div>

        <div class="progress-section">
            <div class="progress-label">
                <span><i class="fas fa-graduation-cap"></i> Overall Progress</span>
                <span><?= round($total_progress); ?>%</span>
            </div>
            <div class="progress-container">
                <div class="progress-fill <?= $total_class ?>" style="width: <?= $total_progress; ?>%;">
                    <?= number_format($rendered, 1); ?> / <?= $required; ?> hrs
                </div>
            </div>
        </div>

        <div class="progress-section">
            <div class="progress-label">
                <span><i class="fas fa-bolt"></i> Weekly Goal (<?= $weekly_goal ?>h)</span>
                <span><?= round($weekly_progress); ?>%</span>
            </div>
            <div class="progress-container">
                <div class="progress-fill <?= $weekly_class ?>" style="width: <?= $weekly_progress; ?>%;">
                    <?= number_format($weekly_rendered, 1); ?>h this week
                </div>
            </div>
        </div>

        <div class="main-grid">
            <div class="section-box">
                <div class="box-header">
                    <i class="fas fa-edit"></i>
                    <h3>Daily Work Log</h3>
                </div>
                <form action="actions/save_log.php" method="POST">
                    <div class="input-group">
                        <label><i class="far fa-calendar-check"></i> DATE</label>
                        <input type="date" name="date" value="<?= date('Y-m-d'); ?>" class="form-control" required>
                    </div>
                    
                    <div class="time-row" style="display:flex; gap:15px;">
                        <div class="input-group" style="flex:1;">
                            <label><i class="far fa-clock"></i> TIME IN</label>
                            <input type="time" name="time_in" class="form-control" required>
                        </div>
                        <div class="input-group" style="flex:1;">
                            <label><i class="fas fa-sign-out-alt"></i> TIME OUT</label>
                            <input type="time" name="time_out" class="form-control" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label><i class="fas fa-list-ul"></i> TASKS & ACCOMPLISHMENTS</label>
                        <textarea name="task_description" class="form-control" rows="4" placeholder="What did you achieve today?"></textarea>
                    </div>

                    <button type="submit" class="btn-submit">
                        <span>SAVE LOG ENTRY</span>
                        <i class="fas fa-check-circle"></i>
                    </button>
                </form>
            </div>

            <div class="section-box">
                <div class="box-header">
                    <i class="fas fa-history"></i>
                    <h3>Recent Activity</h3>
                </div>
                <div class="activity-list">
                    <?php if($recent_logs->num_rows > 0): ?>
                        <?php while($row = $recent_logs->fetch_assoc()): ?>
                        <div class="activity-item">
                            <div class="activity-date">
                                <span class="day"><?= date('d', strtotime($row['log_date'])) ?></span>
                                <span class="month"><?= date('M', strtotime($row['log_date'])) ?></span>
                            </div>
                            <div class="activity-info">
                                <p><?= !empty($row['task_description']) ? htmlspecialchars(substr($row['task_description'], 0, 60)) . '...' : 'Work log entry recorded.' ?></p>
                            </div>
                            <div class="badge-hours"><?= number_format($row['hours_rendered'], 1) ?>h</div>
                        </div>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <p style="text-align:center; color: #a4b0be; padding: 20px;">No logs found yet.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

<script>
    function closeAlert(id) {
        const alert = document.getElementById(id);
        if (alert) {
            alert.style.transition = "all 0.5s ease";
            alert.style.transform = "translateX(120%)";
            alert.style.opacity = "0";
            setTimeout(() => alert.remove(), 500);
        }
    }

    // Auto-close toast after 5 seconds
    window.onload = function() {
        const successAlert = document.getElementById('success-alert');
        if (successAlert) {
            setTimeout(() => closeAlert('success-alert'), 5000);
        }
    };
</script>
</body>
</html>