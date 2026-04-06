<?php
session_start();
include 'includes/database.php';

// 1. Security Check
if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit(); 
}

$uid = $_SESSION['user_id'];

// 2. Calendar Logic: Get Month and Year safely
$month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
$year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

// Fetch dates worked this month using PREPARED STATEMENTS
$work_dates = [];
$date_query = "SELECT DISTINCT log_date FROM logs WHERE user_id = ? AND MONTH(log_date) = ? AND YEAR(log_date) = ?";
$stmt_dates = $conn->prepare($date_query);
$stmt_dates->bind_param("iii", $uid, $month, $year);
$stmt_dates->execute();
$date_res = $stmt_dates->get_result();

while($d = $date_res->fetch_assoc()) {
    $work_dates[] = $d['log_date'];
}
$stmt_dates->close();

// Calendar Calculation
$first_day_of_month = mktime(0, 0, 0, $month, 1, $year);
$number_days = date('t', $first_day_of_month);
$day_of_week = date('w', $first_day_of_month); 
$month_name = date('F', $first_day_of_month);

// Logic for Prev/Next buttons
$prev_month = ($month == 1) ? 12 : $month - 1;
$prev_year  = ($month == 1) ? $year - 1 : $year;
$next_month = ($month == 12) ? 1 : $month + 1;
$next_year  = ($month == 12) ? $year + 1 : $year;

// Determine today's date for highlighting
$today_date = date('Y-m-d');

// 3. For the Table (Fetch all logs using PREPARED STATEMENTS)
$query = "SELECT * FROM logs WHERE user_id = ? ORDER BY log_date DESC";
$stmt_logs = $conn->prepare($query);
$stmt_logs->bind_param("i", $uid);
$stmt_logs->execute();
$result = $stmt_logs->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title>My OJT History</title>
    <style>
        :root { 
            --primary: #3498db; --success: #27ae60; --warning: #f1c40f; 
            --danger: #e74c3c; --dark: #2c3e50; --soft-bg: #f4f7f6; 
        }

        /* Standardized Dashboard Font Style */
        body { 
            background: var(--soft-bg); 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            color: #333; 
        }

        .container { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
        
        /* Matching Dashboard Title Weights */
        h1 { font-weight: 900; color: var(--dark); font-size: 2rem; margin: 0; }
        h2 { font-weight: 800; color: var(--dark); }
        h3 { font-weight: 700; color: var(--dark); font-size: 1.2rem; }

        /* Calendar Card Styling */
        .calendar-card { background: white; padding: 25px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); margin-bottom: 40px; }
        .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; text-align: center; }
        
        /* Day Names matched to Dashboard card labels */
        .day-name { 
            font-weight: 800; 
            color: #a4b0be; 
            padding-bottom: 10px; 
            font-size: 0.75rem; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
        }
        
        .day { 
            padding: 15px 5px; 
            border-radius: 12px; 
            font-size: 0.95rem; 
            border: 1px solid #f1f2f6; 
            transition: 0.3s; 
            background: #fff; 
            font-weight: 600;
        }
        
        /* Worked Day Highlight - Using Success Green or Primary Blue */
        .day.worked { background: rgba(52, 152, 219, 0.1); border-color: var(--primary); color: var(--primary); font-weight: 800; position: relative; }
        .day.worked::after { content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; background: var(--primary); border-radius: 50%; }
        
        .day.today { border: 2px solid var(--warning); color: var(--warning); font-weight: 800; }
        .empty { background: #fafbfc; border: none; }

        /* Button Styling matched to Dashboard 'nav-btn' / 'card' buttons */
        .nav-btn { 
            text-decoration: none; 
            padding: 10px 20px; 
            background: white; 
            border: none; 
            color: var(--dark); 
            border-radius: 10px; 
            font-size: 0.85rem; 
            transition: 0.3s; 
            font-weight: 700; 
            cursor: pointer; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.03);
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .nav-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.08); color: var(--primary); }

        /* Table Styling - Cleaner & Modern */
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
        th { 
            background: #fafbfc; 
            padding: 18px; 
            text-align: left; 
            font-size: 0.8rem; 
            color: #a4b0be; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            font-weight: 800;
            border-bottom: 2px solid #f1f2f6;
        }
        td { padding: 18px; border-bottom: 1px solid #f1f2f6; font-size: 0.9rem; vertical-align: middle; }
        
        .badge-hours { background: #f1f2f6; color: var(--dark); padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; }
        
        /* Edit Action Button */
        .btn-edit { 
            color: var(--primary); 
            text-decoration: none; 
            font-weight: 800; 
            padding: 8px 15px; 
            border-radius: 8px; 
            background: rgba(52, 152, 219, 0.1); 
            transition: 0.2s; 
            font-size: 0.8rem;
        }
        .btn-edit:hover { background: var(--primary); color: white; }

        .btn-view-all { 
            background: var(--primary); 
            color: white; 
            border: none; 
            margin-top: 20px; 
            padding: 15px 30px; 
            font-weight: 800;
            letter-spacing: 0.5px;
        }
    </style>
</head>
<body>
    <?php include 'includes/navbar.php'; ?>

    <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <div>
                <h1>Attendance History</h1>
                <p style="color: #a4b0be; margin-top: 5px; font-weight: 600;">Track your consistency and previous log entries</p>
            </div>
            <a href="index.php" class="nav-btn"><i class="fas fa-chevron-left"></i> Dashboard</a>
        </div>

        <div class="calendar-card">
            <div class="calendar-header">
                <a class="nav-btn" href="?month=<?= $prev_month ?>&year=<?= $prev_year ?>"><i class="fas fa-arrow-left"></i> Prev</a>
                <h2 style="margin:0;"><?= $month_name . " " . $year ?></h2>
                <a class="nav-btn" href="?month=<?= $next_month ?>&year=<?= $next_year ?>">Next <i class="fas fa-arrow-right"></i></a>
            </div>

            <div class="calendar-grid">
                <div class="day-name">Sun</div><div class="day-name">Mon</div><div class="day-name">Tue</div>
                <div class="day-name">Wed</div><div class="day-name">Thu</div><div class="day-name">Fri</div><div class="day-name">Sat</div>

                <?php 
                for($i=0; $i<$day_of_week; $i++) echo '<div class="day empty"></div>';

                for($day=1; $day<=$number_days; $day++): 
                    $current_date = sprintf('%04d-%02d-%02d', $year, $month, $day);
                    $is_worked = in_array($current_date, $work_dates);
                    $is_today = ($current_date === $today_date);
                    
                    $classes = "day";
                    if ($is_worked) $classes .= " worked";
                    if ($is_today) $classes .= " today";
                ?>
                    <div class="<?= $classes ?>">
                        <?= $day ?>
                    </div>
                <?php endfor; ?>
            </div>
        </div>

        <h3 style="margin-bottom: 20px;">Detailed Log History</h3>
        
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Hours</th>
                    <th>Task Description</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody id="logTableBody">
                <?php 
                if($result->num_rows > 0): 
                    $log_counter = 0; 
                    while($row = $result->fetch_assoc()): 
                        $log_counter++;
                        $isHidden = ($log_counter > 5); // Changed to 5 for better layout
                        $row_class = $isHidden ? 'hidden-log-row' : '';
                        $row_style = $isHidden ? 'style="display: none;"' : '';
                ?>
                    <tr class="<?= $row_class ?>" <?= $row_style ?>>
                        <td style="font-weight: 800; color: var(--dark);"><?php echo date('M d, Y', strtotime($row['log_date'])); ?></td>
                        <td><?php echo date('h:i A', strtotime($row['time_in'])); ?></td>
                        <td>
                            <?php 
                                if (!empty($row['time_out'])) {
                                    echo date('h:i A', strtotime($row['time_out']));
                                } else {
                                    echo '<span style="color:var(--warning); font-weight:800;">ACTIVE</span>';
                                }
                            ?>
                        </td>
                        <td><span class="badge-hours"><?php echo number_format($row['hours_rendered'] ?? 0, 1); ?>h</span></td>
                        <td style="color: #747d8c; max-width: 300px;"><?php echo htmlspecialchars($row['task_description'] ?? ''); ?></td>
                        <td>
                            <a href="edit_log.php?id=<?php echo $row['id']; ?>" class="btn-edit">EDIT</a>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr><td colspan="6" style="text-align:center; padding: 40px; color: #a4b0be; font-weight: 600;">No logs found for this period.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>

        <?php if(isset($log_counter) && $log_counter > 5): ?>
            <div style="text-align: center; margin-top: 30px;">
                <button id="toggleLogsBtn" class="nav-btn btn-view-all" onclick="toggleLogs()">
                    VIEW ALL <?= $log_counter ?> LOGS
                </button>
            </div>
        <?php endif; ?>
    </div>

<script>
    function toggleLogs() {
        const hiddenRows = document.querySelectorAll('.hidden-log-row');
        const btn = document.getElementById('toggleLogsBtn');
        const isShowing = hiddenRows[0].style.display === 'table-row';

        if (isShowing) {
            hiddenRows.forEach(row => row.style.display = 'none');
            btn.innerHTML = 'VIEW ALL <?= $log_counter ?> LOGS';
            btn.style.background = 'var(--primary)';
        } else {
            hiddenRows.forEach(row => row.style.display = 'table-row');
            btn.innerHTML = 'CLOSE LOGS';
            btn.style.background = 'var(--danger)';
        }
    }
</script>
<div id="statusToast" style="visibility: hidden; min-width: 280px; background-color: #27ae60; color: #fff; text-align: center; border-radius: 12px; padding: 16px; position: fixed; z-index: 1000; right: 30px; top: 30px; font-weight: 600; box-shadow: 0 5px 15px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 12px;">
    <i class="fas fa-check-circle"></i> Attendance Log Updated!
</div>

<script>
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'updated') {
        const toast = document.getElementById("statusToast");
        toast.style.visibility = "visible";
        toast.style.animation = "fadein 0.5s, fadeout 0.5s 2.5s";
        
        setTimeout(() => { 
            toast.style.visibility = "hidden"; 
            // This cleans the URL so the toast doesn't show again on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 3000);
    }
</script>

<style>
    @keyframes fadein { from {top: 0; opacity: 0;} to {top: 30px; opacity: 1;} }
    @keyframes fadeout { from {top: 30px; opacity: 1;} to {top: 0; opacity: 0;} }
</style>
</body>
</html>