<?php
session_start();
include '../includes/database.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // 1. Get the submitted data
    $user_id = intval($_POST['user_id']);
    $provided_answer = trim($_POST['answer']);
    $new_password = $_POST['new_password'];

    // 2. Fetch the correct security answer from the database
    $stmt = $conn->prepare("SELECT security_answer FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        $stored_answer = $user['security_answer'];

        // 3. Verify the answer (Using strtolower to make it case-insensitive)
        if (strtolower($provided_answer) === strtolower($stored_answer)) {
            
            // 4. Hash the new password for security
            $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

            // 5. Update the password in the database
            $update_stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $update_stmt->bind_param("si", $hashed_password, $user_id);
            
            if ($update_stmt->execute()) {
                // Success! Send them back to the login page with a success flag
                header("Location: ../login.php?reset=success");
                exit();
            } else {
                // Database update failed
                header("Location: ../forgot_password.php?error=" . urlencode("Something went wrong. Please try again."));
                exit();
            }
        } else {
            // Incorrect security answer
            header("Location: ../forgot_password.php?error=" . urlencode("Incorrect security answer. Please try again."));
            exit();
        }
    } else {
        // Fallback if the user ID doesn't exist
        header("Location: ../forgot_password.php?error=" . urlencode("User not found."));
        exit();
    }
} else {
    // If someone tries to access this file directly without submitting the form
    header("Location: ../forgot_password.php");
    exit();
}
?>