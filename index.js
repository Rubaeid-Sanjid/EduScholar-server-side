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

      app.post("/jwt", async (req, res) => {
        const userEmail = req.body;
        const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1d",
        });
  
        res.send({ token });
      });
      
      //middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

      // scholarship related api
    app.post("/scholarships", verifyToken, async (req, res) => {
      const scholarshipInfo = req.body;
      const result = await scholarshipCollection.insertOne(scholarshipInfo);
      res.send(result);
    });

    app.patch("/scholarships/:id", verifyToken, async (req, res) => {
      const scholarshipId = req.params.id;
      const updatedScholarshipInfo = req.body;

      const filter = { _id: new ObjectId(scholarshipId) };

      const updateDoc = {
        $set: {
          universityName: updatedScholarshipInfo.universityName,
          universityImage: updatedScholarshipInfo.universityImage,
          scholarshipName: updatedScholarshipInfo.scholarshipName,
          scholarshipCategory: updatedScholarshipInfo.scholarshipCategory,
          universityLocation: { country: updatedScholarshipInfo.country, city: updatedScholarshipInfo.city },
          universityRank: updatedScholarshipInfo.universityRank,
          applicationDeadline: updatedScholarshipInfo.applicationDeadline,
          subjectName: updatedScholarshipInfo.subjectName,
          scholarshipDescription: updatedScholarshipInfo.scholarshipDescription,
          degree: updatedScholarshipInfo.degree,
          stipend: updatedScholarshipInfo.stipend,
          postDate: updatedScholarshipInfo.postDate,
          serviceCharge: updatedScholarshipInfo.serviceCharge,
          applicationFees: updatedScholarshipInfo.applicationFees,
          rating: parseFloat(updatedScholarshipInfo.rating),
        },
      };
      const result = await scholarshipCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/scholarships", async (req, res) => {
      const result = await scholarshipCollection.find().toArray();
      res.send(result);
    });

    app.get("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipCollection.findOne(query);
      res.send(result);
    });

    app.delete("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipCollection.deleteOne(query);
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

      const query = { user_email: userInfo.user_email };
      const isEmailExist = await usersCollection.findOne(query);

      if (isEmailExist) {
        return res.send({ message: "user already exist.", insertedId: null });
      }

      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // review related api
    app.post("/reviews", async (req, res) => {
      const reviewInfo = req.body;
      const result = await reviewsCollection.insertOne(reviewInfo);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    app.patch("/reviews/:id", verifyToken, async (req, res) => {
      const selectedReviewId = req.params.id;
      const updatedReviewInfo = req.body;
      const filter = { _id: new ObjectId(selectedReviewId) };
      const updateDoc = {
        $set: {
          reviewDate: updatedReviewInfo.reviewDate,
          ratingPoint: parseFloat(updatedReviewInfo.ratingPoint),
          reviewerComments: updatedReviewInfo.reviewerComments,
        },
      };
      const result = await reviewsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { scholarshipId: id };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/reviews/by-email/:email", async (req, res) => {
      const email = req.params.email;
      const query = { reviewerEmail: email };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
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

    // applied scholarship related api
    app.post("/appliedScholarship", async (req, res) => {
      const appliedScholarshipInfo = req.body;
      const result = await appliedScholarshipCollection.insertOne(
        appliedScholarshipInfo
      );
      res.send(result);
    });

    app.get("/appliedScholarship", async (req, res) => {
      const result = await appliedScholarshipCollection.find().toArray();
      res.send(result);
    });

    app.patch("/appliedScholarship/:id", async (req, res) => {
      const selectedScholarshipId = req.params.id;
      const filter = { _id: new ObjectId(selectedScholarshipId) };
      const updatedAppliedScholarshipInfo = req.body;

      const updateDoc = {
        $set: {
          phone: updatedAppliedScholarshipInfo.phone,
          photo: updatedAppliedScholarshipInfo.photo,
          address: updatedAppliedScholarshipInfo.address,
          gender: updatedAppliedScholarshipInfo.gender,
          degree: updatedAppliedScholarshipInfo.degree,
          ssc: updatedAppliedScholarshipInfo.ssc,
          hsc: updatedAppliedScholarshipInfo.hsc,
          date: new Date(),
        },
      };

      const result = await appliedScholarshipCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    app.patch("/appliedScholarship/feedback/:id", async (req, res) => {
      const selectedScholarshipId = req.params.id;
      const filter = { _id: new ObjectId(selectedScholarshipId) };
      const updatedAppliedScholarshipInfo = req.body;

      const updateDoc = {
        $set: {
          feedback: updatedAppliedScholarshipInfo.feedback,
        },
      };

      const result = await appliedScholarshipCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    app.patch("/appliedScholarship/status/:id", async (req, res) => {
      const selectedScholarshipId = req.params.id;
      const filter = { _id: new ObjectId(selectedScholarshipId) };
      const updatedAppliedScholarshipInfo = req.body;

      const updateDoc = {
        $set: {
          status: updatedAppliedScholarshipInfo.status,
        },
      };

      const result = await appliedScholarshipCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    app.get("/appliedScholarship/:email", async (req, res) => {
      const appliedEmail = req.params.email;
      const query = { userEmail: appliedEmail };
      const result = await appliedScholarshipCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/appliedScholarship/:id", async (req, res) => {
      const appliedScholarshipId = req.params.id;
      const query = { _id: new ObjectId(appliedScholarshipId) };
      const result = await appliedScholarshipCollection.deleteOne(query);
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
