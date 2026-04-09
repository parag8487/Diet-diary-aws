document.addEventListener("DOMContentLoaded", async function() {
    const userCountEl = document.getElementById("userCount");
    const foodCountEl = document.getElementById("foodCount");
    const userTableBody = document.getElementById("userTableBody");

    // Load Stats and User Table
    async function initDashboard() {
        try {
            // 1. Fetch Users
            const userRes = await fetch('/api/get-customers');
            if (!userRes.ok) throw new Error('Failed to fetch users');
            const users = await userRes.json();
            
            userCountEl.textContent = users.length;
            renderUserTable(users);

            // 2. Fetch Food Items (for count)
            const foodRes = await fetch('/api/foods');
            if (!foodRes.ok) throw new Error('Failed to fetch foods');
            const foods = await foodRes.json();
            foodCountEl.textContent = foods.length;

        } catch (err) {
            console.error('Dashboard Init Error:', err);
            alert('Error loading dashboard data. Please check connection.');
        }
    }

    function renderUserTable(users) {
        userTableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement("tr");
            const role = user.username === 'admin' ? 'Admin' : 'Customer';
            const badgeClass = user.username === 'admin' ? 'badge-admin' : 'badge-customer';
            
            row.innerHTML = `
                <td><strong>${user.username}</strong></td>
                <td><span class="badge ${badgeClass}">${role}</span></td>
                <td><span class="text-success">● Active</span></td>
                <td>
                    ${user.username !== 'admin' ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.username}')">
                            Delete
                        </button>
                    ` : '<span class="text-muted small">Protected</span>'}
                </td>
            `;
            userTableBody.appendChild(row);
        });
    }

    // Global delete function
    window.deleteUser = async function(username) {
        if (!confirm(`Are you sure you want to delete user "${username}" and all their data?`)) return;

        try {
            const res = await fetch(`/api/delete-customer/${username}`, { method: 'DELETE' });
            if (res.ok) {
                alert('User deleted successfully');
                initDashboard(); // Refresh
            } else {
                const data = await res.json();
                alert('Error: ' + (data.message || 'Could not delete user'));
            }
        } catch (err) {
            console.error('Delete User Error:', err);
            alert('Failed to delete user.');
        }
    };

    initDashboard();
});
