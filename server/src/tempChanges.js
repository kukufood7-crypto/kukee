// New add endpoint
app.post('/api/finish-god/add', async (req, res) => {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const { quantity, date, size = '30gm' } = req.body;

        // Validate quantity
        if (!quantity || quantity <= 0) {
          throw new Error('Invalid quantity');
        }

        // Find and update pouch stock for the specific size
        const pouchStock = await db.collection('stocks').findOne({
          category: 'pouch',
          type: 'raw_material',
          packet_size: size
        }, { session });

        if (!pouchStock || pouchStock.quantity < quantity) {
          throw new Error(`Insufficient pouch stock for ${size}`);
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

        // Get current balance for this size
        const currentBalance = await db.collection('finish_god').findOne({ size }, { sort: { _id: -1 } });
        const newBalance = (currentBalance?.balance || 0) + quantity;

        // Update balance
        await db.collection('finish_god').insertOne({
          balance: newBalance,
          size,
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

        // Get updated balances for all sizes
        const balances = {};
        for (const s of ['30gm', '60gm', '500gm', '1kg']) {
          const current = await db.collection('finish_god').findOne({ size: s }, { sort: { _id: -1 } });
          balances[s] = current?.balance || 0;
        }

        res.json({ 
          success: true, 
          balances,
          balance: newBalance, 
          maxFinishGod: pouchStock.quantity - quantity 
        });
      });
    } catch (error) {
      console.error('Error adding finish god:', error);
      res.status(500).json({ error: error.message || 'Failed to add finish god' });
    } finally {
      await session.endSession();
    }
  });

// New remove endpoint
app.post('/api/finish-god/remove', async (req, res) => {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const { quantity, date, size = '30gm' } = req.body;

        // Validate quantity
        if (!quantity || quantity <= 0) {
          throw new Error('Invalid quantity');
        }

        // Get current balance for this size
        const currentBalance = await db.collection('finish_god').findOne({ size }, { sort: { _id: -1 } });
        
        if (!currentBalance || currentBalance.balance < quantity) {
          throw new Error(`Insufficient ${size} finish god balance`);
        }

        const newBalance = currentBalance.balance - quantity;

        // Find and update pouch stock for the specific size
        const pouchStock = await db.collection('stocks').findOne({
          category: 'pouch',
          type: 'raw_material',
          packet_size: size
        }, { session });

        // Update pouch stock
        await db.collection('stocks').updateOne(
          { _id: pouchStock._id },
          { $set: { 
              quantity: pouchStock.quantity + quantity,
              updated_at: new Date().toISOString()
            }
          },
          { session }
        );

        // Update balance
        await db.collection('finish_god').insertOne({
          balance: newBalance,
          size,
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

        // Get updated balances for all sizes
        const balances = {};
        for (const s of ['30gm', '60gm', '500gm', '1kg']) {
          const current = await db.collection('finish_god').findOne({ size: s }, { sort: { _id: -1 } });
          balances[s] = current?.balance || 0;
        }

        res.json({ 
          success: true, 
          balances,
          balance: newBalance, 
          maxFinishGod: pouchStock.quantity + quantity 
        });
      });
    } catch (error) {
      console.error('Error removing finish god:', error);
      res.status(500).json({ error: error.message || 'Failed to remove finish god' });
    } finally {
      await session.endSession();
    }
  });