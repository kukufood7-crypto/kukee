// Disable TS checks for this server file until proper @types/* packages are installed
// This keeps the file runnable with ts-node/esbuild without type-declaration errors.
// Remove this line after installing @types/express, @types/cors, @types/node, and @types/mongodb
// or switch the server to plain JavaScript.
// @ts-nocheck

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create the uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI not set in environment');
  process.exit(1);
}

const client = new MongoClient(mongoUri);
let db: any;

async function start() {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB server successfully');

    db = client.db('FinishGod');
    console.log('Selected database: FinishGod');
    
    // Verify collections exist
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Ensure finishGodTransactions collection exists
    if (!collections.find(c => c.name === 'finishGodTransactions')) {
      console.log('Creating finishGodTransactions collection...');
      await db.createCollection('finishGodTransactions');
      console.log('finishGodTransactions collection created successfully');
    }

    // Ensure availableStocks collection exists
    if (!collections.find(c => c.name === 'availableStocks')) {
      console.log('Creating availableStocks collection...');
      await db.createCollection('availableStocks');
      console.log('availableStocks collection created successfully');
      
      // Create initial stock record if needed
      const availableStocksCollection = db.collection('availableStocks');
      const existingStock = await availableStocksCollection.findOne({ size: '30gm' });
      
      if (!existingStock) {
        // Get initial balance from transactions
        const finishGodTransactions = db.collection('finishGodTransactions');
        const latestTransaction = await finishGodTransactions.findOne({}, { sort: { createdAt: -1 } });
        const initialBalance = latestTransaction ? latestTransaction.balance : 0;
        
        await availableStocksCollection.insertOne({
          size: '30gm',
          available: initialBalance,
          lastUpdated: new Date()
        });
        console.log('Initial stock record created with balance:', initialBalance);
      }
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }

  // Shops
  app.get('/api/shops', async (req: any, res: any) => {
    const shops = await db.collection('shops').find().sort({ created_at: -1 }).toArray();
    res.json(shops);
  });

  app.post('/api/shops', async (req: any, res: any) => {
    const payload = { ...req.body, created_at: new Date().toISOString() };
    const result = await db.collection('shops').insertOne(payload);
    res.json({ insertedId: result.insertedId });
  });

  // Orders
  app.get('/api/orders', async (req: any, res: any) => {
    const orders = await db.collection('orders').find().sort({ order_date: -1 }).toArray();
    res.json(orders);
  });

  app.post('/api/orders', async (req: any, res: any) => {
    const payload = { ...req.body, created_at: new Date().toISOString(), status: 'pending', order_date: new Date().toISOString() };
    const result = await db.collection('orders').insertOne(payload);
    res.json({ insertedId: result.insertedId });
  });

  app.put('/api/orders/:id', async (req: any, res: any) => {
    const { id } = req.params;
    const update = { ...req.body };
    const result = await db.collection('orders').updateOne({ _id: new ObjectId(id) }, { $set: update });
    res.json(result);
  });

  // Expenses
  app.get('/api/expenses', async (req: any, res: any) => {
    const { month, year } = req.query as any;
    const filter: any = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    const expenses = await db.collection('expenses').find(filter).sort({ created_at: -1 }).toArray();
    res.json(expenses);
  });

  app.post('/api/expenses', upload.single('photo'), async (req, res) => {
    try {
      let photo_url = null;
      if (req.file) {
        // Create URL for the uploaded file
        photo_url = `/uploads/${req.file.filename}`;
      }

      // Parse the stringified form data
      const formData = typeof req.body.expenseType === 'string' 
        ? {
            expense_type: req.body.expenseType,
            amount: parseFloat(req.body.amount),
            month: parseInt(req.body.month),
            year: parseInt(req.body.year),
            description: req.body.description,
            name: req.body.name
          }
        : req.body;

      const payload = { 
        ...formData, 
        photo_url,
        created_at: new Date().toISOString() 
      };

      const result = await db.collection('expenses').insertOne(payload);
      res.json({ insertedId: result.insertedId, photo_url });
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  });

  app.delete('/api/expenses/:id', async (req: any, res: any) => {
    const { id } = req.params;
    const result = await db.collection('expenses').deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  });

  // Stock
  app.get('/api/stocks', async (req: any, res: any) => {
    const stocks = await db.collection('stocks').find().toArray();
    res.json(stocks);
  });

  app.post('/api/stocks', async (req: any, res: any) => {
    const payload = { ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const result = await db.collection('stocks').insertOne(payload);
    res.json({ insertedId: result.insertedId });
  });

  app.put('/api/stocks/:id', async (req: any, res: any) => {
    const { id } = req.params;
    const update = { ...req.body, updated_at: new Date().toISOString() };
    const result = await db.collection('stocks').updateOne({ _id: new ObjectId(id) }, { $set: update });
    res.json(result);
  });

  app.delete('/api/stocks/:id', async (req: any, res: any) => {
    const { id } = req.params;
    try {
      console.log('Attempting to delete stock with id:', id);
      const result = await db.collection('stocks').deleteOne({ _id: new ObjectId(id) });
      console.log('Delete result:', result);
      if (result.deletedCount === 0) {
        console.log('Stock not found with id:', id);
        res.status(404).json({ error: 'Stock not found' });
      } else {
        console.log('Successfully deleted stock with id:', id);
        res.json({ success: true, ...result });
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      res.status(500).json({ error: 'Failed to delete stock', details: error.message });
    }
  });

  // Reminders
  app.get('/api/reminders', async (req: any, res: any) => {
    const reminders = await db.collection('reminders').find().sort({ reminder_date: -1 }).toArray();
    res.json(reminders);
  });

  app.post('/api/reminders', async (req: any, res: any) => {
    const payload = { ...req.body, created_at: new Date().toISOString() };
    const result = await db.collection('reminders').insertOne(payload);
    res.json({ insertedId: result.insertedId });
  });

  // Import max finish god route handler
  const { updateMaxFinishGod } = require('./routes/finishGod');

  // Finish God endpoints
  app.post('/api/finish-god/max', updateMaxFinishGod);

  app.get('/api/finish-god/current', async (req: any, res: any) => {
    try {
      console.log('Fetching current finish god balance...');
      
      // Ensure database connection
      if (!db) {
        throw new Error('Database connection not established');
      }

      // Get the available stocks collection
      const availableStocksCollection = db.collection('availableStocks');
      console.log('Accessing availableStocks collection...');

      // Get the current stock from availableStocks collection
      const currentStock = await availableStocksCollection.findOne({ size: '30gm' });
      
      // If no stock record exists yet, check the transactions collection for balance
      if (!currentStock) {
        const collection = db.collection('finishGodTransactions');
        const latestTransaction = await collection.findOne({}, { sort: { createdAt: -1 } });
        const balance = latestTransaction ? latestTransaction.balance : 0;
        
        // Create initial stock record
        await availableStocksCollection.insertOne({
          size: '30gm',
          available: balance,
          lastUpdated: new Date()
        });
        
        res.json({ balance });
      } else {
        res.json({ balance: currentStock.available });
      }
    } catch (error) {
      console.error('Error fetching current finish god balance:', error);
      res.status(500).json({ message: 'Error fetching current balance', error: error.toString() });
    }
  });

  app.get('/api/finish-god/transactions', async (req: any, res: any) => {
    try {
      console.log('Fetching all finish god transactions...');
      
      // Ensure database connection
      if (!db) {
        throw new Error('Database connection not established');
      }

      // Get the collection
      const collection = db.collection('finishGodTransactions');
      console.log('Accessing finishGodTransactions collection...');

      const transactions = await collection
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      
      console.log(`Found ${transactions.length} transactions`);
      
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching finish god transactions:', error);
      res.status(500).json({ message: 'Error fetching transactions', error: error.toString() });
    }
  });

  app.post('/api/finish-god/add', async (req: any, res: any) => {
    try {
      console.log('Adding finish god, received data:', req.body);
      const { quantity, date } = req.body;

      if (!quantity || quantity <= 0) {
        console.log('Invalid quantity received:', quantity);
        return res.status(400).json({ message: 'Invalid quantity' });
      }

      // Ensure database connection
      if (!db) {
        throw new Error('Database connection not established');
      }

      // Get the collection
      const collection = db.collection('finishGodTransactions');
      const availableStocksCollection = db.collection('availableStocks');
      console.log('Accessing collections...');

      // Get current balance
      const latestTransaction = await collection
        .findOne({}, { sort: { createdAt: -1 } });
      const currentBalance = latestTransaction ? latestTransaction.balance : 0;
      console.log('Current balance:', currentBalance);

      const newBalance = currentBalance + Number(quantity);

      // Create new transaction
      const transaction = {
        date: new Date(date),
        added: Number(quantity),
        removed: 0,
        balance: newBalance,
        createdAt: new Date()
      };
      console.log('Creating new transaction:', transaction);

      // Update available stock
      await availableStocksCollection.updateOne(
        { size: '30gm' },
        { 
          $set: { 
            available: newBalance,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );

      const result = await collection.insertOne(transaction);
      console.log('Transaction created with ID:', result.insertedId);

      res.json({ ...transaction, _id: result.insertedId });
    } catch (error) {
      console.error('Error adding finish god:', error);
      res.status(500).json({ message: 'Error adding finish god', error: error.toString() });
    }
  });

  app.post('/api/finish-god/remove', async (req: any, res: any) => {
    try {
      console.log('Removing finish god, received data:', req.body);
      const { quantity, date } = req.body;

      if (!quantity || quantity <= 0) {
        console.log('Invalid quantity received:', quantity);
        return res.status(400).json({ message: 'Invalid quantity' });
      }

      // Ensure database connection
      if (!db) {
        throw new Error('Database connection not established');
      }

      // Get the collection
      const collection = db.collection('finishGodTransactions');
      const availableStocksCollection = db.collection('availableStocks');
      console.log('Accessing collections...');

      // Get current balance
      const latestTransaction = await collection
        .findOne({}, { sort: { createdAt: -1 } });
      const currentBalance = latestTransaction ? latestTransaction.balance : 0;
      console.log('Current balance:', currentBalance);

      if (currentBalance < quantity) {
        console.log(`Insufficient stock. Requested: ${quantity}, Available: ${currentBalance}`);
        return res.status(400).json({
          message: `Insufficient finish god stock. Available: ${currentBalance}`
        });
      }

      const newBalance = currentBalance - Number(quantity);

      // Create new transaction
      const transaction = {
        date: new Date(date),
        added: 0,
        removed: Number(quantity),
        balance: newBalance,
        createdAt: new Date()
      };
      console.log('Creating new transaction:', transaction);

      // Update available stock
      await availableStocksCollection.updateOne(
        { size: '30gm' },
        { 
          $set: { 
            available: newBalance,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );

      const result = await collection.insertOne(transaction);
      console.log('Transaction created with ID:', result.insertedId);

      res.json({ ...transaction, _id: result.insertedId });
    } catch (error) {
      console.error('Error removing finish god:', error);
      res.status(500).json({ message: 'Error removing finish god', error: error.toString() });
    }
  });

  app.listen(process.env.PORT || 4000, () => {
    console.log('Server running on port', process.env.PORT || 4000);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
