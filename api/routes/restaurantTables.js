import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/*
GET ALL TABLES
*/
router.get("/", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                rt.*,
                r.name AS restaurant_name
            FROM restaurant_tables rt
            JOIN restaurants r
            ON r.id = rt.restaurant_id
            ORDER BY rt.id DESC
        `);

        res.json(result.rows);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

});

/*
GET TABLES BY RESTAURANT
*/
router.get("/restaurant/:restaurantId", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM restaurant_tables
            WHERE restaurant_id = $1
            `,
            [req.params.restaurantId]
        );

        res.json(result.rows);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

});

/*
GET TABLE BY ID
*/
router.get("/:id", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM restaurant_tables
            WHERE id = $1
            `,
            [req.params.id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message:"Table tidak ditemukan"
            });
        }

        res.json(result.rows[0]);

    } catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server Error"
        });

    }

});

/*
CREATE TABLE
*/
router.post("/", async (req, res) => {

    try {

        const {
            restaurant_id,
            table_number,
            capacity
        } = req.body;

        const result = await pool.query(
            `
            INSERT INTO restaurant_tables
            (
                restaurant_id,
                table_number,
                capacity
            )
            VALUES($1,$2,$3)
            RETURNING *
            `,
            [
                restaurant_id,
                table_number,
                capacity
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server Error"
        });

    }

});

/*
UPDATE TABLE
*/
router.put(
    "/:id",
    authMiddleware,
    async (req, res) => {

    try {

        const {
            table_number,
            capacity,
            status
        } = req.body;

        const result = await pool.query(
            `
            UPDATE restaurant_tables
            SET
                table_number=$1,
                capacity=$2,
                status=$3
            WHERE id=$4
            RETURNING *
            `,
            [
                table_number,
                capacity,
                status,
                req.params.id
            ]
        );

        res.json(result.rows[0]);

    } catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server Error"
        });

    }

});

/*
DELETE TABLE
*/
router.delete(
    "/:id",
    authMiddleware,
    async (req, res) => {

    try {

        await pool.query(
            `
            DELETE FROM restaurant_tables
            WHERE id = $1
            `,
            [req.params.id]
        );

        res.json({
            message:"Table berhasil dihapus"
        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server Error"
        });

    }

});

export default router;