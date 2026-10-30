import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getProfileForMeals } from '../services/profileService';
import { loadAccountProfile } from '../services/remoteProfileService';

export function toMealProfile(account) {
  if (!account) return null;
  return {
    dietaryRestrictions: account.dietaryRestrictions || [],
    allergies: account.allergies || [],
    mealPreferences: account.mealPreferences || { preferredCategories: [], dislikedIngredients: [] },
    nutritionalPreference: account.nutritionalPreference || null,
    nutritionalPreferences: account.nutritionalPreferences || [],
    nutritionTargets: account.nutritionTargets || {},
    healthConditions: account.healthConditions || [],
  };
}

export function useMealProfile(user) {
  const userId = user?.id;
  const local = userId ? getProfileForMeals(userId) : null;
  const [remote, setRemote] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);

  useFocusEffect(useCallback(() => {
    if (!userId || getProfileForMeals(userId)) return undefined;
    let active = true;
    loadAccountProfile(user).then((account) => {
      if (!active) return;
      setRemote(toMealProfile(account));
      setLoadedFor(userId);
    }).catch(() => {
      if (!active) return;
      setRemote(null);
      setLoadedFor(userId);
    });
    return () => {
      active = false;
    };
  }, [user, userId]));

  if (local) return { profile: local, loading: false };
  if (!userId) return { profile: null, loading: false };
  if (loadedFor !== userId) return { profile: null, loading: true };
  return { profile: remote, loading: false };
}
