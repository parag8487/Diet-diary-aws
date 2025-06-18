document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById("calorieProteinChart").getContext("2d");
    const chartConfig = {
        type: "bar",
        data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [{
                label: "Calories",
                data: [],
                backgroundColor: "rgba(255, 99, 132, 0.5)",
                borderColor: "rgba(255, 99, 132, 1)",
                yAxisID: 'y'
            }, {
                label: "Protein (g)",
                data: [],
                backgroundColor: "rgba(54, 162, 235, 0.5)",
                borderColor: "rgba(54, 162, 235, 1)",
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { display: true, title: { display: true, text: 'Days' } },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Calories' },
                    beginAtZero: true,
                    max: 2500,
                    stepSize: 500
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Protein (g)' },
                    beginAtZero: true,
                    grid: { drawOnChartArea: false }
                }
            }
        }
    };

    function loadBMIData() {
        const username = localStorage.getItem("currentUser");
        if (username) {
            const bmiData = JSON.parse(localStorage.getItem(`bmiData_${username}`));
            if (bmiData) {
                document.getElementById('bmiResultDashboard').innerHTML = `Your BMI: <strong>${bmiData.bmi}</strong> (${bmiData.bmiCategory})`;
                document.getElementById('bmiNeedleDashboard').style.left = `${bmiData.position}%`;
            }
        }
    }

    function updateBMIDashboard(weight, height) {
        let bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        let bmiCategory = "";
        let position = 50;

        if (bmi < 18.5) {
            bmiCategory = "Underweight";
            position = 10;
        } else if (bmi >= 18.5 && bmi < 24.9) {
            bmiCategory = "Normal";
            position = 40;
        } else if (bmi >= 25 && bmi < 29.9) {
            bmiCategory = "Overweight";
            position = 70;
        } else {
            bmiCategory = "Obese";
            position = 90;
        }

        document.getElementById('bmiResultDashboard').innerHTML = `Your BMI: <strong>${bmi}</strong> (${bmiCategory})`;
        document.getElementById('bmiNeedleDashboard').style.left = `${position}%`;
    }

    const calorieProteinChart = new Chart(ctx, chartConfig);

    async function fetchChartData() {
        try {
            const username = localStorage.getItem('currentUser');
            const response = await fetch(`/get-weekly-data?username=${encodeURIComponent(username)}`);
            const data = await response.json();
            
            const calorieData = validateData(data.calorieData);
            const proteinData = validateData(data.proteinData).map((protein, index) => {
                return Math.min(protein, calorieData[index]);
            });

            return {
                calorieData: calorieData,
                proteinData: proteinData
            };
        } catch (error) {
            console.error('Fetch error:', error);
            return { calorieData: [], proteinData: [] };
        }
    }

    function validateData(dataArray) {
        return Array.isArray(dataArray) && dataArray.length === 7 
            ? dataArray 
            : [0, 0, 0, 0, 0, 0, 0];
    }

    function updateChart(data) {
        if (calorieProteinChart) {
            calorieProteinChart.data.datasets[0].data = data.calorieData;
            calorieProteinChart.data.datasets[1].data = data.proteinData;
            calorieProteinChart.update();
        }
    }

    async function refreshChart() {
        const data = await fetchChartData();
        updateChart(data);
    }

    loadBMIData();
    refreshChart();

    setInterval(refreshChart, 30000);

    document.getElementById('refreshChart')?.addEventListener('click', refreshChart);
    
    const logoutLinks = document.querySelectorAll('a[href="./login.html"], a[href="login.html"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const username = localStorage.getItem("currentUser");
            if (username) {
                localStorage.removeItem(`profile_${username}`);
                localStorage.removeItem(`bmiData_${username}`);
            }
            localStorage.removeItem("currentUser");
        });
    });
});

