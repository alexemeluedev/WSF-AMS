import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authorization header." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "supersecretkey",
    );
    req.user = payload;
    next();
  } catch (error) {
    // Check if the error is explicitly an expired token
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        code: "TOKEN_EXPIRED",
        message: "Session expired. Redirecting to login...",
      });
    }
    // Handle other token errors (malformed, bad signature)
    return res.status(401).json({ message: "Invalid token credentials." });
  }
};

export const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Administrator privileges required." });
  }
  next();
};
