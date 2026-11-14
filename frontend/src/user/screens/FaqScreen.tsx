import BackPageShell from '../components/BackPageShell';
import FaqExperience from '../components/FaqExperience';
import { FAQ_COPY } from '../data/messages';

export default function FaqScreen({ navigation }: {
  navigation: { goBack: () => void };
}) {
  return (
    <BackPageShell title={FAQ_COPY.title} onBack={() => navigation.goBack()} edges={['top', 'bottom']}>
      <FaqExperience />
    </BackPageShell>
  );
}