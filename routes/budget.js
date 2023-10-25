const express = require("express");
const router = express.Router();
const { ADtoBE } = require('../util/date');
const db = require("../db/index");
const { logger } = require('../util/logger');

router.post('/disburse', async (req, res) => {
    try {
      const { code, psu_code, amount, date, fac, note } = req.body;
      logger.info( `${req.method} ${req.url} ${JSON.stringify(req.body)}`);
      const formattedDate = ADtoBE(date);
      const balanceQuery = await db.raw(`
        SELECT balance 
        FROM items 
        WHERE code = ? ;
      `, [code])
      if ( balanceQuery[0].length === 0 ) {
        logger.warn( `${req.method} ${req.url} Itemcode not found.`);
        res.status(404).json( {error: "ไม่พบItemcode"});
      }
      let balance = Number(balanceQuery[0][0].balance);
      let newBalance = balance - Number(amount);
      console.log(newBalance);
      if ( newBalance < 0 ){
        logger.warn( `${req.method} ${req.url} Insufficient balance.`);
        return res.status(404).json( {error: "ยอดเงินไม่เพียงพอ"});
      } 
      
      await db.raw(`
        INSERT INTO disbursed_items ( userID, code, withdrawal_amount, psu_code, date, facID, note ) 
        VALUES ( ?, ?, ?, ?, ?, ?, ? )
      `, [req.id, code, amount, psu_code, formattedDate, fac, (note ? note : '-')  ])

      await db.raw(
        `
        UPDATE items
        SET balance = ?
        WHERE code = ? ;
        `, [newBalance, code]);
      
      logger.info( `${req.method} ${req.url} - Success`);
      res.sendStatus( 201 );
    } catch (error) {
      logger.error( `${req.method} ${req.headers['user-agent']} ${req.url} ${error}`);
      res.status(500).json( { error: "Internal Server Error"} );
    }
});

router.put('/disburse', async (req, res) => {
    try {
      let { id, code, psu_code, amount, date, oldAmount, note } = req.body;
      logger.info( `${req.method} ${req.url} ${JSON.stringify(req.body)}`);
      const formattedDate = ADtoBE(date);
      const balanceQueryResult = await db.raw(`
        SELECT balance, total_amount
        FROM items 
        WHERE code = ? ;
      `, [code])
      if ( balanceQueryResult[0].length === 0 ){
        logger.warn( `${req.method} ${req.url} Itemcode not found.`);
        return res.status(404).json( {error: "ไม่พบItemcode"} );
      } 
      let { balance, total_amount } = balanceQueryResult[0][0];
      balance = Number(balance);
      total_amount = Number(total_amount);
      oldAmount = Number(oldAmount);
      amount = Number(amount);

      if ( balance < amount || (balance + oldAmount) < amount ) {
        logger.warn( `${req.method} ${req.url} Insufficient balance.`);
        return res.status(404).json( {error: "ยอดเงินไม่เพียงพอ"} );
      }

      const update_column = [];
      if ( amount ) update_column.push(`withdrawal_amount = ${amount}`);
      if ( psu_code ) update_column.push(`psu_code = '${psu_code}'`);
      if ( formattedDate ) update_column.push(`date = '${formattedDate}'`);
      if ( note ) update_column.push(`note = '${note}'` );

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

      logger.info( `${req.method} ${req.url} - Success`);
      res.sendStatus(201);

    } catch (error) {
      logger.error( `${error.message}`);
      res.status(500).json( {error: "Internal Server Error"} );
    }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info( `${req.method} ${req.url}`);
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

    logger.info( `${req.method} ${req.url} - Success`);
    res.sendStatus(202);
  } catch (error) {
    logger.error( `${error.message}`);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

router.post('/additemcode', async(req, res) => {
  try {
    const { code, total_amount, name, fac, type, product } = req.body;
    logger.info( `${req.method} ${req.url} ${JSON.stringify(req.body)}`);
    const codeQuery = await db.raw(`
      SELECT code FROM items
      WHERE code = ? ;
    `, [code]);

    if ( !!codeQuery[0][0] ){ 
      logger.warn( `${req.method} ${req.url} Itemcode duplicate.`);
      return res.status(400).json( { error: 'Itemcode ซ้ำ' })
    } 

    await db.raw(`
      INSERT INTO items ( code, name, total_amount, facID, typeID, productID, status, balance ) 
      VALUES ( ?, ?, ?, ?, ?, ?, ?, ? )
    `, [code, name, total_amount, fac, type, product, 'S', total_amount]);
    logger.info( `${req.method} ${req.url} - Success`);
    res.sendStatus(201);
  } catch (error) {
    logger.error( `${error.message}`);
    res.status(500).json( {error: "Internal Server Error"} );
  }
});

module.exports = router;