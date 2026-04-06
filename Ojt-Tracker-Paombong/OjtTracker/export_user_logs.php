<?php
session_start();
include 'includes/database.php';

// Security Check: Only admins should export others' logs
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../index.php");
    exit();
}

if (isset($_GET['id'])) {
    $user_id = mysqli_real_escape_string($conn, $_GET['id']);

    // Fetch user name for the filename
    $user_res = mysqli_query($conn, "SELECT full_name FROM users WHERE id = '$user_id'");
    $user = mysqli_fetch_assoc($user_res);
    $safe_name = str_replace(' ', '_', $user['full_name']);
    
    $filename = "OJT_Logs_" . $safe_name . "_" . date('Y-m-d') . ".csv";

    // Set headers to force download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=' . $filename);

    // Open the output stream
    $output = fopen('php://output', 'w');

    // Set Column Headers
    fputcsv($output, array('Date', 'Time In', 'Time Out', 'Hours Rendered', 'Tasks Performed'));

    // Fetch Logs
    $query = "SELECT log_date, time_in, time_out, hours_rendered, task_description 
              FROM logs 
              WHERE user_id = '$user_id' 
              ORDER BY log_date DESC";
    $result = mysqli_query($conn, $query);

    while ($row = mysqli_fetch_assoc($result)) {
        // Format times for better readability in Excel
        $row['time_in'] = date('h:i A', strtotime($row['time_in']));
        $row['time_out'] = ($row['time_out']) ? date('h:i A', strtotime($row['time_out'])) : 'N/A';
        
        fputcsv($output, $row);
    }

    fclose($output);
    exit();
}
?>