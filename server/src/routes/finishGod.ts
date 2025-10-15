import { Request, Response } from 'express';
import { Db } from 'mongodb';

export const updateMaxFinishGod = async (req: Request, res: Response) => {
  try {
    const { biscuitsGrams, pouches, maxFinishGod, size, date } = req.body;

    // Get database instance from global scope
    const db = (req.app.locals.db as Db);
    if (!db) throw new Error('Database connection not established');
    
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
            biscuits_grams: biscuitsGrams,
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
      biscuitsGrams,
      pouches
    });
  } catch (error) {
    console.error('Error updating max finish god:', error);
    return res.status(500).json({ error: "Failed to update max finish god" });
  }
};