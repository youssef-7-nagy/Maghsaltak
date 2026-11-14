const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

async function authMiddleWare(request, response, next) {
  const auth = request.headers?.authorization || request.headers?.Authorization;

  if (!auth) {
    return response.status(401).json({ message: "Token Not Provided.." });
  }

  if (!auth.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Invalid Token Format.. Use Bearer [token]" });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // fetch the live user
    const { User } = require("../models/User");
    const user = await User.findById(decoded.id).select("_id email role isAvailable");
    if (!user) {
      return response.status(401).json({ message: "User no longer exists." });
    }

    request.user = { id: user._id, email: user.email, role: user.role, isAvailable: user.isAvailable };
    next();
  } catch (error) {
    return response.status(401).json({ message: "Invalid Token or Expired.." });
  }
}

module.exports = { authMiddleWare };