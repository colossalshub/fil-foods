import { type ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminTabBar } from './components/AdminTabBar.js';
import { PhoneFrame } from './components.js';
import { AdminProvider, useAdmin } from './context.js';
import {
  CheckEmailScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  RoleSelectScreen,
  SignInRequiredScreen,
  StaffLoginScreen,
} from './screens/AuthScreens.js';
import { DashboardScreen, NotificationsScreen } from './screens/DashboardScreen.js';
import { MenuFormScreen, MenuScreen } from './screens/MenuScreen.js';
import { OrderDetailScreen, OrdersScreen } from './screens/OrdersScreen.js';
import { RoleHomeScreen } from './screens/RoleHomeScreen.js';
import {
  AboutScreen,
  AuditScreen,
  CustomerDetailScreen,
  CustomersScreen,
  EditProfileScreen,
  HelpScreen,
  PreferencesScreen,
  SettingsScreen,
} from './screens/SettingsScreen.js';
import { StaffNotificationsScreen } from './screens/StaffNotificationsScreen.js';
import { StaffFormScreen, StaffScreen } from './screens/StaffScreen.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function screen(component: ComponentType<never>) {
  return component as unknown as ComponentType<object>;
}

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={screen(DashboardScreen)} />
      <Stack.Screen name="Notifications" component={screen(NotificationsScreen)} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersHome" component={screen(OrdersScreen)} />
    </Stack.Navigator>
  );
}

function MenuStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuHome" component={screen(MenuScreen)} />
      <Stack.Screen name="MenuForm" component={screen(MenuFormScreen)} />
    </Stack.Navigator>
  );
}

function StaffTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffHome" component={screen(StaffScreen)} />
      <Stack.Screen name="StaffForm" component={screen(StaffFormScreen)} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={screen(SettingsScreen)} />
      <Stack.Screen name="EditProfile" component={screen(EditProfileScreen)} />
      <Stack.Screen name="Preferences" component={screen(PreferencesScreen)} />
      <Stack.Screen name="Help" component={screen(HelpScreen)} />
      <Stack.Screen name="About" component={screen(AboutScreen)} />
      <Stack.Screen name="Audit" component={screen(AuditScreen)} />
      <Stack.Screen name="Customers" component={screen(CustomersScreen)} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  const { colors } = useAdmin();
  return (
    <PhoneFrame>
      <Tab.Navigator
        tabBar={(props) => <AdminTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.page },
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardStack} />
        <Tab.Screen name="Orders" component={OrdersStack} />
        <Tab.Screen name="Menu" component={MenuStack} />
        <Tab.Screen name="Staff" component={StaffTabStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>
    </PhoneFrame>
  );
}

function StaffStack() {
  const { ready, session, colors } = useAdmin();
  if (!ready) {
    return (
      <PhoneFrame>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.green} />
        </View>
      </PhoneFrame>
    );
  }
  const initial = session ? (session.role === 'admin' ? 'AdminApp' : 'RoleHome') : 'RoleSelect';
  return (
    <Stack.Navigator initialRouteName={initial} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
      <Stack.Screen name="RoleSelect" component={screen(RoleSelectScreen)} />
      <Stack.Screen name="StaffLogin" component={screen(StaffLoginScreen)} />
      <Stack.Screen name="ForgotPassword" component={screen(ForgotPasswordScreen)} />
      <Stack.Screen name="CheckEmail" component={screen(CheckEmailScreen)} />
      <Stack.Screen name="ResetPassword" component={screen(ResetPasswordScreen)} />
      <Stack.Screen name="SignInRequired" component={screen(SignInRequiredScreen)} />
      <Stack.Screen name="AdminApp" component={AdminTabs} />
      <Stack.Screen name="RoleHome" component={screen(RoleHomeScreen)} />
      <Stack.Screen name="OrderDetail" component={screen(OrderDetailScreen)} />
      <Stack.Screen name="CustomerDetail" component={screen(CustomerDetailScreen)} />
      <Stack.Screen name="StaffNotifications" component={screen(StaffNotificationsScreen)} />
    </Stack.Navigator>
  );
}

export default function StaffNavigator() {
  return (
    <AdminProvider>
      <StaffStack />
    </AdminProvider>
  );
}
