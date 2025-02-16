const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});


app.use(cors({ origin: 'http://localhost:5000' }));

app.use(express.json());

app.use(async function(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});


//get all cars
app.get('/cars', async (req, res) => {
    try {
      const [rows] = await req.db.query(`
        SELECT id, make, model, year FROM cars WHERE deletedYN = 0
        `);

      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch cars" });
    }
  });


//get specific car
app.get('/cars/:id', async function(req, res) {

    const id = req.params.id;
    

    try {
      const exists = await req.db.query(`
        SELECT * FROM cars WHERE id = ? AND deletedYN = 0
        `, [id])

      // check whether id exists (aka not deleted)
      if (exists[0].length > 0) {

        const row = await req.db.query(
          `SELECT id, make, model, year FROM cars WHERE id = :id and deletedYN = 0`, 
          {id}
      )
        return res.status(200).json(row[0])

      } else {
        res.status(400).json({error: `No car exists with id ${id}`})
      }

    } catch (err) {
      res.json({ success: false, message: err, data: null })
    }
  });
  

  //create car
  app.post('/car', async function(req, res) {
    try {
      const { make, model, year } = req.body;

      if (!make || !model || !year) {
        return res.status(400).json({error: 'Make, model, and year required.'})
      }
  
    
      const query = await req.db.query(
        `INSERT INTO cars (make, model, year) 
         VALUES (:make, :model, :year)`,
      { make, model, year }
      );
    
      res.json({ success: true, message: 'Car successfully created', data: null });
    } catch (err) {
      res.json({ success: false, message: err, data: null })
    }
  });
  

  //delete car
  app.delete('/cars/:id', async function(req,res) {
    const id = req.params.id;

    try {

      const exists = await req.db.query(`
        SELECT * FROM cars WHERE id = ? AND deletedYN = 0
        `, [id])

      if (exists[0].length > 0) {
        const query = await req.db.query(
          `UPDATE cars SET deletedYN = 1 WHERE id = ?`, [id]
        )
    
        return res.status(200).json(`Car ${id} deleted successfully.`)

      } else {
        return res.status(400).json({error: `No car found with id ${id}` })
      }

    } catch (err) {
      res.json({ success: false, message: err, data: null })
    }
  });


//update car
  app.put('/cars/:id', async function(req,res) {

    const id = req.params.id;
    const { make, model, year } = req.body;

    if (!make || !model || !year) {
      return res.status(400).json({error: 'Make, model, and year required.'})
    }



    try {
      const exists = await req.db.query(`
        SELECT * FROM cars WHERE id = ? AND deletedYN = 0
        `, [id])

      if (exists[0].length > 0) {
        const query = await req.db.query(`
          UPDATE cars SET make = :make, model = :model, year = :year WHERE id = :id`, { make, model, year, id })
          return res.status(200).json({message: `Car ${id} updated successfully.`})
      } else {
        res.status(400).json({error: `No car found with id ${id}`})
      }
  
    } catch (err) {
        res.json({ success: false, message: err, data: null })
    }
  });

  
  
  app.listen(port, () => console.log(`244 API Example listening on http://localhost:${port}`));