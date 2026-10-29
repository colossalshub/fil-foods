export const CUISINES = ['All', 'Filipino', 'Asian', 'Western', 'Mediterranean'];
export const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
export const FILTER_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Soup', 'Fish'];
export const DIETS = ['Vegetarian', 'Vegan', 'Low-carb', 'High-protein'];
export const FILTER_RESTRICTIONS = ['Low-sodium', 'Low-sugar', 'Soft diet', 'Vegetarian', 'Vegan', 'Low-carb', 'High-protein'];
export const ALLERGENS = ['Peanuts', 'Shellfish', 'Dairy', 'Gluten', 'Egg', 'Soy'];

export const MEALS = [
  {
    id: '1', name: 'Chicken Adobo Bowl', cuisine: 'Filipino', category: 'Lunch',
    diets: ['High-protein'], allergens: ['Soy'], calories: 520, protein: 32, sodium: 780, price: 189, emoji: '🍗',
    mealCategories: [], dietaryTags: [], ingredients: ['Chicken', 'Soy sauce'],
  },
  {
    id: '2', name: 'Sinigang na Hipon', cuisine: 'Filipino', category: 'Dinner',
    diets: ['Low-carb'], allergens: ['Shellfish'], calories: 380, protein: 28, sodium: 620, price: 210, emoji: '🍲',
    mealCategories: ['Soup'], dietaryTags: [], ingredients: ['Shrimp', 'Tamarind'],
  },
  {
    id: '3', name: 'Tofu Veggie Stir-fry', cuisine: 'Asian', category: 'Lunch',
    diets: ['Vegan', 'Vegetarian', 'Low-carb'], allergens: ['Soy'], calories: 340, protein: 18, sodium: 410, price: 165, emoji: '🥦',
    mealCategories: [], dietaryTags: ['Vegetarian'], ingredients: ['Tofu', 'Vegetables'],
  },
  {
    id: '4', name: 'Salmon Teriyaki Rice', cuisine: 'Asian', category: 'Dinner',
    diets: ['High-protein'], allergens: ['Soy', 'Gluten'], calories: 560, protein: 34, sodium: 690, price: 249, emoji: '🍣',
    mealCategories: ['Fish'], dietaryTags: [], ingredients: ['Salmon', 'Rice'],
  },
  {
    id: '5', name: 'Oatmeal with Fruits', cuisine: 'Western', category: 'Breakfast',
    diets: ['Vegetarian'], allergens: ['Gluten', 'Dairy'], calories: 290, protein: 10, carbs: 45, fat: 6, sodium: 120, price: 120, emoji: '🥣',
    mealCategories: [], dietaryTags: ['Low-sodium', 'Vegetarian'], ingredients: ['Oats', 'Fruit'],
  },
  {
    id: '6', name: 'Egg White Omelette', cuisine: 'Western', category: 'Breakfast',
    diets: ['Vegetarian', 'High-protein', 'Low-carb'], allergens: ['Egg', 'Dairy'], calories: 250, protein: 26, sodium: 380, price: 135, emoji: '🍳',
    mealCategories: [], dietaryTags: [], ingredients: ['Egg', 'Cheese'],
  },
  {
    id: '7', name: 'Greek Chickpea Salad', cuisine: 'Mediterranean', category: 'Lunch',
    diets: ['Vegan', 'Vegetarian'], allergens: [], calories: 310, protein: 14, sodium: 340, price: 155, emoji: '🥗',
    mealCategories: [], dietaryTags: ['Vegetarian'], ingredients: ['Chickpea', 'Vegetables'],
  },
  {
    id: '8', name: 'Grilled Chicken Wrap', cuisine: 'Mediterranean', category: 'Snack',
    diets: ['High-protein'], allergens: ['Gluten', 'Dairy'], calories: 410, protein: 30, sodium: 720, price: 145, emoji: '🌯',
    mealCategories: [], dietaryTags: [], ingredients: ['Chicken', 'Wrap'],
  },
  {
    id: 'sample-tinola', name: 'Chicken Tinola', cuisine: 'Filipino', category: 'Lunch',
    diets: ['High-protein'], allergens: [], calories: 320, protein: 28, carbs: 12, fat: 15, sodium: 480,
    price: 120, portion: '1 bowl (350 g)', emoji: '🍲',
    mealCategories: ['Soup'], dietaryTags: ['Low-sodium'], ingredients: ['Chicken', 'Papaya', 'Ginger'],
  },
  {
    id: 'sample-bangus', name: 'Grilled Bangus', cuisine: 'Filipino', category: 'Dinner',
    diets: ['High-protein'], allergens: [], calories: 390, protein: 28, carbs: 8, fat: 18, sodium: 450, price: 195, emoji: '🐟',
    mealCategories: ['Fish'], dietaryTags: ['Low-sodium'], ingredients: ['Bangus', 'Tomato'],
  },
  {
    id: 'sample-ampalaya', name: 'Ampalaya Stir-fry', cuisine: 'Filipino', category: 'Lunch',
    diets: ['Vegetarian'], allergens: [], calories: 180, protein: 8, sodium: 320, price: 130, emoji: '🥬',
    mealCategories: [], dietaryTags: ['Vegetarian'], ingredients: ['Ampalaya', 'Egg'],
  },
  {
    id: 'sample-satay', name: 'Chicken Satay', cuisine: 'Asian', category: 'Dinner',
    diets: ['High-protein'], allergens: ['Peanuts'], calories: 480, protein: 32, sodium: 560, price: 205, emoji: '🍢',
    mealCategories: [], dietaryTags: [], ingredients: ['Chicken', 'Peanut sauce'],
  },
];
