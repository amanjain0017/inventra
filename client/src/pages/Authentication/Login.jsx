import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Toast from "../../components/Toast/Toast";

import mainBg from "./../../assets/Background/mainbackground.png";
import unhidePassword from "./../../assets/icons/unhidepassword.png";
import hidePassword from "./../../assets/icons/hidepassword.png";
import logo from "./../../assets/icons/companylogo.png";
import "./Auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const { user, login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Redirect if the user is already authenticated
  useEffect(() => {
    if (user && !toastMessage) {
      navigate("/home", { replace: true });
    }
  }, [user, navigate, toastMessage]);

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

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setToastMessage(null);

    const result = await login(email, password);

    if (result.success) {
      setToastMessage({
        type: "success",
        text: "Login successful",
      });

      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 1000);
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
          <h2>Log in to your account</h2>
          <p className="auth-subtitle">
            Welcome back! Please enter your details.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Example@email.com"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="at least 8 characters"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  maxLength={40}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
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

            <div className="forgot-password">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't you have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="welcome-section">
          <div className="title-and-logo">
            <h1>
              Welcome to
              <br />
              Canova Inventra
            </h1>
            <div className="logo">
              <img src={logo} alt="Company Logo" className="company-logo" />
            </div>
          </div>
          <div className="illustration">
            <img
              src={mainBg}
              alt="Login Illustration"
              className="illustration-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
