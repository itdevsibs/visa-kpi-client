import { useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import Router from "./router";

export default function App() {
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  if (isLoginPage) {
    return <Router />;
  }

  return (
    <AppShell>
      <Router />
    </AppShell>
  );
}