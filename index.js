const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
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
   const userCollection = client.db('fashionova').collection('users');
   
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
    // stock available------------------
    app.get('/available', async(req, res) => {
      const product = req.query.product;
      const allOrders = await orderCollection.find().toArray();
      const query = {product: product};
      const orders = await orderCollection.find(query).toArray();
      allOrders.forEach()
      res.send(allOrders);
    });
    app.get('/order', async(req, res)=>{
      const customer = req.query.customer;
        const query = {customer: customer};
        const orders = await orderCollection.find(query).toArray();
        res.send(orders)
      });
        // user collection-------------------
        app.put('/user/:email', async(req, res) => {
          const email = req.params.email;
          const user = req.body;
          const filter = {email: email};
          const options = { upsert: true };
          const updateDoc = {
            $set: user,
          };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1d' })
          res.send({result, token});
        });
    
    // order collection-----------------
    app.post('/order', async(req, res) =>{
      const order = req.body;
      const query = {product: order.product, quantity: order.stock > order.quantity, customer: order.customer}
      const exists = await orderCollection.findOne(query);
      if(exists){
        return res.send({success: false, order: exists});
      }
      const result = await orderCollection.insertOne(order);
      return res.send({success: true, result});
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