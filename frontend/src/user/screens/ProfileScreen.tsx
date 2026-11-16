import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import type { Allergy, FieldMap, PersonalInfoInput, Profile } from '../types';
import { useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert } from 'react-native';
import AppModal from '../components/AppModal';
import ActionRow from '../components/ActionRow';
import InlineDialog from '../components/InlineDialog';
import SlideLayer from '../components/SlideLayer';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../components/PageHeader';
import ChangeHistoryCard from '../components/ChangeHistoryCard';
import AppPageShell from '../components/AppPageShell';
import BackPageShell from '../components/BackPageShell';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import Checkbox from '../components/Checkbox';
import Chip from '../components/Chip';
import FormMessage from '../components/FormMessage';
import VerificationFlow from '../components/VerificationFlow';
import { PrivacyModal, TermsModal } from '../components/LegalModals';
import { useAuth } from '../context/AuthContext';
import { recipientDisplayName } from '../domain/audience';
import { setLoginNotice } from '../navigation/loginNotice';
import { deleteAccount, deletionBlockReason, findTermsAcceptance, getPublicUser, getUser, isGoogleOnlyAccount, logout } from '../services/authService';
import { ACCOUNT_COPY, FEEDBACK_COPY, MSG, NOTIFICATIONS_COPY } from '../data/messages';
import {
  ALLERGY_PRESETS,
  NUTRITIONAL_OPTIONS,
  cancelPendingContactChange,
  getProfile,
  isAuditChainIntact,
  nutritionIdsFromProfile,
  readActivityRecord,
  readChangeHistory,
  removeGuardian,
  saveAllergies,
  saveDietaryRestrictions,
  saveGuardian,
  saveHealthConditions,
  saveMealPreferences,
  saveMealRecipient,
  saveNutritionalPreference,
  savePersonalInfo,
} from '../services/profileService';
import { openHelp } from '../navigation/openHelp';
import { openFeedback } from '../navigation/openFeedback';
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
import {
  loadAccountProfile,
  profileFromAuthUser,
  removeRemoteGuardian,
  saveRemoteAllergies,
  saveRemoteDiet,
  saveRemoteGuardian,
  saveRemoteHealth,
  saveRemoteMealPreferences,
  saveRemoteNutrition,
  saveRemotePersonal,
} from '../services/remoteProfileService';
import {
  MEAL_CATEGORY_PRESETS,
  NUTRITION_OPTION_DETAILS,
  PROFILE_DIET_OPTIONS,
  PROFILE_HEALTH_OPTIONS,
} from '../constants/profileFormOptions';
import { colors, card, font, radius, spacing, touch, fonts } from '../theme/theme';

function fullName(profile: Profile | null | undefined) {
  return [profile?.firstName, profile?.middleName, profile?.lastName, profile?.suffix]
    .filter((part) => part && String(part).trim())
    .join(' ');
}

function registeredForSubtitle(profile: Profile) {
  if (profile.accountFor === 'family') {
    const name = recipientDisplayName(profile.mealRecipient);
    return name ? `Registered for: Family Member · ${name}` : 'Registered for: Family Member';
  }
  return 'Registered for: Myself';
}

function formatGuardian(profile: Profile) {
  if (!profile.guardian?.name) return '—';
  const relationship = profile.guardian.relationship ? ` (${profile.guardian.relationship})` : '';
  return `${profile.guardian.name}${relationship}`;
}

function joinValues(values: string[]) {
  return values.length ? values.join(', ') : '—';
}

function ProfileCard({ title, children, onEdit, editLabel = 'Edit' }: {
  title: string;
  children?: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} accessibilityRole="header">{title}</Text>
        {onEdit ? (
          <Pressable accessibilityRole="button" accessibilityLabel={editLabel} onPress={onEdit} style={styles.editHit}>
            <Text style={styles.editLink}>{editLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value?.trim() ? value : '—'}</Text>
    </View>
  );
}

function ProfileNameRow({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) {
  return (
    <View style={styles.nameRow}>
      <View style={styles.nameCol}>
        <ProfileField label="First name" value={firstName} />
      </View>
      <View style={styles.nameCol}>
        <ProfileField label="Last name" value={lastName} />
      </View>
    </View>
  );
}

function ProfilePageHeader({ subtitle }: { subtitle?: string }) {
  return (
    <PageHeader title={ACCOUNT_COPY.screenTitle} subtitle={ACCOUNT_COPY.screenSubtitle} caption={subtitle} />
  );
}

function accountInitial(profile: Profile) {
  const letter = profile.firstName?.trim()?.[0] || profile.lastName?.trim()?.[0] || '?';
  return letter.toUpperCase();
}

function AccountMenuRow({
  icon,
  label,
  onPress,
  danger,
  summary,
  last,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  summary?: string | null;
  last?: boolean;
}) {
  return <ActionRow icon={icon} label={label} summary={summary} onPress={onPress} danger={danger} divider={!last} />;
}

function ProfileModalShell({
  visible,
  animate = true,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  visible?: boolean;
  /** False when this is the only page: the host modal slides instead. */
  animate?: boolean;
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SlideLayer visible={Boolean(visible)} animate={animate}>
      <BackPageShell
        title={title}
        onBack={onClose ?? (() => undefined)}
        edges={['top', 'bottom']}
        avoidKeyboard
        footer={footer}
      >
        {subtitle ? <Text style={styles.modalLead}>{subtitle}</Text> : null}
        <View style={styles.modalFormCard}>{children}</View>
      </BackPageShell>
    </SlideLayer>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, signIn, signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [accountProfile, setAccountProfile] = useState<Profile | null>(null);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  const localProfile = user?.id ? getProfile(user!.id as string) : null;
  const remoteReady = accountProfile?.id === user?.id && loadedProfileId === user?.id;
  const authProfile = user?.id ? profileFromAuthUser(user as { id: string }) : null;
  const profile = localProfile
    || (remoteReady && accountProfile ? accountProfile : null)
    || authProfile;
  const profileLoading = Boolean(user?.id) && !localProfile && !remoteReady;

  useEffect(() => {
    if (!user?.id || getProfile(user!.id as string)) return undefined;
    let active = true;
    loadAccountProfile(user)
      .then((next) => {
        if (!active) return;
        setAccountProfile(next);
        setLoadedProfileId(user?.id ?? null);
      })
      .catch(() => {
        if (!active) return;
        setAccountProfile(profileFromAuthUser(user as { id: string }));
        setLoadedProfileId(user?.id ?? null);
      });
    return () => {
      active = false;
    };
  }, [user, refreshKey]);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [recipientDirty, setRecipientDirty] = useState(false);
  const [recipientForm, setRecipientForm] = useState({
    firstName: '', middleName: '', lastName: '', suffix: '', relationship: '', contactNumber: '', deliveryAddress: '',
  });
  const [recipientMessages, setRecipientMessages] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteReady, setDeleteReady] = useState(false);
  const [confirmRemoveGuardian, setConfirmRemoveGuardian] = useState(false);
  const [toast, setToast] = useState<string[]>([]);

  const [personalOpen, setPersonalOpen] = useState(false);
  const [personalStep, setPersonalStep] = useState('form');
  const [personalForm, setPersonalForm] = useState<PersonalInfoInput>({});
  const [personalDirty, setPersonalDirty] = useState(false);
  const [personalErrors, setPersonalErrors] = useState<FieldMap>({});
  const [personalMessages, setPersonalMessages] = useState<string[]>([]);
  const [verifyMeta, setVerifyMeta] = useState<{
    channel?: string;
    phone?: string;
    email?: string;
    purpose?: string;
  } | null>(null);
  const [verifyKey, setVerifyKey] = useState(0);
  const [discardPersonal, setDiscardPersonal] = useState(false);
  const [discardRecipient, setDiscardRecipient] = useState(false);
  const [hostAnimation, setHostAnimation] = useState<'slide' | 'fade'>('slide');

  const [healthOpen, setHealthOpen] = useState(false);
  const [healthSelected, setHealthSelected] = useState<string[]>([]);
  const [healthOther, setHealthOther] = useState('');

  const [dietSelected, setDietSelected] = useState<string[]>([]);
  const [dietOther, setDietOther] = useState('');

  const [allergyOpen, setAllergyOpen] = useState(false);
  const [allergyList, setAllergyList] = useState<Allergy[]>([]);
  const [allergyManual, setAllergyManual] = useState('');
  const [allergyNote, setAllergyNote] = useState('');

  const [mealPrefOpen, setMealPrefOpen] = useState(false);
  const [mealCategories, setMealCategories] = useState<string[]>([]);
  const [dislikedList, setDislikedList] = useState<string[]>([]);
  const [ingredientDraft, setIngredientDraft] = useState('');

  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [nutritionChoice, setNutritionChoice] = useState<string[]>([]);
  const [targetCalories, setTargetCalories] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetFat, setTargetFat] = useState('');

  const [guardianOpen, setGuardianOpen] = useState(false);
  const [guardianForm, setGuardianForm] = useState({ name: '', relationship: '', contactNumber: '' });
  const [guardianMessages, setGuardianMessages] = useState<string[]>([]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [healthOverviewOpen, setHealthOverviewOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const device = getBiometricDevice();
  const showBiometricOption = isBiometricOptionVisible(device);
  const biometricOn = Boolean(user?.biometricUnlock?.enabled);
  const [enableBioOpen, setEnableBioOpen] = useState(false);
  const [enableBioPassword, setEnableBioPassword] = useState('');
  const [enableBioMessages, setEnableBioMessages] = useState<string[]>([]);
  const [bioNotice, setBioNotice] = useState<string[]>([]);
  const [unlockBioOpen, setUnlockBioOpen] = useState(false);
  const [unlockBioPassword, setUnlockBioPassword] = useState('');
  const [unlockBioMessages, setUnlockBioMessages] = useState<string[]>([]);
  const [unlockNeedsPassword, setUnlockNeedsPassword] = useState(false);

  const acceptance = findTermsAcceptance(user?.username);
  const history = localProfile && user?.id
    ? readChangeHistory(user.id as string, user.id as string)
    : [];
  const historyRecipientName = localProfile
    ? (localProfile.accountFor === 'family'
      ? recipientDisplayName(localProfile.mealRecipient)
      : recipientDisplayName(localProfile))
    : null;
  const activity = localProfile && user?.id
    ? readActivityRecord(user.id as string, user.id as string)
    : [];

  const reload = useCallback(() => {
    if (!user?.id) return;
    setRefreshKey((k) => k + 1);
    signIn(getPublicUser(user!.id as string));
  }, [signIn, user]);

  useEffect(() => {
    if (!user?.id || !device.supported) return;
    const enrollment = syncEnrollmentChange(user!.id as string, device);
    const promptUnlock = user.biometricUnlock?.enabled
      && shouldPrompt(getLastActiveAt(user!.id as string), Date.now(), true);
    const timeoutId = setTimeout(() => {
      if (enrollment.changed) {
        reload();
        setUnlockNeedsPassword(true);
        setBioNotice(['Your saved biometrics changed. Sign in with your password to turn unlock back on.']);
      }
      if (promptUnlock) {
        setUnlockNeedsPassword(biometricRequiresPassword(user!.id as string));
        setUnlockBioOpen(true);
        setUnlockBioMessages([]);
        setUnlockBioPassword('');
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [user?.id, user?.biometricUnlock?.enabled, device, reload]);

  const onBiometricToggle = (next: boolean) => {
    if (!user?.id) return;
    if (next) {
      setEnableBioPassword('');
      setEnableBioMessages([]);
      setEnableBioOpen(true);
      return;
    }
    disableBiometricUnlock(user!.id as string);
    touchLastActive(user!.id as string);
    reload();
    setBioNotice([]);
  };

  const onConfirmEnableBio = () => {
    if (!user?.id) return;
    const result = enableBiometricUnlock(user!.id as string, enableBioPassword, device);
    if (!result.ok) {
      setEnableBioMessages(result.message ? [result.message] : []);
      return;
    }
    setEnableBioOpen(false);
    setEnableBioPassword('');
    touchLastActive(user!.id as string);
    reload();
    setBioNotice(['Unlock with fingerprint or face is on.']);
  };

  const onTryBiometricUnlock = () => {
    if (!user?.id) return;
    const result = recordBiometricCheck(user!.id as string, false);
    if (result.requirePassword) {
      setUnlockNeedsPassword(true);
    }
    setUnlockBioMessages([result.message || BIOMETRIC_FAIL_MESSAGE]);
  };

  const onUnlockWithPassword = () => {
    if (!user?.id) return;
    const result = confirmBiometricSessionWithPassword(user!.id as string, unlockBioPassword);
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

  const flash = (message?: string) => {
    setToast([message ?? '']);
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
    if (user?.id) cancelPendingContactChange(user!.id as string);
    setPersonalOpen(false);
  };

  const savedOrAlert = (result: { ok?: boolean; messages?: string[]; message?: string } | null | undefined) => {
    if (result?.ok) return true;
    Alert.alert('Could not save', result?.messages?.[0] || result?.message || 'Try again.');
    return false;
  };

  const onSavePersonal = async () => {
    if (!user?.id) return;
    if (!getUser(user!.id as string)) {
      const result = await saveRemotePersonal(user!.id as string, personalForm);
      if (!savedOrAlert(result)) {
        setPersonalMessages(result.messages || []);
        setPersonalErrors(result.fields || {});
        return;
      }
      signIn({
        ...user,
        firstName: result.values!.firstName,
        first_name: result.values!.firstName,
        middleName: result.values!.middleName,
        middle_name: result.values!.middleName,
        lastName: result.values!.lastName,
        last_name: result.values!.lastName,
        suffix: result.values!.suffix,
        contactNumber: result.values!.contactNumber,
        contact_number: result.values!.contactNumber,
        email: result.values!.email,
        address: result.values!.address,
      });
      setPersonalDirty(false);
      setPersonalOpen(false);
      reload();
      flash(result.message);
      return;
    }
    const result = savePersonalInfo(user!.id as string, personalForm);
    if (result.needsVerification) {
      setVerifyMeta(result);
      setPersonalStep('verify');
      setVerifyKey((k) => k + 1);
      setPersonalMessages([]);
      return;
    }
    if (!result.ok) {
      setPersonalMessages(result.messages || []);
      setPersonalErrors(result.fields || {});
      return;
    }
    setPersonalDirty(false);
    setPersonalOpen(false);
    reload();
    flash(result.message);
  };

  const onContactVerified = (payload?: string | {
    complete?: boolean;
    nextChannel?: string;
    phone?: string;
    email?: string;
  }) => {
    if (!payload || typeof payload === 'string') return;
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
    setHealthSelected([...(profile?.healthConditions || [])].filter((c) => PROFILE_HEALTH_OPTIONS.includes(c)));
    setHealthOther((profile?.healthConditions || []).find((c) => !PROFILE_HEALTH_OPTIONS.includes(c)) || '');
    setDietSelected([...(profile?.dietaryRestrictions || [])].filter((c) => PROFILE_DIET_OPTIONS.includes(c)));
    setDietOther((profile?.dietaryRestrictions || []).find((c) => !PROFILE_DIET_OPTIONS.includes(c)) || '');
    setHealthOpen(true);
  };

  const saveHealthAndDiet = async () => {
    const healthList = [...healthSelected];
    const healthExtra = healthOther.trim();
    if (healthExtra) healthList.push(healthExtra);
    const dietList = [...dietSelected];
    const dietExtra = dietOther.trim();
    if (dietExtra) dietList.push(dietExtra);
    const localUser = getUser(user!.id as string);
    const healthResult = localUser
      ? saveHealthConditions(user!.id as string, healthList)
      : await saveRemoteHealth(user!.id as string, healthList);
    if (!savedOrAlert(healthResult)) return;
    const dietResult = localUser
      ? saveDietaryRestrictions(user!.id as string, dietList)
      : await saveRemoteDiet(user!.id as string, dietList);
    if (!savedOrAlert(dietResult)) return;
    setHealthOpen(false);
    reload();
    flash(healthResult.message || dietResult.message);
  };

  const openAllergies = () => {
    setAllergyList(profile?.allergies?.map((a) => ({ ...a })) || []);
    setAllergyManual('');
    setAllergyNote('');
    setAllergyOpen(true);
  };

  const toggleAllergy = (name: string) => {
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

  const saveAllergy = async () => {
    const result = getUser(user!.id as string)
      ? saveAllergies(user!.id as string, allergyList)
      : await saveRemoteAllergies(user!.id as string, allergyList);
    if (!savedOrAlert(result)) return;
    setAllergyOpen(false);
    reload();
    flash(result.message);
  };

  const openMealPref = () => {
    setMealCategories([...(profile?.mealPreferences?.preferredCategories || [])]);
    setDislikedList([...(profile?.mealPreferences?.dislikedIngredients || [])]);
    setIngredientDraft('');
    setMealPrefOpen(true);
  };

  const addDislikedIngredient = () => {
    const value = ingredientDraft.trim();
    if (!value) return;
    setDislikedList((prev) => (prev.some((item) => item.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]));
    setIngredientDraft('');
  };

  const saveMealPref = async () => {
    const nextPrefs = {
      preferredCategories: mealCategories,
      dislikedIngredients: dislikedList,
    };
    const result = getUser(user!.id as string)
      ? saveMealPreferences(user!.id as string, nextPrefs)
      : await saveRemoteMealPreferences(user!.id as string, nextPrefs);
    if (!savedOrAlert(result)) return;
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

  const saveNutrition = async () => {
    const result = getUser(user!.id as string)
      ? saveNutritionalPreference(user!.id as string, nutritionChoice, {
        calories: targetCalories,
        protein: targetProtein,
        fat: targetFat,
      })
      : await saveRemoteNutrition(user!.id as string, nutritionChoice);
    if (!savedOrAlert(result)) return;
    setNutritionOpen(false);
    reload();
    flash(result.message);
  };

  const openGuardian = () => {
    setGuardianForm(profile?.guardian || { name: '', relationship: '', contactNumber: '' });
    setGuardianMessages([]);
    setGuardianOpen(true);
  };

  const saveGuardianForm = async () => {
    const result = getUser(user!.id as string)
      ? saveGuardian(user!.id as string, guardianForm)
      : await saveRemoteGuardian(user!.id as string, guardianForm);
    if (!result.ok) {
      setGuardianMessages(result.messages || [result.message || 'Could not save.']);
      return;
    }
    setGuardianOpen(false);
    reload();
    flash(result.message);
  };

  const onRemoveGuardian = async () => {
    const result = getUser(user!.id as string)
      ? removeGuardian(user!.id as string)
      : await removeRemoteGuardian(user!.id as string);
    if (!savedOrAlert(result)) return;
    setGuardianOpen(false);
    reload();
    flash(result.message);
  };

  const onLogoutYes = () => {
    if (user?.id) logout(user!.id as string);
    setConfirmLogout(false);
    signOut();
  };

  const openRecipient = () => {
    const recipient = profile?.mealRecipient;
    setRecipientForm({
      firstName: recipient?.firstName || '',
      middleName: recipient?.middleName || '',
      lastName: recipient?.lastName || '',
      suffix: recipient?.suffix || '',
      relationship: recipient?.relationship || '',
      contactNumber: recipient?.contactNumber || '',
      deliveryAddress: recipient?.deliveryAddress || '',
    });
    setRecipientDirty(false);
    setRecipientMessages([]);
    setRecipientOpen(true);
  };

  const closeRecipient = () => {
    if (recipientDirty) {
      setDiscardRecipient(true);
      return;
    }
    setRecipientOpen(false);
  };

  const onSaveRecipient = () => {
    if (!user?.id) return;
    const result = saveMealRecipient(String(user.id), recipientForm);
    if (!result.ok) {
      setRecipientMessages(result.messages || [MSG.required]);
      return;
    }
    setRecipientDirty(false);
    setRecipientOpen(false);
    reload();
    flash(result.message);
  };

  const openDelete = () => {
    if (!user?.id) return;
    const blocked = deletionBlockReason(String(user.id));
    setDeletePassword('');
    setDeleteReady(false);
    setDeleteMessage(blocked);
    setDeleteOpen(true);
  };

  const onDeleteYes = async () => {
    if (!user?.id) return;
    const stored = getUser(String(user.id));
    const result = await deleteAccount({
      userId: String(user.id),
      password: deletePassword,
      googleConfirmed: deleteReady || !isGoogleOnlyAccount(stored),
    });
    if (!result.ok) {
      if (result.needsGoogle) {
        setDeleteMessage('Sign in with Google again, then confirm.');
        return;
      }
      setDeleteMessage(result.message || MSG.deleteWrongPassword);
      return;
    }
    setDeleteOpen(false);
    setLoginNotice(MSG.accountDeleted);
    signOut();
  };

  // Layers inside the single Account modal, top first (Android back closes the top one).
  const editorOpen = personalOpen || healthOpen || allergyOpen || mealPrefOpen || nutritionOpen || guardianOpen;
  const anyPageOpen = editorOpen || healthOverviewOpen || activityOpen || historyOpen || recipientOpen;
  const anyDialogOpen = discardPersonal || discardRecipient || enableBioOpen || unlockBioOpen
    || confirmRemoveGuardian || deleteOpen || confirmLogout;
  const accountModalVisible = anyPageOpen || anyDialogOpen;
  const openPageCount = [personalOpen, healthOpen, allergyOpen, mealPrefOpen, nutritionOpen, guardianOpen,
    healthOverviewOpen, activityOpen, historyOpen, recipientOpen].filter(Boolean).length;
  // A page slides by itself only when another page stays underneath it; the first page
  // rides on the host modal's own slide, so it never slides twice.
  const slideFor = (open: boolean) => openPageCount - (open ? 1 : 0) > 0;
  // Pages slide the whole host; a confirmation shown from the Account screen itself fades.
  // Remember the last choice so the host closes with the same animation it opened with.
  const wantedHostAnimation = anyPageOpen ? 'slide' : anyDialogOpen ? 'fade' : hostAnimation;
  if (wantedHostAnimation !== hostAnimation) setHostAnimation(wantedHostAnimation);
  const closeTopLayer = () => {
    if (discardPersonal) return setDiscardPersonal(false);
    if (discardRecipient) return setDiscardRecipient(false);
    if (confirmRemoveGuardian) return setConfirmRemoveGuardian(false);
    if (enableBioOpen) return setEnableBioOpen(false);
    if (unlockBioOpen) return setUnlockBioOpen(false);
    if (deleteOpen) return setDeleteOpen(false);
    if (confirmLogout) return setConfirmLogout(false);
    if (personalOpen) return tryClosePersonal();
    if (healthOpen) return setHealthOpen(false);
    if (allergyOpen) return setAllergyOpen(false);
    if (mealPrefOpen) return setMealPrefOpen(false);
    if (nutritionOpen) return setNutritionOpen(false);
    if (guardianOpen) return setGuardianOpen(false);
    if (recipientOpen) return closeRecipient();
    if (historyOpen) return setHistoryOpen(false);
    if (activityOpen) return setActivityOpen(false);
    if (healthOverviewOpen) return setHealthOverviewOpen(false);
    return undefined;
  };

  const closeAllLayers = () => {
    if (personalOpen && user?.id) cancelPendingContactChange(user!.id as string);
    [setDiscardPersonal, setDiscardRecipient, setConfirmRemoveGuardian, setEnableBioOpen, setUnlockBioOpen,
      setDeleteOpen, setConfirmLogout, setPersonalOpen, setHealthOpen, setAllergyOpen, setMealPrefOpen,
      setNutritionOpen, setGuardianOpen, setRecipientOpen, setHistoryOpen, setActivityOpen,
      setHealthOverviewOpen].forEach((close) => close(false));
  };

  if (!profile) {
    return (
      <AppPageShell edges={['top']} contentStyle={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ProfilePageHeader />
          {profileLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.emptyState} />
          ) : (
            <Text style={styles.emptyState}>Sign in to view your profile.</Text>
          )}
        </ScrollView>
      </AppPageShell>
    );
  }

  const recipientName = recipientDisplayName(profile.mealRecipient);
  const allergiesText = (profile.allergies ?? []).length
    ? (profile.allergies ?? []).map((a) => (a.note ? `${a.name} (${a.note})` : a.name)).join(', ')
    : '—';
  const healthContactLabel = profile.accountFor === 'family' ? 'Family contact' : 'Guardian';
  const healthContactValue = profile.accountFor === 'family' ? fullName(profile) : formatGuardian(profile);
  const editProfileSubtitle = profile.accountFor === 'family'
    ? 'Your details · Family Member account'
  : `Your details · Registered for Myself`;

  const healthSummary = (
    <>
      <ProfileField label="Health condition" value={joinValues(profile.healthConditions)} />
      <ProfileField label="Restriction" value={joinValues(profile.dietaryRestrictions)} />
      <ProfileField label="Food allergy" value={allergiesText} />
      <ProfileField label={healthContactLabel} value={healthContactValue} />
    </>
  );

  const mealPrefSummary = [
    ...(profile.mealPreferences?.preferredCategories || []),
    ...((profile.mealPreferences?.dislikedIngredients || []).length
      ? [`Avoid: ${(profile.mealPreferences?.dislikedIngredients || []).join(', ')}`]
      : []),
  ].join(' · ');
  const nutritionSummary = (profile.nutritionalPreferences || [])
    .map((id) => NUTRITIONAL_OPTIONS.find((option) => option.id === id)?.label || id)
    .join(', ');

  const healthEditLinks = (
    <View style={styles.rowsCard}>
      <Text style={styles.rowsHeading}>Update your information</Text>
      <AccountMenuRow icon="medkit-outline" label="Health conditions" summary={joinValues(profile.healthConditions)} onPress={openHealth} />
      <AccountMenuRow icon="alert-circle-outline" label="Food allergies" summary={allergiesText} onPress={openAllergies} />
      <AccountMenuRow icon="restaurant-outline" label="Meal preferences" summary={mealPrefSummary || '—'} onPress={openMealPref} />
      <AccountMenuRow icon="nutrition-outline" label="Nutritional preferences" summary={nutritionSummary || '—'} onPress={openNutrition} />
      <AccountMenuRow icon="call-outline" label="Guardian or family contact" summary={healthContactValue} onPress={openGuardian} last />
    </View>
  );

  const displayName = fullName(profile) || user?.username || '—';

  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProfilePageHeader subtitle={registeredForSubtitle(profile)} />
        <FormMessage messages={toast} tone="ok" />

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{accountInitial(profile)}</Text>
          </View>
          <Text style={styles.identityName}>{displayName}</Text>
          <Text style={styles.identityMeta}>{registeredForSubtitle(profile)}</Text>
          <Text style={styles.identityEmail}>{profile.email}</Text>
        </View>

        <View style={styles.menuCard}>
          <AccountMenuRow icon="person-outline" label={ACCOUNT_COPY.editProfile} onPress={openPersonal} />
          <AccountMenuRow
            icon="heart-outline"
            label={ACCOUNT_COPY.healthInformation}
            onPress={() => setHealthOverviewOpen(true)}
          />
          {profile.accountFor === 'family' ? (
            <AccountMenuRow icon="people-outline" label="Edit meal recipient" onPress={openRecipient} />
          ) : null}
          <AccountMenuRow
            icon="time-outline"
            label={ACCOUNT_COPY.changeHistory}
            onPress={() => setHistoryOpen(true)}
          />
          <AccountMenuRow
            icon="clipboard-outline"
            label={ACCOUNT_COPY.activityRecord}
            onPress={() => setActivityOpen(true)}
          />
          <AccountMenuRow
            icon="notifications-outline"
            label={NOTIFICATIONS_COPY.screenTitle}
            onPress={() => (navigation as { navigate: (name: string) => void }).navigate('Alerts')}
          />
          <AccountMenuRow icon="help-circle-outline" label={ACCOUNT_COPY.help} onPress={() => openHelp(navigation)} />
          <AccountMenuRow icon="log-out-outline" label={ACCOUNT_COPY.logOut} onPress={() => setConfirmLogout(true)} danger last />
        </View>

        <View style={styles.moreCard}>
          <AccountMenuRow icon="chatbubble-ellipses-outline" label={FEEDBACK_COPY.title} onPress={() => openFeedback(navigation)} />

          {showBiometricOption ? (
            <View style={styles.biometricWrap}>
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

          <AccountMenuRow
            icon="document-text-outline"
            label="Terms and Conditions"
            summary={acceptance ? `Accepted ${acceptance.formatted}` : null}
            onPress={() => setShowTerms(true)}
          />
          <AccountMenuRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => setShowPrivacy(true)} />
          <AccountMenuRow icon="trash-outline" label="Delete account" onPress={openDelete} danger last />
        </View>
      </ScrollView>

      <TermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        acceptedAt={acceptance?.formatted}
        closeLabel="Back to Profile"
      />
      <PrivacyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {/*
        One modal for every Account sub-page. React Native cannot reliably present a second
        native Modal while one is visible (iOS waits for the first to close; this is why the
        editors only appeared after pressing Back). So all sub-pages are in-tree layers inside
        this single AppModal: base pages first, editors above them, confirmations last.
      */}
      <AppModal
        visible={accountModalVisible}
        transparent
        avoidKeyboard={false}
        animationType={wantedHostAnimation}
        onRequestClose={closeTopLayer}
        onCloseAll={closeAllLayers}
      >
        <View style={styles.layerHost}>
          <SlideLayer visible={healthOverviewOpen} animate={slideFor(healthOverviewOpen)}>
            <BackPageShell
              title={ACCOUNT_COPY.healthInformation}
              onBack={() => setHealthOverviewOpen(false)}
              edges={['top', 'bottom']}
              footer={(
                <AppButton
                  title="Close"
                  onPress={() => setHealthOverviewOpen(false)}
                  color={colors.primary}
                  style={styles.modalCancel}
                />
              )}
            >
              {profile.accountFor === 'family' ? (
                <>
                  <ProfileCard title="Your details">
                    <ProfileNameRow firstName={profile.firstName} lastName={profile.lastName} />
                    <ProfileField label="Contact number" value={profile.contactNumber} />
                    <ProfileField label="Email" value={profile.email} />
                  </ProfileCard>
                  <ProfileCard title={recipientName ? `Meal recipient: ${recipientName}` : 'Meal recipient'}>
                    <ProfileField label="Relationship" value={profile.mealRecipient?.relationship} />
                    <ProfileField label="Address" value={profile.mealRecipient?.deliveryAddress} />
                    {healthSummary}
                  </ProfileCard>
                </>
              ) : (
                <>
                  <ProfileCard title="Personal information">
                    <ProfileNameRow firstName={profile.firstName} lastName={profile.lastName} />
                    <ProfileField label="Contact number" value={profile.contactNumber} />
                    <ProfileField label="Email" value={profile.email} />
                    <ProfileField label="Address" value={profile.address} />
                  </ProfileCard>
                  <ProfileCard title="Health Information">
                    {healthSummary}
                  </ProfileCard>
                </>
              )}
              {healthEditLinks}
              <Text style={styles.lastUpdated}>
                {profile.profileLastUpdatedFormatted
                  ? `Last updated ${profile.profileLastUpdatedFormatted}`
                  : 'Last updated —'}
              </Text>
            </BackPageShell>
          </SlideLayer>

          <SlideLayer visible={activityOpen} animate={slideFor(activityOpen)}>
            <BackPageShell
              title={ACCOUNT_COPY.activityRecord}
              onBack={() => setActivityOpen(false)}
              edges={['top', 'bottom']}
              subtitle={activity.length ? 'Newest first' : null}
              backLabel={ACCOUNT_COPY.screenTitle}
            >
              {activity.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Ionicons name="document-text-outline" size={32} color={colors.primary} />
                  <Text style={styles.body}>{ACCOUNT_COPY.noActivityYet}</Text>
                </View>
              ) : (
                <View style={styles.activityCard}>
                  {activity.map((entry, index) => (
                    <Text
                      key={entry.id}
                      style={[styles.activityLine, index > 0 && styles.activityDivider]}
                    >
                      {entry.formatted}
                    </Text>
                  ))}
                </View>
              )}
              {!isAuditChainIntact() ? (
                <Text style={styles.body}>{ACCOUNT_COPY.activityIntegrityWarning}</Text>
              ) : null}
            </BackPageShell>
          </SlideLayer>

          <SlideLayer visible={historyOpen} animate={slideFor(historyOpen)}>
            <BackPageShell
              title={ACCOUNT_COPY.changeHistory}
              onBack={() => setHistoryOpen(false)}
              edges={['top', 'bottom']}
              subtitle={history.length ? 'Newest first' : null}
              backLabel={ACCOUNT_COPY.screenTitle}
            >
              {history.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Ionicons name="time-outline" size={32} color={colors.primary} />
                  <Text style={styles.body}>{MSG.noChangesYet}</Text>
                </View>
              ) : (
                history.map((entry) => (
                  <ChangeHistoryCard key={entry.id} entry={entry} recipientName={historyRecipientName} />
                ))
              )}
              {!isAuditChainIntact() ? (
                <Text style={styles.body}>Change history could not be verified. A stored event may have been altered.</Text>
              ) : null}
            </BackPageShell>
          </SlideLayer>

          <SlideLayer visible={recipientOpen} animate={slideFor(recipientOpen)}>
            <BackPageShell
              title="Edit meal recipient"
              onBack={closeRecipient}
              edges={['top', 'bottom']}
              avoidKeyboard
              footer={(
                <>
                  <AppButton title="Save" onPress={onSaveRecipient} color={colors.primary} />
                  <AppButton title="Back" variant="outline" onPress={closeRecipient} color={colors.primary} style={styles.modalCancel} />
                </>
              )}
            >
              <FormMessage messages={recipientMessages} />
              <View style={styles.modalFormCard}>
                <AppInput label="First name" value={recipientForm.firstName} onChangeText={(value) => { setRecipientForm((form) => ({ ...form, firstName: value })); setRecipientDirty(true); }} />
                <AppInput label="Middle name" value={recipientForm.middleName} onChangeText={(value) => { setRecipientForm((form) => ({ ...form, middleName: value })); setRecipientDirty(true); }} />
                <AppInput label="Last name" value={recipientForm.lastName} onChangeText={(value) => { setRecipientForm((form) => ({ ...form, lastName: value })); setRecipientDirty(true); }} />
                <AppInput label="Suffix" value={recipientForm.suffix} onChangeText={(value) => { setRecipientForm((form) => ({ ...form, suffix: value })); setRecipientDirty(true); }} />
                <AppInput label="Relationship" value={recipientForm.relationship} onChangeText={(value) => { setRecipientForm((form) => ({ ...form, relationship: value })); setRecipientDirty(true); }} />
                <AppInput label="Contact number" value={recipientForm.contactNumber} keyboardType="phone-pad" onChangeText={(value) => { setRecipientForm((form) => ({ ...form, contactNumber: value })); setRecipientDirty(true); }} />
                <AppInput label="Delivery address" value={recipientForm.deliveryAddress} onChangeText={(value) => { setRecipientForm((form) => ({ ...form, deliveryAddress: value })); setRecipientDirty(true); }} />
              </View>
            </BackPageShell>
          </SlideLayer>
          <ProfileModalShell
            visible={personalOpen}
            animate={slideFor(personalOpen)}
            title="Edit profile"
            subtitle={editProfileSubtitle}
            onClose={tryClosePersonal}
            footer={personalStep === 'form' ? (
              <AppButton title="Save Profile" onPress={onSavePersonal} color={colors.action} style={styles.modalSave} />
            ) : null}
          >
            {personalStep === 'form' ? (
              <>
                <FormMessage messages={personalMessages} />
                <AppInput label="First name" value={personalForm.firstName} error={personalErrors.firstName ? MSG.required : undefined}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, firstName: v })); setPersonalDirty(true); }} />
                <AppInput label="Middle name" value={personalForm.middleName}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, middleName: v })); setPersonalDirty(true); }} />
                <AppInput label="Last name" value={personalForm.lastName} error={personalErrors.lastName ? MSG.required : undefined}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, lastName: v })); setPersonalDirty(true); }} />
                <AppInput label="Suffix (optional)" value={personalForm.suffix}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, suffix: v })); setPersonalDirty(true); }} />
                <AppInput label="Contact number" value={personalForm.contactNumber} keyboardType="phone-pad"
                  error={personalErrors.contactNumber ? (personalMessages.find((m) => m.includes('contact')) || MSG.invalidContact) : undefined}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, contactNumber: v })); setPersonalDirty(true); }} />
                <AppInput label="Email" value={personalForm.email} keyboardType="email-address"
                  error={personalErrors.email ? (personalMessages.find((m) => m.includes('email')) || MSG.invalidEmail) : undefined}
                  onChangeText={(v) => { setPersonalForm((f) => ({ ...f, email: v })); setPersonalDirty(true); }} />
                {profile.accountFor !== 'family' ? (
                  <AppInput label="Address" value={personalForm.address}
                    onChangeText={(v) => { setPersonalForm((f) => ({ ...f, address: v })); setPersonalDirty(true); }} />
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.body}>Confirm your new contact details with a verification code.</Text>
                <VerificationFlow
                  key={verifyKey}
                  userId={user!.id as string}
                  purpose="contact"
                  phone={verifyMeta?.phone}
                  email={verifyMeta?.email}
                  autoChannel={verifyMeta?.channel}
                  successMessage={MSG.profileUpdated}
                  successButtonTitle="Continue"
                  onVerified={onContactVerified}
                />
              </>
            )}
          </ProfileModalShell>

          <ProfileModalShell
            visible={healthOpen}
            animate={slideFor(healthOpen)}
            title="Health conditions"
            subtitle="Select known conditions and add doctor-provided restrictions."
            onClose={() => setHealthOpen(false)}
            footer={<AppButton title="Save" onPress={saveHealthAndDiet} color={colors.action} style={styles.modalSave} />}
          >
            {PROFILE_HEALTH_OPTIONS.map((label) => (
              <Checkbox
                key={label}
                checked={healthSelected.includes(label)}
                onToggle={() => setHealthSelected((prev) => (
                  prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
                ))}
              >
                {label}
              </Checkbox>
            ))}
            <AppInput label="Other / Doctor-provided restriction" value={healthOther} onChangeText={setHealthOther} />
            <Text style={styles.inputGroupLabel}>Other dietary restrictions</Text>
            {PROFILE_DIET_OPTIONS.map((label) => (
              <Checkbox
                key={label}
                checked={dietSelected.includes(label)}
                onToggle={() => setDietSelected((prev) => (
                  prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
                ))}
              >
                {label}
              </Checkbox>
            ))}
            <AppInput label="Other dietary restriction" value={dietOther} onChangeText={setDietOther} />
          </ProfileModalShell>

          <ProfileModalShell
            visible={allergyOpen}
            animate={slideFor(allergyOpen)}
            title="Food allergies"
            subtitle={profile.accountFor === 'family' && recipientName ? `Meals for ${recipientName}` : 'Meals for you'}
            onClose={() => setAllergyOpen(false)}
            footer={<AppButton title="Save" onPress={saveAllergy} color={colors.action} style={styles.modalSave} />}
          >
            <View style={styles.chipWrap}>
              {ALLERGY_PRESETS.map((name) => (
                <Chip key={name} label={name} active={allergyList.some((a) => a.name === name)} onPress={() => toggleAllergy(name)} />
              ))}
              <Chip
                label="No allergies"
                active={allergyList.length === 0 && !allergyManual.trim()}
                onPress={() => setAllergyList([])}
              />
            </View>
            <AppInput label="Other allergies" value={allergyManual} onChangeText={setAllergyManual} />
            <AppInput label="Reaction note (optional)" value={allergyNote} onChangeText={setAllergyNote} />
            <AppButton title="Add allergen" variant="outline" onPress={addManualAllergy} color={colors.primary} />
            {allergyList.map((a) => (
              <View key={a.name} style={styles.allergyRow}>
                <Text style={styles.body}>{a.name}{a.note ? ` — ${a.note}` : ''}</Text>
                <Pressable accessibilityRole="button" onPress={() => setAllergyList((prev) => prev.filter((x) => x.name !== a.name))}>
                  <Text style={styles.editLink}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </ProfileModalShell>

          <ProfileModalShell
            visible={mealPrefOpen}
            animate={slideFor(mealPrefOpen)}
            title="Meal preferences"
            subtitle="Choose the meals you enjoy and the ingredients to avoid."
            onClose={() => setMealPrefOpen(false)}
            footer={<AppButton title="Save" onPress={saveMealPref} color={colors.action} style={styles.modalSave} />}
          >
            <Text style={styles.inputGroupLabel}>Preferred categories</Text>
            <View style={styles.chipWrap}>
              {MEAL_CATEGORY_PRESETS.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  active={mealCategories.includes(category)}
                  onPress={() => setMealCategories((prev) => (
                    prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
                  ))}
                />
              ))}
            </View>
            <Text style={styles.inputGroupLabel}>Disliked ingredients</Text>
            <View style={styles.chipWrap}>
              {dislikedList.map((ingredient) => (
                <Pressable
                  key={ingredient}
                  accessibilityRole="button"
                  onPress={() => setDislikedList((prev) => prev.filter((item) => item !== ingredient))}
                  style={styles.dislikedChip}
                >
                  <Text style={styles.dislikedText}>{ingredient} ×</Text>
                </Pressable>
              ))}
            </View>
            <AppInput
              label="Add an ingredient to avoid"
              value={ingredientDraft}
              onChangeText={setIngredientDraft}
              onSubmitEditing={addDislikedIngredient}
            />
          </ProfileModalShell>

          <ProfileModalShell
            visible={nutritionOpen}
            animate={slideFor(nutritionOpen)}
            title="Nutritional preferences"
            subtitle={profile.accountFor === 'family' ? 'Choose what matters for the meal recipient.' : 'Choose what matters for your meals.'}
            onClose={() => setNutritionOpen(false)}
            footer={<AppButton title="Save" onPress={saveNutrition} color={colors.action} style={styles.modalSave} />}
          >
            {profile.accountFor === 'family' ? (
              <Text style={styles.familyNote}>
                For a Family Member account, these options are shown for the meal recipient.
              </Text>
            ) : null}
            {NUTRITIONAL_OPTIONS.map((opt) => {
              const selected = nutritionChoice.includes(opt.id);
              return (
                <View key={opt.id} style={[styles.choiceCard, selected && styles.choiceCardOn]}>
                  <Checkbox
                    checked={selected}
                    onToggle={() => setNutritionChoice((prev) => (
                      prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
                    ))}
                  >
                    {opt.label}
                  </Checkbox>
                  <Text style={styles.choiceDetail}>{NUTRITION_OPTION_DETAILS[opt.id]}</Text>
                </View>
              );
            })}
            <AppInput label="Daily calories (optional)" value={targetCalories} onChangeText={setTargetCalories} keyboardType="number-pad" />
            <AppInput label="Daily protein (g) (optional)" value={targetProtein} onChangeText={setTargetProtein} keyboardType="number-pad" />
            <AppInput label="Daily fat limit (g) (optional)" value={targetFat} onChangeText={setTargetFat} keyboardType="number-pad" />
          </ProfileModalShell>

          <ProfileModalShell
            visible={guardianOpen}
            animate={slideFor(guardianOpen)}
            title={profile.guardian ? 'Edit guardian' : 'Add guardian'}
            subtitle={profile.guardian ? 'Update the saved details.' : 'Name, relationship and contact number.'}
            onClose={() => setGuardianOpen(false)}
            footer={(
              <>
                <AppButton
                  title={profile.guardian ? 'Save' : 'Add guardian'}
                  onPress={saveGuardianForm}
                  color={colors.action}
                  style={styles.modalSave}
                />
                {profile.guardian ? (
                  <AppButton title="Remove guardian" variant="outline" onPress={() => setConfirmRemoveGuardian(true)} color={colors.danger} style={styles.modalCancel} />
                ) : null}
              </>
            )}
          >
            {profile.guardian ? (
              <View style={styles.guardianSummary}>
                <Text style={styles.body}>{profile.guardian.name}</Text>
                <Text style={styles.mutedLine}>{profile.guardian.relationship}</Text>
                <Text style={styles.mutedLine}>{profile.guardian.contactNumber}</Text>
              </View>
            ) : (
              <Text style={styles.mutedLine}>{MSG.noGuardian}</Text>
            )}
            <FormMessage messages={guardianMessages} />
            <AppInput label="Name" value={guardianForm.name} onChangeText={(v) => setGuardianForm((f) => ({ ...f, name: v }))} />
            <AppInput label="Relationship" value={guardianForm.relationship} onChangeText={(v) => setGuardianForm((f) => ({ ...f, relationship: v }))} />
            <AppInput label="Contact number" value={guardianForm.contactNumber} keyboardType="phone-pad" onChangeText={(v) => setGuardianForm((f) => ({ ...f, contactNumber: v }))} />
          </ProfileModalShell>
          <InlineDialog visible={discardPersonal}>
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <Text style={styles.confirmTitle} accessibilityRole="header">Discard unsaved changes?</Text>
                <AppButton title="Keep editing" onPress={() => setDiscardPersonal(false)} color={colors.primary} />
                <AppButton title="Discard" variant="outline" onPress={() => {
                  if (user?.id) cancelPendingContactChange(user!.id as string);
                  setDiscardPersonal(false);
                  setPersonalOpen(false);
                }} color={colors.primary} style={styles.confirmNo} />
              </View>
            </View>
          </InlineDialog>
          <InlineDialog visible={discardRecipient}>
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <Text style={styles.confirmTitle} accessibilityRole="header">Discard unsaved changes?</Text>
                <AppButton title="Keep editing" onPress={() => setDiscardRecipient(false)} color={colors.primary} />
                <AppButton title="Discard" variant="outline" onPress={() => {
                  setDiscardRecipient(false);
                  setRecipientOpen(false);
                }} color={colors.primary} style={styles.confirmNo} />
              </View>
            </View>
          </InlineDialog>

          <InlineDialog visible={enableBioOpen}>
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
          </InlineDialog>

          <InlineDialog visible={unlockBioOpen}>
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
          </InlineDialog>

          <InlineDialog visible={confirmRemoveGuardian}>
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <Text style={styles.confirmTitle} accessibilityRole="header">Remove guardian</Text>
                <Text style={styles.confirmBody}>{MSG.removeGuardianConfirm}</Text>
                <AppButton title="Yes" onPress={() => { setConfirmRemoveGuardian(false); onRemoveGuardian(); }} color={colors.primary} />
                <AppButton title="No" variant="outline" onPress={() => setConfirmRemoveGuardian(false)} color={colors.primary} style={styles.confirmNo} />
              </View>
            </View>
          </InlineDialog>

          <InlineDialog visible={deleteOpen}>
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <Text style={styles.confirmTitle} accessibilityRole="header">Delete account</Text>
                {deleteMessage ? <FormMessage messages={deleteMessage} /> : null}
                {profile?.accountFor === 'family' && profile.mealRecipient ? (
                  <Text style={styles.confirmBody}>Meal recipient: {recipientDisplayName(profile.mealRecipient)}</Text>
                ) : null}
                {deleteMessage === MSG.orderInProgress ? null : (
                  <>
                    <Text style={styles.confirmBody}>{MSG.deleteWarning}</Text>
                    {user?.id && isGoogleOnlyAccount(getUser(String(user.id))) && !deleteReady ? (
                      <AppButton title="Sign in with Google again" onPress={() => setDeleteReady(true)} color={colors.primary} />
                    ) : (
                      <AppInput label="Password" value={deletePassword} onChangeText={setDeletePassword} secure />
                    )}
                    <AppButton title="Yes" onPress={onDeleteYes} color={colors.danger} />
                  </>
                )}
                <AppButton title="No" variant="outline" onPress={() => setDeleteOpen(false)} color={colors.primary} style={styles.confirmNo} />
              </View>
            </View>
          </InlineDialog>

          <InlineDialog visible={confirmLogout}>
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <Text style={styles.confirmTitle} accessibilityRole="header">Log out</Text>
                <Text style={styles.confirmBody}>{MSG.logoutConfirm}</Text>
                <AppButton title="Yes" onPress={onLogoutYes} color={colors.primary} />
                <AppButton title="No" variant="outline" onPress={() => setConfirmLogout(false)} color={colors.primary} style={styles.confirmNo} />
              </View>
            </View>
          </InlineDialog>
        </View>
      </AppModal>
    </AppPageShell>
  );
}

const PAGE = {
  title: colors.heading,
  body: colors.muted,
  muted: colors.muted,
  border: colors.cardBorder,
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  layerHost: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  emptyState: { fontFamily: fonts.regular, marginTop: spacing.xl, fontSize: font.body, lineHeight: 24, color: PAGE.body },
  identityCard: {
    ...card,
    marginTop: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.heading,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 28, color: colors.white },
  identityName: { fontFamily: fonts.bold, fontSize: font.lg, color: PAGE.title, textAlign: 'center' },
  identityMeta: { fontFamily: fonts.regular, fontSize: font.sm, color: PAGE.muted, textAlign: 'center' },
  identityEmail: { fontFamily: fonts.regular, fontSize: font.body, color: PAGE.body, textAlign: 'center' },
  menuCard: {
    ...card,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  moreCard: {
    ...card,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  profileCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PAGE.border,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  cardTitle: { fontFamily: fonts.bold, flex: 1, fontSize: font.lg, color: PAGE.title },
  nameRow: { flexDirection: 'row', gap: spacing.md },
  nameCol: { flex: 1 },
  fieldRow: { marginBottom: spacing.md },
  fieldLabel: { fontFamily: fonts.regular, fontSize: font.sm, color: PAGE.muted, marginBottom: 4 },
  fieldValue: { fontFamily: fonts.semibold, fontSize: font.lg, color: PAGE.title, lineHeight: 26 },
  rowsCard: { ...card, marginTop: spacing.lg, overflow: 'hidden' },
  rowsHeading: {
    fontFamily: fonts.bold,
    fontSize: font.sm,
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  lastUpdated: { fontFamily: fonts.regular, marginTop: spacing.lg, fontSize: font.sm, color: PAGE.muted },
  body: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.text },
  mutedLine: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.muted, marginBottom: spacing.xs },
  editHit: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: spacing.sm },
  editLink: { fontFamily: fonts.bold, fontSize: font.body, color: colors.action },
  biometricWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PAGE.border,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },
  biometricLabel: { fontFamily: fonts.regular, flex: 1, fontSize: font.body, lineHeight: 24, color: colors.text, paddingRight: spacing.md },
  modalLead: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.muted, marginBottom: spacing.lg },
  modalFormCard: { ...card, padding: spacing.lg, marginBottom: spacing.md },
  modalSave: { marginTop: spacing.lg },
  modalCancel: { marginTop: spacing.sm },
  inputGroupLabel: {
    fontFamily: fonts.bold,
    fontSize: font.sm,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  dislikedChip: {
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.white,
  },
  dislikedText: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.danger },
  allergyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  choiceCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  choiceCardOn: { backgroundColor: colors.tint, borderColor: colors.primary },
  choiceDetail: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted, marginLeft: 36, marginTop: -4, marginBottom: spacing.xs },
  familyNote: { fontFamily: fonts.regular, fontSize: font.sm, lineHeight: 22, color: colors.muted, marginBottom: spacing.md },
  guardianSummary: { marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  historyEmpty: { ...card, alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  activityCard: { ...card, paddingHorizontal: spacing.lg },
  activityLine: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.text, paddingVertical: spacing.md },
  activityDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg },
  confirmTitle: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.primary, marginBottom: spacing.lg },
  confirmBody: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.lg },
  confirmNo: { marginTop: spacing.sm },
});
