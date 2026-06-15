/**
 * routes/notifications.js
 * Taruh di: BE/routes/notifications.js
 * Daftarkan di server.js:
 *   import notificationRoutes from "./routes/notifications.js";
 *   app.use("/api/notifications", notificationRoutes);
 */

import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/notifications
 * Ambil semua notifikasi user dari hotel_bookings + restaurant_bookings
 * Digabung, diurutkan by updated_at DESC
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const hotelResult = await pool.query(
      `
      SELECT
        hb.id,
        'hotel' AS type,
        hb.status,
        hb.check_in  AS date,
        hb.updated_at,
        h.name       AS title,
        r.room_name  AS subtitle
      FROM hotel_bookings hb
      JOIN rooms r ON hb.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
      WHERE hb.user_id = $1
      ORDER BY hb.updated_at DESC
      LIMIT 20
      `,
      [userId]
    );

    const restoResult = await pool.query(
      `
      SELECT
        rb.id,
        'restaurant' AS type,
        rb.status,
        rb.reservation_date AS date,
        rb.updated_at,
        r.name              AS title,
        CONCAT('Meja ', rt.table_number) AS subtitle
      FROM restaurant_bookings rb
      JOIN restaurants r  ON rb.restaurant_id = r.id
      JOIN restaurant_tables rt ON rb.table_id = rt.id
      WHERE rb.user_id = $1
      ORDER BY rb.updated_at DESC
      LIMIT 20
      `,
      [userId]
    );

    // gabung & urutkan
    const combined = [
      ...hotelResult.rows,
      ...restoResult.rows,
    ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    res.json(combined);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;