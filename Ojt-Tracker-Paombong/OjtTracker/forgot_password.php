<?php
session_start(); // Crucial for securely storing the user ID during the reset process
include 'includes/database.php';

$step = 1;
$error = '';

// Step 1: Find the User
if (isset($_POST['find_user'])) {
    $username = trim($_POST['username']); // Trim accidental whitespace
    
    $stmt = $conn->prepare("SELECT id, security_question FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($user = $res->fetch_assoc()) {
        $step = 2;
        // SECURE WAY: Store the ID in the session, NOT as a hidden HTML input!
        $_SESSION['reset_user_id'] = $user['id'];
        $_SESSION['reset_question'] = $user['security_question'];
    } else {
        $error = "Username not found. Please try again.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Recovery - OJT Tracker</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f6;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }

        .login-card {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.05);
            width: 100%;
            max-width: 400px;
            box-sizing: border-box;
        }

        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .login-header h2 {
            margin: 0;
            color: #2c3e50;
            font-size: 24px;
        }

        .login-header p {
            color: #7f8c8d;
            font-size: 14px;
            margin-top: 5px;
            font-weight: 600;
        }

        .error-inline {
            background: #fdeded;
            color: #e74c3c;
            padding: 10px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 20px;
            text-align: center;
        }

        .input-group {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .input-group label {
            font-size: 12px;
            font-weight: 700;
            color: #95a5a6;
            text-transform: uppercase;
        }

        .input-group input {
            padding: 12px 15px;
            border: 1px solid #dfe6e9;
            border-radius: 8px;
            font-size: 14px;
            background: #fdfdfd;
            transition: all 0.2s;
        }

        .input-group input:focus {
            border-color: #3498db;
            outline: none;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .question-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
            border-left: 4px solid #3498db;
        }

        .btn-reset {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            transition: opacity 0.2s;
        }

        .btn-reset:hover {
            opacity: 0.9;
        }

        .back-link {
            display: inline-block;
            margin-top: 25px;
            color: #7f8c8d;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            transition: color 0.2s;
        }

        .back-link:hover {
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="login-header">
            <h2>Account Recovery</h2>
            <p>Step <?php echo $step; ?> of 2</p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="error-inline"><?php echo $error; ?></div>
        <?php endif; ?>

        <?php if ($step == 1): ?>
            <form method="POST">
                <div class="input-group">
                    <label>Enter Username</label>
                    <input type="text" name="username" required placeholder="e.g. jdoe2024">
                </div>
                <button type="submit" name="find_user" class="btn-reset">Continue</button>
            </form>

        <?php else: ?>
            <form action="actions/reset_process.php" method="POST">
                <div class="input-group">
                    <label>Security Question</label>
                    <p class="question-box">
                        <?php echo htmlspecialchars($_SESSION['reset_question']); ?>
                    </p>
                </div>

                <div class="input-group">
                    <label>Your Answer</label>
                    <input type="text" name="answer" required placeholder="Type your answer...">
                </div>

                <div class="input-group">
                    <label>New Password</label>
                    <input type="password" name="new_password" required placeholder="••••••••">
                </div>

                <button type="submit" class="btn-reset">Reset Password</button>
            </form>
        <?php endif; ?>
        
        <div style="text-align: center;">
            <a href="login.php" class="back-link"><i class="fas fa-arrow-left"></i> Back to Login</a>
        </div>
    </div>
</body>
</html>