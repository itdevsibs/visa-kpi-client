import { UserProvider } from "./context/UserContext";
import { RosterProvider } from "./context/RosterContext";

export default function Providers({ children }) {
  return (
    <UserProvider>
      <RosterProvider>
        {children}
      </RosterProvider>
    </UserProvider>
  );
}