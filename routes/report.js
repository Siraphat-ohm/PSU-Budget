const express = require("express");
const router = express.Router();
const excelJs = require("exceljs")

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

const reportData = async( startDate, endDate, facID) => {
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
        ${ !(facID == 0) ? `AND li.facID = ${facID}` : "" }
`
    const data = await db.raw(query, [startDate, endDate]);

    const formattedData = []
    const seen = new Set()
    data[0].forEach( item => {
        const { id, code, name, withdrawal_amount, psu_code, date, fac, plan, product, type, totalAmount } = item
        if (!seen.has(fac)){
            seen.add(fac)
            formattedData.push(
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
            let indexFac = formattedData.findIndex(item => Object.keys(item) == fac);
            let indexOfValues = formattedData[indexFac][fac].findIndex(item => item.plan == plan && item.product == product && item.type == type);
            if (indexOfValues == -1){
                formattedData[indexFac][fac].push( 
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
                formattedData[indexFac][fac][indexOfValues].items.push( 
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
    });

    return formattedData;
}

router.post('/', async(req, res) => {
  try {
    const { startDate, endDate, fac } = req.body;

    const data = await reportData( startDate, endDate, fac );

    res.json(data)

  } catch (error) {
    console.log(error.message);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

router.post('/createExcel', async(req, res) => {
    try {
        const { startDate, endDate, fac } = req.body;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
        let wb = new excelJs.Workbook();
        let ws = wb.addWorksheet("report");
        const data = await reportData( startDate, endDate, fac );

        data.forEach( fac => {
            const facName = Object.keys(fac)[0];
            fac[facName].forEach( item => {
                const { plan, product, type, items } = item;
                let { totalAmount } = item;
                ws.addRow( [ facName ] );
                ws.addRow( [ plan ] );
                ws.addRow( [ product ] );
                ws.addRow( [ type, "เงินที่ได้รับ", totalAmount, 'บาท' ] );
                ws.addRow( [ "itemcode", "ชื่อรายการ", "เลขที่ มอ.", "จำนวนเงินที่เบิกจ่าย", "วันที่เบิกจ่าย", "ยอดเงินคงเหลือ" ] );
                items.forEach( item => {
                    const { code, name, date, psu_code } = item;
                    let { withdrawal_amount } = item;
                    withdrawal_amount = parseFloat(withdrawal_amount);
                    totalAmount = parseFloat(totalAmount) - withdrawal_amount;
                    ws.addRow( [ code, name, psu_code, withdrawal_amount, date, totalAmount  ] );
                })
                ws.addRow( [ "ยอดเงินคงเหลือ", totalAmount, "บาท"  ] );
            });
            ws.addRow();
        })

        await wb.xlsx.write(res)
        res.end();
    } catch (error) {
        console.log(error.message);
        res.status(500).json( {error: "Internal Server Error"} );
    }
});

module.exports = router;