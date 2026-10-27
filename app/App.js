import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth';
import { MenuProvider } from './src/menu';
import Navigation from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MenuProvider>
          <Navigation />
        </MenuProvider>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
