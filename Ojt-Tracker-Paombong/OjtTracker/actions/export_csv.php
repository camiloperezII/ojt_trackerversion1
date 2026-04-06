<?php
session_start();
include 'includes/database.php';

// 1. Security: Only admins can export data
if (!isset($_SESSION['user_id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    exit("Unauthorized access");
}

// 2. Clear any accidental whitespace or previous output to prevent file corruption
if (ob_get_length()) ob_end_clean();

// 3. Set headers for a professional download experience
$filename = 'OJT_Progress_Report_' . date('Y-m-d_His') . '.csv';
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Pragma: no-cache');
header('Expires: 0');

// 4. Open the output stream
$output = fopen('php://output', 'w');

// 5. Add UTF-8 BOM for Excel Compatibility (Fixes symbols and special characters)
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

// 6. Add a Professional Report Header
fputcsv($output, array('OJT OVERALL PROGRESS REPORT'));
fputcsv($output, array('Generated on:', date('F d, Y h:i A')));
fputcsv($output, array('')); // Spacer row

// 7. Column Headers
fputcsv($output, array(
    'User ID', 
    'Username', 
    'Target Hours', 
    'Hours Rendered', 
    'Hours Remaining', 
    'Completion %', 
    'Status',
    'Estimated Completion Date'
));

// 8. Fetch Data
$query = "SELECT users.id, users.username, users.total_required, 
                 COALESCE(SUM(logs.hours_rendered), 0) as total_done,
                 COUNT(DISTINCT logs.log_date) as days_worked
          FROM users 
          LEFT JOIN logs ON users.id = logs.user_id 
          GROUP BY users.id
          ORDER BY total_done DESC"; // Sorted by highest progress

$result = mysqli_query($conn, $query);

if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $total_required = (float)$row['total_required'] ?: 1; 
        $total_done = (float)$row['total_done'];
        
        $percent = min(($total_done / $total_required) * 100, 100);
        $remaining_hours = max($total_required - $total_done, 0);

        // Logic for Status and Estimation
        $status = "In Progress";
        $est_completion = "N/A";

        if ($remaining_hours <= 0) {
            $status = "Completed";
            $est_completion = "Finished";
        } elseif ($row['days_worked'] > 0 && $total_done > 0) {
            $avg_per_day = $total_done / $row['days_worked'];
            $days_to_go = ceil($remaining_hours / $avg_per_day);
            $est_completion = date('M d, Y', strtotime("+$days_to_go weekdays"));
        }

        // 9. Format the Row
        fputcsv($output, array(
            $row['id'],
            ucwords($row['username']), // Capitalize first letter
            number_format($total_required, 1),
            number_format($total_done, 2),
            number_format($remaining_hours, 2),
            number_format($percent, 1) . '%',
            $status,
            $est_completion
        ));
    }
}

fclose($output);
exit();
?>