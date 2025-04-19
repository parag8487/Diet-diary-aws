document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const saveButton = document.getElementById('save-button');
    const deleteButton = document.getElementById('delete-button');
    const calculateButton = document.getElementById('calculate-button');

    // Save meal plan handler
    saveButton.addEventListener('click', async () => {
        const day = document.getElementById('day').value;
        const meals = {
            breakfast: {
                name: document.getElementById('breakfast').value.trim(),
                quantity: parseFloat(document.getElementById('breakfast-qty').value) || 100
            },
            lunch: {
                name: document.getElementById('lunch').value.trim(),
                quantity: parseFloat(document.getElementById('lunch-qty').value) || 100
            },
            dinner: {
                name: document.getElementById('dinner').value.trim(),
                quantity: parseFloat(document.getElementById('dinner-qty').value) || 100
            }
        };

        try {
            const nutritionData = await getFoodNutrition();
            
            const mealPlanData = {
                meals,
                totalCalories: calculateCalories(nutritionData, meals),
                totalProtein: calculateProtein(nutritionData, meals)
            };

            const response = await fetch('https://diet-diary-3yg2.onrender.com/save-data', {
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
                quantity: parseFloat(document.getElementById('breakfast-qty').value) || 100
            },
            lunch: {
                name: document.getElementById('lunch').value.trim(),
                quantity: parseFloat(document.getElementById('lunch-qty').value) || 100
            },
            dinner: {
                name: document.getElementById('dinner').value.trim(),
                quantity: parseFloat(document.getElementById('dinner-qty').value) || 100
            }
        };

        try {
            const nutritionData = await getFoodNutrition();
            const totalCalories = calculateCalories(nutritionData, meals);
            const totalProtein = calculateProtein(nutritionData, meals);

            document.getElementById('total-calories').textContent = totalCalories.toFixed(1);
            document.getElementById('total-protein').textContent = totalProtein.toFixed(1);

            // Calorie comparison logic
            const requiredCaloriesStr = localStorage.getItem("requiredCalories");
            if (requiredCaloriesStr) {
                const requiredCalories = parseFloat(requiredCaloriesStr);
                if (!isNaN(requiredCalories)) {
                    const totalCaloriesNum = totalCalories;
                    let message;
                    if (totalCaloriesNum < requiredCalories) {
                        message = `You have ${Math.round(requiredCalories - totalCaloriesNum)} calories remaining to reach your goal. (${totalCaloriesNum.toFixed(0)}/${requiredCalories.toFixed(0)})`;
                    } else if (totalCaloriesNum > requiredCalories) {
                        message = `You're ${Math.round(totalCaloriesNum - requiredCalories)} calories over your daily limit (${totalCaloriesNum.toFixed(0)}/${requiredCalories.toFixed(0)})`;
                    } else {
                        message = `Perfect match! ${totalCaloriesNum.toFixed(0)} calories`;
                    }
                    document.getElementById('suggestion-box').innerHTML = message;
                }
            }
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
                if (food.title && !isNaN(food.calories)) {
                    acc[food.title] = {
                        name: food.title,
                        calories: parseFloat(food.calories),
                        protein: parseFloat(food.protein || 0),
                        servingSize: 100
                    };
                }
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
            return nutrition ? total + (nutrition.calories * (meal.quantity / 100)) : total;
        }, 0);
    }

    function calculateProtein(nutritionData, meals) {
        return Object.values(meals).reduce((total, meal) => {
            const nutrition = nutritionData[meal.name];
            return nutrition ? total + (nutrition.protein * (meal.quantity / 100)) : total;
        }, 0);
    }

    // Food suggestions loader
    async function loadFoodSuggestions() {
        try {
            const nutritionData = await getFoodNutrition();
            const foodItems = Object.keys(nutritionData);
            
            ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
                const datalist = document.getElementById(`${mealType}-options`);
                if (datalist) {
                    datalist.innerHTML = foodItems.map(food => 
                        `<option value="${food}">${food}</option>`
                    ).join('');
                }
            });
        } catch (error) {
            console.error('Failed to load food suggestions:', error);
        }
    }

    // Improved Meal Suggestions
    async function loadMealSuggestions() {
        try {
            const requiredCalories = parseFloat(localStorage.getItem("requiredCalories"));
            if (isNaN(requiredCalories)) {
                showSuggestionMessage("Upadte your profile");
                return;
            }

            const nutritionData = await getFoodNutrition();
            const allFoods = Object.values(nutritionData)
                .filter(food => food?.calories && !isNaN(food.calories));

            if (allFoods.length < 3) {
                showSuggestionMessage("Need at least 3 food items to generate meals");
                return;
            }

            const suggestions = [];
            const seenCombos = new Set();
            const MAX_ATTEMPTS = 100;
            const CALORIE_TOLERANCE = requiredCalories * 0.2; // 20% tolerance
            const MIN_PROTEIN_RATIO = 0.15; // At least 15% of calories from protein

            for (let i = 0; i < MAX_ATTEMPTS && suggestions.length < 10; i++) {
                // Shuffle foods for variety
                const shuffled = [...allFoods].sort(() => Math.random() - 0.5);
                const combo = shuffled.slice(0, 3);
                
                // Create unique key for combination
                const comboKey = combo.map(f => f.name).sort().join('|');
                if (seenCombos.has(comboKey)) continue;
                seenCombos.add(comboKey);

                const totalCalories = combo.reduce((sum, food) => sum + food.calories, 0);
                const totalProtein = combo.reduce((sum, food) => sum + food.protein, 0);
                const proteinCalories = totalProtein * 4;
                const proteinRatio = proteinCalories / totalCalories;

                // Check if meets criteria
                if (Math.abs(totalCalories - requiredCalories) <= CALORIE_TOLERANCE && 
                    proteinRatio >= MIN_PROTEIN_RATIO) {
                    suggestions.push({
                        foods: combo,
                        totalCalories,
                        totalProtein,
                        difference: Math.abs(totalCalories - requiredCalories)
                    });
                }
            }

            if (suggestions.length === 0) {
                showSuggestionMessage(`No suitable meals found for ${requiredCalories.toFixed(0)} calories`);
                return;
            }

            // Sort by closest to target calories
            suggestions.sort((a, b) => a.difference - b.difference);
            displayMealSuggestions(suggestions.slice(0, 10), requiredCalories);
        } catch (error) {
            console.error('Suggestion error:', error);
            showSuggestionMessage("Failed to load suggestions");
        }
    }

    function displayMealSuggestions(suggestions, targetCalories) {
        const suggestionsList = document.getElementById('suggestions-list');
        if (!suggestionsList) return;

        suggestionsList.innerHTML = suggestions.map((meal, index) => `
            <div class="suggestion-item">
                <div class="suggestion-header">
                    <h5>Meal ${index + 1}</h5>
                    <span class="calorie-badge">
                        ${Math.round(meal.totalCalories)} cal
                        <small>(${Math.round(meal.difference)} ${meal.totalCalories < targetCalories ? 'under' : 'over'})</small>
                    </span>
                </div>
                <div class="meal-details">
                    ${meal.foods.map(food => `
                        <div class="food-item">
                            <span class="food-name">${food.name}</span>
                            <span class="food-info">
                                100g: ${Math.round(food.calories)} cal, 
                                ${Math.round(food.protein)}g protein
                                (${Math.round((food.protein * 4 / food.calories) * 100)}% protein)
                            </span>
                        </div>
                    `).join('')}
                    <div class="meal-summary">
                        <strong>Total:</strong> 
                        ${Math.round(meal.totalCalories)} calories, 
                        ${Math.round(meal.totalProtein)}g protein
                        (${Math.round((meal.totalProtein * 4 / meal.totalCalories) * 100)}% protein)
                    </div>
                </div>
                <div class="progress mt-2">
                    <div class="progress-bar" 
                         style="width: ${Math.min(100, (meal.totalCalories / targetCalories) * 100)}%"
                         role="progressbar">
                    </div>
                </div>
            </div>
        `).join('');

        const suggestionText = document.getElementById('suggestion-text');
        if (suggestionText) {
            suggestionText.style.display = 'none';
        }
        suggestionsList.style.display = 'block';
    }

    function showSuggestionMessage(message) {
        const suggestionText = document.getElementById('suggestion-text');
        const suggestionsList = document.getElementById('suggestions-list');
        
        if (suggestionText) {
            suggestionText.textContent = message;
            suggestionText.style.display = 'block';
        }
        if (suggestionsList) {
            suggestionsList.style.display = 'none';
        }
    }

    // Initialize
    loadFoodSuggestions();
    loadMealSuggestions();

    // Event listeners
    document.querySelectorAll('.food-input').forEach(input => {
        input.addEventListener('focus', loadFoodSuggestions);
    });
});
