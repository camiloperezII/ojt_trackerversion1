<?php
session_start();
include 'includes/database.php';

// Security: Only admins can delete
if ($_SESSION['role'] !== 'admin') { header("Location: ../index.php"); exit(); }

if (isset($_GET['id'])) {
    $target_id = $_GET['id'];

    // 1. Delete user's logs first (Foreign Key constraint)
    mysqli_query($conn, "DELETE FROM logs WHERE user_id = $target_id");
    
    // 2. Delete the user
    mysqli_query($conn, "DELETE FROM users WHERE id = $target_id");
}

header("Location: ../admin.php");
?>