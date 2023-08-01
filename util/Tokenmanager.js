const jwt = require("jsonwebtoken");


function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "30d" });
}

module.exports = { generateAccessToken }