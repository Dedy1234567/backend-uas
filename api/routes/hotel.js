import express from "express";
import pool from "../db.js";

const router = express.Router();


//GET SEMUA HOTEL
router.get("/", async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM hotels
      ORDER BY id DESC
      `
    );

    res.json(result.rows);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

});

//GET DETAIL HOTEL
router.get("/:id", async (req, res) => {

    try {
  
      const { id } = req.params;
  
      const result = await pool.query(
        `
        SELECT *
        FROM hotels
        WHERE id = $1
        `,
        [id]
      );
  
      if(result.rows.length === 0){
        return res.status(404).json({
          message:"Hotel tidak ditemukan"
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


  //POST HOTEL
  router.post("/", async (req,res)=>{

    try{
  
      const {
        name,
        city,
        address,
        description,
        image_url
      } = req.body;
  
      const result = await pool.query(
        `
        INSERT INTO hotels
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
  
    }catch(error){
  
      console.log(error);
  
      res.status(500).json({
        message:"Server Error"
      });
  
    }
  
  });

  //UPDATE HOTEL
  router.put("/:id", async (req,res)=>{

    try{
  
      const { id } = req.params;
  
      const {
        name,
        city,
        address,
        description,
        image_url
      } = req.body;
  
      const result = await pool.query(
        `
        UPDATE hotels
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
          id
        ]
      );
  
      res.json(result.rows[0]);
  
    }catch(error){
  
      console.log(error);
  
      res.status(500).json({
        message:"Server Error"
      });
  
    }
  
  });

  //DELETE HOTEL
  router.delete("/:id", async (req,res)=>{

    try{
  
      const { id } = req.params;
  
      await pool.query(
        `
        DELETE FROM hotels
        WHERE id=$1
        `,
        [id]
      );
  
      res.json({
        message:"Hotel berhasil dihapus"
      });
  
    }catch(error){
  
      console.log(error);
  
      res.status(500).json({
        message:"Server Error"
      });
  
    }
  
  });
  
  export default router;