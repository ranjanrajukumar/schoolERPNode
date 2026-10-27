import { AuthProvider } from './context/AuthContext.jsx';
import AppRoutes from './routes/index.jsx';

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
