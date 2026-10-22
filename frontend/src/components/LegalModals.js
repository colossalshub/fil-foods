import { Text } from 'react-native';
import InfoModal, { modalText } from './InfoModal';
import AppButton from './AppButton';
import { TERMS_TEXT, HELP_TEXT } from '../data/legal';

export function HelpModal({ visible, onClose }) {
  return (
    <InfoModal visible={visible} title="Help" onClose={onClose}>
      <Text style={modalText}>{HELP_TEXT}</Text>
    </InfoModal>
  );
}

export function TermsModal({ visible, onClose, onAccept }) {
  return (
    <InfoModal
      visible={visible} title="Terms and Conditions" onClose={onClose}
      footer={<AppButton title="I Agree" onPress={onAccept} />}
    >
      <Text style={modalText}>{TERMS_TEXT}</Text>
    </InfoModal>
  );
}
