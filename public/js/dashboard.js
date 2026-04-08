document.addEventListener('DOMContentLoaded', function () {
    if (!localStorage.getItem('currentUser')) {
        window.location.href = 'login.html';
        return;
    }
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
                updateBMIDashboardDisplay(bmiData.bmi);
            }
        }
    }

    function updateBMIDashboard(weight, height) {
        let bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        updateBMIDashboardDisplay(bmi);
    }

    function updateBMIDashboardDisplay(bmi) {
        const bmiValueDisplay = document.getElementById("bmiValueDisplay");
        const bmiStatusText = document.getElementById("bmiStatusText");
        const bmiResultDashboard = document.getElementById('bmiResultDashboard');
        const category = getBMICategory(parseFloat(bmi));
        const color = getBMIColor(parseFloat(bmi));
        if (bmiValueDisplay && bmiStatusText) {
            bmiValueDisplay.textContent = bmi;
            bmiValueDisplay.style.background = `linear-gradient(45deg, ${color}, ${color}aa)`;
            bmiValueDisplay.style.webkitBackgroundClip = 'text';
            bmiValueDisplay.style.webkitTextFillColor = 'transparent';
            bmiValueDisplay.style.backgroundClip = 'text';
            bmiStatusText.textContent = category;
            bmiStatusText.style.color = color;
        } else if (bmiResultDashboard) {
            // fallback for legacy structure
            bmiResultDashboard.innerHTML = `Your BMI: <strong>${bmi}</strong> (${category})`;
        }
        updateBMINeedleDashboard(bmi);
    }

    function getBMICategory(bmi) {
        if (bmi < 18.5) return 'Underweight';
        if (bmi < 25) return 'Normal Weight';
        if (bmi < 30) return 'Overweight';
        return 'Obese';
    }
    function getBMIColor(bmi) {
        if (bmi < 18.5) return '#e74c3c';
        if (bmi < 25) return '#2ecc71';
        if (bmi < 30) return '#f39c12';
        return '#e74c3c';
    }
    function updateBMINeedleDashboard(bmi) {
        const needle = document.getElementById("bmiNeedleDashboard");
        const segments = document.querySelectorAll('.bmi-segment');
        const minBMI = 16;
        const maxBMI = 35;
        const clampedBMI = Math.min(Math.max(parseFloat(bmi), minBMI), maxBMI);
        const angle = ((clampedBMI - minBMI) / (maxBMI - minBMI)) * 180 - 90;
        if (needle) {
            needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        }
        segments.forEach(segment => segment.style.opacity = '0.6');
        if (bmi < 18.5) segments[0].style.opacity = '1';
        else if (bmi < 25) segments[1].style.opacity = '1';
        else if (bmi < 30) segments[2].style.opacity = '1';
        else segments[3].style.opacity = '1';
    }

    const calorieProteinChart = new Chart(ctx, chartConfig);

    async function fetchChartData() {
        try {
            const username = localStorage.getItem('currentUser');
            const response = await fetch(`/api/get-weekly-data?username=${encodeURIComponent(username)}`);
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
            localStorage.removeItem("currentUser");
        });
    });
});

