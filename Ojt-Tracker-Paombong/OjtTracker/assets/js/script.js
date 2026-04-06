
function closeAlert() {
    const alert = document.getElementById('success-alert');
    if (alert) {
        alert.style.transition = "all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
        alert.style.transform = "translateX(120%)";
        alert.style.opacity = "0";
        setTimeout(() => alert.remove(), 500);
    }
}

// Auto-close after 5 seconds
if (document.getElementById('success-alert')) {
    setTimeout(closeAlert, 5000);
}

