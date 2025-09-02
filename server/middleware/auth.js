const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");

const auth = async (req, res, next) => {
  try {
    // Get the token from the Authorization header (e.g., "Bearer YOUR_TOKEN")
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No token provided or invalid format.");
    }
    const token = authHeader.replace("Bearer ", "");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!user) {
      throw new Error("User not found or token invalidated.");
    }

    // Attach the token and user object to the request for use in subsequent middleware/route handlers
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error.message);
    res.status(401).json({ error: "Please authenticate." });
  }
};

module.exports = auth;
