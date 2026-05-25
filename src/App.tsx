import { AdminDashboard } from "./components/AdminDashboard";
import { AuthGate } from "./components/AuthGate";

export default function App() {
  return (
    <AuthGate>
      <AdminDashboard />
    </AuthGate>
  );
}
