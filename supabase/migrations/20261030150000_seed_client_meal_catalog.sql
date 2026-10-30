create unique index if not exists meals_name_unique_idx on public.meals (name);

insert into public.meals (
  name, category, ingredients, allergens, calories, protein, carbs, fat, sodium, portion_size, price
)
values
  ('Chicken Adobo Bowl', 'Lunch', array['Chicken', 'Soy sauce'], array['Soy'], 520, 32, null, null, 780, null, 189),
  ('Sinigang na Hipon', 'Dinner', array['Shrimp', 'Tamarind'], array['Shellfish'], 380, 28, null, null, 620, null, 210),
  ('Tofu Veggie Stir-fry', 'Lunch', array['Tofu', 'Vegetables'], array['Soy'], 340, 18, null, null, 410, null, 165),
  ('Salmon Teriyaki Rice', 'Dinner', array['Salmon', 'Rice'], array['Soy', 'Gluten'], 560, 34, null, null, 690, null, 249),
  ('Oatmeal with Fruits', 'Breakfast', array['Oats', 'Fruit'], array['Gluten', 'Dairy'], 290, 10, 45, 6, 120, null, 120),
  ('Egg White Omelette', 'Breakfast', array['Egg', 'Cheese'], array['Egg', 'Dairy'], 250, 26, null, null, 380, null, 135),
  ('Greek Chickpea Salad', 'Lunch', array['Chickpea', 'Vegetables'], array[]::text[], 310, 14, null, null, 340, null, 155),
  ('Grilled Chicken Wrap', 'Snack', array['Chicken', 'Wrap'], array['Gluten', 'Dairy'], 410, 30, null, null, 720, null, 145),
  ('Chicken Tinola', 'Lunch', array['Chicken', 'Papaya', 'Ginger'], array[]::text[], 320, 28, 12, 15, 480, '1 bowl (350 g)', 120),
  ('Grilled Bangus', 'Dinner', array['Bangus', 'Tomato'], array[]::text[], 390, 28, 8, 18, 450, null, 195),
  ('Ampalaya Stir-fry', 'Lunch', array['Ampalaya', 'Egg'], array[]::text[], 180, 8, null, null, 320, '1 serving', 130),
  ('Chicken Satay', 'Dinner', array['Chicken', 'Peanut sauce', 'Peanut butter'], array[]::text[], 480, 32, null, null, 560, null, 205)
on conflict (name) do update set
  category = excluded.category,
  ingredients = excluded.ingredients,
  allergens = excluded.allergens,
  calories = excluded.calories,
  protein = excluded.protein,
  carbs = excluded.carbs,
  fat = excluded.fat,
  sodium = excluded.sodium,
  portion_size = excluded.portion_size,
  price = excluded.price,
  is_available = true,
  updated_at = now();
