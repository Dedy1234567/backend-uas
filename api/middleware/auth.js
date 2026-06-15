import jwt from "jsonwebtoken";

const authMiddleware = (
  req,
  res,
  next
) => {

  try {

    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Token tidak ditemukan"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      message: "Token tidak valid"
    });

  }

};

export default authMiddleware;