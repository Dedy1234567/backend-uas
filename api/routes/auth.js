import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

//
// REGISTER
//
router.post("/register", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({
        message: "Semua field wajib diisi"
      });
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "Email sudah digunakan"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users(fullname, email, password)
      VALUES($1, $2, $3)
      RETURNING id, fullname, email, role
      `,
      [fullname, email, hashedPassword]
    );

    const user = result.rows[0];

    // Buat JWT Token agar setelah register langsung login otomatis
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Simpan token ke Cookie HTTP-Only
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // Ubah ke true jika sudah produksi (HTTPS)
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    // Kembalikan data yang sama persis dengan struktur Login
    res.status(201).json({
      success: true,
      message: "Registrasi Berhasil",
      token, // Dikirim via body juga untuk fleksibilitas frontend
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server Error"
    });
  }
});

//
// LOGIN
//
router.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Email tidak ditemukan"
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Password salah"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: "Login Berhasil",
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

});

//
// LOGOUT
//
router.post("/logout", (req, res) => {

  res.clearCookie("token");

  res.json({
    success: true,
    message: "Logout berhasil"
  });

});

router.get(
    "/me",
    authMiddleware,
    async (req, res) => {
  
      try {
  
        const result = await pool.query(
          `
          SELECT
          id,
          fullname,
          email,
          role
          FROM users
          WHERE id = $1
          `,
          [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
              message: "User tidak ditemukan"
            });
          }
  
        res.json(result.rows[0]);
  
      } catch (error) {
  
        res.status(500).json({
          message: "Server Error"
        });
  
      }
  
    }
  );

export default router;