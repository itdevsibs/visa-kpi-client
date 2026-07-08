import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios/api-template";
import {
  getUser,
  saveAuth,
  clearAuth,
  getToken,
} from "../../lib/axios/api-template";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(true);

  /* =====================================
     FETCH CURRENT USER
  ===================================== */

  const fetchUser = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/users/me");

      if (res.data.success) {
        setUser(res.data.user);

        saveAuth(token, res.data.user);
      } else {
        clearAuth();
        setUser(null);
      }
    } catch (error) {
      console.error(error);

      clearAuth();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* =====================================
     LOGIN
  ===================================== */

  const login = useCallback((token, userData) => {
    saveAuth(token, userData);
    setUser(userData);
  }, []);

  /* =====================================
     LOGOUT
  ===================================== */

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    navigate("/login");
  }, [navigate]);

  /* =====================================
     UPDATE USER
  ===================================== */

  const updateUser = useCallback((newUser) => {
    setUser(newUser);

    const token = getToken();

    if (token) {
      saveAuth(token, newUser);
    }
  }, []);

  /* =====================================
     INITIAL LOAD
  ===================================== */

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        setUser: updateUser,
        refetchUser: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return context;
}
