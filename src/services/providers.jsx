import { RosterProvider } from "./context/RosterContext";

export default function Providers({ children }) {
  return (
    <RosterProvider>
      {children}
    </RosterProvider>
  );
}
