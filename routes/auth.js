const db = require('../db');
const bcrypt = require("bcrypt");
const { generateAccessToken } = require("../util/Tokenmanager");

const express = require("express");
const { logger } = require('../util/logger');
const router = express.Router();


router.post('/signin', async( req, res ) => {
    try {
        const { username, password } = req.body;
        logger.info( `${req.method} ${req.url}`);
        if ( !username || !password ) return res.status(404).json( {error : "username and password are required."} )
        const foundUser = await db.raw(`SELECT * FROM users WHERE username = ?`, [username]);
        if ( foundUser[0].length === 0 ) return res.status(404).json( { error: "User not found."} );
        const user = foundUser[0][0];
        if ( !(user.username == username && bcrypt.compareSync(password, user.password)) ) throw Error("username or password inccorect.");
        const userInfo = { id: user.id , username: user.username, firstname: user.firstname, lastname: user.lastname }
        const accessToken = generateAccessToken({ userInfo });
        logger.info( `${req.method} ${req.url} -Success`);
        res.status(200).json( { accessToken, ...userInfo, allowLogin: true } );
    } catch (error) {
        logger.error(error);
        res.status(500).json( { error: "Internal Server Error" } );
    }
} );

module.exports = router;