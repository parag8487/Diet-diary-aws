document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("adminLoginForm").addEventListener("submit", function(event) {
        event.preventDefault();

        const adminUsername = document.getElementById("adminUsername").value;
        const adminPassword = document.getElementById("adminPassword").value;

        // Hardcoded admin credentials
        const validAdminUsername = "admin";
        const validAdminPassword = "admin123";

        if (adminUsername === validAdminUsername && adminPassword === validAdminPassword) {
            window.location.href = "admin_dashboard.html";
        } else {
            const errorMessage = document.getElementById("error-message");
            if (errorMessage) {
                errorMessage.textContent = "Invalid login. Please try again.";
                errorMessage.style.color = "red";
            }
        }
    });
});