import { useMemo, useState } from 'react';
import { Pressable, Text, View, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthLayout from '../../components/AuthLayout';
import HelpButton from '../../components/HelpButton';
import AuthBackgroundDecor from '../../components/AuthBackgroundDecor';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import Chip from '../../components/Chip';
import FormMessage from '../../components/FormMessage';
import { PrivacyModal, TermsModal } from '../../components/LegalModals';
import { useAuth } from '../../context/AuthContext';
import { completeOnboarding, logout, normalizeContact } from '../../services/authService';
import { completeOnboardingLive } from '../../services/liveOnboardingService';
import { isSupabaseConfigured } from '../../../lib/supabaseClient';
import { MSG } from '../../data/messages';
import { RECOMMENDATION_MEALS } from '../../data/meals';
import { getRecommendedMeals, ORDER_MSG } from '../../services/orderService';
import type { FieldMap, MealMatchProfile, PublicUser } from '../../types';
import { colors, font, spacing, card, fonts, radius } from '../../theme/theme';

const RELATIONSHIPS = ['Child', 'Parent', 'Spouse', 'Sibling', 'Grandparent', 'Other'];
const ALLERGY_CHOICES = [
  { value: 'Peanuts', label: 'Peanuts' },
  { value: 'Shellfish', label: 'Shellfish / Seafood' },
  { value: 'Milk', label: 'Dairy' },
  { value: 'Eggs', label: 'Eggs' },
  { value: 'Soy', label: 'Soy' },
  { value: 'Gluten', label: 'Gluten' },
];
const CONDITION_CHOICES = [
  { value: 'Hypertension (HTN)', label: 'HTN\n(Hypertension)' },
  { value: 'Diabetes', label: 'Diabetes' },
  { value: 'Gout', label: 'Gout' },
  { value: 'Kidney Problem', label: 'Kidney Problem' },
  { value: 'Low-Cholesterol Diet', label: 'Low-Cholesterol Diet' },
];

export default function CompleteProfileScreen() {
  const { user, keepLoggedIn, signIn, signOut } = useAuth();
  const familyAccount = user?.accountFor === 'family';
  const needsAccountDetails = familyAccount
    && (!user?.firstName || !user?.lastName || !user?.contactNumber || !user?.termsAcceptedAt);
  const needsPersonalDetails = !familyAccount
    && (!user?.firstName || !user?.lastName || !user?.contactNumber || !user?.address || !user?.termsAcceptedAt);
  const stages = familyAccount
    ? ['recipient', 'health', 'recommendations']
    : [...(needsPersonalDetails ? ['personal'] : []), 'health', 'recommendations'];
  const firstStageIndex = 0;
  const [step, setStep] = useState(firstStageIndex);
  const hasPreviousStage = step > firstStageIndex;
  const currentStage = stages[step] || stages[stages.length - 1];
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [suffix, setSuffix] = useState(user?.suffix || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [recipientFirstName, setRecipientFirstName] = useState(user?.mealRecipient?.firstName || '');
  const [recipientMiddleName, setRecipientMiddleName] = useState(user?.mealRecipient?.middleName || '');
  const [recipientLastName, setRecipientLastName] = useState(user?.mealRecipient?.lastName || '');
  const [recipientSuffix, setRecipientSuffix] = useState(user?.mealRecipient?.suffix || '');
  const savedRelationship = user?.mealRecipient?.relationship || '';
  const [relationship, setRelationship] = useState(
    RELATIONSHIPS.includes(savedRelationship) ? savedRelationship : savedRelationship ? 'Other' : '',
  );
  const [relationshipOther, setRelationshipOther] = useState(
    savedRelationship && !RELATIONSHIPS.includes(savedRelationship) ? savedRelationship : '',
  );
  const [recipientContactNumber, setRecipientContactNumber] = useState(user?.mealRecipient?.contactNumber || '');
  const [recipientConsent, setRecipientConsent] = useState(!!user?.mealRecipient?.consentAt);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.mealRecipient?.deliveryAddress || '');
  const [allergies, setAllergies] = useState<string[]>(user?.mealRecipient?.allergies.map((item) => item.name) || []);
  const [allergyOther, setAllergyOther] = useState('');
  const [allergyNote, setAllergyNote] = useState('');
  const [healthConditions, setHealthConditions] = useState<string[]>(user?.mealRecipient?.healthConditions || []);
  const [healthOther, setHealthOther] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(user?.mealRecipient?.dietaryRestrictions || []);
  const [dietaryOther, setDietaryOther] = useState('');
  const [accepted, setAccepted] = useState(!!user?.termsAcceptedAt);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [fields, setFields] = useState<FieldMap>({});
  const [saving, setSaving] = useState(false);

  const leave = () => {
    if (user?.id) logout(user.id);
    signOut();
  };

  const recommendationProfile = useMemo<MealMatchProfile>(() => {
    const savedAllergies = [...allergies];
    if (allergyOther.trim()) savedAllergies.push(allergyOther.trim());
    const savedRestrictions = [...dietaryRestrictions];
    if (dietaryOther.trim()) savedRestrictions.push(dietaryOther.trim());
    return {
      allergies: savedAllergies.map((name) => ({ name, note: allergyNote.trim() })),
      healthConditions: [
        ...healthConditions,
        ...(healthOther.trim() ? [healthOther.trim()] : []),
      ],
      dietaryRestrictions: savedRestrictions,
    };
  }, [allergies, allergyOther, allergyNote, dietaryRestrictions, dietaryOther, healthConditions, healthOther]);
  const recommendations = getRecommendedMeals(RECOMMENDATION_MEALS, recommendationProfile, 3);

  const toggle = (values: string[], setValues: (next: string[]) => void, value: string) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const next = () => {
    const nextFields: FieldMap = {};
    if (currentStage === 'personal' || (currentStage === 'recipient' && needsAccountDetails)) {
      if (currentStage === 'recipient') {
        if (!firstName.trim()) nextFields.firstName = MSG.required;
        if (!lastName.trim()) nextFields.lastName = MSG.required;
        if (!contactNumber.trim()) nextFields.contactNumber = MSG.required;
        if (!accepted && !user?.termsAcceptedAt) nextFields.terms = MSG.termsRequired;
      } else {
        if (!firstName.trim()) nextFields.firstName = MSG.required;
        if (!lastName.trim()) nextFields.lastName = MSG.required;
        if (!contactNumber.trim()) nextFields.contactNumber = MSG.required;
        if (!address.trim()) nextFields.address = MSG.required;
        if (!accepted && !user?.termsAcceptedAt) nextFields.terms = MSG.termsRequired;
      }
      if (contactNumber.trim() && !/^\d{11}$/.test(normalizeContact(contactNumber))) {
        nextFields.contactNumber = MSG.invalidContact;
      }
    }
    if (currentStage === 'recipient') {
      const actualRelationship = relationship === 'Other' ? relationshipOther.trim() : relationship.trim();
      if (!recipientFirstName.trim() || !recipientLastName.trim() || !actualRelationship || !deliveryAddress.trim()) {
        if (!recipientFirstName.trim()) nextFields.recipientFirstName = MSG.required;
        if (!recipientLastName.trim()) nextFields.recipientLastName = MSG.required;
        if (!actualRelationship) nextFields.relationship = MSG.required;
        if (!deliveryAddress.trim()) nextFields.deliveryAddress = MSG.required;
      }
      if (recipientContactNumber.trim() && !/^\d{11}$/.test(normalizeContact(recipientContactNumber))) {
        nextFields.recipientContactNumber = MSG.invalidContact;
      }
      if (!recipientConsent) {
        nextFields.recipientConsent = "Please confirm that you are allowed to manage this person's information.";
      }
    }
    setFields(nextFields);
    const fieldMessages = [...new Set(Object.values(nextFields).filter((value): value is string => typeof value === 'string' && value.length > 0))];
    setMessages(fieldMessages);
    if (fieldMessages.length) return;
    setStep((current) => current + 1);
  };

  const finish = async () => {
    if (!user?.id) {
      setMessages(['Your account could not be loaded. Please log in again.']);
      return;
    }
    setSaving(true);
    const savedAllergies = [...allergies];
    if (allergyOther.trim()) savedAllergies.push(allergyOther.trim());
    const savedConditions = [...healthConditions];
    if (healthOther.trim()) savedConditions.push(healthOther.trim());
    const savedRestrictions = [...dietaryRestrictions];
    if (dietaryOther.trim()) savedRestrictions.push(dietaryOther.trim());
    const input = {
      personal: {
        firstName,
        middleName,
        lastName,
        suffix,
        contactNumber,
        email: user.email,
        address,
      },
      recipient: {
        firstName: recipientFirstName,
        middleName: recipientMiddleName,
        lastName: recipientLastName,
        suffix: recipientSuffix,
        contactNumber: recipientContactNumber,
        relationship,
        relationshipOther,
        deliveryAddress,
        consentConfirmed: recipientConsent,
      },
      allergies: savedAllergies.map((name) => ({ name, note: allergyNote.trim() })),
      healthConditions: savedConditions,
      dietaryRestrictions: savedRestrictions,
      acceptedTerms: accepted,
    };
    const result = isSupabaseConfigured
      ? await completeOnboardingLive(user as PublicUser, input)
      : completeOnboarding(user.id, input);
    setSaving(false);
    if (!result.ok || !result.user) {
      setMessages(result.messages || [MSG.acceptanceSaveFailed]);
      setFields(result.fields || {});
      return;
    }
    signIn(isSupabaseConfigured
      ? { ...result.user, accessToken: user.accessToken, refreshToken: user.refreshToken, expiresAt: user.expiresAt }
      : result.user, { keepLoggedIn });
  };

  const title = currentStage === 'recipient'
    ? 'Who will receive the meals?'
    : currentStage === 'personal'
      ? 'Your details'
      : 'Recommended foods';
  const subtitle = currentStage === 'recipient'
    ? 'Add the family member\'s details.'
    : currentStage === 'personal'
      ? 'Confirm your details and the address where your meals should be delivered.'
      : 'Recommended meals based on the recipient’s allergies and restrictions.';
  const recipientName = familyAccount
    ? [recipientFirstName, recipientLastName].filter(Boolean).join(' ')
    : [firstName, lastName].filter(Boolean).join(' ');
  const recipientRelation = familyAccount
    ? (relationship === 'Other' ? relationshipOther.trim() : relationship.trim()) || 'Family member'
    : 'Myself';
  const goBack = () => {
    if (hasPreviousStage) setStep((current) => current - 1);
    else leave();
  };

  if (currentStage === 'health') {
    return (
      <View style={styles.page}>
        <SafeAreaView style={styles.column} edges={['top', 'bottom']}>
          <AuthBackgroundDecor />
          <KeyboardAvoidingView style={styles.flex} behavior="padding">
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              <View style={styles.topBar}>
                <Pressable accessibilityRole="button" accessibilityLabel="Back to details" onPress={goBack} style={styles.backLink}>
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                  <Text style={styles.backLinkText}>Back to details</Text>
                </Pressable>
                <HelpButton />
              </View>
              <View style={styles.stepTrack}>
                <View style={styles.stepDotOn}><Ionicons name="checkmark" size={16} color={colors.white} /></View>
                <View style={styles.stepLineOn} />
                <View style={styles.stepDotOn}><Text style={styles.stepNumOn}>2</Text></View>
              </View>
              <View style={styles.stepLabels}>
                <Text style={styles.stepLabelOn}>Personal{'\n'}Details</Text>
                <Text style={styles.stepLabelOn}>Health{'\n'}Condition</Text>
              </View>
              <View style={styles.recipientPill}>
                <Ionicons name="person" size={16} color={colors.primary} />
                <Text style={styles.recipientPillText}>
                  Recipient: {recipientName || 'Meal recipient'} ({recipientRelation})
                </Text>
              </View>
              <Text style={styles.healthTitle} accessibilityRole="header">Health condition</Text>
              <Text style={styles.healthLead}>
                Select any food allergies, medical conditions, or dietary restrictions of the meal recipient.
              </Text>
              <View style={styles.sectionHead}>
                <View style={styles.sectionHeadLabel}>
                  <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
                  <Text style={styles.sectionKicker}>Food allergies</Text>
                </View>
                <Text style={styles.tapHint}>Tap to select</Text>
              </View>
              <View style={styles.chips}>
                {ALLERGY_CHOICES.map((allergy) => {
                  const selected = allergies.includes(allergy.value);
                  return (
                    <Pressable
                      key={allergy.value}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggle(allergies, setAllergies, allergy.value)}
                      style={[styles.allergyChip, selected && styles.allergyChipOn]}
                    >
                      {selected ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
                      <Text style={[styles.allergyChipText, selected && styles.allergyChipTextOn]}>{allergy.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.sectionHead}>
                <View style={styles.sectionHeadLabel}>
                  <Ionicons name="heart-outline" size={18} color={colors.primary} />
                  <Text style={styles.sectionKicker}>Medical conditions</Text>
                </View>
              </View>
              <View style={styles.conditionGrid}>
                {CONDITION_CHOICES.map((condition) => {
                  const selected = healthConditions.includes(condition.value);
                  return (
                    <Pressable
                      key={condition.value}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggle(healthConditions, setHealthConditions, condition.value)}
                      style={[styles.condition, selected && styles.conditionOn]}
                    >
                      <View style={[styles.box, selected && styles.boxOn]}>
                        {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                      </View>
                      <Text style={styles.conditionLabel}>{condition.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <AppInput
                label="Other allergies / Doctor-provided restriction"
                value={dietaryOther}
                onChangeText={setDietaryOther}
                autoCapitalize="sentences"
                placeholder="Soft food texture"
              />
              <View style={styles.footerRow}>
                <AppButton title="Back" variant="outline" onPress={goBack} color={colors.primary} style={styles.footerBtn} />
                <AppButton title="Finish" onPress={next} style={styles.footerBtn} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <AuthLayout variant="back" title={title} onBack={hasPreviousStage ? () => setStep((current) => current - 1) : leave} backgroundFrame>
      <Text style={styles.progress}>STEP {step + 1} OF {stages.length}</Text>
      <Text style={styles.lead}>{subtitle}</Text>
      <FormMessage messages={messages} />

      {currentStage === 'recipient' ? (
        <>
          {needsAccountDetails ? (
            <>
              <Text style={styles.sectionTitle}>Your details</Text>
              <AppInput label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" error={fields.firstName} />
              <AppInput label="Middle name (optional)" value={middleName} onChangeText={setMiddleName} autoCapitalize="words" />
              <AppInput label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" error={fields.lastName} />
              <AppInput label="Suffix (optional)" value={suffix} onChangeText={setSuffix} autoCapitalize="words" />
              <AppInput label="Contact number" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" error={fields.contactNumber} />
              <AppInput label="Email address" value={user?.email || ''} editable={false} accessibilityLabel="Email address" />
              {!user?.termsAcceptedAt ? (
                <>
                  <Checkbox checked={accepted} onToggle={() => setAccepted((value) => !value)}>
                    I have read and agree to the Terms and Conditions
                  </Checkbox>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setAccepted(false);
                      leave();
                    }}
                    style={styles.legalLinks}
                  >
                    <Text style={styles.legalLink}>Decline</Text>
                  </Pressable>
                  <View style={styles.legalLinks}>
                    <Pressable onPress={() => setShowTerms(true)} accessibilityRole="link">
                      <Text style={styles.legalLink}>View Terms and Conditions</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowPrivacy(true)} accessibilityRole="link">
                      <Text style={styles.legalLink}>View Privacy Policy</Text>
                    </Pressable>
                  </View>
                  {fields.terms ? <Text style={styles.error}>{fields.terms}</Text> : null}
                </>
              ) : null}
            </>
          ) : null}
          <Text style={styles.sectionTitle}>Meal recipient</Text>
          <View style={styles.nameRow}>
            <View style={styles.nameCol}>
              <AppInput label="First name" value={recipientFirstName} onChangeText={setRecipientFirstName} autoCapitalize="words" error={fields.recipientFirstName} errorSlot={Boolean(fields.recipientFirstName || fields.recipientLastName)} labelStyle={styles.pairLabel} />
            </View>
            <View style={styles.nameCol}>
              <AppInput label="Last name" value={recipientLastName} onChangeText={setRecipientLastName} autoCapitalize="words" error={fields.recipientLastName} errorSlot={Boolean(fields.recipientFirstName || fields.recipientLastName)} labelStyle={styles.pairLabel} />
            </View>
          </View>
          <AppInput label="Middle name (optional)" value={recipientMiddleName} onChangeText={setRecipientMiddleName} autoCapitalize="words" />
          <AppInput label="Suffix (optional)" value={recipientSuffix} onChangeText={setRecipientSuffix} autoCapitalize="words" />
          <Text style={styles.inputLabel}>Relationship</Text>
          <View style={styles.chips}>
            {RELATIONSHIPS.map((option) => (
              <Chip
                key={option}
                label={option}
                active={relationship === option}
                onPress={() => {
                  setRelationship(option);
                  setFields((current) => ({ ...current, relationship: '' }));
                }}
              />
            ))}
          </View>
          {relationship === 'Other' ? (
            <AppInput
              label="Specify relationship"
              value={relationshipOther}
              onChangeText={setRelationshipOther}
              autoCapitalize="words"
              error={fields.relationship}
            />
          ) : fields.relationship ? <Text style={styles.error}>{fields.relationship}</Text> : null}
          <AppInput
            label="Contact number (optional)"
            value={recipientContactNumber}
            onChangeText={setRecipientContactNumber}
            keyboardType="phone-pad"
            error={fields.recipientContactNumber}
          />
          <AppInput label="Delivery address" value={deliveryAddress} onChangeText={setDeliveryAddress} autoCapitalize="words" error={fields.deliveryAddress} />
          <Checkbox
            checked={recipientConsent}
            onToggle={() => setRecipientConsent((value) => !value)}
            accessibilityLabel="I confirm that I am allowed to manage this person's meals and health information."
          >
            I confirm that I am allowed to manage this person&apos;s meals and health information.
          </Checkbox>
          {fields.recipientConsent ? <Text style={styles.error}>{fields.recipientConsent}</Text> : null}
        </>
      ) : null}

      {currentStage === 'personal' ? (
        <>
          <AppInput label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" error={fields.firstName} />
          <AppInput label="Middle name (optional)" value={middleName} onChangeText={setMiddleName} autoCapitalize="words" />
          <AppInput label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" error={fields.lastName} />
          <AppInput label="Suffix (optional)" value={suffix} onChangeText={setSuffix} autoCapitalize="words" />
          <AppInput label="Contact number" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" editable={!user?.contactNumber} error={fields.contactNumber} />
          <AppInput label="Email address" value={user?.email || ''} editable={false} accessibilityLabel="Email address" />
          <AppInput label="Delivery address" value={address} onChangeText={setAddress} autoCapitalize="words" error={fields.address} />
          {!user?.termsAcceptedAt ? (
            <>
              <Checkbox checked={accepted} onToggle={() => setAccepted((value) => !value)}>
                I have read and agree to the Terms and Conditions
              </Checkbox>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setAccepted(false);
                  leave();
                }}
                style={styles.legalLinks}
              >
                <Text style={styles.legalLink}>Decline</Text>
              </Pressable>
              <View style={styles.legalLinks}>
                <Pressable onPress={() => setShowTerms(true)} accessibilityRole="link">
                  <Text style={styles.legalLink}>View Terms and Conditions</Text>
                </Pressable>
                <Pressable onPress={() => setShowPrivacy(true)} accessibilityRole="link">
                  <Text style={styles.legalLink}>View Privacy Policy</Text>
                </Pressable>
              </View>
              {fields.terms ? <Text style={styles.error}>{fields.terms}</Text> : null}
            </>
          ) : null}
        </>
      ) : null}

      {currentStage === 'recommendations' ? (
        <>
          <Text style={styles.recipientName}>
            For {familyAccount
              ? [recipientFirstName, recipientLastName].filter(Boolean).join(' ')
              : [firstName, lastName].filter(Boolean).join(' ')}
          </Text>
          {recommendations.items.length ? recommendations.items.map(({ meal, reason }) => (
            <View key={meal.id} style={styles.recommendation}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealMeta}>{meal.category} · {meal.calories || '—'} kcal</Text>
              <Text style={styles.mealReason}>{reason}</Text>
            </View>
          )) : (
            <Text style={styles.noRecommendations}>
              {recommendations.emptyProfile
                ? 'Add an allergy or dietary restriction to personalize these suggestions. You can update this later in your profile.'
                : ORDER_MSG.noSuggestions}
            </Text>
          )}
          <Text style={styles.disclaimer}>{ORDER_MSG.recommendationsDisclaimer}</Text>
        </>
      ) : null}

      <View style={styles.footerRow}>
        {hasPreviousStage ? (
          <AppButton
            title="Back"
            variant="outline"
            onPress={() => setStep((current) => current - 1)}
            color={colors.primary}
            style={styles.footerBtn}
          />
        ) : null}
        <AppButton
          title={currentStage === 'recommendations' ? 'Continue' : 'Next'}
          onPress={currentStage === 'recommendations' ? finish : next}
          loading={saving}
          style={styles.footerBtn}
        />
      </View>
      <TermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => { setAccepted(true); setShowTerms(false); }}
      />
      <PrivacyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  progress: { fontFamily: fonts.bold, fontSize: font.xs, color: colors.secondary, letterSpacing: 1.2, marginBottom: spacing.sm },
  lead: { fontFamily: fonts.regular, fontSize: font.md, color: colors.text, lineHeight: 22, marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.bold, fontSize: font.md, color: colors.deep, marginBottom: spacing.sm },
  sectionDescription: { fontFamily: fonts.regular, fontSize: font.sm, lineHeight: 18, color: colors.muted, marginTop: -spacing.xs, marginBottom: spacing.md },
  inputLabel: { fontFamily: fonts.semibold, fontSize: font.sm, color: colors.text, marginBottom: spacing.sm },
  allergyCard: { ...card, padding: spacing.md, marginBottom: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  legalLinks: { gap: spacing.sm, marginBottom: spacing.md },
  legalLink: { fontFamily: fonts.regular, minHeight: 48, textAlignVertical: 'center', color: colors.primary, fontSize: font.body, textDecorationLine: 'underline' },
  error: { fontFamily: fonts.regular, color: colors.danger, fontSize: font.sm, marginBottom: spacing.md },
  disclaimer: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted, lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.md },
  recipientName: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.deep, marginBottom: spacing.md },
  recommendation: { backgroundColor: colors.soft, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  mealName: { fontFamily: fonts.bold, fontSize: font.body, color: colors.deep },
  mealMeta: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted, marginTop: 4 },
  mealReason: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.secondary, marginTop: spacing.sm },
  noRecommendations: { fontFamily: fonts.regular, fontSize: font.body, color: colors.muted, lineHeight: 22, marginBottom: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pairLabel: { minHeight: 44, lineHeight: 22 },
  nameCol: { flex: 1, minWidth: 0 },
  footerRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  footerBtn: { flex: 1, marginTop: 0 },
  page: { flex: 1, backgroundColor: colors.authPage, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.authPage, overflow: 'hidden' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', marginLeft: -4, flexShrink: 1 },
  backLinkText: { fontFamily: fonts.medium, fontSize: font.body, color: colors.primary },
  stepTrack: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingHorizontal: spacing.xl },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  stepDotOn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumOn: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  stepLabelOn: { fontFamily: fonts.medium, fontSize: font.sm, lineHeight: 20, color: colors.primary, textAlign: 'center', width: 110 },
  stepLineOn: { flex: 1, height: 2, backgroundColor: colors.primary, marginHorizontal: spacing.sm },
  recipientPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.mint, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: spacing.lg },
  recipientPillText: { fontFamily: fonts.medium, fontSize: font.sm, color: colors.primary, flexShrink: 1 },
  healthTitle: { fontFamily: fonts.bold, fontSize: font.xl, lineHeight: 30, color: colors.heading, textAlign: 'center', marginTop: spacing.lg },
  healthLead: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionHeadLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionKicker: { fontFamily: fonts.semibold, fontSize: font.sm, letterSpacing: 0.6, color: colors.heading, textTransform: 'uppercase' },
  tapHint: { fontFamily: fonts.medium, fontSize: font.sm, color: colors.primary },
  allergyChip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.white },
  allergyChipOn: { backgroundColor: colors.primary },
  allergyChipText: { fontFamily: fonts.medium, fontSize: font.sm, color: colors.primary },
  allergyChipTextOn: { color: colors.white },
  conditionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.lg },
  condition: { width: '48%', minHeight: 64, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  conditionOn: { borderColor: colors.primary, backgroundColor: colors.mint },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: colors.inactive, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  conditionLabel: { flex: 1, fontFamily: fonts.medium, fontSize: font.sm, lineHeight: 20, color: colors.text },
});
