const mongoose = require('mongoose');
const { statuses, priorities } = require('../task-input');

const taskSchema = new mongoose.Schema({
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

taskSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
