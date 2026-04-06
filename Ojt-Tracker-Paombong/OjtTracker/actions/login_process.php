<?php
session_start();
include '../includes/database.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // 1. Sanitize and Get Input
    $username = mysqli_real_escape_string($conn, trim($_POST['username']));
    $password = $_POST['password'];

    // 2. Query the user
    $query = "SELECT * FROM users WHERE username = '$username'";
    $result = mysqli_query($conn, $query);

    if (mysqli_num_rows($result) === 1) {
        $user = mysqli_fetch_assoc($result);

        // 3. Verify Password
        if (password_verify($password, $user['password'])) {
            
            // 4. Set Session Variables
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['username']  = $user['username'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role']      = $user['role'];
            
            // --- CRITICAL: THE TOAST TRIGGER ---
            $_SESSION['login_success'] = true; 

            // 5. Security Check
            if (empty($user['security_question']) || empty($user['security_answer'])) {
                header("Location: ../setup_security.php");
                exit();
            }

            // 6. Redirect based on role
            if ($user['role'] === 'admin') {
                if ($user['total_required'] == 0 || empty($user['total_required'])) {
                    $_SESSION['admin_type'] = 'pure';
                } else {
                    $_SESSION['admin_type'] = 'hybrid';
                }
                header("Location: ../admin.php");
            } else {
                // If this file is index.php, we don't need to redirect, 
                // but if it's login_process.php, we redirect to the dashboard.
                header("Location: ../index.php");
            }
            exit();
        }
    }

    // FAILURE LOGIC
    header("Location: ../login.php?error=invalid&username=" . urlencode($username));
    exit();

} else if (!isset($_SESSION['user_id'])) {
    header("Location: ../login.php");
    exit();
}

// --- DASHBOARD DATA FETCHING ---
$uid = $_SESSION['user_id'];

$stmt_user = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt_user->bind_param("i", $uid);
$stmt_user->execute();
$user_data = $stmt_user->get_result()->fetch_assoc();

$stmt_total = $conn->prepare("SELECT SUM(hours_rendered) as total FROM logs WHERE user_id = ?");
$stmt_total->bind_param("i", $uid);
$stmt_total->execute();
$rendered = $stmt_total->get_result()->fetch_assoc()['total'] ?? 0;
$required = $user_data['total_required'] ?? 0;

$total_progress = ($required > 0) ? ($rendered / $required) * 100 : 0;
$total_progress = min($total_progress, 100);

$total_class = ($total_progress > 75) ? 'bg-high' : (($total_progress > 30) ? 'bg-mid' : 'bg-low');

// Weekly Logic
$weekly_goal = 40; 
$start_of_week = date('Y-m-d', strtotime('monday this week'));
$end_of_week = date('Y-m-d', strtotime('sunday this week'));
$stmt_week = $conn->prepare("SELECT SUM(hours_rendered) as weekly_total FROM logs WHERE user_id = ? AND log_date BETWEEN ? AND ?");
$stmt_week->bind_param("iss", $uid, $start_of_week, $end_of_week);
$stmt_week->execute();
$weekly_rendered = $stmt_week->get_result()->fetch_assoc()['weekly_total'] ?? 0;
$weekly_progress = min(($weekly_rendered / $weekly_goal) * 100, 100);
$weekly_class = ($weekly_progress > 85) ? 'bg-high' : (($weekly_progress > 40) ? 'bg-mid' : 'bg-low');

$stmt_recent = $conn->prepare("SELECT * FROM logs WHERE user_id = ? ORDER BY log_date DESC, time_in DESC LIMIT 5");
$stmt_recent->bind_param("i", $uid);
$stmt_recent->execute();
$recent_logs = $stmt_recent->get_result();

$remaining = max(0, $required - $rendered);
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
        }

        body { background: var(--soft-bg); font-family: 'Segoe UI', sans-serif; margin: 0; color: #333; }
        .container { max-width: 1100px; margin: 30px auto; padding: 0 20px; }
        
        /* --- NEW TOAST STYLING --- */
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; }
        .alert-toast { 
            background: white; border-left: 5px solid var(--success); box-shadow: 0 5px 15px rgba(0,0,0,0.1); 
            border-radius: 8px; padding: 15px 20px; min-width: 300px; position: relative; overflow: hidden; 
            display: flex; align-items: center; gap: 15px; animation: slideIn 0.5s ease forwards;
        }
        .alert-icon { color: var(--success); font-size: 1.5rem; }
        .alert-text strong { display: block; color: var(--dark); }
        .alert-text span { font-size: 0.85rem; color: #7f8c8d; }
        .alert-progress { position: absolute; bottom: 0; left: 0; height: 3px; background: var(--success); width: 100%; animation: shrink 5s linear forwards; }
        
        @keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }
        @keyframes shrink { from { width: 100%; } to { width: 0%; } }

        /* Stats & Progress */
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px; }
        .card { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.03); border-top: 5px solid var(--primary); text-align: center; }
        .card p { margin: 10px 0 0; font-size: 1.5rem; font-weight: 800; color: var(--dark); }
        .progress-section { background: white; padding: 20px; border-radius: 15px; margin-bottom: 20px; }
        .progress-container { background: #e9ecef; border-radius: 50px; height: 30px; overflow: hidden; }
        .progress-fill { height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; transition: width 1.5s ease; }
        .bg-low { background-color: var(--danger); }
        .bg-mid { background-color: var(--warning); }
        .bg-high { background-color: var(--success); }

        .main-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 30px; }
        .section-box { background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
        .form-control { width: 100%; padding: 12px; border: 2px solid #edeff2; border-radius: 10px; margin-bottom: 15px; box-sizing: border-box; }
        .btn-submit { width: 100%; padding: 16px; background: var(--primary); color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; }
    </style>
</head>
<body>

    <div class="toast-container">
        <?php if (isset($_SESSION['login_success'])): ?>
            <div id="login-toast" class="alert-toast">
                <div class="alert-icon"><i class="fas fa-check-circle"></i></div>
                <div class="alert-text">
                    <strong>Login Successful!</strong>
                    <span>Welcome back, <?= htmlspecialchars($_SESSION['full_name']); ?></span>
                </div>
                <div class="alert-progress"></div>
            </div>
            <?php unset($_SESSION['login_success']); ?>
        <?php endif; ?>
    </div>

    <?php include 'includes/navbar.php'; ?>

    <div class="container">
        <div style="margin-bottom: 30px;">
            <h1 style="margin:0; font-weight: 900; color: var(--dark);"><?= $greeting ?>, <?= htmlspecialchars($user_data['full_name']); ?>!</h1>
            <p style="color: #a4b0be; font-weight: 600;">Trainee Dashboard</p>
        </div>

        <div class="stats">
            <div class="card"><h3>Total Rendered</h3><p><?= number_format($rendered, 1); ?> hrs</p></div>
            <div class="card" style="border-top-color: var(--success);"><h3>This Week</h3><p><?= $weekly_rendered; ?> hrs</p></div>
            <div class="card" style="border-top-color: var(--warning);"><h3>Remaining</h3><p><?= number_format($remaining, 1); ?> hrs</p></div>
        </div>

        <div class="progress-section">
            <div class="progress-label" style="display:flex; justify-content: space-between; margin-bottom: 10px; font-weight: 700;">
                <span>Overall Progress</span><span><?= round($total_progress); ?>%</span>
            </div>
            <div class="progress-container">
                <div class="progress-fill <?= $total_class ?>" style="width: <?= $total_progress; ?>%;">
                    <?= number_format($rendered, 1); ?> / <?= $required; ?> hrs
                </div>
            </div>
        </div>

        <div class="main-grid">
            <div class="section-box">
                <h3><i class="fas fa-edit"></i> Log Work</h3>
                <form action="actions/save_log.php" method="POST">
                    <label>Date</label>
                    <input type="date" name="date" value="<?= date('Y-m-d'); ?>" class="form-control" required>
                    <div style="display: flex; gap: 10px;">
                        <input type="time" name="time_in" class="form-control" required>
                        <input type="time" name="time_out" class="form-control" required>
                    </div>
                    <textarea name="task_description" class="form-control" rows="4" placeholder="Tasks done..."></textarea>
                    <button type="submit" class="btn-submit">SAVE ENTRY</button>
                </form>
            </div>

            <div class="section-box">
                <h3><i class="fas fa-history"></i> Recent Activity</h3>
                <?php while($row = $recent_logs->fetch_assoc()): ?>
                <div style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                    <span><?= date('M d', strtotime($row['log_date'])) ?></span>
                    <strong><?= $row['hours_rendered'] ?>h</strong>
                </div>
                <?php endwhile; ?>
            </div>
        </div>
    </div>

    <script>
        // Auto-hide the toast after 5 seconds
        window.onload = function() {
            const toast = document.getElementById('login-toast');
            if (toast) {
                setTimeout(() => {
                    toast.style.transition = "opacity 0.5s ease";
                    toast.style.opacity = "0";
                    setTimeout(() => toast.remove(), 500);
                }, 5000);
            }
        };
    </script>
</body>
</html>