import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
GET ALL ROOMS
*/
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                r.*,
                h.name AS hotel_name
            FROM rooms r
            JOIN hotels h
            ON h.id = r.hotel_id
            ORDER BY r.id DESC
        `);

    res.json(result.rows);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

/*
CREATE ROOM
*/
router.post("/", async (req, res) => {
  try {
    const { hotel_id, room_name, price, capacity, total_rooms,available_rooms,image_url, description } = req.body;

    const result = await pool.query(
      `
        INSERT INTO rooms(
    hotel_id,
    room_name,
    price,
    capacity,
    total_rooms,
    available_rooms,
    image_url,
    description
)
VALUES(
    $1,$2,$3,$4,$5,$6,$7,$8
)
        RETURNING *
        `,
      [hotel_id, room_name, price, capacity, total_rooms, total_rooms, image_url, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

/*
GET ROOM BY HOTEL
*/
router.get("/hotel/:hotelId", async (req, res) => {
  try {
    const result = await pool.query(
      `
            SELECT *
            FROM rooms
            WHERE hotel_id = $1
            `,
      [req.params.hotelId]
    );
    //mana
    res.json(result.rows);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

/*
GET ROOM BY ID
*/
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
            SELECT *
            FROM rooms
            WHERE id = $1
            `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Room tidak ditemukan",
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

/*
UPDATE ROOM
*/
router.put("/:id", async (req, res) => {
  try {
    const {
        room_name,
        price,
        capacity,
        total_rooms,
        image_url,
        description
      } = req.body;

    const result = await pool.query(
        `
        UPDATE rooms
        SET
          room_name=$1,
          price=$2,
          capacity=$3,
          total_rooms=$4,
          image_url=$5,
          description=$6
        WHERE id=$7
        RETURNING *
        `,
        [
          room_name,
          price,
          capacity,
          total_rooms,
          image_url,
          description,
          req.params.id
        ]
    );

    if(result.rows.length === 0){
        return res.status(404).json({
          message:"Room tidak ditemukan"
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

/*
DELETE ROOM
*/
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      `
            DELETE FROM rooms
            WHERE id = $1
            `,
      [req.params.id]
    );

    res.json({
      message: "Room berhasil dihapus",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

export default router;
