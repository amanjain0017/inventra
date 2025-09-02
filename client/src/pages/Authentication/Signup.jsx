import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Toast from "../../components/Toast/Toast";

import mainBg from "./../../assets/Background/mainbackground.png";
import unhidePassword from "./../../assets/icons/unhidepassword.png";
import hidePassword from "./../../assets/icons/hidepassword.png";
import logo from "./../../assets/icons/companylogo.png";
import "./Auth.css";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const { user, signup, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Redirect if the user is already authenticated
  useEffect(() => {
    if (user && !toastMessage) {
      navigate("/home", { replace: true });
    }
  }, [user, navigate, toastMessage]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setToastMessage(null);

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setToastMessage({
        type: "error",
        text: "Passwords do not match!",
      });
      return;
    }

    if (formData.password.length < 6) {
      setToastMessage({
        type: "error",
        text: "Password must be atleast 6 characters!",
      });
      return;
    }

    // Split name into firstName and lastName
    const nameParts = formData.name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    if (!firstName) {
      setToastMessage({
        type: "error",
        text: "Please enter your name!",
      });
      return;
    }

    const result = await signup(
      firstName,
      lastName,
      formData.email,
      formData.password
    );

    if (result.success) {
      setToastMessage({
        type: "success",
        text: "Account created successfully",
      });

      setTimeout(() => {
        navigate("/home");
      }, 1000);
    } else {
      setToastMessage({
        type: "error",
        text: result.error || "Signup failed. Please try again.",
      });
    }
  };

  const closeToast = () => {
    setToastMessage(null);
  };

  return (
    <div className="auth-container">
      <Toast message={toastMessage} onClose={closeToast} duration={3000} />

      <div className="auth-left">
        <div className="auth-form">
          <h2>Create an account</h2>
          <p className="auth-subtitle">Start inventory management.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="Example@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Create Password</label>
              <div className="password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="at least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
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

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Signing Up..." : "Sign up"}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Do you have an account? <Link to="/login">Sign in</Link>
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

export default Signup;
