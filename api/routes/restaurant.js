import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

//GET ALL
router.get("/", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT *
            FROM restaurants
            ORDER BY id DESC
        `);

        res.json(result.rows);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

});

//GET DETAIL 
router.get("/:id", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM restaurants
            WHERE id = $1
            `,
            [req.params.id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message:"Restaurant tidak ditemukan"
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

// CREATE
router.post(
    "/",
    authMiddleware,
    async (req, res) => {

    try {

        const {
            name,
            city,
            address,
            description,
            image_url
        } = req.body;

        const result = await pool.query(
            `
            INSERT INTO restaurants
            (
                name,
                city,
                address,
                description,
                image_url
            )
            VALUES($1,$2,$3,$4,$5)
            RETURNING *
            `,
            [
                name,
                city,
                address,
                description,
                image_url
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

});

//UPDATE 
router.put("/:id", async (req, res) => {

    try {

        const {
            name,
            city,
            address,
            description,
            image_url
        } = req.body;

        const result = await pool.query(
            `
            UPDATE restaurants
            SET
                name=$1,
                city=$2,
                address=$3,
                description=$4,
                image_url=$5
            WHERE id=$6
            RETURNING *
            `,
            [
                name,
                city,
                address,
                description,
                image_url,
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

//DELETE
router.delete("/:id", async (req, res) => {

    try {

        await pool.query(
            `
            DELETE FROM restaurants
            WHERE id = $1
            `,
            [req.params.id]
        );

        res.json({
            message:"Restaurant berhasil dihapus"
        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server Error"
        });

    }

});

export default router;