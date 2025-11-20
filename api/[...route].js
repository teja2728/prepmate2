const app = require('../app');
const { connectToDatabase } = require('../utils/db');

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (err) {
    console.error('API handler error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
