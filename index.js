const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// mongodb

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddl1jzo.mongodb.net/surplus-food-sharing?retryWrites=true&w=majority`;
const uri = "mongodb://localhost:27017";

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
    await client.connect();

    // database and collections
    // const foodCollection = client
    // .db("surplus-food-sharing")
    // .collection("foods");

    const foodCollection = client
      .db("surplus-food-sharing-localdb")
      .collection("foods");
    const requestCollection = client
      .db("surplus-food-sharing-localdb")
      .collection("requests");

    // foods api
    app.get("/api/v1/foods", async (req, res) => {
      const result = await foodCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/v1/foods/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.get("/api/v1/user/foods", async (req, res) => {
      const query = req.query.email;
      // console.log(query);
      const filter = { donorEmail: query };
      const result = await foodCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/api/v1/user/create-food", async (req, res) => {
      const food = req.body;
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });

    app.delete("/api/v1/user/cancel-food/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await foodCollection.deleteOne(filter);
        res.status(200).send(result);
      } catch (error) {
        // console.log(error);
        res.send(error);
      }
    });

    app.patch("/api/v1/user/update-food/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // const options = {upsert: true}
      const foodInfo = req.body;
      const updateDoc = {
        $set: {
          foodName: foodInfo.foodName,
          foodImage: foodInfo.foodImage,
          foodQuantity: foodInfo.foodQuantity,
          pickupLocation: foodInfo.pickupLocation,
          donorName: foodInfo.donorName,
          donorImage: foodInfo.donorImage,
          donorEmail: foodInfo.donorEmail,
          additionalNote: foodInfo.additionalNote,
          foodStatus: foodInfo.foodStatus,
          expireDate: foodInfo.expireDate,
          updatedDate: foodInfo.updatedDate,
        },
      };
      const result = await foodCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // food request api

    app.get("/api/v1/user/food-requests/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { foodId: id };
      const result = await requestCollection.find(query).toArray();
      res.send(result)
    });
   

    app.post("/api/v1/user/food-requests", async (req, res) => {
      const foodRequest = req.body;
      // console.log(foodRequest);
      const result = await requestCollection.insertOne(foodRequest);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (res, req) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
