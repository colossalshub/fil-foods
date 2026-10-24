import { Text } from 'react-native';
import InfoModal, { modalText } from './InfoModal';
import AppButton from './AppButton';
import { TERMS_TEXT, HELP_TEXT } from '../data/legal';
import { colors } from '../theme/theme';

export function HelpModal({ visible, onClose }) {
  return (
    <InfoModal visible={visible} title="Help" onClose={onClose}>
      <Text style={modalText}>{HELP_TEXT}</Text>
    </InfoModal>
  );
}

export function TermsModal({ visible, onClose, onAccept, acceptedAt }) {
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

const acceptedStyle = { marginTop: 16, fontWeight: '600' };
