const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: "401, Your're not authorized" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "401, You're not authorized" });
    }
    req.user = decoded;
    next();
  });
};

// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddl1jzo.mongodb.net/surplus-food-sharing?retryWrites=true&w=majority`;
// const uri = "mongodb://localhost:27017";

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
    const foodCollection = client
      .db("surplus-food-sharing")
      .collection("foods");

    const requestCollection = client
      .db("surplus-food-sharing")
      .collection("requests");

    // const foodCollection = client
    // .db("surplus-food-sharing-localdb")
    // .collection("foods");
    // const requestCollection = client
    // .db("surplus-food-sharing-localdb")
    // .collection("requests");


    // auth api
        // auth routes
        app.post("/api/v1/auth/access-token", (req, res) => {
          // creating access token and sent to the client
          // {email: "john@doe.com"}
          const user = req.body;
          const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
          // console.log(token);
          res
            .cookie("token", token, {
              httpOnly: true,
              secure: false, 
              // sameSite: "none",
            })
            .send({ success: true });
        });

    // foods api
    app.get("/api/v1/foods", async (req, res) => {
      const query = {
        $or: [{ foodStatus: "available" }, { foodStatus: "pending" }],
      };
      const result = await foodCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/api/v1/foods-by-query", async (req, res) => {
      const query = req.query.ser;
      console.log(query);
      // const result = await foodCollection.find({foodName : {$regex: query}}).toArray()
      const result = await foodCollection
        .aggregate([
          {
            $addFields: {
              result: {
                $regexMatch: {
                  input: "$foodName",
                  regex: /line/,
                  options: "i",
                },
              },
            },
          },
        ])
        .toArray();

      // const result = await foodCollection.aggregate(
      //   [
      //     {
      //       $search: {
      //         index: "myfoods",
      //         text: {
      //           query: query,
      //           path: {
      //             wildcard: "*"
      //           }
      //         }
      //       }
      //     }
      //   ]
      // ).toArray()
      res.send(result);
    });

    app.get("/api/v1/foods/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.get("/api/v1/user/foods", verifyToken, async (req, res) => {
      const queryEmail = req.query.email;
      const tokenEmailFromVerifyToken = req.user.email;
      // console.log(query);
      if (queryEmail !== tokenEmailFromVerifyToken) {
        return res.status(403).send({message: "403, Access forbidden"});
      }
      const query = { donorEmail: queryEmail };
      const result = await foodCollection.find(query).toArray();
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
      } 
      catch (error) {
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

    app.patch("/api/v1/user/update-food-status/:id", async (req, res) => {
      const id = req.params.id;
      // console.log("from food status patch: ", id);
      const filter = { _id: new ObjectId(id) };
      const foodInfo = req.body;
      const updateDoc = {
        $set: {
          foodStatus: foodInfo.foodStatus,
        },
      };
      const result = await foodCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // food request api
    app.get("/api/v1/user/food-requests/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { foodId: id };
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/api/v1/user/food-requests", verifyToken, async (req, res) => {
      // const query = req.query.email;      
      // console.log(query);
      const queryEmail = req.query.email;
      const tokenEmailFromVerifyToken = req.user.email;
      // console.log(query);
      if (queryEmail !== tokenEmailFromVerifyToken) {
        return res.status(403).send({message: "403, Access forbidden"});
      }

      const query = { requesterEmail: queryEmail };
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/api/v1/user/food-requests", async (req, res) => {
      const foodRequest = req.body;
      // console.log(foodRequest);
      const result = await requestCollection.insertOne(foodRequest);
      res.send(result);
    });

    app.delete("/api/v1/user/cancel-food-request/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await requestCollection.deleteOne(filter);
        res.status(200).send(result);
      } catch (error) {
        // console.log(error);
        res.send(error);
      }
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


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
