<?php
session_start();
include 'includes/database.php';

// 1. FIXED: Security Check - Redirect to root, not parent of root
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit();

}

// Default to today's date if no date is picked
$selected_date = isset($_GET['log_date']) ? mysqli_real_escape_string($conn, $_GET['log_date']) : date('Y-m-d');

// 2. SUCCESS MESSAGE (Optional but helpful)
$msg = "";
if (isset($_GET['status']) && $_GET['status'] == 'updated') {
    $msg = "Log updated successfully!";
}

// Fetch logs
$query = "SELECT logs.*, users.username 
          FROM logs 
          JOIN users ON logs.user_id = users.id 
          WHERE logs.log_date = '$selected_date'
          ORDER BY logs.time_in ASC";

$result = mysqli_query($conn, $query);
?>

<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="assets/css/style.css">
    <title>Daily Logs - Admin</title>
</head>
<body>
    <?php include 'includes/navbar.php'; ?>

    <div class="container">
        <h1>OJT Tracker Logs - Paombong</h1>
        
        <?php if($msg): ?>
            <p style="color: green; font-weight: bold; background: #d4edda; padding: 10px; border-radius: 5px;"><?php echo $msg; ?></p>
        <?php endif; ?>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #eee; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <form method="GET" style="display: flex; align-items: center; gap: 10px; background: none; padding: 0; box-shadow: none;">
                <label>Select Date:</label>
                <input type="date" name="log_date" value="<?php echo $selected_date; ?>" onchange="this.form.submit()">
                <button type="submit" style="padding: 5px 15px;">View Date</button>
            </form>
            
            <a href="admin.php" style="text-decoration: none; font-weight: bold; color: #2c3e50;">View All Trainees →</a>
        </div>

        <h3>Logs for: <?php echo date('F d, Y', strtotime($selected_date)); ?></h3>

        <table border="1" style="width:100%; border-collapse: collapse;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th>Trainee Name</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Hours</th>
                    <th>Tasks</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if(mysqli_num_rows($result) > 0): ?>
                    <?php while($row = mysqli_fetch_assoc($result)): ?>
                    <tr>
                        <td style="font-weight: bold; padding: 10px;"><?php echo htmlspecialchars($row['username']); ?></td>
                        <td style="padding: 10px;"><?php echo date('h:i A', strtotime($row['time_in'])); ?></td>
                        <td style="padding: 10px;"><?php echo date('h:i A', strtotime($row['time_out'])); ?></td>
                        <td style="color: #27ae60; font-weight: bold; padding: 10px;"><?php echo $row['hours_rendered']; ?></td>
                        <td style="font-size: 13px; padding: 10px;"><?php echo htmlspecialchars($row['task_description']); ?></td>
                        <td style="padding: 10px; text-align: center;"> 
                            <a href="edit_log.php?id=<?php echo $row['id']; ?>" style="color: #3498db; text-decoration: none; font-weight: bold;">Edit</a>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 30px; color: #7f8c8d;">
                            No logs found for this date.
                        </td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</body>
</html>