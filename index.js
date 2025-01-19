
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cors(
    {
        origin: ['http://localhost:5173'], //replace with client address
        credentials: true,
    }
)); 

// cookie parser middleware
app.use(cookieParser());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7oyvz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const db = client.db('havenHomesDB');
    const advertisementsCollection = db.collection('advertisements')
    const reviewsCollection = db.collection('reviews')
    const propertiesCollection = db.collection('properties')
    const userCollection = db.collection('users')
    const messageCollection = db.collection('user-message')

    // Save or update an user in db
    app.post('/users/:email', async(req,res)=>{
      const email = req.params.email;
    const query = {email}
    const user = req.body;
    const isExist =await userCollection.findOne(query)
    if(isExist) {
      return res.send(isExist)
    }
    const result = await userCollection.insertOne({
      ...user,
      role: 'customer',
      timestamp: Date.now()
    })
    res.send(result)
    })

     // Get users data from db
     app.get('/users', async(req,res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    // Save Property Data in db
    app.post('/properties', async(req,res) => {
      const property = req.body;
      const result = await propertiesCollection.insertOne(property)
      res.send(result)
    })

    // Make Admin APIs
    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const user = req.body;
      const filter = {_id: new ObjectId(id)}
      const update = {
        $set:{
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter,update);
      res.send(result)
    })
    // Make Agent APIs
    app.patch('/users/agent/:id', async(req,res)=>{
      const id = req.params.id;
      const user = req.body;
      const filterId = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          role: 'agent'
        }
      }
      const result = await userCollection.updateOne(filterId,updateDoc);
      res.send(result)
    })
    app.patch('/users/fraud/:id', async(req,res)=>{
      const id = req.params.id;
      const user = req.body;
      const filterId = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          role: 'fraud'
        }
      }
      const result = await userCollection.updateOne(filterId,updateDoc);

      if (result.modifiedCount > 0) {
        const user = await userCollection.findOne(filterId)
        if (user) {
          const propertiesDeleteResult = await propertiesCollection.deleteMany({ agentEmail: user.email });
          res.send({
            message: `${propertiesDeleteResult.deletedCount} properties deleted and user marked as fraud.`,
            result,
            propertiesDeleteResult,
          });
        } else {
          res.status(404).send({ message: 'User not found.' });
        }
      } else {
        res.status(400).send({ message: 'Failed to mark user as fraud or user not found.' });
      }
    });

    // Delete an user
    app.delete('/users/:id', async(req,res)=>{
      const id=req.params.id;
      const query = {_id: new ObjectId(id)};
      const result  = await userCollection.deleteOne(query)
      res.send(result)
    })

    // Get Property data from db
    app.get('/properties', async(req,res) => {
      const result = await propertiesCollection.find().toArray()
      res.send(result)
    })

    app.get('/properties/:email', async(req,res) => {
      const email = req.params.email;
      const query = {agentEmail: email}
      const result = await propertiesCollection.find(query).toArray()
      res.send(result)
    })

    // Get property by ID
    app.get('/all-properties/:id', async(req,res)=>{
      const id = req.params.id;
      try {
        const result = await propertiesCollection.findOne({ _id: new ObjectId(id) });
        if (!result) {
            return res.status(404).send({ message: 'Property not found' });
        }
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching property', error });
    }
    })

    app.post('/wishlist', async (req, res) => {
      const wishlistItem = req.body;
      try {
          const result = await db.collection('wishlist').insertOne(wishlistItem);
          res.send(result);
      } catch (error) {
          res.status(500).send({ message: 'Error adding to wishlist', error });
      }
  });
    app.post('/user-message', async (req, res) => {
      const message = req.body;
      try {
          const result = await messageCollection.insertOne(message);
          res.send(result);
      } catch (error) {
          res.status(500).send({ message: 'Error adding to user-message', error });
      }
  });


  app.post('/reviews', async (req, res) => {
    const review = req.body;
    try {
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Error adding review', error });
    }
});

app.get('/reviews', async (req, res) => {
  
  try {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
  } catch (error) {
      res.status(500).send({ message: 'Error fetching reviews', error });
  }
});

  app.get('/reviews/:propertyId', async (req, res) => {
    const propertyId = req.params.propertyId;
    const query = {propertyId}
    try {
        const result = await reviewsCollection.find(query).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching reviews', error });
    }
});

app.delete('/reviews/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await reviewsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.status(200).send({ message: 'Review deleted successfully.' });
    } else {
      res.status(404).send({ message: 'Review not found.' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error deleting review.', error });
  }
});

// Update property
app.patch('/dashboard/update-property/:id', async(req,res)=>{
  const id= req.params.id;
  const property = req.body;
  const query = {_id: new ObjectId(id)};

  const update = {
    $set: {
      title: property?.title,
      location: property?.location,
      description: property?.description,
      minimumPrice: property?.minimumPrice,
      maximumPrice: property?.maximumPrice
    }
  }
  try{
    const result = await propertiesCollection.updateOne(query,update);
    res.send(result)

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Property not found' });
    }

  }catch(error){
    console.error('Error Updating Property:', error);
    res.status(500).send({ error: 'Failed to update property' });
  }
})

app.get('/update-property/:id', async(req,res) => {
  const id= req.params.id;
  const query = {id}
  const result = await propertiesCollection.findOne(query);
  res.send(result)
})

// Verify Property - PATCH request
app.patch('/properties/verify/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const property = await propertiesCollection.findOne({ _id: new ObjectId(id) });
    if (!property) {
      return res.status(404).send({ message: 'Property not found' });
    }

    // Update the property status to "verified"
    const result = await propertiesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { status: 'verified' }
      }
    );

    if (result.modifiedCount === 1) {
      res.send({ message: 'Property verified successfully', property });
    } else {
      res.status(400).send({ message: 'Failed to verify property' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error verifying property', error });
  }
});


// Reject Property - PATCH request
app.patch('/properties/reject/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const property = await propertiesCollection.findOne({ _id: new ObjectId(id) });
    if (!property) {
      return res.status(404).send({ message: 'Property not found' });
    }

    // Update the property status to "rejected"
    const result = await propertiesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { status: 'rejected' }
      }
    );

    if (result.modifiedCount === 1) {
      res.send({ message: 'Property rejected successfully', property });
    } else {
      res.status(400).send({ message: 'Failed to reject property' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error rejecting property', error });
  }
});


// Get all properties with statuses - GET request
app.get('/properties/status/verified', async (req, res) => {
  try {
    const result = await propertiesCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching properties', error });
  }
});




// Delete Property
app.delete('/properties/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await propertiesCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.status(200).send({ message: 'Property deleted successfully.' });
    } else {
      res.status(404).send({ message: 'Property not found.' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error deleting property.', error });
  }
});


    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello from my server')
})

app.listen(port, () => {
    console.log('My simple server is running at', port);
})
