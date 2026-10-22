import PlaceholderScreen from './PlaceholderScreen';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  return (
    <PlaceholderScreen
      title="Profile"
      icon="person-circle-outline"
      message={`Signed in as ${user?.username ?? 'guest'}. Dietary and health details will live here.`}
    >
      <AppButton title="Log out" variant="outline" onPress={signOut} style={{ alignSelf: 'stretch' }} />
    </PlaceholderScreen>
  );
}
