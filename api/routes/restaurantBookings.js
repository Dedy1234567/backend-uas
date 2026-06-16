import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/*
CREATE RESERVATION
*/
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, table_id, reservation_date, reservation_time, guest_count } = req.body;

    const tableResult = await pool.query(
      `
            SELECT *
            FROM restaurant_tables
            WHERE id = $1
            `,
      [table_id]
    );

    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        message: "Meja tidak ditemukan",
      });
    }

    const table = tableResult.rows[0];

    if (table.status !== "available") {
      return res.status(400).json({
        message: "Meja sedang tidak tersedia",
      });
    }

    if (guest_count > table.capacity) {
      return res.status(400).json({
        message: `Kapasitas meja hanya ${table.capacity} orang`,
      });
    }

    const result = await pool.query(
      `
        INSERT INTO restaurant_bookings(
            user_id,
            restaurant_id,
            table_id,
            reservation_date,
            reservation_time,
            guest_count,
            status
        )
        VALUES($1,$2,$3,$4,$5,$6, 'pending')
        RETURNING *
        `,
      [req.user.id, restaurant_id, table_id, reservation_date, reservation_time, guest_count]
    );

    await pool.query(
      `
            UPDATE restaurant_tables
            SET status = 'booked'
            WHERE id = $1
            `,
      [table_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

/*
GET SEMUA RESERVASI (Dengan Search, Filter, dan Pagination)
URL Contoh: /api/reservations?page=1&limit=10&search=budi&status=pending
*/
router.get("/", async (req, res) => {
  try {
    // 1. Ambil query parameters dengan nilai default
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "all";

    const offset = (page - 1) * limit;

    // 2. Bangun kondisi WHERE secara dinamis
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // Tambahkan filter pencarian (Nama, Email, Restoran, Meja) jika ada
    if (search) {
      whereClauses.push(`(
        u.fullname ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        r.name ILIKE $${paramIndex} OR 
        rt.table_number::text ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Tambahkan filter status jika spesifik (bukan 'all')
    if (status !== "all") {
      whereClauses.push(`rb.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Gabungkan klausa WHERE jika ada kondisi yang terpenuhi
    const whereQuery = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // 3. Query untuk menghitung total data setelah difilter (Penting untuk Pagination info)
    const countQuery = `
      SELECT COUNT(*) 
      FROM restaurant_bookings rb
      JOIN restaurants r ON r.id = rb.restaurant_id
      JOIN restaurant_tables rt ON rt.id = rb.table_id
      JOIN users u ON u.id = rb.user_id
      ${whereQuery}
    `;
    const countResult = await pool.query(countQuery, params);
    const totalData = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalData / limit);

    // 4. Query utama untuk mengambil data dengan LIMIT dan OFFSET
    const mainParams = [...params, limit, offset];
    const limitIndex = paramIndex;
    const offsetIndex = paramIndex + 1;

    const mainQuery = `
      SELECT
          rb.*,
          r.name AS restaurant_name,
          rt.table_number,
          u.fullname,
          u.email
      FROM restaurant_bookings rb
      JOIN restaurants r ON r.id = rb.restaurant_id
      JOIN restaurant_tables rt ON rt.id = rb.table_id
      JOIN users u ON u.id = rb.user_id
      ${whereQuery}
      ORDER BY rb.id DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await pool.query(mainQuery, mainParams);

    // 5. Kembalikan response terstruktur lengkap dengan metadata pagination
    res.json({
      data: result.rows,
      pagination: {
        totalData,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

//RESERVASI BERDASARKAN USER
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
            SELECT
                rb.*,
                r.name AS restaurant_name,
                rt.table_number
            FROM restaurant_bookings rb

            JOIN restaurants r
            ON r.id = rb.restaurant_id

            JOIN restaurant_tables rt
            ON rt.id = rb.table_id

            WHERE rb.user_id = $1
            ORDER BY rb.id DESC
            `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

//CANCEL RESERVATION
router.put("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    let bookingResult;

    if (req.user.role === "ADMIN") {
      bookingResult = await pool.query(
        `SELECT * FROM restaurant_bookings WHERE id = $1`,
        [req.params.id]
      );
    } else {
      bookingResult = await pool.query(
        `SELECT * FROM restaurant_bookings WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
      );
    }

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        message: "Booking tidak ditemukan",
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.status === "cancelled") {
      return res.status(400).json({
        message: "Booking sudah dibatalkan",
      });
    }

    await pool.query(
      `UPDATE restaurant_bookings SET status='cancelled' WHERE id=$1`,
      [req.params.id]
    );

    await pool.query(
      `UPDATE restaurant_tables SET status='available' WHERE id=$1`,
      [booking.table_id]
    );

    res.json({
      success: true,
      message: "Reservasi berhasil dibatalkan",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

//COMPLETED
router.put("/:id/complete", authMiddleware, async (req, res) => {
  try {
    // Jalankan dengan SQL biasa, ambil table_id untuk mengembalikan status meja
    const bookingCheck = await pool.query(
      `SELECT table_id, status FROM restaurant_bookings WHERE id = $1`,
      [req.params.id]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Reservasi tidak ditemukan" });
    }

    const booking = bookingCheck.rows[0];

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(400).json({ message: "Reservasi tidak dalam status pending/confirmed" });
    }

    // Update status booking menjadi completed
    const result = await pool.query(
      `
        UPDATE restaurant_bookings
        SET status = 'completed'
        WHERE id = $1
        RETURNING *
        `,
      [req.params.id]
    );

    // PERBAIKAN: Kembalikan status meja menjadi 'available' agar bisa dipesan kembali
    await pool.query(
      `
        UPDATE restaurant_tables
        SET status = 'available'
        WHERE id = $1
        `,
      [booking.table_id]
    );

    res.json({
      message: "Reservasi berhasil ditandai selesai",
      booking: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;