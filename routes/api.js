const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { validateTask, readTaskFilters } = require('../task-input');

const router = express.Router();

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ error: 'Invalid task ID.' });
  }
  next();
});

router.get('/', async (req, res) => {
  const { query, errors } = readTaskFilters(req.query);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Check the task filters.', fields: errors });
  }

  const tasks = await Task.find({ userId: req.session.userId, ...query }).sort({ createdAt: -1 }).lean();
  return res.json(tasks);
});

router.post('/', async (req, res) => {
  const { task, errors } = validateTask(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Check the task fields.', fields: errors });
  }

  const createdTask = await Task.create({ ...task, userId: req.session.userId });
  return res.status(201).json(createdTask);
});

router.put('/:id', async (req, res) => {
  const { task, errors } = validateTask(req.body, true);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Check the task fields.', fields: errors });
  }

  const filter = { _id: req.params.id, userId: req.session.userId };
  const updatedTask = await Task.findOneAndUpdate(filter, { $set: task }, {
    returnDocument: 'after', runValidators: true
  });
  if (!updatedTask) return res.status(404).json({ error: 'Task not found.' });

  return res.json(updatedTask);
});

router.delete('/:id', async (req, res) => {
  const result = await Task.deleteOne({ _id: req.params.id, userId: req.session.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Task not found.' });

  return res.json({ message: 'Task deleted.' });
});

module.exports = router;
