// Defines how user accounts are stored in MongoDB.
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // A unique index prevents duplicate usernames.
  username: { type: String, required: true, unique: true },
  // Regular queries omit the password hash. The login route requests it explicitly.
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
