const express = require("express");
const router = express.Router();
const { BalanceReport, DeprivationReport, NormalReport, OverviewReport } = require('../util/reportData');
const { ADtoBE } = require("../util/date");

const db = require("../db/index");
const { logger } = require("../util/logger");

router.get('/opt', async(req, res) => {
  try {
    logger.info(`${req.method} ${req.url}`);
    const query = `
      SELECT id, fac 
      FROM facs; 
    `
    const data = await db.raw(query);

    const fac_opt = data[0].map( f => { return { id:f.id, label: f.fac } });
    fac_opt.unshift( { id:0, label: "all" } );
    logger.info(`${req.method} ${req.url} - Success`);
    res.status(200).json(fac_opt);
  } catch (error) {
    logger.error(`${error.message}`);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

router.post('/', async(req, res) => {
  try {
    const { startDate, endDate, fac, begin, mode, status } = req.body;
    logger.info(`${req.method} ${req.url} ${JSON.stringify(req.body)}`);
    const formatStartDate = ADtoBE(startDate);
    const formatEndtDate = ADtoBE(endDate);
    let data;
    if ( mode == 'N' ){
      data = await NormalReport( formatStartDate, formatEndtDate, fac, begin, status );
    } else if( mode == 'D' ){
      data = await DeprivationReport( formatStartDate, formatEndtDate, fac, begin );
    } else if ( mode == 'A' ){
      data = await OverviewReport( formatStartDate, formatEndtDate, fac, begin );
    } else if ( mode == 'B' ){
      data = await BalanceReport( fac );
    }
    logger.info(`${req.method} ${req.url} - Success`);
    res.status(200).json(data)
  } catch (error) {
    logger.error(`${error.message}`);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

module.exports = router;