document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("signupForm").addEventListener("submit", function(event) {
        event.preventDefault();

        const newUsername = document.getElementById("newUsername").value;
        const newPassword = document.getElementById("newPassword").value;

        fetch('http://localhost:3000/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername, password: newPassword })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = "login.html";
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
                errorMessage.textContent = "Failed to register. Please try again.";
                errorMessage.style.color = "red";
            }
        });
    });
});