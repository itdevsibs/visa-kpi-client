import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

function decodeJwtPayload(token) {
  try {
    const tokenParts = String(token || "").split(".");

    if (tokenParts.length !== 3) {
      return null;
    }

    const base64Url = tokenParts[1];

    const base64 = base64Url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(base64Url.length / 4) * 4, "=");

    const decodedPayload = window.atob(base64);

    const jsonPayload = decodeURIComponent(
      decodedPayload
        .split("")
        .map((character) => {
          return `%${character
            .charCodeAt(0)
            .toString(16)
            .padStart(2, "0")}`;
        })
        .join(""),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("[JWT DECODE ERROR]", error);
    return null;
  }
}

function getToken() {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
}

function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
}

export default function AuthSessionWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  const jwtTimeoutRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const loggingOutRef = useRef(false);

  const clearJwtTimer = useCallback(() => {
    if (jwtTimeoutRef.current) {
      window.clearTimeout(jwtTimeoutRef.current);
      jwtTimeoutRef.current = null;
    }
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      window.clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearJwtTimer();
    clearInactivityTimer();
  }, [clearJwtTimer, clearInactivityTimer]);

  const logoutUser = useCallback(
    (reason = "expired") => {
      console.log("[AUTO LOGOUT]", reason);

      if (loggingOutRef.current) {
        return;
      }

      loggingOutRef.current = true;

      clearAllTimers();
      clearAuthStorage();

      if (window.location.pathname !== "/login") {
        navigate("/login", {
          replace: true,
          state: {
            sessionExpired: true,
            logoutReason: reason,
            message:
              reason === "inactive"
                ? "You were logged out because there was no activity."
                : "Your session has expired. Please log in again.",
          },
        });
      }

      window.setTimeout(() => {
        loggingOutRef.current = false;
      }, 300);
    },
    [clearAllTimers, navigate],
  );

  const scheduleJwtLogout = useCallback(() => {
    clearJwtTimer();

    const token = getToken();

    if (!token) {
      return;
    }

    const decodedToken = decodeJwtPayload(token);
    const expirationSeconds = Number(decodedToken?.exp);

    if (!Number.isFinite(expirationSeconds)) {
      logoutUser("invalid-token");
      return;
    }

    const expirationMilliseconds =
      expirationSeconds * 1000;

    const remainingMilliseconds =
      expirationMilliseconds - Date.now();

    if (remainingMilliseconds <= 0) {
      logoutUser("expired");
      return;
    }

    console.log(
      "[JWT TIMER] Logout in",
      Math.ceil(remainingMilliseconds / 1000),
      "seconds",
    );

    jwtTimeoutRef.current = window.setTimeout(() => {
      logoutUser("expired");
    }, remainingMilliseconds);
  }, [clearJwtTimer, logoutUser]);

  const scheduleInactivityLogout = useCallback(() => {
    clearInactivityTimer();

    const token = getToken();

    if (!token) {
      return;
    }

    console.log(
      "[INACTIVITY TIMER] Restarted. Logout in",
      INACTIVITY_TIMEOUT_MS / 1000,
      "seconds",
    );

    inactivityTimeoutRef.current = window.setTimeout(() => {
      logoutUser("inactive");
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, logoutUser]);

  const handleActivity = useCallback(
    (event) => {
      if (window.location.pathname === "/login") {
        return;
      }

      if (!getToken()) {
        return;
      }

      console.log(
        "[USER ACTIVITY]",
        event?.type || "route-change",
        new Date().toLocaleTimeString(),
      );

      scheduleInactivityLogout();
    },
    [scheduleInactivityLogout],
  );

  useEffect(() => {
    if (location.pathname === "/login") {
      clearAllTimers();
      return;
    }

    const token = getToken();

    if (!token) {
      return;
    }

    scheduleJwtLogout();
    scheduleInactivityLogout();
  }, [
    location.pathname,
    location.search,
    clearAllTimers,
    scheduleJwtLogout,
    scheduleInactivityLogout,
  ]);

  useEffect(() => {
    if (location.pathname === "/login") {
      return undefined;
    }

    const activityEvents = [
      "click",
      "mousedown",
      "keydown",
      "scroll",
      "wheel",
      "touchstart",
      "touchmove",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleActivity,
        {
          passive: true,
          capture: true,
        },
      );
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleActivity,
          {
            capture: true,
          },
        );
      });
    };
  }, [location.pathname, handleActivity]);

  useEffect(() => {
    if (
      location.pathname !== "/login" &&
      getToken()
    ) {
      handleActivity({
        type: "route-change",
      });
    }
  }, [
    location.pathname,
    location.search,
    handleActivity,
  ]);

  useEffect(() => {
    function handleStorageChange(event) {
      if (
        event.key === "token" ||
        event.key === "user"
      ) {
        scheduleJwtLogout();
        scheduleInactivityLogout();
      }
    }

    function handleTokenUpdated() {
      loggingOutRef.current = false;

      scheduleJwtLogout();
      scheduleInactivityLogout();
    }

    function handleWindowFocus() {
      if (!getToken()) {
        return;
      }

      scheduleJwtLogout();
      scheduleInactivityLogout();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        getToken()
      ) {
        scheduleJwtLogout();
        scheduleInactivityLogout();
      }
    }

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    window.addEventListener(
      "auth-token-updated",
      handleTokenUpdated,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      clearAllTimers();

      window.removeEventListener(
        "storage",
        handleStorageChange,
      );

      window.removeEventListener(
        "auth-token-updated",
        handleTokenUpdated,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    clearAllTimers,
    scheduleJwtLogout,
    scheduleInactivityLogout,
  ]);

  return null;
}