const formData = require("express-form-data");
const express = require("express");
const cors = require('cors');
const cookieParser = require("cookie-parser");

const multer = require("multer");
const app = express();
const routes = require("./routes");

app.use(
  cors(
    {
      'credentials': true,
      origin: true
      // 'origin': ['http://localhost:3000', 'http://localhost:8081'] 

    }
  )
);


app.use(cookieParser());
app.use(express.json());

app.use(routes);

app.use((req, res, next) => {

  const error = new Error("Not found");
  error.status = 404;
  next(error);
});


//São quatro paramêtros (alguns podem ser omitidos).
app.use((error, req, res) => {

  res.status(error.status || 500);
  res.json(error.message);
});

app.listen(3353);
