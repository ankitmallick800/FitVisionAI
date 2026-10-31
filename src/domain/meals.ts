export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";
export type MealDiet = "vegan" | "vegetarian" | "eggetarian" | "non_vegetarian";

export interface Meal {
  id: string;
  name: string;
  slot: MealSlot;
  diets: MealDiet[];
  allergens: string[];
  needs: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  items: string[];
}

export const MEALS: Meal[] = [
  { id: "poha", name: "Vegetable poha", slot: "breakfast", diets: ["vegan"], allergens: [], needs: ["veg"], kcal: 340, protein: 8, carbs: 52, fat: 10, time: "7:30–9:00", items: ["Poha with peas, onion, and curry leaves", "Lemon", "A piece of fruit"] },
  { id: "idli", name: "Idli and sambar", slot: "breakfast", diets: ["vegan"], allergens: [], needs: ["rice", "dal"], kcal: 320, protein: 12, carbs: 58, fat: 5, time: "7:30–9:00", items: ["Two idlis", "Sambar", "Coconut chutney if you tolerate it"] },
  { id: "oats-dairy", name: "Oats with milk and fruit", slot: "breakfast", diets: ["vegetarian"], allergens: ["dairy", "gluten"], needs: ["oats", "dairy", "fruit"], kcal: 390, protein: 16, carbs: 56, fat: 10, time: "7:30–9:00", items: ["Rolled oats cooked in milk", "Fruit", "A spoon of seeds if you have them"] },
  { id: "dal-chilla", name: "Moong dal chilla", slot: "breakfast", diets: ["vegan"], allergens: [], needs: ["dal", "veg"], kcal: 310, protein: 16, carbs: 40, fat: 8, time: "7:30–9:00", items: ["Two moong dal chillas", "Mint chutney or plain yogurt alternative", "Fruit"] },
  { id: "eggs-roti", name: "Egg bhurji and roti", slot: "breakfast", diets: ["eggetarian"], allergens: ["egg", "gluten"], needs: ["eggs", "roti"], kcal: 430, protein: 24, carbs: 36, fat: 18, time: "7:30–9:00", items: ["Two-egg bhurji with vegetables", "One roti", "Fruit"] },
  { id: "besan", name: "Besan chilla", slot: "breakfast", diets: ["vegan"], allergens: [], needs: ["veg"], kcal: 300, protein: 14, carbs: 36, fat: 10, time: "7:30–9:00", items: ["Besan chilla with onion and tomato", "Fruit"] },
  { id: "rajma", name: "Rajma and rice", slot: "lunch", diets: ["vegan"], allergens: [], needs: ["rice", "veg"], kcal: 620, protein: 22, carbs: 96, fat: 12, time: "12:30–2:00", items: ["Rajma", "Rice", "Salad or cooked vegetables"] },
  { id: "dal-roti", name: "Dal, roti, and curd", slot: "lunch", diets: ["vegetarian"], allergens: ["dairy", "gluten"], needs: ["dal", "roti", "dairy", "veg"], kcal: 580, protein: 24, carbs: 78, fat: 16, time: "12:30–2:00", items: ["Two rotis", "Dal", "Cooked vegetables", "A small bowl of curd"] },
  { id: "dal-rice", name: "Dal, rice, and vegetables", slot: "lunch", diets: ["vegan"], allergens: [], needs: ["dal", "rice", "veg"], kcal: 560, protein: 20, carbs: 90, fat: 10, time: "12:30–2:00", items: ["Rice", "Dal", "A large serving of vegetables"] },
  { id: "paneer", name: "Paneer, roti, and salad", slot: "lunch", diets: ["vegetarian"], allergens: ["dairy", "gluten"], needs: ["dairy", "roti", "veg"], kcal: 640, protein: 32, carbs: 58, fat: 28, time: "12:30–2:00", items: ["Paneer bhurji", "Two rotis", "Salad"] },
  { id: "chicken", name: "Chicken, roti, and vegetables", slot: "lunch", diets: ["non_vegetarian"], allergens: ["gluten"], needs: ["chicken", "roti", "veg"], kcal: 610, protein: 42, carbs: 52, fat: 20, time: "12:30–2:00", items: ["Grilled or curry chicken", "Two rotis", "Vegetables"] },
  { id: "fish", name: "Fish curry and rice", slot: "lunch", diets: ["non_vegetarian"], allergens: ["fish"], needs: ["fish", "rice", "veg"], kcal: 590, protein: 36, carbs: 68, fat: 16, time: "12:30–2:00", items: ["Fish curry", "Rice", "Vegetables"] },
  { id: "chana", name: "Roasted chana and fruit", slot: "snack", diets: ["vegan"], allergens: [], needs: ["fruit"], kcal: 220, protein: 10, carbs: 32, fat: 5, time: "4:00–5:30", items: ["A handful of roasted chana", "Seasonal fruit"] },
  { id: "dahi", name: "Yogurt and fruit", slot: "snack", diets: ["vegetarian"], allergens: ["dairy"], needs: ["dairy", "fruit"], kcal: 200, protein: 10, carbs: 26, fat: 5, time: "4:00–5:30", items: ["Plain dahi or yogurt", "Fruit"] },
  { id: "makhana", name: "Makhana and fruit", slot: "snack", diets: ["vegan"], allergens: [], needs: ["fruit"], kcal: 190, protein: 5, carbs: 28, fat: 6, time: "4:00–5:30", items: ["Roasted makhana", "Fruit"] },
  { id: "sprouts", name: "Sprout chaat", slot: "snack", diets: ["vegan"], allergens: [], needs: ["veg"], kcal: 210, protein: 12, carbs: 30, fat: 4, time: "4:00–5:30", items: ["Moong sprouts", "Onion, tomato, and lemon"] },
  { id: "boiled-eggs", name: "Boiled eggs and fruit", slot: "snack", diets: ["eggetarian"], allergens: ["egg"], needs: ["eggs", "fruit"], kcal: 230, protein: 14, carbs: 18, fat: 10, time: "4:00–5:30", items: ["Two boiled eggs", "Fruit"] },
  { id: "khichdi", name: "Vegetable khichdi", slot: "dinner", diets: ["vegan"], allergens: [], needs: ["rice", "dal", "veg"], kcal: 480, protein: 18, carbs: 74, fat: 10, time: "7:30–9:00", items: ["Moong and rice khichdi", "A side of vegetables"] },
  { id: "dinner-dal", name: "Light dal, vegetables, and roti", slot: "dinner", diets: ["vegan"], allergens: ["gluten"], needs: ["dal", "roti", "veg"], kcal: 460, protein: 18, carbs: 68, fat: 10, time: "7:30–9:00", items: ["One or two rotis", "Dal", "A large vegetable serving"] },
  { id: "tofu", name: "Tofu, vegetables, and rice", slot: "dinner", diets: ["vegan"], allergens: ["soy"], needs: ["tofu", "rice", "veg"], kcal: 520, protein: 26, carbs: 62, fat: 16, time: "7:30–9:00", items: ["Tofu stir-fry", "A modest scoop of rice", "Vegetables"] },
  { id: "egg-curry", name: "Egg curry and salad", slot: "dinner", diets: ["eggetarian"], allergens: ["egg", "gluten"], needs: ["eggs", "roti", "veg"], kcal: 490, protein: 24, carbs: 42, fat: 22, time: "7:30–9:00", items: ["Egg curry", "One roti", "Salad or cooked vegetables"] },
  { id: "chicken-dinner", name: "Chicken, vegetables, and rice", slot: "dinner", diets: ["non_vegetarian"], allergens: [], needs: ["chicken", "rice", "veg"], kcal: 540, protein: 40, carbs: 48, fat: 16, time: "7:30–9:00", items: ["Chicken", "A modest scoop of rice", "Vegetables"] },
  { id: "paneer-dinner", name: "Paneer and vegetables", slot: "dinner", diets: ["vegetarian"], allergens: ["dairy", "gluten"], needs: ["dairy", "roti", "veg"], kcal: 520, protein: 28, carbs: 40, fat: 24, time: "7:30–9:00", items: ["Paneer", "One roti", "Vegetables"] },
];

export const SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};
