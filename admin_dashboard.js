document.addEventListener("DOMContentLoaded", function() {
    async function fetchCustomers() {
        try {
            const response = await fetch('https://diet-diary-3yg2.onrender.com/get-customers');
            const customers = await response.json();

            const customerRows = document.getElementById("customerRows");
            customerRows.innerHTML = '';

            customers.forEach(customer => {
                const row = document.createElement("tr");
                const lastLoginDate = new Date(customer.last_login);
                // Convert to IST (UTC+5:30)
                const istOffset = 5.5 * 60; // 5 hours and 30 minutes in minutes
                const istDate = new Date(lastLoginDate.getTime() + istOffset * 60 * 1000);
                const formattedLastLogin = istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

                row.innerHTML = `
                    <td>${customer.username}</td>
                    <td>${formattedLastLogin}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteCustomer('${customer.username}')">Delete</button>
                    </td>
                `;
                customerRows.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    }

    window.deleteCustomer = function(username) {
        if (confirm(`Are you sure you want to delete user ${username}?`)) {
            fetch(`http://localhost:3000/delete-customer/${username}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Customer deleted successfully.');
                        fetchCustomers(); // Refresh the table
                    } else {
                        alert('Failed to delete customer.');
                    }
                })
                .catch(error => {
                    console.error('Error deleting customer:', error);
                    alert('Failed to delete customer.');
                });
        }
    };

    fetchCustomers();
});
