<?php
// Ensure session is started, but don't call it if already started in the parent file
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>

<nav class="navbar">
    <div class="nav-container">
        <a href="<?php echo (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') ? 'admin.php' : 'index.php'; ?>" class="logo">OJT Tracker</a>
        
        <div class="nav-right">
            <div class="nav-links">
                <?php if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin'): ?>
                    <a href="admin.php" class="admin-link">Admin Panel</a>
                    
                    <?php if (($_SESSION['admin_type'] ?? 'pure') !== 'pure'): ?>
                        <a href="index.php">Dashboard</a>
                        <a href="view_history.php">My History</a>
                    <?php endif; ?>

                <?php else: ?>
                    <a href="index.php">Dashboard</a>
                    <a href="view_history.php">My History</a>
                <?php endif; ?>
            </div>

            <div class="nav-profile-dropdown">
                <button onclick="toggleNavMenu()" class="nav-user-btn" id="navUserBtn">
                    <i class="fas fa-user-circle"></i>
                    <span>
                        <?php echo htmlspecialchars($_SESSION['username'] ?? 'User'); ?>
                        <?php if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin'): ?>
                            <span class="admin-badge">ADMIN</span>
                        <?php endif; ?>
                    </span>
                    <i class="fas fa-caret-down"></i>
                </button>
                
                <div id="navDropdown" class="nav-dropdown-content">
                    <div class="dropdown-header">Account Settings</div>
                    <a href="edit_user.php?view=profile"><i class="fas fa-user-cog fa-fw"></i> Edit Profile</a>
                    <a href="edit_user.php?view=password"><i class="fas fa-key fa-fw"></i> Change Password</a>
                    
                    <div class="nav-divider"></div>
                    
                    <a href="logout.php" class="nav-logout-link" onclick="return confirm('Are you sure you want to log out?')">
                        <i class="fas fa-sign-out-alt fa-fw"></i> Logout
                    </a>
                </div>
            </div>
        </div>
    </div>
</nav>

<style>
/* Navbar Container Styling */
.navbar {
    background: #2c3e50;
    padding: 10px 0;
    color: white;
}

.nav-container {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between; /* Pushes Logo to left, nav-right to right */
    align-items: center;
    padding: 0 20px;
}

/* NEW: Groups the links and profile button together */
.nav-right {
    display: flex;
    align-items: center;
    gap: 25px; 
}

.logo {
    color: white;
    text-decoration: none;
    font-weight: 900;
    font-size: 1.4rem;
    letter-spacing: 1px;
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 20px;
}

.nav-links a {
    color: rgba(255,255,255,0.8);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    transition: 0.3s;
}

.nav-links a:hover { color: white; }

/* Admin Panel Button Styling */
.admin-link {
    background: #f1c40f !important; /* Warning Yellow */
    color: #2c3e50 !important;
    padding: 8px 15px !important;
    border-radius: 8px;
    font-weight: 800 !important;
    text-transform: uppercase;
    font-size: 11px !important;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 10px rgba(241, 196, 15, 0.3);
}

.admin-link:hover {
    background: #f39c12 !important;
    transform: translateY(-2px);
}

/* User Profile Button */
.nav-profile-dropdown {
    position: relative;
    display: inline-block;
}

.nav-user-btn {
    background: rgba(255,255,255,0.1);
    color: white;
    border: 1px solid rgba(255,255,255,0.2);
    padding: 8px 15px;
    border-radius: 50px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: 0.3s;
}

.nav-user-btn:hover { background: rgba(255,255,255,0.2); }

/* Admin Badge inside button */
.admin-badge {
    background: #f1c40f;
    color: #2c3e50;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 900;
    margin-left: 5px;
    vertical-align: middle;
}

/* Dropdown Menu */
.nav-dropdown-content {
    display: none;
    position: absolute;
    right: 0;
    top: 50px;
    background-color: white;
    min-width: 200px;
    box-shadow: 0px 10px 25px rgba(0,0,0,0.15);
    border-radius: 12px;
    z-index: 1001;
    overflow: hidden;
    border: 1px solid #eee;
}

.dropdown-header {
    padding: 12px 16px;
    font-size: 11px;
    text-transform: uppercase;
    color: #a4b0be;
    font-weight: 800;
    background: #fafbfc;
}

.nav-dropdown-content a {
    color: #2c3e50 !important;
    padding: 12px 16px;
    text-decoration: none;
    display: block;
    font-size: 14px;
    transition: 0.2s;
}

.nav-dropdown-content a:hover {
    background-color: #f8f9fa;
    color: #3498db !important;
    padding-left: 20px;
}

.nav-divider {
    height: 1px;
    background: #f1f2f6;
    margin: 5px 0;
}

.nav-logout-link {
    color: #e74c3c !important;
    font-weight: 700;
}

.nav-logout-link:hover {
    background-color: #fff5f5 !important;
}

.show-nav { display: block !important; }
</style>

<script>
function toggleNavMenu() {
    document.getElementById("navDropdown").classList.toggle("show-nav");
}

// Close dropdown if clicked outside
window.addEventListener('click', function(e) {
    const btn = document.getElementById('navUserBtn');
    const dropdown = document.getElementById("navDropdown");
    
    if (btn && !btn.contains(e.target)) {
        if (dropdown && dropdown.classList.contains('show-nav')) {
            dropdown.classList.remove('show-nav');
        }
    }
});
</script>