const express = require('express');
const cors = require('cors');
require("dotenv").config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://car-doctor-b07ce.web.app', 'https://car-doctor-b07ce.web.app'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b6ov8m0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// Middlewares
const logger = async (req, res, next) => {
  // console.log('Called: ', req.host, req.originalUrl);
  console.log("Logger middlewares: ", req.method, req.url);
  next();
}

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('Verifying token for ', token);
  // No token available
  if(!token) {
    return res.status(401).send({message: 'not authorized'});
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // Error
    if(err) {
      // console.error('Invalid token: ', err);
      return res.status(401).send({message: 'unauthorized'})
    }

    // If token is valid then it would be decoded
    // console.log('Value in the token: ', decoded);
    req.user = decoded;
    next();
  })
  // next();
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    // Auth related api
    // app.post('/jwt', async (req, res) => {
    //   const user = req.body;
    //   console.log(user);
    //   // const token = jwt.sign(user, 'secret', {expiresIn: '1h'});
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});

    //   res.cookie('token', token, {
    //     httpOnly: true,
    //     secure: false,
    //     // sameSite: 'none',
    //   }).send({success: true});
    // })

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});

      // res.send({token});
      // res.cookie('token', token, {
      //   httpOnly: true,
      //   secure: true,
      //   // sameSite: 'none',
      // }).send({success: true});

      res.cookie('token', token, cookieOptions).send({success: true});
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('Logging Out: ', user);
      // res.clearCookie('token', {maxAge: 0}).send({success: true});
      res.clearCookie('token', { ...cookieOptions, maxAge: 0}).send({success: true});
    })


    // Get the database
    const carServicesCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings');


    // Get all data
    app.get('/services', logger, async (req, res) => {
        const cursor = carServicesCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    // Get specific data
    app.get('/serviceDetails/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const options = {
            projection: {title: 1, price: 1, service_id: 1}
        }
        const result = await carServicesCollection.findOne(query, options);
        res.send(result);
    })
    
    // Get specific data for book the service
    app.get('/bookService/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const options = {
            projection: {title: 1, price: 1, service_id: 1, img:1}
        }
        const result = await carServicesCollection.findOne(query, options);
        res.send(result);
    });

    // Add new booking data
    app.post('/addBookings', async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
      // console.log(newBooking);
    });

    // Get Specific bookings
    app.get('/myBookings', logger, verifyToken, async (req, res) => {
      // http://localhost:5000/myBookings?email=afsar@gmail.com&sort=1
      // console.log(req.query);
      console.log('Tok Tok Token: ', req.cookies.token);
      // console.log('User in the valid token: ', req.user);

      if(req.query.email !== req.user.email) {
        return res.status(403).send({message: 'forbidden access'});
      }

      let query = {};
      if(req.query?.email) {
        query = {email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // Update specific booking data
    app.patch('/updateBookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedBooking = req.body;
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        }
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // Delete Specific bookings data
    app.delete('/deleteBooking/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Welcome to the car doctor server!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});