const express = require("express");
const router = express.Router();
const dayjs = require('dayjs');
const buddhistEra = require('dayjs/plugin/buddhistEra');

const db = require("../db/index");

dayjs.extend(buddhistEra);

router.post('/disburse', async (req, res) => {
    try {
      const { code, psu_code, amount, date, fac } = req.body;
      const formattedDate = dayjs(date).format("BBBB-MM-DD");
      const balanceQuery = await db.raw(`
        SELECT balance 
        FROM items 
        WHERE code = ? ;
      `, [code])
      if ( balanceQuery[0].length === 0 ) res.status(404).json( {error: "ไม่พบitemcode"});
      let balance = Number(balanceQuery[0][0].balance);
      let newBalance = balance - Number(amount);
      if ( newBalance <= 0 ) return res.status(404).json( {error: "ยอดเงินไม่เพียงพอ"});
      
      await db.raw(`
        INSERT INTO disbursed_items ( userID, code, withdrawal_amount, psu_code, date, facID ) 
        VALUES ( ?, ?, ?, ?, ?, ?)
      `, [req.id, code, amount, psu_code, formattedDate, fac])

      await db.raw(
        `
        UPDATE items
        SET balance = ?
        WHERE code = ? ;
        `, [newBalance, code]);
      
      res.sendStatus(201);
    } catch (error) {
      console.log(error.message);
      res.status(500).json( { error: "Internal Server Error"} );
    }
});

router.put('/disburse', async (req, res) => {
    try {
      let { id, code, psu_code, amount, date, oldAmount } = req.body;
      const formattedDate = dayjs(date).format("BBBB-MM-DD");
      const balanceQueryResult = await db.raw(`
        SELECT balance, total_amount
        FROM items 
        WHERE code = ? ;
      `, [code])
      if ( balanceQueryResult[0].length === 0 ) return res.status(404).json( {error: "ไม่พบitemcode"} );
      let { balance, total_amount } = balanceQueryResult[0][0];
      balance = Number(balance);
      total_amount = Number(total_amount);
      oldAmount = Number(oldAmount);
      amount = Number(amount);

      if ( balance < amount || (balance + oldAmount) < amount ) return res.status(404).json( {error: "ยอดเงินไม่เพียงพอ"} );


      const update_column = [];
      if ( amount ) update_column.push(`withdrawal_amount = ${amount}`);
      if ( psu_code ) update_column.push(`psu_code = '${psu_code}'`);
      if ( formattedDate ) update_column.push(`date = '${formattedDate}'`);

      const updateQuery = `
        UPDATE disbursed_items
        SET ${update_column.join(', ')} 
        WHERE id = ? ;
      `
      await db.raw(updateQuery, [id]);

      const balanceQuery = `
        UPDATE items
        SET balance = ${ ( oldAmount + balance == total_amount ) ? balance + oldAmount - amount : balance - amount}
        WHERE code = ? ;
      `
      await db.raw(balanceQuery, [code]);

      res.sendStatus(201);

    } catch (error) {
      console.log(error.message);
      res.status(500).json( {error: "Internal Server Error"} );
    }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawalQuery = await db.raw( 
      `SELECT withdrawal_amount, code
       FROM disbursed_items
       WHERE id = ? ;
      `, [id]);
      
    const { withdrawal_amount, code } = withdrawalQuery[0][0];

    const refundQuery = `
      UPDATE items
      SET balance = balance + ?
      WHERE code = ?
    `;
    
    await db.raw(refundQuery, [withdrawal_amount, code]);
    await db.raw(`
        DELETE FROM disbursed_items
        WHERE id = ? ;
    `, [id]);

    res.json({ message: 'Withdrawal processed successfully', id });
  } catch (error) {
    console.log(error.message);
    res.json(error.message);
  }
});

router.post('/additemcode', async(req, res) => {
  try {
    const { code, total_amount, name, fac, type, product } = req.body;
    const codeQuery = await db.raw(`
      SELECT code FROM items
      WHERE code = ? ;
    `, [code]);
    if ( !!codeQuery[0][0] ) return res.status(404).json( { error: 'Itemcode ซ้ำ' })
    await db.raw(`
      INSERT INTO items ( code, name, total_amount, facID, typeID, productID, status, balance ) 
      VALUES ( ?, ?, ?, ?, ?, ?, ?, ? )
    `, [code, name, total_amount, fac, type, product, 's', total_amount]);
    res.json(req.body);
  } catch (error) {
    console.log(error.message);
    res.status(500).json( {error: "Internal Server Error"} );
  }

});

module.exports = router;