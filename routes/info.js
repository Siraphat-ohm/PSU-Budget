const express = require("express");
const router = express.Router();

const db = require("../db/index");

router.get( '/options/:opt', async( req, res ) => {
    try {
      const { opt } = req.params;
      if ( opt == "disbursed"){
        let rawData = await db.raw(`
                                    SELECT fac, id FROM facs 
                                    WHERE userID = ? ;`,
                                    [req.id]);
        const fac_opt = rawData[0].map( item =>  { return { label: item.fac, id: item.id.toString() } } );
        rawData = await db.raw( 'SELECT code, name, facID, balance FROM items ;');

        const groupedData = rawData[0].reduce((result, current) => {
          const { facID, code, name, balance } = current;
          if (!result[facID]) {
            result[facID] = [];
          }
          result[facID].push( { label: code, name, balance });
          return result;
        }, {});

        res.json( { fac_opt, code_opt: groupedData} );
      } else if ( opt == "add" ) {
        const typeQuery = await db.raw(`SELECT * FROM types ;`);
        const productQuery = await db.raw(`SELECT * FROM products ;`)
        const facQuery = await db.raw(`
                                      SELECT * FROM facs 
                                      WHERE userID = ? ;
                                    `, [req.id]);
        const fac_opt = facQuery[0].map( item =>  { return { label: item.fac, id: item.id } } );
        const type_opt = typeQuery[0].map( item => { return { label: item.type, id: item.id }} );
        const product_opt = productQuery[0].map( item => { return { label: item.product, id: item.id }})
        const data = { type_opt, product_opt, fac_opt };
        res.json(data);
      }

    } catch(error) {
        res.status(500).json(error.message);
    }
} );

router.get('/items-disbursed', async (req, res) => {
  try {
    const data = await db.raw( 
      ` SELECT disbursed_items.id, disbursed_items.code, items.name, psu_code, withdrawal_amount, date
        FROM disbursed_items 
        INNER JOIN items ON items.code = disbursed_items.code
        ;
      `
      ) ;
    res.json(data[0]);
  } catch (error) {
    res.json(error);
  }
});

router.get('/:id', async(req, res) => {
    try {
        const data = await db.raw( 
        `SELECT disbursed_items.id, facs.fac, items.code, items.name, psu_code, items.balance , withdrawal_amount, date
          FROM disbursed_items INNER JOIN items
          ON items.code = disbursed_items.code
          INNER JOIN facs ON facs.id = items.facID
          WHERE disbursed_items.id = ? ;
            `, [req.params.id]);
          console.log(data[0][0].date)
        res.status(200).json(...data[0]);
    } catch (error) {
      console.log(error.message);
        res.status(404).json(error.message);
    }
});

router.post('/report', async(req, res) => {
  try {
    const { startDate, endDate, fac } = req.body;
    const query = `
      SELECT f.fac, p.plan, pd.product, t.type, di.code, 
            i.name, di.psu_code, di.withdrawal_amount,
            di.date
      FROM disbursed_items as di
      INNER JOIN items as i
      ON i.code = di.code
      INNER JOIN products as pd
      ON i.productID = pd.id
      INNER JOIN plans as p
      ON pd.planID = p.id
      INNER JOIN types as t
      ON i.typeID = t.id
      INNER JOIN facs as f
      ON i.facID = f.id
      WHERE i.facID = ${fac}
      AND di.date BETWEEN '${startDate}' AND '${endDate}';
    `
    const data = await db.raw(query);
    
    res.json( data[0] );
  } catch (error) {
    console.log(error.message);
  }
});

module.exports = router;