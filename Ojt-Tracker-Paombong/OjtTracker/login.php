<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title>Login - OJT Tracker</title>
    <style>
        /* --- General Layout --- */
        body {
            background-color: #f4f7f6;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: 'Segoe UI', Roboto, sans-serif;
        }

        /* --- Floating Toast Container --- */
        .toast-container {
            position: fixed;
            top: 25px;
            right: 25px;
            z-index: 9999;
        }

        .alert-toast {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            min-width: 320px;
            border-radius: 12px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            border: 1px solid rgba(39, 174, 96, 0.2);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: toastSlideIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }

        @keyframes toastSlideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .alert-content {
            display: flex;
            align-items: center;
            padding: 18px 20px;
            gap: 15px;
        }

        .alert-icon {
            width: 38px;
            height: 38px;
            background: rgba(39, 174, 96, 0.1);
            color: #27ae60;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
        }

        .alert-text {
            flex-grow: 1;
        }

        .alert-text strong {
            display: block;
            color: #2c3e50;
            font-size: 14px;
            margin-bottom: 2px;
        }

        .alert-text span {
            color: #7f8c8d;
            font-size: 12px;
        }

        .alert-close {
            background: none;
            border: none;
            color: #bdc3c7;
            cursor: pointer;
            font-size: 14px;
            transition: 0.2s;
        }

        .alert-close:hover { color: #e74c3c; }

        .alert-progress {
            height: 3px;
            background: #27ae60;
            width: 100%;
            transform-origin: left;
            animation: toastTimer 5s linear forwards;
        }

        @keyframes toastTimer {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
        }

        /* --- Login Card Styling --- */
        .login-card {
            background: white;
            width: 100%;
            max-width: 380px;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.05);
            text-align: center;
        }

        .login-header h2 { margin: 0; color: #2c3e50; font-size: 24px; font-weight: 800; }
        .login-header p { color: #95a5a6; margin: 8px 0 30px; font-size: 14px; }

        .input-group { text-align: left; margin-bottom: 20px; }
        .input-group label { display: block; margin-bottom: 8px; font-weight: 700; color: #34495e; font-size: 13px; }
        .input-group input {
            width: 100%; padding: 12px 15px; border: 2px solid #f1f2f6;
            border-radius: 10px; box-sizing: border-box; font-size: 15px; transition: 0.3s;
        }
        .input-group input:focus { border-color: #3498db; outline: none; background: #fff; }

        .login-btn {
            width: 100%; padding: 14px; background: #2c3e50; color: white;
            border: none; border-radius: 10px; font-weight: 700; font-size: 16px;
            cursor: pointer; transition: 0.3s; margin-top: 10px;
        }
        .login-btn:hover { background: #34495e; transform: translateY(-2px); }

        .error-inline {
            background: #fff5f5; color: #c0392b; padding: 10px; 
            border-radius: 8px; margin-bottom: 20px; font-size: 13px; border: 1px solid #fed7d7;
        }
    </style>
</head>
<body>

    <div class="toast-container">
        <?php if (isset($_GET['status']) && $_GET['status'] == 'success'): ?>
            <div id="success-alert" class="alert-toast">
                <div class="alert-content">
                    <div class="alert-icon"><i class="fas fa-check"></i></div>
                    <div class="alert-text">
                        <strong>Account Created!</strong>
                        <span>Login with your new credentials.</span>
                    </div>
                    <button class="alert-close" onclick="closeAlert('success-alert')"><i class="fas fa-times"></i></button>
                </div>
                <div class="alert-progress"></div>
            </div>
        <?php endif; ?>

        <?php if (isset($_GET['reset']) && $_GET['reset'] == 'success'): ?>
            <div id="reset-alert" class="alert-toast">
                <div class="alert-content">
                    <div class="alert-icon" style="color: #3498db; background: rgba(52, 152, 219, 0.1);"><i class="fas fa-key"></i></div>
                    <div class="alert-text">
                        <strong>Password Reset!</strong>
                        <span>You can now log in with your new password.</span>
                    </div>
                    <button class="alert-close" onclick="closeAlert('reset-alert')"><i class="fas fa-times"></i></button>
                </div>
                <div class="alert-progress" style="background: #3498db;"></div>
            </div>
        <?php endif; ?>
    </div>

    <div class="login-card">
        <div class="login-header">
            <h2>OJT Tracker</h2>
            <p>Welcome back, please login</p>
        </div>

        <?php if (isset($_GET['error'])): ?>
            <div class="error-inline">
                <i class="fas fa-circle-exclamation"></i> Invalid username or password.
            </div>
        <?php endif; ?>
        
        <form action="actions/login_process.php" method="POST">
            <div class="input-group">
                <label>Username</label>
                <input type="text" name="username" required placeholder="Enter username"
                       value="<?php echo isset($_GET['username']) ? htmlspecialchars($_GET['username']) : ''; ?>">
            </div>

            <div class="input-group">
                <label>Password</label>
                <input type="password" name="password" required placeholder="••••••••">
                <div style="text-align: right; margin-top: 5px;">
                    <a href="forgot_password.php" style="color: #3498db; text-decoration: none; font-size: 12px; font-weight: 600;">Forgot Password?</a>
                </div>
            </div>

            <button type="submit" class="login-btn">Sign In</button>
        </form>
        
        <div style="margin-top: 25px; font-size: 14px; color: #7f8c8d;">
            Don't have an account? <a href="register.php" style="color: #3498db; text-decoration: none; font-weight: 700;">Register</a>
        </div>
    </div>

    <script>
        // Updated to accept an ID so it works for multiple toasts
        function closeAlert(id) {
            const alert = document.getElementById(id);
            if (alert) {
                alert.style.transition = "all 0.5s ease";
                alert.style.transform = "translateX(120%)";
                alert.style.opacity = "0";
                setTimeout(() => alert.remove(), 500);
            }
        }

        // Auto-close timers
        if (document.getElementById('success-alert')) {
            setTimeout(() => closeAlert('success-alert'), 5000);
        }
        if (document.getElementById('reset-alert')) {
            setTimeout(() => closeAlert('reset-alert'), 5000);
        }
    </script>
</body>
</html>