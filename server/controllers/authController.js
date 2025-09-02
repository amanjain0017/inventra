const User = require("../models/userSchema");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

// Route: POST /api/auth/signup
// Access: Public
// Description: Registers a new user with first name, last name, email, and password.
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .json({ error: "Please enter all required fields." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists." });
    }

    // Create new user (password hashing is handled by pre-save hook in schema)
    const user = new User({ firstName, lastName, email, password });
    await user.save();

    // Generate JWT token
    const token = await user.generateAuthToken();

    // Send success response
    res.status(201).json({
      message: "User registered successfully!",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server error during signup." });
  }
};

// Route: POST /api/auth/login
// Access: Public
// Description: Authenticates a user with email and password, and returns a JWT token.
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please enter email and password." });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Compare password (using method from userSchema)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Generate new JWT token
    const token = await user.generateAuthToken();

    res.status(200).json({
      message: "Login successful!",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login." });
  }
};

// Route: POST /api/auth/forgot-password
// Access: Public
// Description: Sends an OTP to the user's registered email for password reset.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ error: "Please provide an email address." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Send a generic success message even if email not found to prevent email enumeration
      return res.status(200).json({
        message: "If a user with that email exists, an OTP has been sent.",
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.passwordResetOtp = otp;
    user.passwordResetOtpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
    await user.save({ validateBeforeSave: false }); // Skip schema validation for temporary fields

    const message = `
            <h1>Canova Inventra Password Reset OTP</h1><br><br>
            <p>Your One-Time Password (OTP) for password reset is:</p>
            <h2>${otp}</h2>
            <p>This OTP is valid for 5 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset OTP for Inventra",
        message,
      });
      res.status(200).json({
        success: true,
        message: "OTP sent to your email successfully.",
      });
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError);
      // Clear OTP if email sending fails
      user.passwordResetOtp = undefined;
      user.passwordResetOtpExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("Email could not be sent:", emailError);
      return res.status(500).json({
        success: false,
        message: "Email could not be sent. Please try again later.",
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error " });
    console.error(error);
  }
};

// Route: POST /api/auth/verify-otp
// Access: Public
// Description: Verifies the OTP sent to the user's email. If valid, returns a temporary reset token.
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Please provide email and OTP." });
    }

    const user = await User.findOne({
      email,
      passwordResetOtp: otp,
      passwordResetOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    // If OTP is valid, clear OTP fields and set the flag
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    user.isOtpVerified = true; // Set flag to true
    await user.save({ validateBeforeSave: false });

    // Generate a short-lived token to allow password reset
    const resetToken = jwt.sign(
      { _id: user._id, otpVerified: true },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m", // Short-lived token for password reset
      }
    );

    res.status(200).json({ message: "OTP verified successfully.", resetToken });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ error: "Server error during OTP verification." });
  }
};

// Route: POST /api/auth/reset-password
// Access: Public (requires valid resetToken from verify-otp)
// Description: Allows user to set a new password after successful OTP verification.
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmNewPassword } = req.body;

    if (!resetToken || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long." });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (!decoded.otpVerified) {
        return res.status(403).json({ error: "Invalid reset token." });
      }
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired reset token." });
    }

    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Ensure that the OTP was indeed verified for this user session
    if (!user.isOtpVerified) {
      return res.status(403).json({
        error:
          "OTP not verified for this session. Please restart password reset.",
      });
    }

    // Update the password (pre-save hook will hash it)
    user.password = newPassword;
    user.isOtpVerified = undefined; // Clear the flag after successful reset
    await user.save();

    res.status(200).json({
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Server error during password reset." });
  }
};

// Route: GET /api/auth/profile
// Access: Protected (requires JWT authentication)
// Description: Gets the currently authenticated user's profile information.
exports.getProfile = async (req, res) => {
  try {
    // req.user is populated by the auth middleware
    const user = req.user;

    res.status(200).json({
      message: "Profile retrieved successfully.",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        dashboardLayout: user.dashboardLayout,
        statisticsLayout: user.statisticsLayout,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Server error while retrieving profile." });
  }
};

// Route: PUT /api/auth/profile
// Access: Protected (requires JWT authentication)
// Description: Updates the currently authenticated user's profile information and/or password.
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dashboardLayout,
      statisticsLayout,
      currentPassword,
      newPassword,
      confirmNewPassword,
    } = req.body;
    const user = req.user;

    // Check if password change is requested
    const isPasswordChange =
      currentPassword || newPassword || confirmNewPassword;

    // Validate input - at least one field should be provided
    if (
      !firstName &&
      !lastName &&
      !dashboardLayout &&
      !statisticsLayout &&
      !isPasswordChange
    ) {
      return res.status(400).json({
        error: "Please provide at least one field to update.",
      });
    }

    // Handle password change validation if requested
    if (isPasswordChange) {
      // Validate all password fields are provided
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({
          error:
            "All password fields (currentPassword, newPassword, confirmNewPassword) are required for password change.",
        });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: "New passwords do not match." });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters long." });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        return res
          .status(400)
          .json({ error: "Current password is incorrect." });
      }

      // Check if new password is different from current password
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          error: "New password must be different from current password.",
        });
      }
    }

    // Update profile fields
    const updateData = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (dashboardLayout !== undefined)
      updateData.dashboardLayout = dashboardLayout;
    if (statisticsLayout !== undefined)
      updateData.statisticsLayout = statisticsLayout;

    // Update password if requested
    if (isPasswordChange) {
      user.password = newPassword;
    }

    // Update profile fields using findByIdAndUpdate if no password change
    let updatedUser;
    if (Object.keys(updateData).length > 0 && !isPasswordChange) {
      updatedUser = await User.findByIdAndUpdate(user._id, updateData, {
        new: true, // Return the updated document
        runValidators: true, // Run schema validations
      });
    } else if (Object.keys(updateData).length > 0 && isPasswordChange) {
      // If both profile and password update, update profile fields on user object
      Object.assign(user, updateData);
      updatedUser = await user.save();
    } else if (isPasswordChange) {
      // Only password change
      updatedUser = await user.save();
    }

    // Build response message
    let message = "Profile updated successfully.";
    if (isPasswordChange && Object.keys(updateData).length > 0) {
      message = "Profile and password updated successfully.";
    } else if (isPasswordChange) {
      message = "Password updated successfully.";
    }

    res.status(200).json({
      message,
      user: {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        dashboardLayout: updatedUser.dashboardLayout,
        statisticsLayout: updatedUser.statisticsLayout,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server error while updating profile." });
  }
};

// Route: POST /api/auth/logout
// Access: Protected (requires JWT authentication)
// Description: Logs out the currently authenticated user by invalidating their JWT token.
exports.logout = async (req, res) => {
  try {
    // req.user and req.token are populated by the 'auth' middleware
    if (!req.user || !req.token) {
      return res
        .status(401)
        .json({ error: "Authentication required for logout." });
    }

    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token; // Remove the current token from the user's tokens array
    });

    await req.user.save();

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Server error during logout." });
  }
};

// Route: POST /api/auth/logout-all
// Access: Protected (requires JWT authentication)
// Description: Logs out the user from all devices by clearing all JWT tokens.
exports.logoutAll = async (req, res) => {
  try {
    const user = req.user;

    // Clear all tokens
    user.tokens = [];
    await user.save();

    res.status(200).json({
      message: "Logged out from all devices successfully.",
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res
      .status(500)
      .json({ error: "Server error during logout from all devices." });
  }
};
