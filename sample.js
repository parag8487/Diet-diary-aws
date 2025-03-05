document.addEventListener('DOMContentLoaded', function () {
    const saveButton = document.getElementById('save-button');
    const deleteButton = document.getElementById('delete-button');
    const calculateButton = document.getElementById('calculate-button');

    // Save meal plan handler
    saveButton.addEventListener('click', async () => {
        const day = document.getElementById('day').value;
        const meals = {
            breakfast: {
                name: document.getElementById('breakfast').value.trim(),
                quantity: parseFloat(document.getElementById('breakfast-qty').value) || 1
            },
            lunch: {
                name: document.getElementById('lunch').value.trim(),
                quantity: parseFloat(document.getElementById('lunch-qty').value) || 1
            },
            dinner: {
                name: document.getElementById('dinner').value.trim(),
                quantity: parseFloat(document.getElementById('dinner-qty').value) || 1
            }
        };

        try {
            const nutritionData = await getFoodNutrition();
            
            const mealPlanData = {
                meals,
                totalCalories: calculateCalories(nutritionData, meals),
                totalProtein: calculateProtein(nutritionData, meals)
            };

            const response = await fetch('http://localhost:3000/save-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day, data: mealPlanData }),
            });

            response.ok ? alert('Meal plan saved successfully!') : alert('Error: ' + await response.text());
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save meal plan. Check console for details.');
        }
    });

    // Delete handler
    deleteButton.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to delete all meal data?")) return;
        
        try {
            const response = await fetch('http://localhost:3000/delete-data', { method: 'DELETE' });
            response.ok ? alert('All meal data deleted!') : alert('Delete failed: ' + await response.text());
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete data. Check console.');
        }
    });

    // Calculate handler
    calculateButton.addEventListener('click', async () => {
        const meals = {
            breakfast: {
                name: document.getElementById('breakfast').value.trim(),
                quantity: parseFloat(document.getElementById('breakfast-qty').value) || 1
            },
            lunch: {
                name: document.getElementById('lunch').value.trim(),
                quantity: parseFloat(document.getElementById('lunch-qty').value) || 1
            },
            dinner: {
                name: document.getElementById('dinner').value.trim(),
                quantity: parseFloat(document.getElementById('dinner-qty').value) || 1
            }
        };

        try {
            const nutritionData = await getFoodNutrition();
            document.getElementById('total-calories').textContent = 
                calculateCalories(nutritionData, meals).toFixed(1);
            document.getElementById('total-protein').textContent = 
                calculateProtein(nutritionData, meals).toFixed(1);
        } catch (error) {
            console.error('Calculation error:', error);
            alert('Failed to calculate nutrients. Check console.');
        }
    });

    // Nutrition data loader
    async function getFoodNutrition() {
        try {
            const [sqlFoods, jsonFoods] = await Promise.all([
                fetch('http://localhost:3000/get-food/all').then(r => r.json()),
                fetch('http://localhost:3000/api/foods').then(r => r.json())
            ]);
            
            return [...sqlFoods, ...jsonFoods].reduce((acc, food) => {
                acc[food.title] = {
                    calories: parseFloat(food.calories) || 0,
                    protein: parseFloat(food.protein) || 0,
                    servingSize: parseFloat(food.servingSize) || 1
                };
                return acc;
            }, {});
        } catch (error) {
            console.error('Nutrition data error:', error);
            return {};
        }
    }

    // Calculation functions
    function calculateCalories(nutritionData, meals) {
        return Object.values(meals).reduce((total, meal) => {
            const nutrition = nutritionData[meal.name];
            return total + (nutrition ? nutrition.calories * (meal.quantity / nutrition.servingSize) : 0);
        }, 0);
    }

    function calculateProtein(nutritionData, meals) {
        return Object.values(meals).reduce((total, meal) => {
            const nutrition = nutritionData[meal.name];
            return total + (nutrition ? nutrition.protein * (meal.quantity / nutrition.servingSize) : 0);
        }, 0);
    }

    // Load food suggestions
    async function loadFoodSuggestions() {
        try {
            const nutritionData = await getFoodNutrition();
            const foodItems = Object.keys(nutritionData);
            
            ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
                const datalist = document.getElementById(`${mealType}-options`);
                datalist.innerHTML = foodItems.map(food => 
                    `<option value="${food}">${food}</option>`
                ).join('');
            });
        } catch (error) {
            console.error('Failed to load food suggestions:', error);
        }
    }

    // Initial setup
    loadFoodSuggestions();
});