function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: "fail", message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ status: "fail", message: "Admin access required" });
  }

  return next();
}

function serviceProviderOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: "fail", message: "Unauthorized" });
  }

  if (req.user.role !== "serviceProvider") {
    return res.status(403).json({ status: "fail", message: "Service Provider access required" });
  }

  return next();
}

function adminOrServiceProvider(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: "fail", message: "Unauthorized" });
  }

  if (!["admin", "serviceProvider"].includes(req.user.role)) {
    return res.status(403).json({ status: "fail", message: "Admin or Service Provider access required" });
  }

  return next();
}

module.exports = { adminOnly, serviceProviderOnly, adminOrServiceProvider };
