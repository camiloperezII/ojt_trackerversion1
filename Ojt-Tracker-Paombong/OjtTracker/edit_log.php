<?php
session_start();
include 'includes/database.php';

// 1. Security Check: Ensure user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

$uid = $_SESSION['user_id'];
$role = $_SESSION['role'] ?? 'user'; 

// 2. Get the ID from the URL
$id = isset($_GET['id']) ? mysqli_real_escape_string($conn, $_GET['id']) : null;

if (!$id) {
    header("Location: view_history.php");
    exit();
}

// 3. Fetch existing log (Users only edit their own)
if ($role === 'admin') {
    $log_query = "SELECT * FROM logs WHERE id = '$id'";
} else {
    $log_query = "SELECT * FROM logs WHERE id = '$id' AND user_id = '$uid'";
}

$log_result = mysqli_query($conn, $log_query);
$log = mysqli_fetch_assoc($log_result);

if (!$log) {
    header("Location: view_history.php?error=unauthorized");
    exit();
}

// 4. Handle Form Submission
$error_msg = "";
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $t_in = $_POST['time_in'];
    $t_out = $_POST['time_out'];
    $task = mysqli_real_escape_string($conn, $_POST['task_description']);
    $date = $_POST['log_date'];

    $start = new DateTime($t_in);
    $end = new DateTime($t_out);
    if ($end <= $start) { $end->modify('+1 day'); }
    
    $interval = $start->diff($end);
    $hours = $interval->h + ($interval->i / 60) + ($interval->days * 24);
    $hours_rendered = round(max(0, $hours - 1), 2);

    $update_sql = "UPDATE logs SET 
                    time_in = '$t_in', 
                    time_out = '$t_out', 
                    log_date = '$date',
                    hours_rendered = '$hours_rendered', 
                    task_description = '$task' 
                    WHERE id = '$id'";

    if (mysqli_query($conn, $update_sql)) {
        header("Location: view_history.php?status=updated");
        exit();
    } else {
        $error_msg = "Database Error: " . mysqli_error($conn);
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title>Edit My Log</title>
    <style>
        :root { 
            --primary: #3498db; 
            --primary-hover: #2980b9;
            --text-dark: #2c3e50;
            --text-light: #7f8c8d;
            --border-color: #dfe6e9;
            --bg-color: #f4f7f6;
        }
        
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: var(--bg-color); 
            display: flex; justify-content: center; align-items: center; 
            min-height: 100vh; margin: 0; padding: 20px;
        }
        
        .edit-card { 
            background: white; width: 100%; max-width: 480px; 
            padding: 40px 30px; border-radius: 20px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.05); 
            border-top: 5px solid var(--primary);
        }
        
        .edit-card h2 { color: var(--text-dark); text-align: center; margin: 0 0 5px 0; font-weight: 800; }
        .edit-card .subtitle { text-align: center; color: var(--text-light); font-size: 0.9rem; margin-bottom: 30px; font-weight: 600; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 0.75rem; font-weight: 800; color: #a4b0be; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        
        input, textarea { 
            width: 100%; padding: 12px 15px; border: 1px solid var(--border-color); border-radius: 10px; 
            box-sizing: border-box; font-family: inherit; font-size: 0.95rem; color: var(--text-dark);
            transition: all 0.3s ease; background-color: #fcfcfc; font-weight: 600;
        }
        
        input:focus, textarea:focus { outline: none; border-color: var(--primary); background-color: #fff; box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        
        .btn-save { 
            background: var(--primary); color: white; border: none; padding: 15px; width: 100%; 
            border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; margin-top: 15px; 
            transition: 0.3s; box-shadow: 0 4px 6px rgba(52, 152, 219, 0.2);
        }
        
        .btn-save:hover { background: var(--primary-hover); transform: translateY(-2px); }
        .cancel { display: block; text-align: center; margin-top: 20px; color: var(--text-light); text-decoration: none; font-size: 0.9rem; font-weight: 700; transition: 0.3s; }
        .cancel:hover { color: #e74c3c; }

        /* Toast Styles */
        #toast {
            visibility: hidden; min-width: 280px; background-color: #333; color: #fff;
            text-align: center; border-radius: 12px; padding: 16px; position: fixed;
            z-index: 1000; right: 30px; top: 30px; font-weight: 600;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 12px;
        }
        #toast.show { visibility: visible; animation: fadein 0.5s, fadeout 0.5s 2.5s; }
        @keyframes fadein { from {top: 0; opacity: 0;} to {top: 30px; opacity: 1;} }
        @keyframes fadeout { from {top: 30px; opacity: 1;} to {top: 0; opacity: 0;} }
    </style>
</head>
<body>

    <div id="toast"></div>

    <div class="edit-card">
        <h2>Update Log Record</h2>
        <div class="subtitle">
            Editing entry for: <strong style="color: var(--primary);"><?php echo date('M d, Y', strtotime($log['log_date'])); ?></strong>
        </div>
        
        <form method="POST" action="edit_log.php?id=<?php echo $id; ?>">
            <div class="form-group">
                <label>Date of Work</label>
                <input type="date" name="log_date" value="<?php echo $log['log_date']; ?>" required>
            </div>
            
            <div class="grid">
                <div class="form-group">
                    <label>Time In</label>
                    <input type="time" name="time_in" value="<?php echo $log['time_in']; ?>" required>
                </div>
                <div class="form-group">
                    <label>Time Out</label>
                    <input type="time" name="time_out" value="<?php echo $log['time_out']; ?>" required>
                </div>
            </div>
            
            <div class="form-group">
                <label>Daily Task Summary</label>
                <textarea name="task_description" rows="4" placeholder="Briefly describe the tasks completed..." required><?php echo htmlspecialchars($log['task_description']); ?></textarea>
            </div>
            
            <button type="submit" class="btn-save">SAVE CHANGES</button>
            <a href="view_history.php" class="cancel">Cancel and Return</a>
        </form>
    </div>

    <script>
        function showToast(message, type = 'success') {
            const toast = document.getElementById("toast");
            toast.innerHTML = (type === 'success' ? '<i class="fas fa-check-circle"></i> ' : '<i class="fas fa-exclamation-circle"></i> ') + message;
            toast.style.backgroundColor = type === 'success' ? "#27ae60" : "#e74c3c";
            toast.className = "show";
            setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
        }

        <?php if (!empty($error_msg)): ?>
            showToast("<?php echo $error_msg; ?>", 'error');
        <?php endif; ?>
    </script>
</body>
</html>