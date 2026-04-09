document.addEventListener("DOMContentLoaded", function () {
    const addFoodForm = document.getElementById("addFoodForm");
    const foodList = document.querySelector(".food-list");

    // Load existing foods on page load
    async function loadFoods() {
        try {
            const response = await fetch('/api/foods');
            const foods = await response.json();
            
            foodList.innerHTML = '';
            foods.forEach(food => {
                foodList.appendChild(createFoodRow(food));
            });
        } catch (error) {
            console.error('Error loading foods:', error);
            alert('Failed to load food items. Please try again later.');
        }
    }

    
    function createFoodRow(food) {
        const row = document.createElement("div");
        row.className = "row align-items-center py-2 border-bottom";
        row.innerHTML = `
            <div class="col-2">
                <img src="${food.url || food.imageUrl}" alt="${food.title}" class="img-fluid food-image" />
            </div>
            <div class="col-4">${food.title}</div>
            <div class="col-2">${food.calories}</div>
            <div class="col-1">${food.carbs}g</div>
            <div class="col-1">${food.fat}g</div>
            <div class="col-2">${food.protein}g</div>
        `;
        return row;
    }

    
    addFoodForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        
        const imageUrl = document.getElementById("imageUrl").value.trim();
        const title = document.getElementById("title").value.trim();
        const calories = document.getElementById("calories").value.trim();
        const carbs = document.getElementById("carbs").value.trim();
        const fat = document.getElementById("fat").value.trim();
        const protein = document.getElementById("protein").value.trim();

        
        if (!imageUrl || !title || !calories || !carbs || !fat || !protein) {
            alert("Please fill out all fields.");
            return;
        }

        try {
            
            const response = await fetch('/api/save-food', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: imageUrl,
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

            
            const newFood = await response.json();
            foodList.appendChild(createFoodRow(newFood));
            
            
            addFoodForm.reset();

        } catch (error) {
            console.error('Error:', error);
            alert('Error saving food item. Please try again.');
        }
    });

    
    loadFoods();
});
