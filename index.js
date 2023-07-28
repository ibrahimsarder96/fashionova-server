const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require ('stripe')(process.env.STRIPE_SECRET_KEY)
// middle ware
app.use(cors());
app.use(express.json());

// connection mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cbfxhbf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// verifyJwt token---------------------
function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'unAuthorized access'});
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
    if(err){
      return res.status(403).send({message: 'Forbidden access'});
    }
    req.decoded = decoded;
    next()
  })
};

async function run () {
  try{
    await client.connect();
   const productCollection = client.db('fashionova').collection('products');
   const orderCollection = client.db('fashionova').collection('orders');
   const userCollection = client.db('fashionova').collection('users');
   const paymentCollection = client.db('fashionova').collection('payments');
   
    // products load---------------
    app.get('/products', async(req, res) => {
      const query = {}
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });
    // single product load------------
    app.get('/products/:id', async(req, res) =>{
      const id = req.params.id;
      const query={_id: ObjectId(id)};
      const product = await productCollection.findOne(query);
      res.send(product);
    });
    // product add ----------------------
    app.post('/products', async (req, res) =>{
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });
    // Product Remove database ------------
    app.delete('/products/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
    // // stock available------------------
    // app.get('/available', async(req, res) => {
    //   const product = req.query.product;
    //   const allOrders = await orderCollection.find().toArray();
    //   const query = {product: product};
    //   const orders = await orderCollection.find(query).toArray();
    //   allOrders.forEach()
    //   res.send(allOrders);
    // });
    // user order collection----------------------
  app.get('/order',verifyJWT, async(req, res)=>{
    const customer = req.query.customer;
    const decodedEmail = req.decoded.email;
    if(decodedEmail === customer){
      const query = {customer : customer};
      const orders = await orderCollection.find(query).toArray();
      return res.send(orders)
    }
  else{
    return res.status(403).send({message: 'Forbidden access'});
  }
  });
  // order collection -----------------
  app.get('/order/:id', async(req,res) => {
    const id = req.params.id;
    const query = {_id: ObjectId(id)};
    const order = await orderCollection.findOne(query);
    res.send(order);
  });
  // payment method --------------------
  app.post('/create-payment-intent', async(req, res)=>{
    const product = req.body;
    const price = product.price;
    const amount = price*100;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types:['card']
    });
    res.send({clientSecret: paymentIntent.client_secret})
  });
  // payment transactionId -------------
  app.patch('/order/:id', async(req, res)=> {
    const id = req.params.id;
    const payment = req.body;
    const filter = {_id: ObjectId(id)};
    const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        }
    } 
    const result = await paymentCollection.insertOne(payment);
    const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
    res.send(updatedDoc);
  });
  // all users ------------------------
  app.get('/user',verifyJWT, async(req, res) => {
    const users = await userCollection.find().toArray();
    res.send(users);
  });
  // admin user -------------------------
  app.get('/user/:email', async(req, res) =>{
    const email = req.params.email;
    const user = await userCollection.findOne({email: email});
    const isAdmin = user.role === 'admin';
    res.send({admin: isAdmin});
  }); 

  app.put('/user/admin/:email',verifyJWT, async(req, res) => {
    const email = req.params.email;
    const requester = req.decoded.email;
    const requesterAccount = await userCollection.findOne({email: requester});
    if(requesterAccount.role === 'admin'){
      const filter = {email: email};
      const updateDoc = {
        $set: {role: 'admin'}
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    }
   else{
    res.status(403).send({message: 'forbidden'});
   }
  });
        // user collection-------------------
  app.put('/user/:email', async(req, res) => {
    const email = req.params.email;
    const user = req.body;
    const filter = {email: email};
    const options = { upsert: true };
    const updateDoc = {
      $set: user};
    const result = await userCollection.updateOne(filter, updateDoc, options);
    const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1d' })
    res.send({result, token})
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