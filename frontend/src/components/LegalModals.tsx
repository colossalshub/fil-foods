import { Text } from 'react-native';
import InfoModal, { modalText } from './InfoModal';
import AppButton from './AppButton';
import { TERMS_TEXT, PRIVACY_TEXT, HELP_TEXT } from '../data/legal';
import { colors } from '../theme/theme';

export function HelpModal({ visible, onClose }: { visible?: boolean; onClose?: () => void }) {
  return (
    <InfoModal visible={visible} title="Help" onClose={onClose}>
      <Text style={modalText}>{HELP_TEXT}</Text>
    </InfoModal>
  );
}

export function PrivacyModal({ visible, onClose }: { visible?: boolean; onClose?: () => void }) {
  return (
    <InfoModal
      visible={visible} title="Privacy Policy" onClose={onClose}
      footer={<AppButton title="Close" onPress={onClose} variant="outline" color={colors.primary} />}
    >
      <Text style={modalText}>{PRIVACY_TEXT}</Text>
    </InfoModal>
  );
}

export function TermsModal({ visible, onClose, onAccept, acceptedAt }: {
  visible?: boolean;
  onClose?: () => void;
  onAccept?: () => void;
  acceptedAt?: string | null;
}) {
  return (
    <InfoModal
      visible={visible} title="Terms and Conditions" onClose={onClose}
      footer={onAccept
        ? <AppButton title="I Agree" onPress={onAccept} color={colors.action} />
        : <AppButton title="Close" onPress={onClose} variant="outline" color={colors.primary} />}
    >
      <Text style={modalText}>{TERMS_TEXT}</Text>
      {acceptedAt ? <Text style={[modalText, acceptedStyle]}>Accepted {acceptedAt}</Text> : null}
    </InfoModal>
  );
}

const acceptedStyle = { marginTop: 16, fontWeight: '600' as const };
