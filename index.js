const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors({
  origin: ['http://localhost:5173','https://jobify-4431f.web.app','https://jobify-4431f.firebaseapp.com'],
  credentials: true
}

));
app.use(express.json());
app.use(cookieParser());


const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gsjmw27.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    const jobifyDB = client.db("JobifyDB");
    const jobs = jobifyDB.collection("Jobs");
    const applications = jobifyDB.collection("application");

    app.get('/allJobs', async (req, res) => {
      const result = await jobs.find().toArray();

      res.send(result);
    })
    app.get('/jobs/:category', async (req, res) => {
      const category = req.params.category;
      const query =
      {
        category: category

      }
      const result = await jobs.find(query).toArray();
      res.send(result);
    })
    app.get('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query =
      {
        _id: new ObjectId(id)

      }
      const result = await jobs.find(query).toArray();
      res.send(result);
    })

    app.get('/myJobs', verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      if (req.user.email !== req.query.email) {
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await jobs.find(query).toArray();
      res.send(result);

    })

    app.get('/appliedJobs', verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.user.email !== req.query.email) {
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = { applicantEmail: email };
      const result = await applications.find(query).toArray();
      res.send(result);

    })

    app.post('/addJob', async (req, res) => {
      const doc = req.body;

      const result = await jobs.insertOne(doc);
      res.send(result);
    })

    app.post('/applyToJob', async (req, res) => {
      const doc = req.body;

      const result = await applications.insertOne(doc);
      const jobId = doc.jobId;
      await jobs.updateOne(
        { _id: new ObjectId(jobId) },
        { $inc: { applicants: 1 } }
      );
      res.send(result);


    })

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      res.send({ success: true })


    })

    app.post('/logout', async (req, res) => {
      const user = req.body;

      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })

    app.put('/myJob/:id', async (req, res) => {
      const id = req.params.id;
      const doc = req.body;

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          picture: doc.newPicture,
          name: doc.newName,
          title: doc.newTitle,
          category: doc.newCategory,
          jobPostingDate: doc.newJobPostingDate,
          jobDeadline: doc.newJobDeadline,
          salary: doc.newSalary,
          description: doc.newDescription,
          applicants: doc.newApplicants

        },
      };

      const result = await jobs.updateOne(filter, updateDoc, options);
      res.send(result);

    })


    app.delete('/myJob/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobs.deleteOne(query);
      res.send(result);
    })
    app.options('*', cors());
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error

  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send("Jobify Server Is Running");
})

app.listen(port, () => {
  console.log(`Jobify Server Running On Port:${port}`)
})