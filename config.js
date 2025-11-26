require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT || 5000}`;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

module.exports = { BACKEND_URL, FRONTEND_URL };
