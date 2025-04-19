document.addEventListener("DOMContentLoaded", function () {
    const addFoodForm = document.getElementById("addFoodForm");
    const foodList = document.querySelector(".food-list");

    // Load existing foods on page load
    async function loadFoods() {
        try {
            const response = await fetch('http://localhost:3000/api/foods');
            const foods = await response.json();
            
            foodList.innerHTML = ''; // Clear existing items
            foods.forEach(food => {
                foodList.appendChild(createFoodRow(food));
            });
        } catch (error) {
            console.error('Error loading foods:', error);
            alert('Failed to load food items. Please try again later.');
        }
    }

    // Create food row element
    function createFoodRow(food) {
        const row = document.createElement("div");
        row.className = "row align-items-center py-2 border-bottom";
        row.innerHTML = `
            <div class="col-2">
                <img src="${food.imageUrl}" alt="${food.title}" class="img-fluid food-image" />
            </div>
            <div class="col-4">${food.title}</div>
            <div class="col-2">${food.calories}</div>
            <div class="col-1">${food.carbs}g</div>
            <div class="col-1">${food.fat}g</div>
            <div class="col-2">${food.protein}g</div>
        `;
        return row;
    }

    // Handle form submission
    addFoodForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Get input values
        const imageUrl = document.getElementById("imageUrl").value.trim();
        const title = document.getElementById("title").value.trim();
        const calories = document.getElementById("calories").value.trim();
        const carbs = document.getElementById("carbs").value.trim();
        const fat = document.getElementById("fat").value.trim();
        const protein = document.getElementById("protein").value.trim();

        // Validation
        if (!imageUrl || !title || !calories || !carbs || !fat || !protein) {
            alert("Please fill out all fields.");
            return;
        }

        try {
            // Send data to server
            const response = await fetch('http://localhost:3000/api/foods', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageUrl,
                    title,
                    calories,
                    carbs,
                    fat,
                    protein
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save food item');
            }

            // Add new item to the list
            const newFood = await response.json();
            foodList.appendChild(createFoodRow(newFood));
            
            // Clear form
            addFoodForm.reset();

        } catch (error) {
            console.error('Error:', error);
            alert('Error saving food item. Please try again.');
        }
    });

    // Initial load of food items
    loadFoods();
});