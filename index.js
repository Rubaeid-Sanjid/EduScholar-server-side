const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");

//middleware
app.use(cors());
app.use(express.json());

app.post("/jwt", async (req, res) => {
  const userEmail = req.body;
  const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });

  res.send({ token });
});

app.get("/", (req, res) => {
  res.send("EduScholar server");
});

app.listen(port, () => {
  console.log(`Server is running at port ${port}`);
});
