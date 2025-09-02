import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Toast from "../../components/Toast/Toast";

import "./Auth.css";
import emailBG from "./../../assets/Background/enteremail.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const { forgotPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      setToastMessage({
        type: "error",
        text: error,
      });
    }
  }, [error]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setToastMessage(null);

    const result = await forgotPassword(email);

    if (result.success) {
      setToastMessage({
        type: "success",
        text: "OTP sent successfully to your email",
      });

      // Navigate to OTP verification page after 2 seconds
      setTimeout(() => {
        navigate("/otp-verification", {
          state: { email, fromForgotPassword: true },
        });
      }, 2000);
    }
  };

  const closeToast = () => {
    setToastMessage(null);
  };

  return (
    <div className="auth-container">
      {toastMessage && (
        <Toast message={toastMessage} onClose={closeToast} duration={3000} />
      )}

      <div className="auth-left">
        <div className="auth-form">
          <h2>Canova Inventra</h2>
          <p className="auth-subtitle">
            Please enter your registered email ID to receive an OTP
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Sending..." : "Send Mail"}
            </button>
          </form>
        </div>
      </div>

      <div className="auth-right">
        <div className="welcome-section">
          <div className="illustration">
            <img
              src={emailBG}
              alt="Forgot Password Illustration"
              className="illustration-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
