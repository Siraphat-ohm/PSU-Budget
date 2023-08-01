require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');
const { verify } = require('./middleware/verify');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.urlencoded( {extended: true } ));

// routes

app.use( "/api/auth", require("./routes/auth") );
app.use(verify);
app.use("/api/budget", require("./routes/budget") );
app.use("/api/info", require("./routes/info") );

app.listen(process.env.PORT, ()=>{
    console.log(`started in port ${process.env.PORT}`);
});