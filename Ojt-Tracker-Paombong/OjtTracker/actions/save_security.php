<?php
session_start();
include '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: ../login.php");
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user_id = $_SESSION['user_id'];
    $role = $_SESSION['role'];
    
    // It's good practice to trim the answer so accidental spaces don't lock them out later
    $security_question = $_POST['security_question'];
    $security_answer = trim($_POST['security_answer']); 

    // Update the existing user's record
    $sql = "UPDATE users SET security_question = ?, security_answer = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssi", $security_question, $security_answer, $user_id);
    
    if ($stmt->execute()) {
        // Route them to their proper dashboard
        if ($role === 'admin') {
            header("Location: ../admin.php");
        } else {
            // FIXED: Changed to index.php to match your Trainee Dashboard
            header("Location: ../index.php"); 
        }
        exit();
    } else {
        echo "Error updating record: " . $conn->error;
    }
} else {
    header("Location: ../edit_user.php?view=security");
    exit();
}