import React, { createContext, useContext, useMemo, useEffect } from "react";
import { ClerkProvider, useUser, useClerk } from "@clerk/clerk-react";

const AuthContext = createContext();

const CLERK_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || "";

function ClerkBridge({ children }) {
  const { user: clerkUser, isLoaded } = useUser();
  const clerk = useClerk();

  useEffect(() => {
    localStorage.removeItem("user");
  }, []);

  const activeUser = useMemo(() => {
    if (!clerkUser) return null;

    return {
      id: clerkUser.id,
      name: clerkUser.fullName || clerkUser.firstName || clerkUser.username || "Farmer",
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      phone: clerkUser.primaryPhoneNumber?.phoneNumber || "",
      place: clerkUser.unsafeMetadata?.place || "",
      photo: clerkUser.imageUrl || ""
    };
  }, [clerkUser]);

  // ── Track login in admin panel ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    const API_BASE_URL = process.env.REACT_APP_API_URL || "https://krishi-mitra-6avb.onrender.com";
    fetch(`${API_BASE_URL}/api/admin/track-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: clerkUser.id,
        name:    clerkUser.fullName || clerkUser.firstName || clerkUser.username || "",
        email:   clerkUser.primaryEmailAddress?.emailAddress || "",
        phone:   clerkUser.primaryPhoneNumber?.phoneNumber || "",
        photo:   clerkUser.imageUrl || "",
        event:   "login",
        page:    window.location.pathname,
      }),
    }).catch(() => {}); // silent — never break the app
  }, [isLoaded, clerkUser?.id]); // eslint-disable-line

  const logout = async () => {
    try {
      await clerk.signOut();
    } catch (err) {
      console.warn("Clerk signout:", err);
    }
    localStorage.removeItem("user");
    localStorage.removeItem("profilePhoto");
  };

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        rawClerkUser: clerkUser,
        isClerkActive: !!clerkUser,
        isClerkConfigured: true,
        isLoaded,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function AuthProvider({ children }) {
  if (!CLERK_KEY) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          rawClerkUser: null,
          isClerkActive: false,
          isClerkConfigured: false,
          isLoaded: true,
          logout: () => {}
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_KEY}
      afterSignOutUrl="/login"
      signInUrl="/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/account"
      signUpFallbackRedirectUrl="/account"
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
