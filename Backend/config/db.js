const mongoose = require('mongoose');

// Vercel serverless caching strategy
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Wait for connection to be established rather than buffering
    };

    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not defined in environment variables');
      return null;
    }

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
      return mongoose;
    }).catch(err => {
      console.error(`Error connecting to MongoDB: ${err.message}`);
      cached.promise = null; // reset promise to allow retries
      throw err;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;
