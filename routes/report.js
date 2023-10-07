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
        SELECT 
            di.id,
            di.code, 
            li.name, 
            f.fac, 
            pd.plan, 
            pd.product, 
            t.type, 
            di.withdrawal_amount, 
            di.date,
            nli.totalAmount, 
            di.psu_code
        FROM disbursed_items AS di
        JOIN items AS li 
            ON li.code = di.code
        JOIN facs AS f ON f.id = li.facID
        JOIN (
            SELECT pd.product, p.plan, pd.id, p.id AS plan_id
            FROM products AS pd
            JOIN plans AS p ON p.id = pd.planID 
        ) AS pd 
        ON li.productID = pd.id
        JOIN types AS t 
            ON t.id = li.typeID
        JOIN (
            SELECT facID, productID, typeID, SUM(li.total_amount) AS totalAmount
            FROM items AS li
            GROUP BY facID, productID, typeID
        ) AS nli ON nli.facID = li.facID
                AND nli.productID = li.productID
                AND nli.typeID = li.typeID
        WHERE date BETWEEN ? AND ?
        ${ !(fac == 0) ? `AND li.facID = ${fac}` : "" }
`
    const data = await db.raw(query, [startDate, endDate]);

    const result = []
    const seen = new Set()
    data[0].forEach( item => {
        const { id, code, name, withdrawal_amount, psu_code, date, fac, plan, product, type, totalAmount } = item
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
                            items: [ 
                                {
                                    id,
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
                        items:[
                            {
                                id,
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
                result[indexFac][fac][indexOfValues].items.push( 
                    { 
                        id,
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
    console.log(error.message);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

module.exports = router;