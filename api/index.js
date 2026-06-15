import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";

import hotelRoutes from "./routes/hotel.js";

import roomRoutes from "./routes/rooms.js";

import hotelBookingRoutes from "./routes/hotelBookings.js"

import restaurantRoutes from "./routes/restaurant.js";

import restaurantTableRoutes from "./routes/restaurantTables.js";

import restaurantBookingRoutes from "./routes/restaurantBookings.js";

import dashboardRoutes from "./routes/dashboard.js";

import notifications from "./routes/notifications.js"

import bcrypt from "bcrypt";
import pool from "./db.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/hotel", hotelRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/hotel-bookings",hotelBookingRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/restaurant-tables",restaurantTableRoutes);
app.use("/api/restaurant-bookings",restaurantBookingRoutes);
app.use("/api/dashboard",dashboardRoutes);
app.use("/api/notifications", notifications);

app.get("/", (req, res) => {
  res.send("Booking API Running");
});

async function createDefaultAdmin() {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      ["admin@gmail.com"]
    );

    if (result.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await pool.query(
        `
        INSERT INTO users(fullname, email, password, role)
        VALUES($1, $2, $3, $4)
        `,
        [
          "Administrator",
          "admin@gmail.com",
          hashedPassword,
          "admin"
        ]
      );

      console.log("Default admin berhasil dibuat");
    } else {
      console.log("Admin sudah ada");
    }
  } catch (error) {
    console.error(error);
  }
}

createDefaultAdmin();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});