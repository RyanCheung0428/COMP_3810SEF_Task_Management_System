// The REST API under /api/tasks uses the session to identify the task owner and returns JSON.
const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { validateTask, readTaskFilters } = require('../task-input');

const router = express.Router();

// Return 400 for an invalid task ID before querying MongoDB.
router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ error: 'Invalid task ID.' });
  }
  next();
});

// GET /api/tasks applies the filters and returns an array of the signed-in user's tasks.
router.get('/', async (req, res) => {
  const { query, errors } = readTaskFilters(req.query);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Check the task filters.', fields: errors });
  }

  const tasks = await Task.find({ userId: req.session.userId, ...query })
    .sort({ createdAt: -1 }).lean();
  return res.json(tasks);
});

// POST /api/tasks validates the request, creates the task, and returns 201 with the new record.
router.post('/', async (req, res) => {
  const { task, errors } = validateTask(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Check the task fields.', fields: errors });
  }

  const createdTask = await Task.create({ ...task, userId: req.session.userId });
  return res.status(201).json(createdTask);
});

// PUT /api/tasks/:id applies the submitted editable fields and returns the updated task.
router.put('/:id', async (req, res) => {
  const { task, errors } = validateTask(req.body, { partial: true });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Check the task fields.', fields: errors });
  }

  // Match both IDs so a task outside this user's account returns 404.
  const filter = { _id: req.params.id, userId: req.session.userId };
  const updatedTask = await Task.findOneAndUpdate(filter, { $set: task }, {
    returnDocument: 'after', runValidators: true
  });
  if (!updatedTask) return res.status(404).json({ error: 'Task not found.' });

  return res.json(updatedTask);
});

// DELETE /api/tasks/:id removes the user's task and returns a 200 confirmation.
router.delete('/:id', async (req, res) => {
  const result = await Task.deleteOne({ _id: req.params.id, userId: req.session.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Task not found.' });

  return res.json({ message: 'Task deleted.' });
});

module.exports = router;
