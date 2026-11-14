import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import HelpButton from '../components/HelpButton';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMealProfile } from '../hooks/useMealProfile';
import { recipientDisplayName } from '../domain/audience';
import {
  COOKING_STYLES,
  MEAT_PROTEINS,
  ORDER_MSG,
  STANDARD_MEAL_PRICE,
  VEGETABLE_STYLES,
  formatPeso,
  isMealAvailable,
  lineSubtotal,
  parseQuantityInput,
  profileAllergensInMeal,
} from '../services/orderService';
import { MEAL_PHOTOS } from '../data/mealPhotos';
import type { Meal } from '../types';
import { colors, font, radius, spacing, control } from '../theme/theme';

export default function MealDetailScreen({ route, navigation }: {
  route: { params?: { meal?: Meal } };
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: object) => void;
    getParent?: () => { getParent?: () => { getParent?: () => { navigate: (name: string, params?: object) => void } | undefined } | undefined } | undefined;
  };
}) {
  const meal = route.params?.meal as Meal;
  const { user } = useAuth();
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const [quantityText, setQuantityText] = useState('1');
  const [qtyError, setQtyError] = useState('');
  const [vegetableStyle, setVegetableStyle] = useState('');
  const [meatProtein, setMeatProtein] = useState('');
  const [cookingStyle, setCookingStyle] = useState('');
  const recipientName = user?.accountFor === 'family' ? recipientDisplayName(user.mealRecipient) : '';

  const { profile } = useMealProfile(user);
  const available = isMealAvailable(meal);
  const allergens = profile ? profileAllergensInMeal(meal, profile) : [];
  const cartRow = items.find((row) => row.meal.id === meal.id);

  const parsedQty = parseQuantityInput(quantityText);
  const previewTotal = parsedQty.ok ? lineSubtotal(meal, parsedQty.value ?? 0) : null;

  const onQuantityChange = (text: string) => {
    setQuantityText(text);
    const result = parseQuantityInput(text);
    setQtyError(result.ok ? '' : (result.message || ''));
  };

  const needsAccount = !user?.id || user.role === 'visitor';

  const onAdd = () => {
    if (needsAccount) {
      Alert.alert('Log in to order', 'Create an account or log in before placing an order.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Log in', onPress: () => navigation.getParent?.()?.getParent?.()?.getParent?.()?.navigate('Login') },
      ]);
      return;
    }
    const result = parseQuantityInput(quantityText);
    if (!result.ok) {
      setQtyError(result.message || '');
      return;
    }
    if (!available) return;
    if (result.value !== 1) {
      setQtyError(ORDER_MSG.oneMealPerTime);
      return;
    }
    const customization = {
      vegetableStyle: vegetableStyle || undefined,
      meatProtein: meatProtein || undefined,
      cookingStyle: cookingStyle || undefined,
    };
    const error = addItem(meal, 1, customization);
    if (error) {
      setQtyError(error);
      return;
    }
    Alert.alert('Added to order', `${meal.name} is in your cart.`, [
      { text: 'Keep browsing', style: 'cancel' },
      { text: 'View order', onPress: () => navigation.navigate('Checkout') },
    ]);
  };

  const onUpdateCart = () => {
    const result = parseQuantityInput(quantityText);
    if (!result.ok) {
      setQtyError(result.message || '');
      return;
    }
    if (result.value !== 1) {
      setQtyError(ORDER_MSG.oneMealPerTime);
      return;
    }
    updateQuantity(meal.id, 1);
    Alert.alert('Updated', 'Quantity saved in your cart.');
  };

  const onRemove = () => {
    removeItem(meal.id);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{meal.name}</Text>
        <HelpButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {MEAL_PHOTOS[meal.id] ? (
            <Image
              source={MEAL_PHOTOS[meal.id]}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={`${meal.name} photo`}
            />
          ) : (
            <Text style={styles.emoji}>{meal.emoji}</Text>
          )}
        </View>
        <Text style={styles.category}>{meal.category}</Text>
        <Text style={styles.meta}>{meal.cuisine} · {formatPeso(STANDARD_MEAL_PRICE)}</Text>

        {!available ? (
          <Text style={styles.unavailable}>{ORDER_MSG.mealUnavailable}</Text>
        ) : null}

        {allergens.map((a) => (
          <Text key={a} style={styles.warn}>{ORDER_MSG.mealAllergen(a, recipientName)}</Text>
        ))}

        <Text style={styles.section}>Ingredients</Text>
        <Text style={styles.body}>{(meal.ingredients || []).join(', ')}</Text>

        <Text style={styles.section}>Allergens</Text>
        <Text style={styles.body}>
          {(meal.allergens || []).length ? (meal.allergens || []).join(', ') : 'None listed'}
        </Text>

        <Text style={styles.section}>Nutrition</Text>
        <Text style={styles.body}>
          {meal.calories} kcal · Protein {meal.protein} g
          {meal.carbs != null ? ` · Carbs ${meal.carbs} g` : ''}
          {meal.fat != null ? ` · Fat ${meal.fat} g` : ''}
          {' · Sodium '}{meal.sodium} mg
        </Text>

        <Text style={styles.section}>Portion</Text>
        <Text style={styles.body}>{meal.portion || '1 serving'}</Text>

        <Text style={styles.section}>Vegetables</Text>
        <View style={styles.choices}>
          {VEGETABLE_STYLES.map((style) => (
            <Pressable key={style} accessibilityRole="button" accessibilityLabel={style} onPress={() => setVegetableStyle(style)} style={[styles.choice, vegetableStyle === style && styles.choiceOn]}>
              <Text style={styles.choiceText}>{style}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>Meat</Text>
        <View style={styles.choices}>
          {MEAT_PROTEINS.map((protein) => (
            <Pressable key={protein} accessibilityRole="button" accessibilityLabel={protein} onPress={() => setMeatProtein(protein)} style={[styles.choice, meatProtein === protein && styles.choiceOn]}>
              <Text style={styles.choiceText}>{protein}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>Cooking style</Text>
        <View style={styles.choices}>
          {COOKING_STYLES.map((style) => (
            <Pressable key={style} accessibilityRole="button" accessibilityLabel={style} onPress={() => setCookingStyle(style)} style={[styles.choice, cookingStyle === style && styles.choiceOn]}>
              <Text style={styles.choiceText}>{style}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Quantity</Text>
        <Text style={styles.label}>Whole servings</Text>
        <TextInput
          style={[styles.input, qtyError ? styles.inputError : null]}
          value={quantityText}
          onChangeText={onQuantityChange}
          keyboardType="number-pad"
          editable={available}
          accessibilityLabel="Quantity"
        />
        {qtyError ? <Text style={styles.error}>{qtyError}</Text> : null}
        {previewTotal != null ? (
          <Text style={styles.lineTotal}>Line total: {formatPeso(previewTotal)}</Text>
        ) : null}

        {cartRow ? (
          <View style={styles.cartActions}>
            <AppButton title="Update quantity" onPress={onUpdateCart} disabled={!available} style={styles.actionBtn} />
            <AppButton title="Remove from order" variant="outline" onPress={onRemove} style={styles.actionBtn} />
          </View>
        ) : (
          <AppButton title="Add to order" onPress={onAdd} disabled={!available} style={styles.addBtn} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: font.lg, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', marginBottom: spacing.md },
  heroImage: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.surface },
  emoji: { fontSize: 64 },
  category: { fontSize: font.body, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.md, color: colors.muted, marginTop: 4 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: control.minHeight, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.soft },
  choiceText: { fontSize: font.body, color: colors.text },
  unavailable: { marginTop: spacing.md, color: colors.danger, fontSize: font.body },
  warn: { marginTop: spacing.sm, color: colors.danger, fontSize: font.body },
  section: { marginTop: spacing.lg, fontSize: font.body, fontWeight: '700', color: colors.primary },
  body: { marginTop: 6, fontSize: font.body, color: colors.text, lineHeight: 22 },
  label: { marginTop: spacing.sm, fontSize: font.md, color: colors.muted, marginBottom: 4 },
  input: {
    minHeight: control.minHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: font.body,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: font.md, marginTop: 4 },
  lineTotal: { marginTop: spacing.sm, fontSize: font.body, fontWeight: '600', color: colors.text },
  addBtn: { marginTop: spacing.xl },
  cartActions: { marginTop: spacing.xl, gap: spacing.sm },
  actionBtn: { marginTop: spacing.sm },
});
