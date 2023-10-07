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
        console.log(error.message);
        res.status(500).json( {error: "Internal Server Error"} );
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
    console.log(error.message);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

router.get('/:id', async(req, res) => {
    try {
        const query = `
          SELECT disbursed_items.id, facs.fac, items.code, items.name, 
                  psu_code, items.balance , withdrawal_amount, date
          FROM disbursed_items INNER JOIN items
          ON items.code = disbursed_items.code
          INNER JOIN facs ON facs.id = items.facID
          WHERE disbursed_items.id = ? ;
        `
        const data = await db.raw(query, [req.params.id]);
        res.status(200).json(...data[0]);
    } catch (error) {
      console.log(error.message);
      res.status(500).json( {error: "Internal Server Error"} );
    }
});

module.exports = router;