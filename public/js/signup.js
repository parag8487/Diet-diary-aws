document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("signupForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const newUsername = document.getElementById("newUsername").value;
        const newPassword = document.getElementById("newPassword").value;

        fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername, password: newPassword })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove all localStorage data related to this username
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.includes(newUsername)) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                    localStorage.removeItem("currentUser");
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
