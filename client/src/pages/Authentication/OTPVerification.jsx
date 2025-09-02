import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Toast from "../../components/Toast/Toast";

import otpBG from "./../../assets/Background/enterotp.png";
import "./Auth.css";

const OTPVerification = () => {
  const [otp, setOtp] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const { verifyOtp, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user came from forgot password page
  useEffect(() => {
    if (!location.state?.fromForgotPassword || !location.state?.email) {
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

  const handleOtpChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and limit to 6 characters
    if (/^\d*$/.test(value) && value.length <= 6) {
      setOtp(value);
    }
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setToastMessage(null);

    if (!location.state?.email) {
      setToastMessage({
        type: "error",
        text: "Email not found. Please restart the process.",
      });
      return;
    }

    if (otp.length !== 6) {
      setToastMessage({
        type: "error",
        text: "Please enter a 6-digit OTP",
      });
      return;
    }

    const result = await verifyOtp(location.state.email, otp);

    if (result.success) {
      setToastMessage({
        type: "success",
        text: "OTP verified successfully",
      });

      setTimeout(() => {
        navigate("/reset-password", {
          state: {
            resetToken: result.data.resetToken,
            fromOtpVerification: true,
          },
        });
      }, 1500);
    }
  };

  const closeToast = () => {
    setToastMessage(null);
  };

  // Don't render if user didn't come from forgot password
  if (!location.state?.fromForgotPassword) {
    return null;
  }

  return (
    <div className="auth-container">
      {toastMessage && (
        <Toast message={toastMessage} onClose={closeToast} duration={3000} />
      )}

      <div className="auth-left">
        <div className="auth-form">
          <h2>Enter Your OTP</h2>
          <p className="auth-subtitle">
            We've sent a 6-digit OTP to your registered mail.
            <br />
            Please enter it below to sign in.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>OTP</label>
              <input
                type="text"
                placeholder="xxxxxx"
                value={otp}
                onChange={handleOtpChange}
                maxLength="6"
                required
                disabled={loading}
                style={{ letterSpacing: "0.2em", textAlign: "center" }}
              />
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Confirm"}
            </button>
          </form>
        </div>
      </div>

      <div className="auth-right">
        <div className="welcome-section">
          <div className="illustration">
            <img
              src={otpBG}
              alt="OTP Verification Illustration"
              className="illustration-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
