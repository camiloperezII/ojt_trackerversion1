<?php
session_start();
include 'includes/database.php';
if ($_SESSION['role'] !== 'admin') { exit("Unauthorized"); }

if (isset($_GET['log_id'])) {
    $lid = $_GET['log_id'];
    $uid = $_GET['user_id'];
    
    mysqli_query($conn, "DELETE FROM logs WHERE id = $lid");
    header("Location: ../view_user_logs.php?id=$uid");
}
?>