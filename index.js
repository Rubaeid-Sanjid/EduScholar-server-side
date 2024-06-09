const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b8fibtq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const scholarshipCollection = client
      .db("eduScholar")
      .collection("scholarships");
    const usersCollection = client.db("eduScholar").collection("users");
    const reviewsCollection = client.db("eduScholar").collection("reviews");
    const paymentCollection = client.db("eduScholar").collection("payments");
    const appliedScholarshipCollection = client
      .db("eduScholar")
      .collection("appliedScholarships");

    app.get("/scholarships", async (req, res) => {
      const result = await scholarshipCollection.find().toArray();
      res.send(result);
    });

    app.get("/scholarshipDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipCollection.findOne(query);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    });

    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { scholarshipId: id };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/jwt", async (req, res) => {
      const userEmail = req.body;
      const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });

      res.send({ token });
    });

    //payment related api
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payment", async (req, res) => {
      const paymentInfo = req.body;
      const paymentResult = await paymentCollection.insertOne(paymentInfo);
      res.send(paymentResult);
    });

    app.post("/appliedScholarship", async (req, res) => {
      const appliedScholarshipInfo = req.body;
      const result = await appliedScholarshipCollection.insertOne(
        appliedScholarshipInfo
      );
      res.send(result);
    });
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("EduScholar server");
});

app.listen(port, () => {
  console.log(`Server is running at port ${port}`);
});
