<?php
session_start();
include 'includes/database.php';

if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit(); 
}

$uid = $_SESSION['user_id'];

// Determine what the user wants to edit (default to profile)
$view = $_GET['view'] ?? 'profile'; 

$msg = "";
$error = "";

// 1. Handle POST Updates
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['update_username'])) {
        $new_user = trim($_POST['username']);
        $stmt = $conn->prepare("UPDATE users SET username = ? WHERE id = ?");
        $stmt->bind_param("si", $new_user, $uid);
        if($stmt->execute()) {
            $msg = "Username updated successfully!";
        }
    } 
    
    if (isset($_POST['update_password'])) {
        $pass = $_POST['password'];
        $conf = $_POST['confirm_password'];

        if ($pass !== $conf) {
            $error = "Passwords do not match!";
        } elseif (strlen($pass) < 6) {
            $error = "Password must be at least 6 characters.";
        } else {
            $hashed = password_hash($pass, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->bind_param("si", $hashed, $uid);
            $stmt->execute();
            $msg = "Password changed successfully!";
        }
    }
}

// 2. Fetch User Info INCLUDING ROLE
$stmt = $conn->prepare("SELECT username, full_name, role FROM users WHERE id = ?");
$stmt->bind_param("i", $uid);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

// 3. Set the Dynamic Return URL
$return_url = ($user['role'] === 'admin') ? 'admin.php' : 'index.php';
$return_label = ($user['role'] === 'admin') ? 'Admin Panel' : 'My Dashboard';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    
    <meta charset="UTF-8">
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title>Settings</title>
    <style>
        :root { --primary: #3498db; --success: #27ae60; --danger: #e74c3c; }
        body { background: #f4f7f6; font-family: 'Segoe UI', sans-serif; }
        .edit-card { max-width: 400px; margin: 50px auto 20px auto; background: white; padding: 0; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); overflow: hidden; }
        
        .tabs { display: flex; background: #eee; }
        .tab { flex: 1; padding: 15px; text-align: center; text-decoration: none; color: #666; font-weight: bold; font-size: 14px; transition: 0.3s; }
        .tab.active { background: white; color: var(--primary); border-top: 3px solid var(--primary); }
        
        .form-content { padding: 30px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #444; font-size: 14px; }
        input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 15px; }
        
        .btn-save { width: 100%; padding: 13px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px; transition: 0.3s; }
        .btn-save:hover { background: #2980b9; }
        
        .alert { padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; font-weight: 500; text-align: center; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        
        .back-container { text-align: center; margin-bottom: 50px; }
        .back-btn { display: inline-block; text-decoration: none; color: var(--primary); font-weight: 700; font-size: 14px; transition: 0.2s; }
        .back-btn:hover { text-decoration: underline; }
    </style>
</head>
<body>

    <div class="edit-card">
        <div class="tabs">
            <a href="?view=profile" class="tab <?= $view == 'profile' ? 'active' : '' ?>">
                <i class="fas fa-user"></i> Profile
            </a>
            <a href="?view=password" class="tab <?= $view == 'password' ? 'active' : '' ?>">
                <i class="fas fa-lock"></i> Password
            </a>
        </div>

        <div class="form-content">
            <?php if($msg): ?> <div class="alert alert-success"><?= $msg ?></div> <?php endif; ?>
            <?php if($error): ?> <div class="alert alert-danger"><?= $error ?></div> <?php endif; ?>

            <?php if ($view == 'profile'): ?>
                <form method="POST">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" value="<?= htmlspecialchars($user['full_name']) ?>" disabled style="background:#f9f9f9; color:#999;">
                        <small style="color:#999; font-size: 11px;">Name can only be changed by Admin.</small>
                    </div>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" name="username" value="<?= htmlspecialchars($user['username']) ?>" required>
                    </div>
                    <button type="submit" name="update_username" class="btn-save">Update Username</button>
                </form>

            <?php else: ?>
                <form method="POST">
                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" name="password" placeholder="Enter new password" required>
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" name="confirm_password" placeholder="Repeat new password" required>
                    </div>
                    <button type="submit" name="update_password" class="btn-save" style="background: var(--success);">Change Password</button>
                </form>
            <?php endif; ?>
        </div>
    </div>

    <div class="back-container">
        <a href="<?= $return_url ?>" class="back-btn">
            <i class="fas fa-arrow-left"></i> Return to <?= $return_label ?>
        </a>
    </div>

</body>
</html>