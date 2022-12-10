const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// middle ware
app.use(cors());
app.use(express.json());

// connection mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cbfxhbf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run () {
  try{
    await client.connect();
   const productCollection = client.db('fashionova').collection('products');
   const orderCollection = client.db('fashionova').collection('orders');
   
    // products load---------------
    app.get('/product', async(req, res) => {
      const query = {}
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });
    // single product load------------
    app.get('/product/:id', async(req, res) =>{
      const id = req.params.id;
      const query={_id: ObjectId(id)};
      const product = await productCollection.findOne(query);
      res.send(product);
    });
    // order collection-----------------
    app.post('/order', async(req, res) =>{
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
  }
  catch{

  }
};
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})