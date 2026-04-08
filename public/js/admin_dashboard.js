document.addEventListener("DOMContentLoaded", function () {
    async function fetchCustomers() {
        try {
            const response = await fetch('/api/get-customers');
            const customers = await response.json();

            const customerRows = document.getElementById("customerRows");
            customerRows.innerHTML = '';

            customers.forEach(customer => {
                const row = document.createElement("tr");
                const lastLoginDate = new Date(customer.last_login);

                const istOffset = 5.5 * 60;
                const istDate = new Date(lastLoginDate.getTime() + istOffset * 60 * 1000);
                const formattedLastLogin = istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

                row.innerHTML = `
                    <td><strong>${customer.username}</strong></td>
                    <td><i class="fas fa-clock text-muted"></i> ${formattedLastLogin}</td>
                    <td>
                        <button class="btn btn-danger btn-action" onclick="deleteCustomer('${customer.username}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                `;
                customerRows.appendChild(row);
            });


            updateStatistics(customers);
        } catch (error) {
            console.error('Error fetching customers:', error);
            showError('Failed to load customer data. Please try again.');
        }
    }

    async function fetchFoodCount() {
        try {
            const response = await fetch('/api/foods');
            const foods = await response.json();
            return foods.length;
        } catch (error) {
            console.error('Error fetching foods:', error);
            return 0;
        }
    }

    async function updateStatistics(customers) {
        const totalCustomers = customers.length;
        const totalFoods = await fetchFoodCount();


        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers = customers.filter(customer => {
            const lastLogin = new Date(customer.last_login);
            return lastLogin > sevenDaysAgo;
        }).length;


        document.getElementById('totalCustomers').textContent = totalCustomers;
        document.getElementById('totalFoods').textContent = totalFoods;
        document.getElementById('activeUsers').textContent = activeUsers;


        animateNumbers();
    }

    function animateNumbers() {
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(element => {
            const finalValue = element.textContent;
            const isPercentage = finalValue.includes('%');
            const numericValue = parseInt(finalValue.replace('%', ''));

            let currentValue = 0;
            const increment = numericValue / 50;

            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= numericValue) {
                    currentValue = numericValue;
                    clearInterval(timer);
                }
                element.textContent = Math.floor(currentValue) + (isPercentage ? '%' : '');
            }, 20);
        });
    }

    function showError(message) {

        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(errorDiv);


        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    window.deleteCustomer = function (username) {
        if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            fetch(`/api/delete-customer/${username}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {

                        const successDiv = document.createElement('div');
                        successDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
                        successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
                        successDiv.innerHTML = `
                            <i class="fas fa-check-circle"></i> User "${username}" deleted successfully!
                            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                        `;
                        document.body.appendChild(successDiv);


                        setTimeout(() => {
                            if (successDiv.parentNode) {
                                successDiv.parentNode.removeChild(successDiv);
                            }
                        }, 3000);

                        fetchCustomers();
                    } else {
                        showError('Failed to delete customer. Please try again.');
                    }
                })
                .catch(error => {
                    console.error('Error deleting customer:', error);
                    showError('Failed to delete customer. Please check your connection.');
                });
        }
    };


    fetchCustomers();


    setInterval(fetchCustomers, 30000);
});
