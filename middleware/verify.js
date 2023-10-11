
const jwt = require('jsonwebtoken')

const verify = (req, res, next) => {
    console.info(req.method, req.url, req.headers['user-agent']);
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.sendStatus(401);
    jwt.verify( token, process.env.SECRET_KEY, (err, decode) => {
        if ( err ) return res.sendStatus(401);
        const { userInfo: { id, username} } = decode
        req.id = id;
        req.username = username;
        req.token = token;
        next();
    })
    
}

module.exports = { verify }