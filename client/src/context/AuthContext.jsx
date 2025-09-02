import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

const AuthContext = createContext();

// Base API URL - using Vite environment variable
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Configure axios to automatically include the auth token
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Custom hook to use the Auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage for persistence on refresh
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to update state and local storage
  const storeAuthData = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    if (newToken) {
      localStorage.setItem("token", newToken);
    } else {
      localStorage.removeItem("token");
    }
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("user");
    }
  };

  // Clear error function
  const clearError = () => setError(null);

  // Get user profile function using useCallback to prevent re-creation
  const getProfile = useCallback(async (currentAccessToken) => {
    setLoading(true);
    setError(null);
    try {
      // Temporarily set the auth header for this request
      const tempApiClient = axios.create({ baseURL: API_BASE_URL });
      if (currentAccessToken) {
        tempApiClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${currentAccessToken}`;
      } else {
        delete tempApiClient.defaults.headers.common["Authorization"];
      }

      const response = await tempApiClient.get("/auth/profile");
      storeAuthData(currentAccessToken, response.data.user);
      return { success: true, user: response.data.user };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "Failed to fetch profile";
      setError(errorMessage);
      storeAuthData(null, null); // Clear state if token is invalid
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Signup function
  const signup = async (firstName, lastName, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post("/auth/signup", {
        firstName,
        lastName,
        email,
        password,
      });

      const newToken = response.data.token;
      // Now fetch and store the full user profile
      const profileResult = await getProfile(newToken);

      if (profileResult.success) {
        return { success: true, message: "Signup successful!" };
      } else {
        return { success: false, error: profileResult.error };
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "Signup failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      const newToken = response.data.token;
      // Now fetch and store the full user profile
      const profileResult = await getProfile(newToken);

      if (profileResult.success) {
        return { success: true, message: "Login successful!" };
      } else {
        return { success: false, error: profileResult.error };
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "Login failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password function
  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post("/auth/forgot-password", { email });
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "Failed to send OTP";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP function
  const verifyOtp = async (email, otp) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post("/auth/verify-otp", { email, otp });
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "OTP verification failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Reset Password function
  const resetPassword = async (resetToken, newPassword, confirmNewPassword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post("/auth/reset-password", {
        resetToken,
        newPassword,
        confirmNewPassword,
      });
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "Password reset failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (updateData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.put("/auth/profile", updateData);
      storeAuthData(token, response.data.user);
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Profile update failed. Please try again.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      await apiClient.post("/auth/logout", {});
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      storeAuthData(null, null);
      setLoading(false);
    }
  };

  // Logout from all devices function
  const logoutAll = async () => {
    setLoading(true);
    try {
      await apiClient.post("/auth/logout-all", {});
    } catch (err) {
      console.error("Logout all devices error:", err);
    } finally {
      storeAuthData(null, null);
      setLoading(false);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    return !!storedToken && !!storedUser;
  }, []);

  // Effect to rehydrate state from local storage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && !storedUser) {
      // If token exists but user data doesn't, fetch the profile
      getProfile(storedToken);
    } else if (storedToken && storedUser) {
      // If both exist, update the axios header
      apiClient.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${storedToken}`;
    }
  }, [getProfile]);

  const value = {
    user,
    token,
    loading,
    error,
    signup,
    login,
    forgotPassword,
    verifyOtp,
    resetPassword,
    logout,
    logoutAll,
    getProfile,
    updateProfile,
    isAuthenticated,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
