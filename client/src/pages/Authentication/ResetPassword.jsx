import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Toast from "../../components/Toast/Toast";

import "./Auth.css";
import unhidePassword from "./../../assets/icons/unhidepassword.png";
import hidePassword from "./../../assets/icons/hidepassword.png";
import resetBG from "./../../assets/Background/createpassword.png";

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [passwordErrors, setPasswordErrors] = useState([]);

  const { resetPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user came from OTP verification page
  useEffect(() => {
    if (!location.state?.fromOtpVerification || !location.state?.resetToken) {
      // Redirect to forgot password if accessed directly
      navigate("/forgot-password", { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (error) {
      setToastMessage({
        type: "error",
        text: error,
      });
    }
  }, [error]);

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear password validation errors when user starts typing
    if (name === "newPassword" && passwordErrors.length > 0) {
      setPasswordErrors([]);
    }

    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setToastMessage(null);

    if (!location.state?.resetToken) {
      setToastMessage({
        type: "error",
        text: "Reset token not found. Please restart the process.",
      });
      return;
    }

    // Validate password
    const validationErrors = validatePassword(formData.newPassword);
    if (validationErrors.length > 0) {
      setPasswordErrors(validationErrors);
      setToastMessage({
        type: "error",
        text: "Please fix the password requirements",
      });
      return;
    }

    // Check if passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setToastMessage({
        type: "error",
        text: "Passwords do not match",
      });
      return;
    }

    const result = await resetPassword(
      location.state.resetToken,
      formData.newPassword,
      formData.confirmPassword
    );

    if (result.success) {
      setToastMessage({
        type: "success",
        text: "Password reset successful! Redirecting to login...",
      });

      // Navigate to login page after 2 seconds
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    }
  };

  const closeToast = () => {
    setToastMessage(null);
  };

  // Don't render if user didn't come from OTP verification
  if (!location.state?.fromOtpVerification) {
    return null;
  }

  return (
    <div className="auth-container">
      {toastMessage && (
        <Toast message={toastMessage} onClose={closeToast} duration={4000} />
      )}

      <div className="auth-left">
        <div className="auth-form">
          <h2>Create New Password</h2>
          <p className="auth-subtitle">
            Today is a new day. It's your day. You shape it.
            <br />
            Create a new password for your registered account.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Enter New Password</label>
              <div className="password-input">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="at least 8 characters"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  maxLength={40}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                >
                  {showNewPassword ? (
                    <img src={hidePassword} alt="hide" width={18} height={22} />
                  ) : (
                    <img
                      src={unhidePassword}
                      alt="unhide"
                      width={18}
                      height={22}
                    />
                  )}
                </button>
              </div>
              {passwordErrors.length > 0 && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#dc3545",
                    marginTop: "5px",
                    lineHeight: "1.4",
                  }}
                >
                  {passwordErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="password-input">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="at least 8 characters"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  maxLength={40}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <img src={hidePassword} alt="hide" width={18} height={22} />
                  ) : (
                    <img
                      src={unhidePassword}
                      alt="unhide"
                      width={18}
                      height={22}
                    />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={
                loading || !formData.newPassword || !formData.confirmPassword
              }
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>

      <div className="auth-right">
        <div className="welcome-section">
          <div className="illustration">
            <img
              src={resetBG}
              alt="Reset Password Illustration"
              className="illustration-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
