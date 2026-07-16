import { useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import Router from "./router";
import AuthSessionWatcher from "./components/AuthSessionWatcher";

export default function App() {
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  return (
    <>
      <AuthSessionWatcher />

      {isLoginPage ? (
        <Router />
      ) : (
        <AppShell>
          <Router />
        </AppShell>
      )}
    </>
  );
}