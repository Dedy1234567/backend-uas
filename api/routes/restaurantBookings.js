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
            guest_count
        )
        VALUES($1,$2,$3,$4,$5,$6)
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

    res.status(500).json({
      message: "Server Error",
    });
  }
});

//GET SEMUA RESERVASI
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT
            rb.*,
            r.name AS restaurant_name,
            rt.table_number,
            u.fullname,
            u.email
    
        FROM restaurant_bookings rb
    
        JOIN restaurants r
        ON r.id = rb.restaurant_id
    
        JOIN restaurant_tables rt
        ON rt.id = rb.table_id
    
        JOIN users u
        ON u.id = rb.user_id
    
        ORDER BY rb.id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
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
            `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

//CANCEL RESERVASION
router.put("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    let bookingResult;

if (req.user.role === "ADMIN") {

  bookingResult = await pool.query(
    `
    SELECT *
    FROM restaurant_bookings
    WHERE id = $1
    `,
    [req.params.id]
  );

} else {

  bookingResult = await pool.query(
    `
    SELECT *
    FROM restaurant_bookings
    WHERE id = $1
    AND user_id = $2
    `,
    [
      req.params.id,
      req.user.id
    ]
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
      `
    UPDATE restaurant_bookings
    SET status='cancelled'
    WHERE id=$1
    `,
      [req.params.id]
    );

    await pool.query(
      `
    UPDATE restaurant_tables
    SET status='available'
    WHERE id=$1
    `,
      [booking.table_id]
    );

    res.json({
      success: true,
      message: "Reservasi berhasil dibatalkan",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

//completed
router.put("/:id/complete",authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(
        `
        UPDATE restaurant_bookings
        SET status = 'completed'
        WHERE id = $1
          AND status = 'pending'
        RETURNING *
        `,
        [req.params.id]
      );
   
      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Reservasi tidak ditemukan atau status bukan pending",
        });
      }
   
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
