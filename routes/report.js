const express = require("express");
const router = express.Router();
const { reportDataN, reportDataD, reportDataA } = require('../util/reportData');
const { ADtoBE } = require("../util/date");

const db = require("../db/index");

router.get('/opt', async(req, res) => {
  try {
    const query = `
      SELECT id, fac 
      FROM facs; 
    `
    const data = await db.raw(query);

    const fac_opt = data[0].map( f => { return { id:f.id, label: f.fac } });
    fac_opt.push( { id:0, label: "all" } );
    res.json(fac_opt);
  } catch (error) {
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

router.post('/', async(req, res) => {
  try {
    const { startDate, endDate, fac, begin, mode } = req.body;
    const formatStartDate = ADtoBE(startDate);
    const formatEndtDate = ADtoBE(endDate);
    let data;
    if ( mode == 'N' ){
      data = await reportDataN( formatStartDate, formatEndtDate, fac, begin );
    } else if( mode == 'D' ){
      data = await reportDataD( formatStartDate, formatEndtDate, fac, begin );
    } else if ( mode == 'A' ){
      data = await reportDataA( formatStartDate, formatEndtDate, fac, begin );
    }
    res.json(data)
  } catch (error) {
    console.log(error.message);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

module.exports = router;