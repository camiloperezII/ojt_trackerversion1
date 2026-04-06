<?php
session_start();
include 'includes/database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit();
}

$school_name = isset($_GET['school']) ? mysqli_real_escape_string($conn, $_GET['school']) : '';

// Fetch students from this school and calculate their total hours rendered
$query = "SELECT users.id, users.username, users.total_required, 
          IFNULL(SUM(logs.hours_rendered), 0) as total_rendered
          FROM users 
          LEFT JOIN logs ON users.id = logs.user_id 
          WHERE users.school = '$school_name' AND users.role = 'user'
          GROUP BY users.id";

$result = mysqli_query($conn, $query);
?>

<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="assets/css/style.css">
    <title>Students - <?php echo htmlspecialchars($school_name); ?></title>
</head>
<body>
    <?php include 'includes/navbar.php'; ?>

    <div class="container">
        <h1>Students from <?php echo htmlspecialchars($school_name); ?></h1>
        
        <table>
            <thead>
                <tr>
                    <th>Student Name</th>
                    <th>Hours Rendered</th>
                    <th>Required Hours</th>
                    <th>Progress Bar</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php while($row = mysqli_fetch_assoc($result)): 
                    $percent = ($row['total_required'] > 0) ? ($row['total_rendered'] / $row['total_required']) * 100 : 0;
                    $percent = min(100, round($percent, 2)); // Cap at 100%
                ?>
                <tr>
                    <td style="font-weight: bold;"><?php echo htmlspecialchars($row['username']); ?></td>
                    <td><?php echo number_format($row['total_rendered'], 2); ?> hrs</td>
                    <td><?php echo $row['total_required']; ?> hrs</td>
                    <td style="width: 200px;">
                        <div style="background: #eee; border-radius: 10px; overflow: hidden; height: 15px;">
                            <div style="width: <?php echo $percent; ?>%; background: #27ae60; height: 100%;"></div>
                        </div>
                        <small><?php echo $percent; ?>% Complete</small>
                    </td>
                    <td>
                        <a href="admin_daily_logs.php?user_id=<?php echo $row['id']; ?>" style="color: #3498db; text-decoration: none;">View Detailed Logs</a>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>

        <div style="margin-top: 20px;">
            <a href="manage_schools.php">← Back to Schools</a>
        </div>
    </div>
</body>

</html>