<?php
include '../includes/database.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Collect and sanitize input
    $full_name = mysqli_real_escape_string($conn, $_POST['full_name']);
    $username  = mysqli_real_escape_string($conn, $_POST['username']);
    $password  = $_POST['password']; 
    $school    = mysqli_real_escape_string($conn, $_POST['school']);
    
    // NEW: Capture Security Question and Answer
    $security_question = mysqli_real_escape_string($conn, $_POST['security_question']);
    $security_answer   = mysqli_real_escape_string($conn, $_POST['security_answer']);
    
    $role      = 'student'; // Default role for new registrations

    // 1. Check if username already exists
    $check_user = "SELECT * FROM users WHERE username = '$username'";
    $result = mysqli_query($conn, $check_user);

    if (mysqli_num_rows($result) > 0) {
        header("Location: ../register.php?error=exists");
        exit();
    }

    // 2. Hash the password for security
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // 3. Insert into Database (Updated to include security columns)
    $sql = "INSERT INTO users (full_name, username, password, role, school, security_question, security_answer) 
            VALUES ('$full_name', '$username', '$hashed_password', '$role', '$school', '$security_question', '$security_answer')";

    if (mysqli_query($conn, $sql)) {
        // Redirect to login with success message
        header("Location: ../login.php?status=success");
        exit();
    } else {
        echo "Error: " . mysqli_error($conn);
    }
} else {
    header("Location: ../register.php");
    exit();
}
?>