// Defines the task fields, defaults and validation rules used by MongoDB operations.
const mongoose = require('mongoose');
const { statuses, priorities } = require('../task-input');

// Mongoose also keeps createdAt and updatedAt up to date.
const taskSchema = new mongoose.Schema({
  // Keep the owner's MongoDB ID fixed after a task is created.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true
  },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: statuses, default: 'Pending' },
  priority: { type: String, enum: priorities, default: 'Medium' },
  category: { type: String, default: '', trim: true },
  dueDate: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

// This index helps find a user's tasks in newest-first order.
taskSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
