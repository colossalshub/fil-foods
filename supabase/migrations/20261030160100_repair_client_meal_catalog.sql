insert into public.meals (
  name, category, ingredients, allergens, calories, protein, carbs, fat, sodium, portion_size, price
)
values (
  'Ampalaya Stir-fry',
  'Lunch',
  array['Ampalaya', 'Egg'],
  array[]::text[],
  180,
  8,
  null,
  null,
  320,
  '1 serving',
  130
)
on conflict (name) do update set
  category = excluded.category,
  ingredients = excluded.ingredients,
  allergens = excluded.allergens,
  calories = excluded.calories,
  protein = excluded.protein,
  sodium = excluded.sodium,
  portion_size = excluded.portion_size,
  price = excluded.price,
  is_available = true,
  updated_at = now();
