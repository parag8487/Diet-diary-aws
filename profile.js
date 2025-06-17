document.addEventListener("DOMContentLoaded", function () {
  const profileForm = document.getElementById("profileForm");
  const bmiNeedle = document.getElementById("bmiNeedle");
  const bmiResult = document.getElementById("bmiResult");
  const calorieResult = document.getElementById("calorieResult"); 

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

    localStorage.setItem("bmiData", JSON.stringify({ bmi, bmiCategory, position }));
  }

  function calculateCalories(bmiCategory) {
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);
    const age = parseInt(document.getElementById("age").value);
    const sex = document.getElementById("sex").value;

    if (!weight || !height || !age || !sex) return;

    let bmr;
    if (sex === "Male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const activityFactor = 1.55;
    const tdee = bmr * activityFactor;

    let dailyCalories;
    let message;
    if (bmiCategory === "underweight") {
      dailyCalories = tdee + 700; 
      message = `To gain weight, you need <strong>${dailyCalories.toFixed(0)} kcal</strong> daily.`;
    } else if (bmiCategory === "overweight" || bmiCategory === "obese") {
      dailyCalories = tdee - 700; 
      message = `To lose weight, you need <strong>${dailyCalories.toFixed(0)} kcal</strong> daily.`;
    } else { 
      dailyCalories = tdee;
      message = `To maintain weight, you need <strong>${dailyCalories.toFixed(0)} kcal</strong> daily.`;
    }

    calorieResult.innerHTML = message;

    localStorage.setItem("requiredCalories", dailyCalories.toString());
  }

  document.getElementById("weight").addEventListener("input", function() {
    const weight = this.value;
    const height = document.getElementById("height").value;
    if (weight && height) {
      updateBMI(weight, height);
    }
  });

  document.getElementById("height").addEventListener("input", function() {
    const height = this.value;
    const weight = document.getElementById("weight").value;
    if (weight && height) {
      updateBMI(weight, height);
    }
  });

  loadProfile();
});