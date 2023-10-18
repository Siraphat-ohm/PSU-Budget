const express = require("express");
const router = express.Router();
const { logger } = require('../util/logger');
const db = require("../db/index");

router.get('/options/:opt', async (req, res) => {
  try {
    const { opt } = req.params;
    logger.info(`${req.method} ${req.url}`);

    if (opt === "disbursed") {
      const rawData = await db.raw(`
        SELECT fac, id FROM facs 
        WHERE userID = ?;
      `, [req.id]);

      const fac_opt = rawData[0].map(item => ({ label: item.fac, id: item.id.toString() }));

      const itemsData = await db.raw('SELECT code, name, facID, balance FROM items;');

      const groupedData = itemsData[0].reduce((result, current) => {
        const { facID, code, name, balance } = current;
        if (!result[facID]) {
          result[facID] = [];
        }
        result[facID].push({ label: code, name, balance });
        return result;
      }, {});

      return res.status(200).json({ fac_opt, code_opt: groupedData });
    } else if (opt === "add") {
      const [typeQuery, productQuery, facQuery] = await Promise.all([
        db.raw(`SELECT * FROM types;`),
        db.raw(`SELECT * FROM products;`),
        db.raw(`
          SELECT * FROM facs 
          WHERE userID = ?;
        `, [req.id])
      ]);

      const fac_opt = facQuery[0].map(item => ({ label: item.fac, id: item.id }));
      const type_opt = typeQuery[0].map(item => ({ label: item.type, id: item.id }));
      const product_opt = productQuery[0].map(item => ({ label: item.product, id: item.id }));

      const data = { type_opt, product_opt, fac_opt };

      logger.info(`${req.method} ${req.url} - Success`);
      return res.status(200).json(data);
    }
  } catch (error) {
    logger.error(`${req.method} ${req.url} ${error}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/items-disbursed', async (req, res) => {
  try {
    logger.info( `${req.method} ${req.url}`);
    const data = (await db.raw( 
      ` SELECT disbursed_items.id, disbursed_items.code, items.name, psu_code, withdrawal_amount, date, note
        FROM disbursed_items 
        INNER JOIN items ON items.code = disbursed_items.code
        ORDER BY disbursed_items.id DESC;
      `
    ))[0] ;
    logger.info( `${req.method} ${req.url} - Success`);
    res.status(200).json(data);
  } catch (error) {
    logger.error( `${req.method} ${req.url} ${error}`);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

router.get('/:id', async(req, res) => {
    try {
        logger.info( `${req.method} ${req.url}`);
        const query = `
          SELECT disbursed_items.id, facs.fac, items.code, items.name, 
                  psu_code, items.balance , withdrawal_amount, date, note
          FROM disbursed_items INNER JOIN items
          ON items.code = disbursed_items.code
          INNER JOIN facs ON facs.id = items.facID
          WHERE disbursed_items.id = ? ;
        `
        const data = await db.raw(query, [req.params.id]);
        logger.info( `${req.method} ${req.url} - Success`);
        res.status(200).json(...data[0]);
    } catch (error) {
      logger.error( `${req.method} ${req.url} ${error}`);
      res.status(500).json( {error: "Internal Server Error"} );
    }
});

module.exports = router;