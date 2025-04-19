document.addEventListener("DOMContentLoaded", function () {
  const profileForm = document.getElementById("profileForm");
  const bmiNeedle = document.getElementById("bmiNeedle");
  const bmiResult = document.getElementById("bmiResult");
  const calorieResult = document.getElementById("calorieResult"); // New element for displaying daily calories

  // Load saved profile data
  function loadProfile() {
    const profile = JSON.parse(localStorage.getItem("profile")) || {};
    if (profile.name) document.getElementById("name").value = profile.name;
    if (profile.age) document.getElementById("age").value = profile.age;
    if (profile.sex) document.getElementById("sex").value = profile.sex;
    if (profile.weight) document.getElementById("weight").value = profile.weight;
    if (profile.height) document.getElementById("height").value = profile.height;

    if (profile.weight && profile.height) {
      updateBMI(profile.weight, profile.height);
    }
  }

  // Save profile data
  profileForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const age = document.getElementById("age").value;
    const sex = document.getElementById("sex").value;
    const weight = document.getElementById("weight").value;
    const height = document.getElementById("height").value;

    const profile = { name, age, sex, weight, height };
    localStorage.setItem("profile", JSON.stringify(profile));

    updateBMI(weight, height);
    alert("Profile saved successfully!");
  });

  // Calculate and update BMI
  function updateBMI(weight, height) {
    if (!weight || !height) return;

    let bmi = (weight / ((height / 100) ** 2)).toFixed(1);
    let bmiCategory = "";
    let position = 50;

    if (bmi < 18.5) {
      bmiCategory = "underweight";
      position = 10;
      calculateCalories("underweight");
    } else if (bmi >= 18.5 && bmi < 24.9) {
      bmiCategory = "normal";
      position = 40;
      calculateCalories("normal");
    } else if (bmi >= 25 && bmi < 29.9) {
      bmiCategory = "overweight";
      position = 70;
      calculateCalories("overweight");
    } else {
      bmiCategory = "obese";
      position = 90;
      calculateCalories("overweight");
    }

    bmiResult.innerHTML = `Your BMI: <strong>${bmi}</strong> (${bmiCategory})`;
    bmiNeedle.style.left = `${position}%`;

    // Save BMI data to localStorage
    localStorage.setItem("bmiData", JSON.stringify({ bmi, bmiCategory, position }));
  }

  // Calculate daily calorie requirement based on BMI
  function calculateCalories(bmiCategory) {
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);
    const age = parseInt(document.getElementById("age").value);
    const sex = document.getElementById("sex").value;

    if (!weight || !height || !age || !sex) return;

    // Basal Metabolic Rate (BMR) calculation using Mifflin-St Jeor equation
    let bmr;
    if (sex === "Male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Total Daily Energy Expenditure (TDEE) calculation with activity factor
    const activityFactor = 1.55;
    const tdee = bmr * activityFactor;

    // Adjusting calories based on BMI category
    let dailyCalories;
    let message;
    if (bmiCategory === "underweight") {
      dailyCalories = tdee + 500; // Add 500 calories for weight gain
      message = `To gain weight, you need <strong>${dailyCalories.toFixed(0)} kcal</strong> daily.`;
    } else if (bmiCategory === "overweight" || bmiCategory === "obese") {
      dailyCalories = tdee - 500; // Subtract 500 calories for weight loss
      message = `To lose weight, you need <strong>${dailyCalories.toFixed(0)} kcal</strong> daily.`;
    } else { // Normal
      dailyCalories = tdee;
      message = `To maintain weight, you need <strong>${dailyCalories.toFixed(0)} kcal</strong> daily.`;
    }

    calorieResult.innerHTML = message;

    // Store dailyCalories in local storage
    localStorage.setItem("requiredCalories", dailyCalories.toString());
  }

  loadProfile();
});