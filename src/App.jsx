import AppShell from "./AppShell.jsx";
import Router from "./router.jsx";
import "./index.css";

export default function App() {
  return (
    <AppShell>
      <Router />
    </AppShell>
  );
}