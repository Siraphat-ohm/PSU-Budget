const express = require("express");
const router = express.Router();

const db = require("../db/index")

router.post('/disburse', async (req, res) => {
    try {
      res.json(req.body);
    } catch (error) {
      console.log(error.message);
      res.status(500).json( { error: "Internal Server Error"} );
    }
});

router.put('/disburse', async (req, res) => {
    try {
      res.json(req.body);
    } catch (error) {
      console.log(error.message);
      res.status(500).json( { error: "Internal Server Error"} );
    }
});


module.exports = router;