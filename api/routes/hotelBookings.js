import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

//
// CREATE BOOKING
//
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { room_id, check_in, check_out, total_nights, total_price } = req.body;

    const start = new Date(check_in);

    const end = new Date(check_out);

    if (end <= start) {
      return res.status(400).json({
        message: "Tanggal checkout harus setelah checkin",
      });
    }

    const roomResult = await pool.query(
      `
          SELECT *
          FROM rooms
          WHERE id = $1
          `,
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        message: "Kamar tidak ditemukan",
      });
    }

    const room = roomResult.rows[0];

    if (room.available_rooms <= 0) {
      return res.status(400).json({
        message: "Kamar sudah habis",
      });
    }

    const bookingResult = await pool.query(
      `
          INSERT INTO hotel_bookings
          (
            user_id,
            room_id,
            check_in,
            check_out,
            total_nights,
            total_price
          )
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING *
          `,
      [req.user.id, room_id, check_in, check_out, total_nights, total_price]
    );

    await pool.query(
      `
        UPDATE rooms
        SET available_rooms =
            available_rooms - 1
        WHERE id = $1
        `,
      [room_id]
    );

    res.status(201).json({
      success: true,
      booking: bookingResult.rows[0],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

//
// GET ALL BOOKINGS
// (ADMIN)
//
router.get("/", async (req, res) => {
  try {
    // 1. Ambil query parameters dengan pengamanan nilai default
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : "";
    const status = req.query.status ? req.query.status.trim().toLowerCase() : "all";

    const offset = (page - 1) * limit;

    // 2. Bangun kondisi WHERE secara dinamis
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // Tambahkan filter pencarian (Nama User, Email, Nama Kamar, Nama Hotel)
    if (search !== "") {
      whereClauses.push(`(
        u.fullname ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        r.room_name ILIKE $${paramIndex} OR 
        h.name ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Tambahkan filter status jika bukan 'all'
    if (status !== "all" && status !== "") {
      whereClauses.push(`hb.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereQuery = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // 3. Query untuk menghitung total data setelah difilter
    const countQuery = `
      SELECT COUNT(*) 
      FROM hotel_bookings hb
      JOIN rooms r ON hb.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
      JOIN users u ON hb.user_id = u.id
      ${whereQuery}
    `;
    const countResult = await pool.query(countQuery, params);
    const totalData = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalData / limit);

    // 4. PERBAIKAN DI SINI: Menyusun array parameter & index secara aman
    const mainParams = [...params]; // Copy params filter pencarian/status terlebih dahulu
    
    mainParams.push(limit);  // Masukkan limit ke dalam array
    const limitIndex = mainParams.length; // Otomatis mendapatkan nomor urut placeholder ($) tepat untuk LIMIT
    
    mainParams.push(offset); // Masukkan offset ke dalam array
    const offsetIndex = mainParams.length; // Otomatis mendapatkan nomor urut placeholder ($) tepat untuk OFFSET

    const mainQuery = `
      SELECT
        hb.*,
        r.room_name,
        h.name AS hotel_name,
        u.fullname,
        u.email
      FROM hotel_bookings hb
      JOIN rooms r ON hb.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
      JOIN users u ON hb.user_id = u.id
      ${whereQuery}
      ORDER BY hb.id DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await pool.query(mainQuery, mainParams);

    // 5. Kembalikan response berstruktur lengkap beserta metadata pagination
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
    console.error("ERROR AT GET HOTEL BOOKINGS:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

//
// GET MY BOOKINGS 
//
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        hb.*,
        r.room_name,
        h.name AS hotel_name
      FROM hotel_bookings hb
      JOIN rooms r 
        ON hb.room_id = r.id
      JOIN hotels h 
        ON r.hotel_id = h.id
      WHERE hb.user_id = $1
      ORDER BY hb.id DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("=== EROR SQL BACKEND ===");
    console.error(error);
    res.status(500).json({
      message: "Server Error",
    });
  }
});

//
// GET BOOKING DETAIL
//
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
          SELECT
            hb.*,
            r.room_name,
            h.name AS hotel_name

          FROM hotel_bookings hb

          JOIN rooms r
          ON hb.room_id = r.id

          JOIN hotels h
          ON r.hotel_id = h.id

          WHERE hb.id = $1
          AND hb.user_id = $2
          `,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Booking tidak ditemukan",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});


//
// CANCEL BOOKING
//
router.put(
    "/:id/cancel",
    authMiddleware,
    async (req, res) => {
  
      try {
  
        let bookingResult;
  
        // ADMIN bisa cancel semua booking
        if (req.user.role === "ADMIN") {
  
          bookingResult =
            await pool.query(
              `
              SELECT *
              FROM hotel_bookings
              WHERE id = $1
              `,
              [req.params.id]
            );
  
        } else {
  
          // USER hanya bisa cancel booking miliknya sendiri
          bookingResult =
            await pool.query(
              `
              SELECT *
              FROM hotel_bookings
              WHERE id = $1
              AND user_id = $2
              `,
              [
                req.params.id,
                req.user.id
              ]
            );
  
        }
  
        if (
          bookingResult.rows.length === 0
        ) {
  
          return res.status(404).json({
            message:
              "Booking tidak ditemukan"
          });
  
        }
  
        const booking =
          bookingResult.rows[0];
  
        if (
          booking.status ===
          "cancelled"
        ) {
  
          return res.status(400).json({
            message:
              "Booking sudah dibatalkan"
          });
  
        }
  
        // ubah status booking
        await pool.query(
          `
          UPDATE hotel_bookings
          SET status = 'cancelled'
          WHERE id = $1
          `,
          [req.params.id]
        );
  
        // kembalikan stok kamar
        await pool.query(
          `
          UPDATE rooms
          SET available_rooms =
              available_rooms + 1
          WHERE id = $1
          `,
          [booking.room_id]
        );
  
        res.json({
          success: true,
          message:
            "Booking berhasil dibatalkan"
        });
  
      } catch (error) {
  
        console.log(error);
  
        res.status(500).json({
          message:
            "Server Error"
        });
  
      }
  
    }
  );

  //COMPLETED
  router.put("/:id/complete", authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(
        `
        UPDATE hotel_bookings
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
            "Booking tidak ditemukan atau status bukan pending",
        });
      }
  
      res.json({
        success: true,
        message: "Booking berhasil diselesaikan",
        booking: result.rows[0],
      });
    } catch (error) {
      console.log(error);
  
      res.status(500).json({
        message: "Server Error",
      });
    }
  });

  export default router;