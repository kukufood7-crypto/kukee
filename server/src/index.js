import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI not set in environment');
  process.exit(1);
}

const client = new MongoClient(mongoUri);
let db;

async function start() {
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'kuku-pup-palace');
  console.log('Connected to MongoDB');

  // Shops
  app.get('/api/shops', async (req, res) => {
    const shops = await db.collection('shops').find().sort({ created_at: -1 }).toArray();
    res.json(shops);
  });

  app.post('/api/shops', async (req, res) => {
    const payload = { ...req.body, created_at: new Date().toISOString() };
    const result = await db.collection('shops').insertOne(payload);
    res.json({ insertedId: result.insertedId });
  });

  app.delete('/api/shops/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.collection('shops').deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Shop not found' });
      }
      
      res.json({ message: 'Shop deleted successfully' });
    } catch (error) {
      console.error('Error deleting shop:', error);
      res.status(500).json({ message: 'Failed to delete shop' });
    }
  });

  // Orders
  app.get('/api/orders', async (req, res) => {
    const orders = await db.collection('orders').find().sort({ order_date: -1 }).toArray();
    res.json(orders);
  });

  app.post('/api/orders', async (req, res) => {
    const payload = { ...req.body, created_at: new Date().toISOString(), status: 'pending', order_date: new Date().toISOString() };
    const result = await db.collection('orders').insertOne(payload);
    res.json({ insertedId: result.insertedId });
  });

  app.put('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    const update = { ...req.body };
    const result = await db.collection('orders').updateOne({ _id: new ObjectId(id) }, { $set: update });
    res.json(result);
  });

  app.delete('/api/orders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.collection('orders').deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      res.json({ message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Failed to delete order' });
    }
  });
  app.get('/api/expenses', async (req, res) => {
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    const expenses = await db.collection('expenses').find(filter).sort({ created_at: -1 }).toArray();
    res.json(expenses);
  });

  app.post('/api/expenses', async (req, res) => {
    const payload = { ...req.body, created_at: new Date().toISOString() };
    const result = await db.collection('expenses').insertOne(payload);
    res.json({ insertedId: result.insertedId });
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const result = await db.collection('expenses').deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  });

  // Initialize stocks for all packet sizes if they don't exist
  async function initializeStocks() {
    const sizes = ['30gm', '60gm', '500gm', '1kg'];
    for (const size of sizes) {
      const existingStock = await db.collection('stocks').findOne({
        category: 'pouch',
        type: 'raw_material',
        packet_size: size
      });

      if (!existingStock) {
        await db.collection('stocks').insertOne({
          category: 'pouch',
          type: 'raw_material',
          packet_size: size,
          quantity: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  // Run initialization when server starts
  initializeStocks().catch(console.error);

  // Stocks Management
  // Total stock route must be before the general stocks routes to avoid conflict
  app.get('/api/stocks/total', async (req, res) => {
    try {
      const stocks = await db.collection('stocks').find().toArray();
      const totalStock = stocks.reduce((total, item) => total + (item.quantity || 0), 0);
      res.json({ total: totalStock });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get total stock' });
    }
  });

  app.get('/api/stocks', async (req, res) => {
    try {
      const stocks = await db.collection('stocks').find().toArray();
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stocks' });
    }
  });

  app.post('/api/stocks', async (req, res) => {
    try {
      const payload = {
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const result = await db.collection('stocks').insertOne(payload);
      res.json({ insertedId: result.insertedId });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add stock' });
    }
  });

  app.put('/api/stocks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const update = {
        ...req.body,
        updated_at: new Date().toISOString()
      };
      const result = await db.collection('stocks').updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update stock' });
    }
  });

  // Reminders
  app.get('/api/reminders', async (req, res) => {
    const reminders = await db.collection('reminders').find().sort({ reminder_date: -1 }).toArray();
    res.json(reminders);
  });

  app.post('/api/reminders', async (req, res) => {
    const payload = { ...req.body, created_at: new Date().toISOString() };
    const result = await db.collection('reminders').insertOne(payload);
    res.json({ insertedId: result.insertedId });
  });

  // Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Finish God Endpoints
  app.get('/api/finish-god/current', async (req, res) => {
    try {
      // Get balances for all sizes
      const balances = {};
      for (const size of ['30gm', '60gm', '500gm', '1kg']) {
        const current = await db.collection('finish_god').findOne({ size }, { sort: { _id: -1 } });
        balances[size] = current?.balance || 0;
      }
      
      // Also return the 30gm balance as 'balance' for backward compatibility
      const balance = balances['30gm'] || 0;
      
      res.json({ balances, balance });
    } catch (error) {
      console.error('Error fetching finish god balance:', error);
      res.status(500).json({ error: 'Failed to fetch current balance' });
    }
  });

  app.get('/api/finish-god/transactions', async (req, res) => {
    try {
      const transactions = await db.collection('finish_god_transactions')
        .find()
        .sort({ date: -1 })
        .toArray();
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching finish god transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/finish-god/add', async (req, res) => {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const { quantity, date, size = '30gm' } = req.body;

        // Validate quantity
        if (!quantity || quantity <= 0) {
          throw new Error('Invalid quantity');
        }

        // Get current balance for the specific size
        const currentBalance = await db.collection('finish_god').findOne({ size }, { sort: { _id: -1 } });
        const newBalance = (currentBalance?.balance || 0) + quantity;

        // Find and update pouch stock (raw material pouch)
        const pouchStock = await db.collection('stocks').findOne({
          category: 'pouch',
          type: 'raw_material'
        }, { session });

        if (!pouchStock || pouchStock.quantity < quantity) {
          throw new Error('Insufficient pouch stock');
        }

        // Update pouch stock
        await db.collection('stocks').updateOne(
          { _id: pouchStock._id },
          { $set: { 
              quantity: pouchStock.quantity - quantity,
              updated_at: new Date().toISOString()
            }
          },
          { session }
        );

        // Update balance for specific size
        await db.collection('finish_god').insertOne({
          size,
          balance: newBalance,
          updated_at: new Date().toISOString()
        }, { session });

        // Create transaction record
        await db.collection('finish_god_transactions').insertOne({
          date: date || new Date().toISOString(),
          added: quantity,
          removed: 0,
          balance: newBalance,
          size,
          type: 'add',
          created_at: new Date().toISOString()
        }, { session });

        res.json({ success: true, balance: newBalance, maxFinishGod: pouchStock.quantity - quantity });
      });
    } catch (error) {
      console.error('Error adding finish god:', error);
      res.status(500).json({ error: error.message || 'Failed to add finish god' });
    } finally {
      await session.endSession();
    }
  });

  app.post('/api/finish-god/remove', async (req, res) => {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const { quantity, date, size = '30gm' } = req.body;

        // Validate quantity
        if (!quantity || quantity <= 0) {
          throw new Error('Invalid quantity');
        }

        // Get current balance for the specific size
        const currentBalance = await db.collection('finish_god').findOne({ size }, { sort: { _id: -1 } });
        
        if (!currentBalance || currentBalance.balance < quantity) {
          throw new Error('Insufficient balance');
        }

        const newBalance = currentBalance.balance - quantity;

        // Update balance for specific size (remove packets from inventory)
        await db.collection('finish_god').insertOne({
          size,
          balance: newBalance,
          updated_at: new Date().toISOString()
        }, { session });

        // Create transaction record
        await db.collection('finish_god_transactions').insertOne({
          date: date || new Date().toISOString(),
          added: 0,
          removed: quantity,
          balance: newBalance,
          size,
          type: 'remove',
          created_at: new Date().toISOString()
        }, { session });

        res.json({ success: true, balance: newBalance });
      });
    } catch (error) {
      console.error('Error removing finish god:', error);
      res.status(500).json({ error: error.message || 'Failed to remove finish god' });
    } finally {
      await session.endSession();
    }
  });

  app.post('/api/finish-god/max', async (req, res) => {
    try {
      const { biscuitsGrams, pouches, maxFinishGod, size, date } = req.body;
      
      // Get current max finish god count
      const currentMaxData = await db.collection('max_finish_god')
        .findOne({ size });

      // Log the values for debugging
      console.log('Updating max finish god:', {
        biscuitsGrams,
        pouches,
        maxFinishGod,
        currentMax: currentMaxData?.max_count
      });

      // Update or insert the new max value
      const result = await db.collection('max_finish_god')
        .updateOne(
          { size },
          {
            $set: {
              max_count: maxFinishGod,
              biscuits_grams: biscuitsGrams || 0,
              pouches,
              size,
              date: new Date(date),
              updated_at: new Date()
            }
          },
          { upsert: true }
        );

      return res.status(200).json({ 
        message: "Max finish god updated successfully",
        maxFinishGod,
        biscuitsGrams: biscuitsGrams || 0,
        pouches
      });
    } catch (error) {
      console.error('Error updating max finish god:', error);
      return res.status(500).json({ error: "Failed to update max finish god" });
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
