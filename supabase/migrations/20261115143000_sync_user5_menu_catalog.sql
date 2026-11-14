-- Sync Supabase meal catalog with frontend MENU_CATALOG (USR-16/17/18/20, ADM-17/18, KIT-15, DEL-14).

alter table public.meals
  add column if not exists client_meal_key text;

drop index if exists public.meals_name_unique_idx;

create unique index if not exists meals_client_meal_key_idx
  on public.meals (client_meal_key);

create unique index if not exists meals_name_category_unique_idx
  on public.meals (name, category);

-- Backfill keys on legacy seed rows that match search fixture names (before new inserts).
update public.meals set client_meal_key = 'sample-tinola', price = 300, is_available = true, updated_at = now()
  where name = 'Chicken Tinola' and client_meal_key is null;
update public.meals set client_meal_key = 'sample-bangus', price = 300, is_available = true, updated_at = now()
  where name = 'Grilled Bangus' and client_meal_key is null;
update public.meals set client_meal_key = 'sample-satay', price = 300, is_available = true, updated_at = now()
  where name = 'Chicken Satay' and client_meal_key is null;
update public.meals set client_meal_key = 'sample-ampalaya', price = 300, is_available = true, updated_at = now()
  where name = 'Ampalaya Stir-fry' and client_meal_key is null;

-- Remove superseded demo catalog rows that are not in the current app menu.
update public.meals
set is_available = false, updated_at = now()
where name in (
  'Chicken Adobo Bowl',
  'Sinigang na Hipon',
  'Tofu Veggie Stir-fry',
  'Salmon Teriyaki Rice',
  'Oatmeal with Fruits',
  'Egg White Omelette',
  'Greek Chickpea Salad',
  'Grilled Chicken Wrap'
)
  and client_meal_key is null;

insert into public.meals (
  client_meal_key, name, description, category, ingredients, allergens,
  calories, protein, sodium, portion_size, price, is_available
)
values
  (
    'sugar-free-ube-pandesal', 'Sugar Free Ube Pandesal',
    'A ube-flavored pandesal sweetened without added sugar, suitable for diabetic-friendly plans.',
    'Breakfast', array['Whole wheat flour', 'Ube', 'Yeast', 'Stevia', 'Milk', 'Egg'],
    array['Wheat', 'Milk', 'Egg'], 190, 6, 450, '1 serving', 300, true
  ),
  (
    'traditional-pandesal', 'Traditional Pandesal',
    'Classic Filipino breakfast roll, baked fresh daily.',
    'Breakfast', array['Flour', 'Yeast', 'Sugar', 'Butter', 'Salt'],
    array['Wheat', 'Milk'], 210, 6, 450, '1 serving', 300, true
  ),
  (
    'whole-wheat-pandesal', 'Whole Wheat Pandesal',
    'Higher-fiber pandesal for steady morning energy.',
    'Breakfast', array['Whole wheat flour', 'Yeast', 'Honey', 'Salt'],
    array['Wheat'], 200, 8, 450, '1 serving', 300, true
  ),
  (
    'menu-monay', 'Monay',
    'Dense, slightly sweet Filipino bread roll.',
    'Breakfast', array['Flour', 'Yeast', 'Sugar', 'Butter'],
    array['Wheat', 'Milk', 'Egg'], 220, 7, 450, '1 serving', 300, true
  ),
  (
    'menu-spanish-bread', 'Spanish Bread',
    'Soft roll filled with buttery sugar crumbs.',
    'Breakfast', array['Flour', 'Butter', 'Sugar', 'Milk', 'Egg'],
    array['Wheat', 'Milk', 'Egg'], 240, 6, 450, '1 serving', 300, true
  ),
  (
    'menu-ensaymada', 'Ensaymada',
    'Sweet brioche topped with butter, sugar, and grated cheese.',
    'Breakfast', array['Flour', 'Butter', 'Sugar', 'Cheese', 'Egg'],
    array['Wheat', 'Milk', 'Egg'], 280, 8, 450, '1 serving', 300, true
  ),
  (
    'menu-cheese-bread', 'Cheese Bread',
    'Baked bread with melted cheese filling.',
    'Breakfast', array['Flour', 'Cheese', 'Butter', 'Milk', 'Egg'],
    array['Wheat', 'Milk', 'Egg'], 260, 10, 450, '1 serving', 300, true
  ),
  (
    'menu-piaya', 'Piaya',
    'Flat muscovado-filled pastry from Negros.',
    'Breakfast', array['Flour', 'Muscovado', 'Butter', 'Sesame'],
    array['Wheat', 'Sesame'], 230, 4, 450, '1 serving', 300, true
  ),
  (
    'plate-lunch-beef', 'Beef',
    'Beef lunch plate with Filipino cooking style and vegetable side.',
    'Lunch', array['Beef', 'Garlic', 'Onion', 'Vegetables'], array[]::text[],
    450, 32, 450, '1 serving', 300, true
  ),
  (
    'plate-lunch-pork', 'Pork',
    'Pork lunch plate with Filipino cooking style and vegetable side.',
    'Lunch', array['Pork', 'Garlic', 'Onion', 'Vegetables'], array[]::text[],
    420, 30, 450, '1 serving', 300, true
  ),
  (
    'plate-lunch-chicken', 'Chicken',
    'Chicken lunch plate with Filipino cooking style and vegetable side.',
    'Lunch', array['Chicken', 'Garlic', 'Ginger', 'Vegetables'], array[]::text[],
    320, 28, 450, '1 serving', 300, true
  ),
  (
    'plate-lunch-fish', 'Fish',
    'Fish lunch plate with Filipino cooking style and vegetable side.',
    'Lunch', array['Fish', 'Tomato', 'Vegetables'], array[]::text[],
    390, 28, 450, '1 serving', 300, true
  ),
  (
    'plate-lunch-veg-steamed', 'Steamed',
    'Steamed vegetable plate with optional protein.',
    'Lunch', array['Mixed vegetables', 'Garlic'], array[]::text[],
    220, 8, 450, '1 serving', 300, true
  ),
  (
    'plate-lunch-veg-stir-fried', 'Stir-fried',
    'Stir-fried vegetable plate with optional protein.',
    'Lunch', array['Mixed vegetables', 'Garlic', 'Onion'], array[]::text[],
    260, 10, 450, '1 serving', 300, true
  ),
  (
    'plate-lunch-veg-pinakbet', 'Pinakbet',
    'Pinakbet vegetable plate with optional protein.',
    'Lunch', array['Sitaw', 'Eggplant', 'Okra', 'Ampalaya', 'Bagoong'],
    array['Shellfish'], 285, 12, 450, '1 serving', 300, true
  ),
  (
    'plate-dinner-beef', 'Beef',
    'Beef dinner plate with Filipino cooking style and vegetable side.',
    'Dinner', array['Beef', 'Garlic', 'Onion', 'Vegetables'], array[]::text[],
    450, 32, 450, '1 serving', 300, true
  ),
  (
    'plate-dinner-pork', 'Pork',
    'Pork dinner plate with Filipino cooking style and vegetable side.',
    'Dinner', array['Pork', 'Garlic', 'Onion', 'Vegetables'], array[]::text[],
    420, 30, 450, '1 serving', 300, true
  ),
  (
    'plate-dinner-chicken', 'Chicken',
    'Chicken dinner plate with Filipino cooking style and vegetable side.',
    'Dinner', array['Chicken', 'Garlic', 'Ginger', 'Vegetables'], array[]::text[],
    320, 28, 450, '1 serving', 300, true
  ),
  (
    'plate-dinner-fish', 'Fish',
    'Fish dinner plate with Filipino cooking style and vegetable side.',
    'Dinner', array['Fish', 'Tomato', 'Vegetables'], array[]::text[],
    390, 28, 450, '1 serving', 300, true
  ),
  (
    'plate-dinner-veg-steamed', 'Steamed',
    'Steamed vegetable plate with optional protein.',
    'Dinner', array['Mixed vegetables', 'Garlic'], array[]::text[],
    220, 8, 450, '1 serving', 300, true
  ),
  (
    'plate-dinner-veg-stir-fried', 'Stir-fried',
    'Stir-fried vegetable plate with optional protein.',
    'Dinner', array['Mixed vegetables', 'Garlic', 'Onion'], array[]::text[],
    260, 10, 450, '1 serving', 300, true
  ),
  (
    'plate-dinner-veg-pinakbet', 'Pinakbet',
    'Pinakbet vegetable plate with optional protein.',
    'Dinner', array['Sitaw', 'Eggplant', 'Okra', 'Ampalaya', 'Bagoong'],
    array['Shellfish'], 285, 12, 450, '1 serving', 300, true
  )
on conflict (client_meal_key) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  ingredients = excluded.ingredients,
  allergens = excluded.allergens,
  calories = excluded.calories,
  protein = excluded.protein,
  sodium = excluded.sodium,
  portion_size = excluded.portion_size,
  price = excluded.price,
  is_available = excluded.is_available,
  updated_at = now();

-- Dietitian and kitchen staff need to read catalog for order review (DIT-14/15, KIT-15).
drop policy if exists meals_staff_select on public.meals;
create policy meals_staff_select on public.meals for select using (public.is_staff());