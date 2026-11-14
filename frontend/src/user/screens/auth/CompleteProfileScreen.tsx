import { useMemo, useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import AuthLayout from '../../components/AuthLayout';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import Chip from '../../components/Chip';
import FormMessage from '../../components/FormMessage';
import { PrivacyModal, TermsModal } from '../../components/LegalModals';
import { useAuth } from '../../context/AuthContext';
import { completeOnboarding, logout, normalizeContact } from '../../services/authService';
import { ALLERGY_PRESETS } from '../../services/profileService';
import { MSG } from '../../data/messages';
import { MEALS } from '../../data/meals';
import { getRecommendedMeals, ORDER_MSG } from '../../services/orderService';
import type { FieldMap, MealMatchProfile } from '../../types';
import { colors, font, spacing, card } from '../../theme/theme';

const HEALTH_OPTIONS = ['High blood pressure (HTN)', 'Diabetes', 'Gout', 'Kidney Problem', 'Low-Cholesterol Diet'];
const DIET_OPTIONS = ['Low-sodium', 'Low-sugar', 'Low-cholesterol diet', 'Soft food texture'];
const RELATIONSHIPS = ['Child', 'Parent', 'Spouse', 'Sibling', 'Grandparent', 'Other'];

export default function CompleteProfileScreen() {
  const { user, keepLoggedIn, signIn, signOut } = useAuth();
  const familyAccount = user?.accountFor === 'family';
  const needsAccountDetails = familyAccount
    && (!user?.firstName || !user?.lastName || !user?.contactNumber || !user?.termsAcceptedAt);
  const needsPersonalDetails = !familyAccount
    && (!user?.firstName || !user?.lastName || !user?.contactNumber || !user?.address || !user?.termsAcceptedAt);
  const stages = familyAccount
    ? ['recipient', 'healthAndDiet', 'recommendations']
    : [...(needsPersonalDetails ? ['personal'] : []), 'healthAndDiet', 'recommendations'];
  const firstStageIndex = familyAccount || needsPersonalDetails ? 0 : 1;
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
  const recommendations = getRecommendedMeals(MEALS, recommendationProfile, 3);

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

  const finish = () => {
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
    const result = completeOnboarding(user.id, {
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
    });
    setSaving(false);
    if (!result.ok || !result.user) {
      setMessages(result.messages || [MSG.acceptanceSaveFailed]);
      setFields(result.fields || {});
      return;
    }
    signIn(result.user, { keepLoggedIn });
  };

  const title = currentStage === 'recipient'
    ? 'Meal recipient details'
    : currentStage === 'personal'
      ? 'Your details'
      : currentStage === 'healthAndDiet'
        ? 'Food allergies'
        : 'Recommended foods';
  const subtitle = currentStage === 'recipient'
    ? 'Family Member account · recipient information.'
    : currentStage === 'personal'
      ? 'Confirm your details and the address where your meals should be delivered.'
      : currentStage === 'healthAndDiet'
        ? 'Choose the meal recipient’s allergies, health conditions and dietary restrictions.'
        : 'Recommended meals based on the recipient’s allergies and restrictions.';

  return (
    <AuthLayout variant="back" title={title} onBack={hasPreviousStage ? () => setStep((current) => current - 1) : leave} backgroundFrame>
      <Text style={styles.progress}>STEP {step + 1} OF 3</Text>
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
          <Text style={styles.sectionTitle}>Meal recipient details</Text>
          <AppInput label="First name" value={recipientFirstName} onChangeText={setRecipientFirstName} autoCapitalize="words" error={fields.recipientFirstName} />
          <AppInput label="Middle name (optional)" value={recipientMiddleName} onChangeText={setRecipientMiddleName} autoCapitalize="words" />
          <AppInput label="Last name" value={recipientLastName} onChangeText={setRecipientLastName} autoCapitalize="words" error={fields.recipientLastName} />
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

      {currentStage === 'healthAndDiet' ? (
        <>
          <View style={styles.allergyCard}>
            <View style={styles.chips}>
              {ALLERGY_PRESETS.map((allergy) => (
                <Chip
                  key={allergy}
                  label={allergy}
                  active={allergies.includes(allergy)}
                  onPress={() => toggle(allergies, setAllergies, allergy)}
                />
              ))}
              <Chip
                label="No allergies"
                active={allergies.length === 0 && !allergyOther.trim()}
                onPress={() => { setAllergies([]); setAllergyOther(''); }}
              />
            </View>
            <AppInput label="Other allergy (optional)" value={allergyOther} onChangeText={setAllergyOther} autoCapitalize="words" />
          </View>
          <Text style={styles.sectionTitle}>Health &amp; Restrictions</Text>
          <Text style={styles.sectionDescription}>Select known conditions and add doctor-provided restrictions.</Text>
          <Text style={styles.inputLabel}>Health conditions</Text>
          <View style={styles.chips}>
            {HEALTH_OPTIONS.map((condition) => (
              <Chip
                key={condition}
                label={condition}
                active={healthConditions.includes(condition)}
                onPress={() => toggle(healthConditions, setHealthConditions, condition)}
              />
            ))}
          </View>
          <AppInput label="Other health condition (optional)" value={healthOther} onChangeText={setHealthOther} autoCapitalize="sentences" />
          <Text style={styles.inputLabel}>Dietary restrictions</Text>
          <View style={styles.chips}>
            {DIET_OPTIONS.map((restriction) => (
              <Chip
                key={restriction}
                label={restriction}
                active={dietaryRestrictions.includes(restriction)}
                onPress={() => toggle(dietaryRestrictions, setDietaryRestrictions, restriction)}
              />
            ))}
          </View>
          <AppInput label="Other / doctor-provided restriction (optional)" value={dietaryOther} onChangeText={setDietaryOther} autoCapitalize="sentences" />
          <AppInput label="Reaction or notes (optional)" value={allergyNote} onChangeText={setAllergyNote} multiline />
          <Text style={styles.disclaimer}>{ORDER_MSG.recommendationsDisclaimer}</Text>
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

      <AppButton
        title="Continue"
        onPress={currentStage === 'recommendations' ? finish : next}
        loading={saving}
        style={styles.continue}
      />
      {hasPreviousStage ? (
        <AppButton
          title="Back"
          variant="outline"
          onPress={() => setStep((current) => current - 1)}
          color={colors.primary}
          style={styles.back}
        />
      ) : null}
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
  progress: { fontSize: font.xs, color: colors.secondary, fontWeight: '700', letterSpacing: 1.2, marginBottom: spacing.sm },
  lead: { fontSize: font.md, color: colors.text, lineHeight: 22, marginBottom: spacing.lg },
  sectionTitle: { fontSize: font.md, color: colors.deep, fontWeight: '700', marginBottom: spacing.sm },
  sectionDescription: { fontSize: font.sm, lineHeight: 18, color: colors.muted, marginTop: -spacing.xs, marginBottom: spacing.md },
  inputLabel: { fontSize: font.sm, color: colors.text, fontWeight: '600', marginBottom: spacing.sm },
  allergyCard: { ...card, padding: spacing.md, marginBottom: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  legalLinks: { gap: spacing.sm, marginBottom: spacing.md },
  legalLink: { minHeight: 48, textAlignVertical: 'center', color: colors.primary, fontSize: font.body, textDecorationLine: 'underline' },
  error: { color: colors.danger, fontSize: font.sm, marginBottom: spacing.md },
  disclaimer: { fontSize: font.sm, color: colors.muted, lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.md },
  recipientName: { fontSize: font.lg, fontWeight: '700', color: colors.deep, marginBottom: spacing.md },
  recommendation: { backgroundColor: colors.soft, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  mealName: { fontSize: font.body, color: colors.deep, fontWeight: '700' },
  mealMeta: { fontSize: font.sm, color: colors.muted, marginTop: 4 },
  mealReason: { fontSize: font.sm, color: colors.secondary, marginTop: spacing.sm },
  noRecommendations: { fontSize: font.body, color: colors.muted, lineHeight: 22, marginBottom: spacing.md },
  continue: { marginTop: spacing.md },
  back: { marginTop: spacing.sm },
});
