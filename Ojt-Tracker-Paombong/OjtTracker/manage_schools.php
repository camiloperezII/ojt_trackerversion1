<?php
session_start();
include 'includes/database.php';

// Security Check
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit();
}

// Handle the update logic
if (isset($_POST['update_school'])) {
    $old_name = mysqli_real_escape_string($conn, $_POST['old_name']);
    $new_name = mysqli_real_escape_string($conn, $_POST['new_name']);

    // Update students associated with the old name
    $update_query = "UPDATE users SET school = '$new_name' WHERE school = '$old_name' AND role = 'user'";
    mysqli_query($conn, $update_query);
    $msg = "School renamed successfully for all students!";
}

/** * UPDATED QUERY: 
 * We filter for role = 'user' so administrators are not included in the count.
 */
$schools_query = mysqli_query($conn, "SELECT school, COUNT(*) as student_count 
                                      FROM users 
                                      WHERE school != '' 
                                      AND role = 'user' 
                                      GROUP BY school");
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="assets/css/style.css">
    <title>Manage Schools - Admin</title>
    <style>
        .container { max-width: 1100px; margin: 40px auto; padding: 0 20px; }
        .school-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .school-table th { background: #f8f9fa; padding: 15px; text-align: left; color: #7f8c8d; }
        .school-table td { padding: 15px; border-top: 1px solid #eee; }
        .btn-view { background: #3498db; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 600; }
        .rename-form { display: flex; gap: 5px; margin: 0; padding: 0; background: none; box-shadow: none; }
        .input-rename { padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 150px; }
        .btn-rename { padding: 8px 12px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <?php include 'includes/navbar.php'; ?>

    <div class="container">
        <h1>School Management</h1>
        <p style="color: #7f8c8d;">Manage school affiliations and track student populations.</p>

        <?php if(isset($msg)) echo "<p style='color: #27ae60; font-weight: bold; background: #eafaf1; padding: 10px; border-radius: 5px;'>$msg</p>"; ?>

        <table class="school-table">
            <thead>
                <tr>
                    <th>Current School Name</th>
                    <th>Number of Students</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if(mysqli_num_rows($schools_query) > 0): ?>
                    <?php while ($row = mysqli_fetch_assoc($schools_query)): ?>
                    <tr>
                        <td style="font-weight: bold; color: #2c3e50;"><?php echo htmlspecialchars($row['school']); ?></td>
                        <td>
                            <span style="background: #e1f5fe; color: #0288d1; padding: 4px 10px; border-radius: 12px; font-weight: bold;">
                                <?php echo $row['student_count']; ?> Trainees
                            </span>
                        </td>
                        <td style="display: flex; gap: 15px; align-items: center;">
                            <a href="school_daily_report.php?school=<?php echo urlencode($row['school']); ?>" class="btn-view">
                                View Trainees
                            </a>

                            <form method="POST" class="rename-form">
                                <input type="hidden" name="old_name" value="<?php echo htmlspecialchars($row['school']); ?>">
                                <input type="text" name="new_name" placeholder="New Name" required class="input-rename">
                                <button type="submit" name="update_school" class="btn-rename">Rename</button>
                            </form>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="3" style="text-align: center; padding: 30px; color: #95a5a6;">No schools found with active students.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
        
        <div style="margin-top: 30px;">
            <a href="admin.php" style="color: #3498db; text-decoration: none; font-weight: bold;">← Back to Dashboard</a>
        </div>
    </div>
</body>
</html>