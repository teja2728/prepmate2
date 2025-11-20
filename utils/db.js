const mongoose = require('mongoose');

let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

function addEventLogging() {
  if (mongoose.connection._prepmateLogging) return;
  mongoose.connection._prepmateLogging = true;
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}

async function connectToDatabase() {
  addEventLogging();
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MongoDB connection error: MONGO_URI is not set');
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then((m) => {
      console.log('MongoDB connected successfully');
      return m;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

async function connectWithRetry(retries = 5, delayMs = 3000) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MongoDB connection error: MONGO_URI is not set');
    process.exit(1);
  }
  addEventLogging();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('MongoDB connected successfully');
      return true;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, err?.message || err);
      if (attempt < retries) {
        console.log(`Retrying MongoDB connection in ${Math.round(delayMs / 1000)}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.error('All MongoDB connection attempts failed. Check that your IP is whitelisted in Atlas and the URI is correct.');
        return false;
      }
    }
  }
}

module.exports = { connectToDatabase, connectWithRetry };
