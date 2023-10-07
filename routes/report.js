const express = require("express");
const router = express.Router();

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
    const { startDate, endDate, fac } = req.body;
    const query = `
      SELECT di.code, i.name, di.withdrawal_amount, di.psu_code,
            di.date, f.fac, p.plan, pd.product, t.type, si.totalAmount
      FROM disbursed_items as di
      INNER JOIN items as i
      ON i.code = di.code
      INNER JOIN ( 
  	      SELECT facID, SUM( total_amount ) as totalAmount
  	      FROM items
  	      GROUP BY facID
      ) as si
      ON si.facID = di.facID
      INNER JOIN products as pd
      ON i.productID = pd.id
      INNER JOIN plans as p
      ON pd.planID = p.id
      INNER JOIN types as t
      ON i.typeID = t.id
      INNER JOIN facs as f
      ON i.facID = f.id
      WHERE di.date BETWEEN ? AND ?
      ${ fac == 0 ? "" : `AND di.facID = ${fac} ;` }
    `
    const data = await db.raw(query, [startDate, endDate]);

    const result = []
    const seen = new Set()
    data[0].forEach( item => {
        const { code, name, withdrawal_amount, psu_code, date, fac, plan, product, type, totalAmount } = item
        if (!seen.has(fac)){
            seen.add(fac)
            result.push(
                {
                    [fac]: [
                        { 
                            plan, 
                            product,
                            type, 
                            totalAmount, 
                            item: [ 
                                {
                                    code, 
                                    name, 
                                    withdrawal_amount, 
                                    psu_code,
                                    date
                                }
                            ] 
                        }
                    ]
                }
            )
        
        } else if (seen.has(fac)){
            let indexFac = result.findIndex(item => Object.keys(item) == fac);
            let indexOfValues = result[indexFac][fac].findIndex(item => item.plan == plan && item.product == product && item.type == type);
            if (indexOfValues == -1){
                result[indexFac][fac].push( 
                    { 
                        plan, 
                        product,
                        type, 
                        totalAmount,
                        item:[
                            {
                                code, 
                                name, 
                                withdrawal_amount, 
                                psu_code,
                                date
                            }
                        ]
                    }
                )
            } else {
                result[indexFac][fac][indexOfValues].item.push( 
                    { 
                        code,
                        name,
                        withdrawal_amount, 
                        psu_code,
                        date
                    }
                )
            }
        }
    })

    res.json( result );
  } catch (error) {
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

module.exports = router;