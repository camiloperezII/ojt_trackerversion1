<?php
session_start();
include 'includes/database.php'; 

$SECRET_ADMIN_KEY = "HR_Admin2026!"; 

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $full_name = mysqli_real_escape_string($conn, $_POST['full_name']);
    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $role = $_POST['role'];
    
    $security_question = mysqli_real_escape_string($conn, $_POST['security_question']);
    $security_answer = mysqli_real_escape_string($conn, $_POST['security_answer']);
    
    $required_hours = ($role === 'admin') ? 0 : (int)$_POST['required_hours'];
    $school = ($role === 'admin') ? 'Administrator' : mysqli_real_escape_string($conn, $_POST['school']);
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);

    if ($role === 'admin') {
        $entered_key = $_POST['admin_key'] ?? '';
        if ($entered_key !== $SECRET_ADMIN_KEY) {
            $error = "Invalid Admin Registration Key!";
        }
    }

    if (!isset($error)) {
        $check = mysqli_query($conn, "SELECT id FROM users WHERE username = '$username'");
        if (mysqli_num_rows($check) > 0) {
            $error = "Username already taken!";
        } else {
            $sql = "INSERT INTO users (full_name, username, school, password, total_required, role, security_question, security_answer) 
                    VALUES ('$full_name', '$username', '$school', '$password', '$required_hours', '$role', '$security_question', '$security_answer')";

            if (mysqli_query($conn, $sql)) {
                header("Location: login.php?status=success");
                exit();
            } else {
                $error = "Registration failed: " . mysqli_error($conn);
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title>Register - OJT Tracker</title>
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f4f7f6; font-family: 'Segoe UI', sans-serif; }
        .container { width: 100%; max-width: 450px; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        h2 { text-align: center; color: #2c3e50; margin-bottom: 30px; font-weight: 800; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #34495e; font-size: 14px; }
        input, select { width: 100%; padding: 12px; margin-bottom: 20px; border: 2px solid #edf2f7; border-radius: 10px; box-sizing: border-box; font-size: 15px; transition: 0.3s; }
        input:focus { border-color: #3498db; outline: none; }
        .error-msg { background: #ffdada; color: #e74c3c; padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-size: 14px; border: 1px solid #ffbaba; }
        .btn-register { width: 100%; padding: 14px; background: #27ae60; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px; transition: 0.3s; }
        .btn-register:hover { background: #219150; transform: translateY(-2px); }
        .hidden { display: none; }
        .input-group { margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Create Account</h2>
        
        <?php if (isset($error)): ?>
            <div class="error-msg"><?= $error ?></div>
        <?php endif; ?>

        <form method="POST">
            <label>I am a:</label>
            <select name="role" id="roleSelect" onchange="toggleFields()" required>
                <option value="user">Trainee (Student)</option>
                <option value="admin">Administrator / Supervisor</option>
            </select>

            <label>Full Name</label>
            <input type="text" name="full_name" placeholder="Juan Dela Cruz" required>
            
            <label>Username</label>
            <input type="text" name="username" placeholder="j.delacruz24" required>

            <div id="adminKeyField" class="hidden">
                <label style="color: #e67e22;"><i class="fas fa-key"></i> Admin Registration Key</label>
                <input type="password" name="admin_key" placeholder="Enter secret admin code">
            </div>

            <div id="traineeFields">
                <label>School</label>
                <input list="school_options" name="school" placeholder="Select or type school">
                <datalist id="school_options">
                    <option value="La Consolacion University">
                    <option value="Bulacan State University">
                    <option value="Baliuag University">
                </datalist>

                <label>Required Hours</label>
                <input type="number" name="required_hours" value="600">
            </div>

            <div class="input-group">
                <label>Security Question</label>
                <select name="security_question" class="form-control" required style="width: 100%; padding: 12px; border-radius: 10px; border: 2px solid #edeff2;">
                    <option value="" disabled selected>Select a question...</option>
                    <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                    <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                    <option value="In what city were you born?">In what city were you born?</option>
                    <option value="What was the name of your elementary school?">What was the name of your elementary school?</option>
                    <option value="What is your favorite movie or book?">What is your favorite movie or book?</option>
                    <option value="What was your childhood nickname?">What was your childhood nickname?</option>
                    <option value="In what city did your parents meet?">In what city did your parents meet?</option>
                    <option value="What is the name of your favorite teacher?">What is the name of your favorite teacher?</option>
                    <option value="What was the name of the street you grew up on?">What was the name of the street you grew up on?</option>
                    <option value="What was your dream job as a child?">What was your dream job as a child?</option>
                </select>
            </div>

            <div class="input-group">
                <label>Security Answer</label>
                <input type="text" name="security_answer" class="form-control" placeholder="Your answer" required>
            </div>

            <label>Password</label>
            <input type="password" name="password" placeholder="••••••••" required>

            <button type="submit" class="btn-register">Register Account</button>
        </form>

        <p style="text-align:center; margin-top:25px; font-size: 14px;">
            <a href="login.php" style="color: #3498db; text-decoration: none; font-weight: bold;">Already have an account? Login</a>
        </p>
    </div>

    <script>
        function toggleFields() {
            const role = document.getElementById('roleSelect').value;
            const traineeFields = document.getElementById('traineeFields');
            const adminKeyField = document.getElementById('adminKeyField');
            const hoursInput = document.querySelector('input[name="required_hours"]');

            if (role === 'admin') {
                traineeFields.classList.add('hidden');
                adminKeyField.classList.remove('hidden');
                if(hoursInput) hoursInput.value = 0; 
            } else {
                traineeFields.classList.remove('hidden');
                adminKeyField.classList.add('hidden');
                if(hoursInput) hoursInput.value = 600; 
            }
        }
    </script>
</body>
</html>