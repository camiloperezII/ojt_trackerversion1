<?php
session_start();
include '../includes/database.php';

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $date = $_POST['date'];
    $t_in = $_POST['time_in'];
    $t_out = $_POST['time_out'];
    $task = $_POST['task_description'];

    // --- 1. DUPLICATION CHECK (Secure Prepared Statement) ---
    $stmt_check = $conn->prepare("SELECT id FROM logs WHERE user_id = ? AND log_date = ?");
    $stmt_check->bind_param("is", $user_id, $date);
    $stmt_check->execute();
    $check_result = $stmt_check->get_result();

    if ($check_result->num_rows > 0) {
        // Redirect to dashboard with duplicate status
        header("Location: ../index.php?status=duplicate");
        exit();
    }
    $stmt_check->close();

    // --- 2. AUTOMATIC CALCULATION LOGIC ---
    $start = new DateTime($t_in);
    $end = new DateTime($t_out);
    
    // Handle cases where time out is past midnight (if applicable)
    if ($end < $start) {
        $end->modify('+1 day');
    }

    $interval = $start->diff($end);
    $hours = $interval->h + ($interval->i / 60);
    
    // Add full days if the internship shift was extremely long
    if ($interval->days > 0) {
        $hours += ($interval->days * 24);
    }

    // Deduct 1 hour for lunch (minimum 0 hours)
    $hours_rendered = max(0, $hours - 1);
    $hours_rendered = round($hours_rendered, 2);

    // --- 3. INSERT DATA (Secure Prepared Statement) ---
    $sql = "INSERT INTO logs (user_id, log_date, time_in, time_out, hours_rendered, task_description) 
            VALUES (?, ?, ?, ?, ?, ?)";
    
    $stmt_insert = $conn->prepare($sql);
    $stmt_insert->bind_param("isssds", $user_id, $date, $t_in, $t_out, $hours_rendered, $task);

    if ($stmt_insert->execute()) {
        header("Location: ../index.php?status=success");
        exit();
    } else {
        // Helpful for debugging during OJT development
        die("Execution Error: " . $stmt_insert->error);
    }
} else {
    header("Location: ../login.php");
    exit();
}
?>