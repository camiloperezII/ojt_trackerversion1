<?php
session_start();
include 'includes/database.php';

// Security Check
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit();
}

// Get User ID from URL
$user_id = $_GET['id'] ?? null;

if (!$user_id) {
    header("Location: admin.php");
    exit();
}

// 1. Fetch User Info & Total Hours Rendered
$user_sql = "SELECT u.full_name, u.total_required, 
             COALESCE(SUM(l.hours_rendered), 0) as total_done,
             COUNT(DISTINCT l.log_date) as days_worked
             FROM users u 
             LEFT JOIN logs l ON u.id = l.user_id 
             WHERE u.id = ?";
$user_stmt = $conn->prepare($user_sql);
$user_stmt->bind_param("i", $user_id);
$user_stmt->execute();
$user_data = $user_stmt->get_result()->fetch_assoc();

$total_req = $user_data['total_required'] ?: 1;
$total_done = $user_data['total_done'];
$percent = min(round(($total_done / $total_req) * 100, 1), 100);
$remaining_hours = max($total_req - $total_done, 0);

// --- IMPROVED CSV EXPORT LOGIC ---
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    if (ob_get_length()) ob_end_clean();

    $filename = "Trainee_Report_" . str_replace(' ', '_', $user_data['full_name']) . "_" . date('Y-m-d') . ".csv";
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    $output = fopen('php://output', 'w');
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    fputcsv($output, ['TRAINEE ATTENDANCE REPORT']);
    fputcsv($output, ['Name:', $user_data['full_name']]);
    fputcsv($output, ['Total Requirement:', $total_req . ' Hours']);
    fputcsv($output, ['Total Rendered:', number_format($total_done, 2) . ' Hours']);
    fputcsv($output, ['Completion:', $percent . '%']);
    fputcsv($output, ['Report Generated:', date('F d, Y h:i A')]);
    fputcsv($output, []); 
    
    fputcsv($output, ['Date', 'Time In', 'Time Out', 'Hours Rendered', 'Task Description / Remarks']);
    
    $csv_sql = "SELECT log_date, time_in, time_out, hours_rendered, task_description FROM logs WHERE user_id = ? ORDER BY log_date DESC";
    $csv_stmt = $conn->prepare($csv_sql);
    $csv_stmt->bind_param("i", $user_id);
    $csv_stmt->execute();
    $csv_result = $csv_stmt->get_result();
    
    while ($row = $csv_result->fetch_assoc()) {
        $clean_task = str_replace(["\r", "\n"], " ", $row['task_description']);
        fputcsv($output, [
            date('Y-m-d', strtotime($row['log_date'])),
            date('h:i A', strtotime($row['time_in'])),
            $row['time_out'] ? date('h:i A', strtotime($row['time_out'])) : 'STILL IN',
            number_format($row['hours_rendered'], 2),
            $clean_task ?: 'N/A'
        ]);
    }
    fclose($output);
    exit(); 
}

// 2. Estimate Completion Date
$est_completion = "N/A";
if ($user_data['days_worked'] > 0 && $remaining_hours > 0 && $total_done > 0) {
    $avg_per_day = $total_done / $user_data['days_worked'];
    $days_to_go = ceil($remaining_hours / $avg_per_day);
    $est_completion = date('M d, Y', strtotime("+$days_to_go weekdays"));
}

// 3. Fetch Individual Logs
$log_sql = "SELECT * FROM logs WHERE user_id = ? ORDER BY log_date DESC, time_in DESC";
$log_stmt = $conn->prepare($log_sql);
$log_stmt->bind_param("i", $user_id);
$log_stmt->execute();
$logs_result = $log_stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trainee Logs - <?php echo htmlspecialchars($user_data['full_name']); ?></title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { 
            --primary: #3498db; --dark: #2c3e50; --success: #218c74; --warning: #f1c40f; 
        }
        body { font-family: 'Segoe UI', sans-serif; background-color: #f4f7f6; margin: 0; }
        .container { max-width: 1000px; margin: 40px auto; padding: 0 20px; }
        
        .back-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .back-nav a { text-decoration: none; color: var(--primary); font-weight: 700; font-size: 14px; }

        /* HIGH-CONTRAST CSV BUTTON */
.btn-csv {
    background-color: #1e8449; /* Deeper Green */
    color: #ffffff !important; /* Default: Forced White */
    padding: 12px 20px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 800; /* Extra Bold */
    display: inline-flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s ease; /* Smooth transition for color and transform */
    border: 1px solid #145a32;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}

.btn-csv:hover {
    background-color: #145a32; /* Darker Green on Hover */
    color: #f1c40f !important; /* FONT COLOR CHANGES TO GOLD ON HOVER */
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    text-shadow: none; /* Optional: clear shadow when color changes */
}

.btn-csv i {
    color: inherit; /* Icon will now follow the text color change automatically */
    font-size: 14px;
    transition: color 0.3s ease;
}

        .stats-grid {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }

        .progress-container { background: #eee; border-radius: 10px; height: 12px; width: 100%; overflow: hidden; margin: 15px 0 5px; }
        .progress-bar { height: 100%; background: #27ae60; transition: width 0.4s ease; }
        
        .stat-label { font-size: 11px; font-weight: 700; color: #95a5a6; text-transform: uppercase; }
        .stat-value { font-size: 20px; font-weight: bold; color: var(--dark); display: block; }

        .modern-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .modern-table th { background: #f8f9fa; padding: 15px; text-align: left; font-size: 13px; color: #7f8c8d; text-transform: uppercase; }
        .modern-table td { padding: 15px; border-top: 1px solid #f1f2f6; font-size: 14px; color: var(--dark); }
        
        .status-active { color: #e67e22; font-weight: bold; }
        .hours-tag { background: #eafaf1; color: #27ae60; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
    </style>
</head>
<body>
    <?php include 'includes/navbar.php'; ?>

    <div class="container">
        <div class="back-nav">
            <a href="admin.php">← Back to Dashboard</a>
            <a href="?id=<?php echo $user_id; ?>&export=csv" class="btn-csv">
                <i class="fas fa-file-export"></i> <span>EXPORT DATA</span>
            </a>
        </div>

        <div class="stats-grid">
            <div class="card">
                <span class="stat-label">Overall Completion</span>
                <h2 style="margin: 5px 0;"><?php echo htmlspecialchars($user_data['full_name']); ?></h2>
                <div class="progress-container">
                    <div class="progress-bar" style="width: <?php echo $percent; ?>%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
                    <span><?php echo $percent; ?>% Complete</span>
                    <span style="color: #7f8c8d;"><?php echo number_format($total_done, 1); ?> / <?php echo $total_req; ?> Hours</span>
                </div>
            </div>

            <div class="card" style="text-align: center;">
                <span class="stat-label">Hours Remaining</span>
                <span class="stat-value" style="font-size: 32px; color: #e74c3c; margin-top: 10px;">
                    <?php echo number_format($remaining_hours, 1); ?>
                </span>
                <small style="color: #95a5a6;">Hours left to finish</small>
            </div>

            <div class="card" style="text-align: center;">
                <span class="stat-label">Est. Completion</span>
                <span class="stat-value" style="font-size: 22px; color: var(--primary); margin-top: 10px;">
                    <?php echo $est_completion; ?>
                </span>
                <small style="color: #95a5a6;">Based on daily avg</small>
            </div>
        </div>

        <table class="modern-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Hours Rendered</th>
                    <th>Tasks / Remarks</th>
                </tr>
            </thead>
            <tbody>
                <?php if ($logs_result->num_rows > 0): ?>
                    <?php while($log = $logs_result->fetch_assoc()): ?>
                    <tr>
                        <td style="font-weight: 600;"><?php echo date('M d, Y', strtotime($log['log_date'])); ?></td>
                        <td><?php echo date('h:i A', strtotime($log['time_in'])); ?></td>
                        <td>
                            <?php echo $log['time_out'] ? date('h:i A', strtotime($log['time_out'])) : '<span class="status-active">Currently In</span>'; ?>
                        </td>
                        <td>
                            <span class="hours-tag"><?php echo number_format($log['hours_rendered'], 2); ?>h</span>
                        </td>
                        <td style="color: #636e72; font-style: italic;">
                            <?php echo htmlspecialchars($log['task_description'] ?: 'No task recorded'); ?>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: #95a5a6;">No logs found for this trainee.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</body>
</html>