import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, Modal, StyleSheet, ScrollView, Pressable, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import Chip from '../components/Chip';
import FormMessage from '../components/FormMessage';
import VerificationFlow from '../components/VerificationFlow';
import { TermsModal } from '../components/LegalModals';
import { useAuth } from '../context/AuthContext';
import { findTermsAcceptance, getPublicUser, logout } from '../services/authService';
import { MSG } from '../data/messages';
import {
  ALLERGY_PRESETS,
  DIETARY_RESTRICTIONS,
  HEALTH_CONDITIONS,
  NUTRITIONAL_OPTIONS,
  cancelPendingContactChange,
  getProfile,
  isAuditChainIntact,
  nutritionIdsFromProfile,
  readChangeHistory,
  removeGuardian,
  saveAllergies,
  saveDietaryRestrictions,
  saveGuardian,
  saveHealthConditions,
  saveMealPreferences,
  saveNutritionalPreference,
  savePersonalInfo,
} from '../services/profileService';
import { openHelp } from '../navigation/openHelp';
import {
  BIOMETRIC_FAIL_MESSAGE,
  confirmBiometricSessionWithPassword,
  disableBiometricUnlock,
  enableBiometricUnlock,
  biometricRequiresPassword,
  getBiometricDevice,
  getLastActiveAt,
  isBiometricOptionVisible,
  recordBiometricCheck,
  shouldPrompt,
  syncEnrollmentChange,
  touchLastActive,
} from '../services/biometricService';
import { colors, font, radius, spacing, touch } from '../theme/theme';

function fullName(profile) {
  return [profile.firstName, profile.middleName, profile.lastName, profile.suffix]
    .filter((part) => part && String(part).trim())
    .join(' ');
}

function Section({ title, children, onEdit, editLabel = 'Edit' }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
        {onEdit ? (
          <Pressable accessibilityRole="button" onPress={onEdit} style={styles.editHit}>
            <Text style={styles.editLink}>{editLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Line({ label, value }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, signIn, signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  void refreshKey;
  const profile = user?.id ? getProfile(user.id) : null;
  const [showTerms, setShowTerms] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [toast, setToast] = useState([]);

  const [personalOpen, setPersonalOpen] = useState(false);
  const [personalStep, setPersonalStep] = useState('form');
  const [personalForm, setPersonalForm] = useState({});
  const [personalDirty, setPersonalDirty] = useState(false);
  const [personalErrors, setPersonalErrors] = useState({});
  const [personalMessages, setPersonalMessages] = useState([]);
  const [verifyMeta, setVerifyMeta] = useState(null);
  const [verifyKey, setVerifyKey] = useState(0);
  const [discardPersonal, setDiscardPersonal] = useState(false);

  const [healthOpen, setHealthOpen] = useState(false);
  const [healthSelected, setHealthSelected] = useState([]);
  const [healthOther, setHealthOther] = useState('');

  const [dietOpen, setDietOpen] = useState(false);
  const [dietSelected, setDietSelected] = useState([]);
  const [dietOther, setDietOther] = useState('');

  const [allergyOpen, setAllergyOpen] = useState(false);
  const [allergyList, setAllergyList] = useState([]);
  const [allergyManual, setAllergyManual] = useState('');
  const [allergyNote, setAllergyNote] = useState('');

  const [mealPrefOpen, setMealPrefOpen] = useState(false);
  const [prefCategories, setPrefCategories] = useState('');
  const [disliked, setDisliked] = useState('');

  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [nutritionChoice, setNutritionChoice] = useState([]);
  const [targetCalories, setTargetCalories] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetFat, setTargetFat] = useState('');

  const [guardianOpen, setGuardianOpen] = useState(false);
  const [guardianForm, setGuardianForm] = useState({ name: '', relationship: '', contactNumber: '' });
  const [guardianMessages, setGuardianMessages] = useState([]);

  const [historyOpen, setHistoryOpen] = useState(false);

  const device = getBiometricDevice();
  const showBiometricOption = isBiometricOptionVisible(device);
  const biometricOn = Boolean(user?.biometricUnlock?.enabled);
  const [enableBioOpen, setEnableBioOpen] = useState(false);
  const [enableBioPassword, setEnableBioPassword] = useState('');
  const [enableBioMessages, setEnableBioMessages] = useState([]);
  const [bioNotice, setBioNotice] = useState([]);
  const [unlockBioOpen, setUnlockBioOpen] = useState(false);
  const [unlockBioPassword, setUnlockBioPassword] = useState('');
  const [unlockBioMessages, setUnlockBioMessages] = useState([]);
  const [unlockNeedsPassword, setUnlockNeedsPassword] = useState(false);

  const acceptance = findTermsAcceptance(user?.username);
  const history = user?.id ? readChangeHistory(user.id, user.id) : [];

  const reload = useCallback(() => {
    if (!user?.id) return;
    setRefreshKey((k) => k + 1);
    signIn(getPublicUser(user.id));
  }, [signIn, user]);

  useEffect(() => {
    if (!user?.id || !device.supported) return;
    const enrollment = syncEnrollmentChange(user.id, device);
    const promptUnlock = user.biometricUnlock?.enabled
      && shouldPrompt(getLastActiveAt(user.id), Date.now(), true);
    const timeoutId = setTimeout(() => {
      if (enrollment.changed) {
        reload();
        setUnlockNeedsPassword(true);
        setBioNotice(['Your saved biometrics changed. Sign in with your password to turn unlock back on.']);
      }
      if (promptUnlock) {
        setUnlockNeedsPassword(biometricRequiresPassword(user.id));
        setUnlockBioOpen(true);
        setUnlockBioMessages([]);
        setUnlockBioPassword('');
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [user?.id, user?.biometricUnlock?.enabled, device, reload]);

  const onBiometricToggle = (next) => {
    if (!user?.id) return;
    if (next) {
      setEnableBioPassword('');
      setEnableBioMessages([]);
      setEnableBioOpen(true);
      return;
    }
    disableBiometricUnlock(user.id);
    touchLastActive(user.id);
    reload();
    setBioNotice([]);
  };

  const onConfirmEnableBio = () => {
    if (!user?.id) return;
    const result = enableBiometricUnlock(user.id, enableBioPassword, device);
    if (!result.ok) {
      setEnableBioMessages(result.message ? [result.message] : []);
      return;
    }
    setEnableBioOpen(false);
    setEnableBioPassword('');
    touchLastActive(user.id);
    reload();
    setBioNotice(['Unlock with fingerprint or face is on.']);
  };

  const onTryBiometricUnlock = () => {
    if (!user?.id) return;
    const result = recordBiometricCheck(user.id, false);
    if (result.requirePassword) {
      setUnlockNeedsPassword(true);
    }
    setUnlockBioMessages([result.message || BIOMETRIC_FAIL_MESSAGE]);
  };

  const onUnlockWithPassword = () => {
    if (!user?.id) return;
    const result = confirmBiometricSessionWithPassword(user.id, unlockBioPassword);
    if (!result.ok) {
      setUnlockBioMessages(result.message ? [result.message] : [BIOMETRIC_FAIL_MESSAGE]);
      return;
    }
    setUnlockBioOpen(false);
    setUnlockNeedsPassword(false);
    setUnlockBioPassword('');
    setUnlockBioMessages([]);
    reload();
  };

  const flash = (message) => {
    setToast([message]);
  };

  const openPersonal = () => {
    if (!profile) return;
    setPersonalForm({
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      suffix: profile.suffix,
      contactNumber: profile.contactNumber,
      email: profile.email,
      address: profile.address,
    });
    setPersonalStep('form');
    setPersonalErrors({});
    setPersonalMessages([]);
    setPersonalDirty(false);
    setVerifyMeta(null);
    setPersonalOpen(true);
  };

  const tryClosePersonal = () => {
    if (personalDirty && personalStep === 'form') {
      setDiscardPersonal(true);
      return;
    }
    if (user?.id) cancelPendingContactChange(user.id);
    setPersonalOpen(false);
  };

  const onSavePersonal = () => {
    if (!user?.id) return;
    const result = savePersonalInfo(user.id, personalForm);
    if (result.needsVerification) {
      setVerifyMeta(result);
      setPersonalStep('verify');
      setVerifyKey((k) => k + 1);
      setPersonalMessages([]);
      return;
    }
    if (!result.ok) {
      setPersonalMessages(result.messages);
      setPersonalErrors(result.fields || {});
      return;
    }
    setPersonalDirty(false);
    setPersonalOpen(false);
    reload();
    flash(result.message);
  };

  const onContactVerified = (payload) => {
    if (payload?.complete === false) {
      setVerifyMeta((prev) => ({
        ...prev,
        channel: payload.nextChannel,
        phone: payload.phone,
        email: payload.email,
      }));
      setVerifyKey((k) => k + 1);
      return;
    }
    setPersonalOpen(false);
    setPersonalDirty(false);
    reload();
    flash(MSG.profileUpdated);
  };

  const openHealth = () => {
    setHealthSelected([...(profile?.healthConditions || [])].filter((c) => HEALTH_CONDITIONS.includes(c)));
    setHealthOther((profile?.healthConditions || []).find((c) => !HEALTH_CONDITIONS.includes(c)) || '');
    setHealthOpen(true);
  };

  const saveHealth = () => {
    const list = [...healthSelected];
    const other = healthOther.trim();
    if (other) list.push(other);
    const result = saveHealthConditions(user.id, list);
    setHealthOpen(false);
    reload();
    flash(result.message);
  };

  const openDiet = () => {
    setDietSelected([...(profile?.dietaryRestrictions || [])].filter((c) => DIETARY_RESTRICTIONS.includes(c)));
    setDietOther((profile?.dietaryRestrictions || []).find((c) => !DIETARY_RESTRICTIONS.includes(c)) || '');
    setDietOpen(true);
  };

  const saveDiet = () => {
    const list = [...dietSelected];
    const other = dietOther.trim();
    if (other) list.push(other);
    const result = saveDietaryRestrictions(user.id, list);
    setDietOpen(false);
    reload();
    flash(result.message);
  };

  const openAllergies = () => {
    setAllergyList(profile?.allergies?.map((a) => ({ ...a })) || []);
    setAllergyManual('');
    setAllergyNote('');
    setAllergyOpen(true);
  };

  const toggleAllergy = (name) => {
    setAllergyList((prev) => {
      const exists = prev.find((a) => a.name === name);
      if (exists) return prev.filter((a) => a.name !== name);
      return [...prev, { name, note: '' }];
    });
  };

  const addManualAllergy = () => {
    const name = allergyManual.trim();
    if (!name) return;
    setAllergyList((prev) => {
      if (prev.some((a) => a.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { name, note: allergyNote.trim() }];
    });
    setAllergyManual('');
    setAllergyNote('');
  };

  const saveAllergy = () => {
    const result = saveAllergies(user.id, allergyList);
    setAllergyOpen(false);
    reload();
    flash(result.message);
  };

  const openMealPref = () => {
    setPrefCategories((profile?.mealPreferences?.preferredCategories || []).join(', '));
    setDisliked((profile?.mealPreferences?.dislikedIngredients || []).join(', '));
    setMealPrefOpen(true);
  };

  const saveMealPref = () => {
    const result = saveMealPreferences(user.id, {
      preferredCategories: prefCategories.split(',').map((s) => s.trim()).filter(Boolean),
      dislikedIngredients: disliked.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setMealPrefOpen(false);
    reload();
    flash(result.message);
  };

  const openNutrition = () => {
    setNutritionChoice(nutritionIdsFromProfile(profile));
    setTargetCalories(profile?.nutritionTargets?.calories ? String(profile.nutritionTargets.calories) : '');
    setTargetProtein(profile?.nutritionTargets?.protein ? String(profile.nutritionTargets.protein) : '');
    setTargetFat(profile?.nutritionTargets?.fat ? String(profile.nutritionTargets.fat) : '');
    setNutritionOpen(true);
  };

  const saveNutrition = () => {
    const result = saveNutritionalPreference(user.id, nutritionChoice, {
      calories: targetCalories,
      protein: targetProtein,
      fat: targetFat,
    });
    setNutritionOpen(false);
    reload();
    flash(result.message);
  };

  const openGuardian = () => {
    setGuardianForm(profile?.guardian || { name: '', relationship: '', contactNumber: '' });
    setGuardianMessages([]);
    setGuardianOpen(true);
  };

  const saveGuardianForm = () => {
    const result = saveGuardian(user.id, guardianForm);
    if (!result.ok) {
      setGuardianMessages(result.messages);
      return;
    }
    setGuardianOpen(false);
    reload();
    flash(result.message);
  };

  const onRemoveGuardian = () => {
    const result = removeGuardian(user.id);
    setGuardianOpen(false);
    reload();
    flash(result.message);
  };

  const onLogoutYes = () => {
    if (user?.id) logout(user.id);
    setConfirmLogout(false);
    signOut();
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Account" />
        <Text style={styles.lead}>Sign in to view your profile.</Text>
      </SafeAreaView>
    );
  }

  const nutritionIds = nutritionIdsFromProfile(profile);
  const nutritionLabel = nutritionIds.length
    ? NUTRITIONAL_OPTIONS.filter((opt) => nutritionIds.includes(opt.id)).map((opt) => opt.label).join(', ')
    : '—';
  const targetLabel = profile.nutritionTargets?.calories || profile.nutritionTargets?.protein || profile.nutritionTargets?.fat
    ? `${profile.nutritionTargets.calories || 0} kcal, ${profile.nutritionTargets.protein || 0} g protein, ${profile.nutritionTargets.fat || 0} g fat`
    : '—';
  const allergiesText = profile.allergies.length
    ? profile.allergies.map((a) => (a.note ? `${a.name} (${a.note})` : a.name)).join(', ')
    : '—';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Account" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <FormMessage messages={toast} tone="ok" />

        <Section title="Personal information" onEdit={openPersonal}>
          <Line label="Name" value={fullName(profile)} />
          <Line label="Contact" value={profile.contactNumber} />
          <Line label="Email" value={profile.email} />
          <Line label="Address" value={profile.address} />
        </Section>

        <Section title="Health conditions" onEdit={openHealth}>
          <Text style={styles.body}>{profile.healthConditions.length ? profile.healthConditions.join(', ') : '—'}</Text>
        </Section>

        <Section title="Dietary restrictions" onEdit={openDiet}>
          <Text style={styles.body}>{profile.dietaryRestrictions.length ? profile.dietaryRestrictions.join(', ') : '—'}</Text>
        </Section>

        <Section title="Food allergies" onEdit={openAllergies}>
          <Text style={styles.body}>{allergiesText}</Text>
        </Section>

        <Section title="Meal preferences" onEdit={openMealPref}>
          <Line label="Preferred categories" value={(profile.mealPreferences.preferredCategories || []).join(', ') || '—'} />
          <Line label="Disliked ingredients" value={(profile.mealPreferences.dislikedIngredients || []).join(', ') || '—'} />
        </Section>

        <Section title="Nutritional preferences" onEdit={openNutrition}>
          <Text style={styles.body}>{nutritionLabel}</Text>
          <Line label="Daily targets" value={targetLabel} />
        </Section>

        <Section title="Guardian or family member" onEdit={openGuardian}>
          {profile.guardian ? (
            <>
              <Line label="Name" value={profile.guardian.name} />
              <Line label="Relationship" value={profile.guardian.relationship} />
              <Line label="Contact" value={profile.guardian.contactNumber} />
            </>
          ) : (
            <Text style={styles.body}>—</Text>
          )}
        </Section>

        <Section title="Last updated">
          <Text style={styles.body}>{profile.profileLastUpdatedFormatted || '—'}</Text>
        </Section>

        <AppButton title="Change History" variant="outline" onPress={() => setHistoryOpen(true)} color={colors.primary} />

        <AppButton title="Help" variant="outline" onPress={() => openHelp(navigation)} color={colors.primary} style={styles.linkBtn} />
        <AppButton title="Notifications" variant="outline" onPress={() => navigation.navigate('Alerts')} color={colors.primary} style={styles.linkBtn} />

        {showBiometricOption ? (
          <View style={styles.sectionBlock}>
            <FormMessage messages={bioNotice} tone="ok" />
            <View style={styles.biometricRow}>
              <Text style={styles.biometricLabel}>Unlock with fingerprint or face</Text>
              <Switch
                accessibilityLabel="Unlock with fingerprint or face"
                value={biometricOn}
                onValueChange={onBiometricToggle}
                trackColor={{ false: colors.border, true: colors.action }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionHeading} accessibilityRole="header">Terms and Conditions</Text>
        <Text style={styles.body}>
          Read how your health and dietary information is collected and used.
        </Text>
        {acceptance ? (
          <Text style={styles.accepted}>Accepted {acceptance.formatted}</Text>
        ) : null}
        <AppButton title="View Terms and Conditions" onPress={() => setShowTerms(true)} color={colors.action} />

        <AppButton title="Log out" variant="outline" onPress={() => setConfirmLogout(true)} color={colors.primary} style={styles.logout} />
      </ScrollView>

      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} acceptedAt={acceptance?.formatted} />

      <Modal visible={personalOpen} animationType="slide" onRequestClose={tryClosePersonal}>
        <SafeAreaView style={styles.modalScreen}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle} accessibilityRole="header">Edit personal information</Text>
            {personalStep === 'form' ? (
              <>
                <FormMessage messages={personalMessages} />
                <AppInput label="First name" value={personalForm.firstName} error={personalErrors.firstName ? MSG.required : undefined}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, firstName: v })); setPersonalDirty(true); }} />
                <AppInput label="Middle name" value={personalForm.middleName}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, middleName: v })); setPersonalDirty(true); }} />
                <AppInput label="Last name" value={personalForm.lastName} error={personalErrors.lastName ? MSG.required : undefined}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, lastName: v })); setPersonalDirty(true); }} />
                <AppInput label="Suffix" value={personalForm.suffix}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, suffix: v })); setPersonalDirty(true); }} />
                <AppInput label="Contact number" value={personalForm.contactNumber} keyboardType="phone-pad"
                  error={personalErrors.contactNumber ? (personalMessages.find((m) => m.includes('contact')) || MSG.invalidContact) : undefined}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, contactNumber: v })); setPersonalDirty(true); }} />
                <AppInput label="Email" value={personalForm.email} keyboardType="email-address"
                  error={personalErrors.email ? (personalMessages.find((m) => m.includes('email')) || MSG.invalidEmail) : undefined}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, email: v })); setPersonalDirty(true); }} />
                <AppInput label="Address" value={personalForm.address}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, address: v })); setPersonalDirty(true); }} />
                <AppButton title="Save" onPress={onSavePersonal} color={colors.primary} />
                <AppButton title="Cancel" variant="outline" onPress={tryClosePersonal} color={colors.primary} style={styles.modalCancel} />
              </>
            ) : (
              <>
                <Text style={styles.body}>Confirm your new contact details with a verification code.</Text>
                <VerificationFlow
                  key={verifyKey}
                  userId={user.id}
                  purpose="contact"
                  phone={verifyMeta?.phone}
                  email={verifyMeta?.email}
                  autoChannel={verifyMeta?.channel}
                  successMessage={MSG.profileUpdated}
                  successButtonTitle="Done"
                  onVerified={onContactVerified}
                />
                <AppButton title="Cancel" variant="outline" onPress={tryClosePersonal} color={colors.primary} style={styles.modalCancel} />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <EditListModal
        visible={healthOpen}
        title="Health conditions"
        onClose={() => setHealthOpen(false)}
        onSave={saveHealth}
      >
        <OptionGrid options={HEALTH_CONDITIONS} selected={healthSelected} onToggle={(label) => {
          setHealthSelected((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
        }} />
        <AppInput label="Other condition" value={healthOther} onChangeText={setHealthOther} />
      </EditListModal>

      <EditListModal visible={dietOpen} title="Dietary restrictions" onClose={() => setDietOpen(false)} onSave={saveDiet}>
        <OptionGrid options={DIETARY_RESTRICTIONS} selected={dietSelected} onToggle={(label) => {
          setDietSelected((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
        }} />
        <AppInput label="Other restriction" value={dietOther} onChangeText={setDietOther} />
      </EditListModal>

      <Modal visible={allergyOpen} animationType="slide" onRequestClose={() => setAllergyOpen(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalTitle} accessibilityRole="header">Food allergies</Text>
            <View style={styles.chipWrap}>
              {ALLERGY_PRESETS.map((name) => (
                <Chip key={name} label={name} active={allergyList.some((a) => a.name === name)} onPress={() => toggleAllergy(name)} />
              ))}
            </View>
            <AppInput label="Other allergen" value={allergyManual} onChangeText={setAllergyManual} />
            <AppInput label="Reaction note" value={allergyNote} onChangeText={setAllergyNote} />
            <AppButton title="Add allergen" variant="outline" onPress={addManualAllergy} color={colors.primary} />
            {allergyList.map((a) => (
              <View key={a.name} style={styles.allergyRow}>
                <Text style={styles.body}>{a.name}{a.note ? ` — ${a.note}` : ''}</Text>
                <Pressable accessibilityRole="button" onPress={() => setAllergyList((prev) => prev.filter((x) => x.name !== a.name))}>
                  <Text style={styles.editLink}>Remove</Text>
                </Pressable>
              </View>
            ))}
            <AppButton title="Save" onPress={saveAllergy} color={colors.primary} />
            <AppButton title="Cancel" variant="outline" onPress={() => setAllergyOpen(false)} color={colors.primary} style={styles.modalCancel} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <EditListModal visible={mealPrefOpen} title="Meal preferences" onClose={() => setMealPrefOpen(false)} onSave={saveMealPref}>
        <AppInput label="Preferred categories (comma-separated)" value={prefCategories} onChangeText={setPrefCategories} />
        <AppInput label="Disliked ingredients (comma-separated)" value={disliked} onChangeText={setDisliked} />
      </EditListModal>

      <EditListModal visible={nutritionOpen} title="Nutritional preferences" onClose={() => setNutritionOpen(false)} onSave={saveNutrition}>
        {NUTRITIONAL_OPTIONS.map((opt) => {
          const selected = nutritionChoice.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => setNutritionChoice((prev) => (
                prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
              ))}
              style={styles.radioRow}
            >
              <Text style={styles.body}>{opt.label}</Text>
              <Text style={styles.radioMark}>{selected ? '●' : '○'}</Text>
            </Pressable>
          );
        })}
        <AppInput label="Daily calories" value={targetCalories} onChangeText={setTargetCalories} keyboardType="number-pad" />
        <AppInput label="Daily protein (g)" value={targetProtein} onChangeText={setTargetProtein} keyboardType="number-pad" />
        <AppInput label="Daily fat limit (g)" value={targetFat} onChangeText={setTargetFat} keyboardType="number-pad" />
      </EditListModal>

      <Modal visible={guardianOpen} animationType="slide" onRequestClose={() => setGuardianOpen(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalTitle} accessibilityRole="header">Guardian or family member</Text>
            <FormMessage messages={guardianMessages} />
            <AppInput label="Name" value={guardianForm.name}
              onChangeText={(v) => setGuardianForm((f) => ({ ...f, name: v }))} />
            <AppInput label="Relationship" value={guardianForm.relationship}
              onChangeText={(v) => setGuardianForm((f) => ({ ...f, relationship: v }))} />
            <AppInput label="Contact number" value={guardianForm.contactNumber} keyboardType="phone-pad"
              onChangeText={(v) => setGuardianForm((f) => ({ ...f, contactNumber: v }))} />
            <AppButton title="Save" onPress={saveGuardianForm} color={colors.primary} />
            {profile.guardian ? (
              <AppButton title="Remove guardian" variant="outline" onPress={onRemoveGuardian} color={colors.danger} style={styles.modalCancel} />
            ) : null}
            <AppButton title="Cancel" variant="outline" onPress={() => setGuardianOpen(false)} color={colors.primary} style={styles.modalCancel} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalTitle} accessibilityRole="header">Change history</Text>
            {history.length === 0 ? (
              <Text style={styles.body}>{MSG.noChangesYet}</Text>
            ) : (
              history.map((entry) => (
                <Text key={entry.id} style={styles.historyLine}>{entry.formatted}</Text>
              ))
            )}
            {!isAuditChainIntact() ? (
              <Text style={styles.body}>Change history could not be verified. A stored event may have been altered.</Text>
            ) : null}
            <AppButton title="Close" onPress={() => setHistoryOpen(false)} color={colors.primary} style={styles.modalCancel} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={discardPersonal} transparent animationType="fade" onRequestClose={() => setDiscardPersonal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.confirmTitle} accessibilityRole="header">Discard unsaved changes?</Text>
            <AppButton title="Keep editing" onPress={() => setDiscardPersonal(false)} color={colors.primary} />
            <AppButton title="Discard" variant="outline" onPress={() => {
              if (user?.id) cancelPendingContactChange(user.id);
              setDiscardPersonal(false);
              setPersonalOpen(false);
            }} color={colors.primary} style={styles.confirmNo} />
          </View>
        </View>
      </Modal>

      <Modal visible={enableBioOpen} transparent animationType="fade" onRequestClose={() => setEnableBioOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.confirmTitle} accessibilityRole="header">Turn on biometric unlock</Text>
            <Text style={styles.confirmBody}>Enter your current password to confirm.</Text>
            <FormMessage messages={enableBioMessages} />
            <AppInput
              label="Password"
              value={enableBioPassword}
              secureTextEntry
              onChangeText={setEnableBioPassword}
            />
            <AppButton title="Confirm" onPress={onConfirmEnableBio} color={colors.primary} />
            <AppButton title="Cancel" variant="outline" onPress={() => setEnableBioOpen(false)} color={colors.primary} style={styles.confirmNo} />
          </View>
        </View>
      </Modal>

      <Modal visible={unlockBioOpen} transparent animationType="fade" onRequestClose={() => setUnlockBioOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.confirmTitle} accessibilityRole="header">Confirm it&apos;s you</Text>
            <FormMessage messages={unlockBioMessages} />
            {unlockNeedsPassword ? (
              <>
                <Text style={styles.confirmBody}>Use your password to continue.</Text>
                <AppInput
                  label="Password"
                  value={unlockBioPassword}
                  secureTextEntry
                  onChangeText={setUnlockBioPassword}
                />
                <AppButton title="Continue with password" onPress={onUnlockWithPassword} color={colors.primary} />
              </>
            ) : (
              <AppButton title="Try biometric again" onPress={onTryBiometricUnlock} color={colors.primary} />
            )}
            <AppButton title="Cancel" variant="outline" onPress={() => setUnlockBioOpen(false)} color={colors.primary} style={styles.confirmNo} />
          </View>
        </View>
      </Modal>

      <Modal visible={confirmLogout} transparent animationType="fade" onRequestClose={() => setConfirmLogout(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.confirmTitle} accessibilityRole="header">Log out</Text>
            <Text style={styles.confirmBody}>{MSG.logoutConfirm}</Text>
            <AppButton title="Yes" onPress={onLogoutYes} color={colors.primary} />
            <AppButton title="No" variant="outline" onPress={() => setConfirmLogout(false)} color={colors.primary} style={styles.confirmNo} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function EditListModal({ visible, title, children, onClose, onSave }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalScreen}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle} accessibilityRole="header">{title}</Text>
          {children}
          <AppButton title="Save" onPress={onSave} color={colors.primary} />
          <AppButton title="Cancel" variant="outline" onPress={onClose} color={colors.primary} style={styles.modalCancel} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function OptionGrid({ options, selected, onToggle }) {
  return (
    <View style={styles.chipWrap}>
      {options.map((label) => (
        <Chip key={label} label={label} active={selected.includes(label)} onPress={() => onToggle(label)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  lead: { fontSize: font.body, lineHeight: 24, color: colors.text, padding: spacing.xl },
  sectionBlock: { marginBottom: spacing.xl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: font.lg, fontWeight: '700', color: colors.primary },
  sectionHeading: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text },
  accepted: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.md },
  line: { marginBottom: spacing.sm },
  lineLabel: { fontSize: font.sm, color: colors.muted, marginBottom: 2 },
  lineValue: { fontSize: font.body, color: colors.text, lineHeight: 24 },
  editHit: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: spacing.sm },
  editLink: { fontSize: font.body, color: colors.action, fontWeight: '700' },
  linkBtn: { marginTop: spacing.sm },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },
  biometricLabel: { flex: 1, fontSize: font.body, lineHeight: 24, color: colors.text, paddingRight: spacing.md },
  logout: { marginTop: spacing.xxl },
  modalScreen: { flex: 1, backgroundColor: colors.background },
  modalScroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.lg },
  modalCancel: { marginTop: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  allergyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  radioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: touch.min, paddingVertical: spacing.sm },
  radioMark: { fontSize: font.lg, color: colors.primary },
  historyLine: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg },
  confirmTitle: { fontSize: font.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.lg },
  confirmBody: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.lg },
  confirmNo: { marginTop: spacing.sm },
});
