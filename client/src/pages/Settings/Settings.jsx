import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Toast from "../../components/Toast/Toast";
import logo from "../../assets/icons/companylogo.png";
import "./Settings.css";

const Settings = () => {
  const { user, updateProfile, logout, loading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // UI state
  const [activeTab, setActiveTab] = useState("profile");
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Show toast message
  const showToast = (message, type) => {
    setToast({ text: message, type });
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare update data
      const updateData = {};

      // Add profile fields if they've changed
      if (formData.firstName !== user?.firstName) {
        updateData.firstName = formData.firstName;
      }
      if (formData.lastName !== user?.lastName) {
        updateData.lastName = formData.lastName;
      }

      // Add password fields if password change is requested
      const isPasswordChange =
        formData.currentPassword ||
        formData.newPassword ||
        formData.confirmNewPassword;
      if (isPasswordChange) {
        if (
          !formData.currentPassword ||
          !formData.newPassword ||
          !formData.confirmNewPassword
        ) {
          showToast(
            "All password fields are required for password change",
            "error"
          );
          setIsSubmitting(false);
          return;
        }

        if (formData.newPassword !== formData.confirmNewPassword) {
          showToast("New passwords do not match", "error");
          setIsSubmitting(false);
          return;
        }

        if (formData.newPassword.length < 6) {
          showToast("New password must be at least 6 characters long", "error");
          setIsSubmitting(false);
          return;
        }

        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
        updateData.confirmNewPassword = formData.confirmNewPassword;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        showToast("No changes to save", "error");
        setIsSubmitting(false);
        return;
      }

      const result = await updateProfile(updateData);

      if (result.success) {
        showToast(result.message, "success");

        // Clear password fields after successful update
        if (isPasswordChange) {
          setFormData((prev) => ({
            ...prev,
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
          }));
        }
      } else {
        showToast(result.error, "error");
      }
    } catch (error) {
      showToast("An error occurred while updating profile", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      showToast("Error logging out", "error");
    }
  };

  return (
    <>
      <div className="settings-header">
        <div className="page-title">Settings</div>
        <div className="mobile-logo">
          <img src={logo} alt="logo" width={35} />
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      <div className="settings-page">
        <div className="settings-container">
          <div className="settings-tabs">
            <button
              className={`tab-button ${
                activeTab === "profile" ? "active" : ""
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Edit Profile
            </button>
          </div>

          <div className="settings-form-container">
            <form onSubmit={handleProfileUpdate} className="settings-form">
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    className="form-input disabled"
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="save-button"
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <Toast message={toast} onClose={() => setToast(null)} duration={3000} />
      </div>
    </>
  );
};

export default Settings;
