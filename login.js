document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("loginForm").addEventListener("submit", function(event) {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        const apiUrl = `http://localhost:3000/login`;

        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = "dashboard.html";
            } else {
                const errorMessage = document.getElementById("error-message");
                if (errorMessage) {
                    errorMessage.textContent = data.message;
                    errorMessage.style.color = "red";
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            const errorMessage = document.getElementById("error-message");
            if (errorMessage) {
                errorMessage.textContent = "Failed to login. Please try again.";
                errorMessage.style.color = "red";
            }
        });
    });
});