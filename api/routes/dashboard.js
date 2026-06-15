import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/user",
  authMiddleware,
  async (req, res) => {

    try {

      const userId = req.user.id;

      const hotelResult =
        await pool.query(
          `
          SELECT COUNT(*) as total
          FROM hotel_bookings
          WHERE user_id = $1
          `,
          [userId]
        );

      const restaurantResult =
        await pool.query(
          `
          SELECT COUNT(*) as total
          FROM restaurant_bookings
          WHERE user_id = $1
          `,
          [userId]
        );

      const activeHotel =
        await pool.query(
          `
          SELECT COUNT(*) as total
          FROM hotel_bookings
          WHERE user_id = $1
          AND status != 'cancelled'
          `,
          [userId]
        );

      const activeRestaurant =
        await pool.query(
          `
          SELECT COUNT(*) as total
          FROM restaurant_bookings
          WHERE user_id = $1
          AND status != 'cancelled'
          `,
          [userId]
        );

      const cancelledHotel =
        await pool.query(
          `
          SELECT COUNT(*) as total
          FROM hotel_bookings
          WHERE user_id = $1
          AND status = 'cancelled'
          `,
          [userId]
        );

      const cancelledRestaurant =
        await pool.query(
          `
          SELECT COUNT(*) as total
          FROM restaurant_bookings
          WHERE user_id = $1
          AND status = 'cancelled'
          `,
          [userId]
        );

      res.json({

        totalHotelBookings:
          Number(
            hotelResult.rows[0].total
          ),

        totalRestaurantBookings:
          Number(
            restaurantResult.rows[0].total
          ),

        activeBookings:
          Number(
            activeHotel.rows[0].total
          ) +
          Number(
            activeRestaurant.rows[0].total
          ),

        cancelledBookings:
          Number(
            cancelledHotel.rows[0].total
          ) +
          Number(
            cancelledRestaurant.rows[0].total
          )

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: "Server Error"
      });

    }

  }
);

router.get(
    "/",
    authMiddleware,
    async (req, res) => {
  
      try {
  
        const hotels =
          await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM hotels
            `
          );
  
        const rooms =
          await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM rooms
            `
          );
  
        const users =
          await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM users
            `
          );
  
        const hotelBookings =
          await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM hotel_bookings
            `
          );
  
        const restaurantBookings =
          await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM restaurant_bookings
            `
          );
  
        const activeBookings =
          await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM hotel_bookings
            WHERE status != 'cancelled'
            `
          );
  
        const cancelledBookings =
          await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM hotel_bookings
            WHERE status = 'cancelled'
            `
          );
  
        res.json({
  
          totalHotels:
            Number(
              hotels.rows[0].total
            ),
  
          totalRooms:
            Number(
              rooms.rows[0].total
            ),
  
          totalUsers:
            Number(
              users.rows[0].total
            ),
  
          totalHotelBookings:
            Number(
              hotelBookings.rows[0].total
            ),
  
          totalRestaurantBookings:
            Number(
              restaurantBookings.rows[0].total
            ),
  
          activeBookings:
            Number(
              activeBookings.rows[0].total
            ),
  
          cancelledBookings:
            Number(
              cancelledBookings.rows[0].total
            )
  
        });
  
      } catch (error) {
  
        console.log(error);
  
        res.status(500).json({
          message: "Server Error"
        });
  
      }
  
    }
  );

export default router;