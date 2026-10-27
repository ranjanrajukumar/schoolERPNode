import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { audienceOf, useAuth } from './auth';
import { homeSections, homeTiles, useMenu } from './menu';
import { color } from './theme';
import { Button, Card, Muted, Title } from './ui';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import HomeGrid from './screens/HomeGrid';
import LoginScreen from './screens/LoginScreen';
import MoreScreen from './screens/MoreScreen';
import AttendanceScreen from './screens/family/AttendanceScreen';
import { ChildProvider } from './screens/family/ChildContext';
import FeesScreen from './screens/family/FeesScreen';
import LeaveScreen from './screens/family/LeaveScreen';
import NoticesScreen from './screens/family/NoticesScreen';
import ResultsScreen from './screens/family/ResultsScreen';
import TimetableScreen from './screens/family/TimetableScreen';
import { FamilySummary, StaffSummary } from './screens/homeSummary';
import DetailScreen from './screens/modules/DetailScreen';
import ListScreen from './screens/modules/ListScreen';
import { ModuleScreen, StatsRoute } from './screens/modules/ModulesHome';
import ExamsScreen from './screens/staff/ExamsScreen';
import MarkAttendanceScreen from './screens/staff/MarkAttendanceScreen';
import MarksScreen from './screens/staff/MarksScreen';
import MyClassScreen from './screens/staff/MyClassScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const noHeader = { headerShown: false };

const tabIcon = (name) => ({ color: c, size }) => <Ionicons name={name} size={size} color={c} />;
const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: color.header,
  tabBarInactiveTintColor: '#8a93a6',
  tabBarLabelStyle: { fontWeight: '600', fontSize: 12, marginBottom: 2 },
  tabBarStyle: { height: 76, paddingTop: 6, paddingBottom: 10 },
};

/** The generic module pages (a module's pages, a list, one record, a summary) that both apps share. */
const moduleScreens = (
  <>
    <Stack.Screen name="Module" component={ModuleScreen} />
    <Stack.Screen name="List" component={ListScreen} />
    <Stack.Screen name="Detail" component={DetailScreen} />
    <Stack.Screen name="Stats" component={StatsRoute} />
  </>
);

const pageParams = (registry, moduleKey, screenKey) => ({ registry, moduleKey, screenKey });

/** The profile tab: name, password, sign out. */
function Profile() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="MoreHome">{(props) => <MoreScreen {...props} />}</Stack.Screen>
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
}

/* ---------- parents and students ---------- */

// the same screens as the tabs, opened from the home sections: they need a way back
const withBack = (Screen) => function WithBack(props) { return <Screen {...props} back />; };
const AttendanceBack = withBack(AttendanceScreen);
const FeesBack = withBack(FeesScreen);
const ResultsBack = withBack(ResultsScreen);
const TimetableBack = withBack(TimetableScreen);

function FamilyHomeMain({ navigation }) {
  const { items } = useMenu();
  return <HomeGrid sections={homeSections(items, navigation)} summary={<FamilySummary />} onBell={() => navigation.navigate('Notices')} />;
}

function FamilyHome() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="HomeMain" component={FamilyHomeMain} />
      {moduleScreens}
      <Stack.Screen name="Attendance" component={AttendanceBack} />
      <Stack.Screen name="Fees" component={FeesBack} />
      <Stack.Screen name="Results" component={ResultsBack} />
      <Stack.Screen name="Timetable" component={TimetableBack} />
      <Stack.Screen name="Notices" component={NoticesScreen} />
      <Stack.Screen name="Leave" component={LeaveScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
}

/** The "Ask Query" tab: feedback and grievances, with the form to send one. */
function AskQuery() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Feedback" component={ListScreen} initialParams={{ registry: 'family', moduleKey: 'admin', screenKey: 'feedback', root: true }} />
      <Stack.Screen name="Detail" component={DetailScreen} />
    </Stack.Navigator>
  );
}

function FamilyTabs() {
  return (
    <ChildProvider>
      <Tab.Navigator screenOptions={tabOptions}>
        <Tab.Screen name="Home" component={FamilyHome} options={{ tabBarIcon: tabIcon('home') }} />
        <Tab.Screen name="Time Table" component={TimetableScreen} options={{ tabBarIcon: tabIcon('time-outline') }} />
        <Tab.Screen name="Ask Query" component={AskQuery} options={{ tabBarIcon: tabIcon('help-circle-outline') }} />
        <Tab.Screen name="Profile" component={Profile} options={{ tabBarIcon: tabIcon('person-outline') }} />
      </Tab.Navigator>
    </ChildProvider>
  );
}

/* ---------- teachers, admins and accountants ---------- */

function StaffHomeMain({ navigation }) {
  const { user } = useAuth();
  const { items } = useMenu();
  return <HomeGrid tiles={homeTiles(items, 'staff', navigation)} summary={<StaffSummary role={user?.role} />} onBell={() => navigation.navigate('List', pageParams('staff', 'communication', 'notices'))} />;
}

function StaffHome() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="HomeMain" component={StaffHomeMain} />
      {moduleScreens}
      <Stack.Screen name="Exams" component={ExamsScreen} />
      <Stack.Screen name="Marks" component={MarksScreen} />
      <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
      <Stack.Screen name="MyClass" component={MyClassScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
}

function StaffTabs() {
  const { user } = useAuth();
  const teaches = ['admin', 'teacher'].includes(user?.role);
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Home" component={StaffHome} options={{ tabBarIcon: tabIcon('home') }} />
      {teaches && <Tab.Screen name="My class" component={MyClassScreen} options={{ tabBarIcon: tabIcon('people-outline') }} />}
      {teaches && <Tab.Screen name="Attendance" component={MarkAttendanceScreen} options={{ tabBarIcon: tabIcon('checkbox-outline') }} />}
      <Tab.Screen name="Profile" component={Profile} options={{ tabBarIcon: tabIcon('person-outline') }} />
    </Tab.Navigator>
  );
}

/* ---------- everyone else, and the states before the app opens ---------- */

function WebOnly() {
  const { user, signOut } = useAuth();
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: color.bg }}>
      <Card>
        <Title>Please use the web app</Title>
        <Muted style={{ marginBottom: 16 }}>The mobile app is for parents, students and school staff. {user?.name}, your {user?.role} tools are on the school website.</Muted>
        <Button title="Sign out" onPress={signOut} />
      </Card>
    </View>
  );
}

function MustChangePassword() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Forced">{() => <ChangePasswordScreen forced />}</Stack.Screen>
    </Stack.Navigator>
  );
}

function SignedOut() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const { ready, user } = useAuth();
  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}><ActivityIndicator color={color.header} size="large" /></View>;
  }
  const audience = user ? audienceOf(user.role) : null;
  return (
    <NavigationContainer>
      {!user ? <SignedOut /> : user.mustChangePassword ? <MustChangePassword /> : audience === 'family' ? <FamilyTabs /> : audience === 'staff' ? <StaffTabs /> : <WebOnly />}
    </NavigationContainer>
  );
}
