const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { emptyTask, statuses, priorities, validateTask, readTaskFilters } = require('../task-input');

const router = express.Router();

function showForm(res, task, errors, action, heading, status = 200) {
  return res.status(status).render('task-form', { task, errors, statuses, priorities, action, heading });
}

function taskNotFound(res) {
  return res.status(404).render('error', { status: 404, message: 'Task not found.' });
}

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).render('error', { status: 400, message: 'Invalid task ID.' });
  }
  next();
});

router.get('/', async (req, res) => {
  const { filters, query, errors } = readTaskFilters(req.query);
  const hasErrors = Object.keys(errors).length > 0;
  const tasks = hasErrors ? [] : await Task.find({ userId: req.session.userId, ...query })
    .sort({ createdAt: -1 }).lean();

  const message = req.session.message || '';
  delete req.session.message;

  return res.status(hasErrors ? 400 : 200).render('tasks', {
    tasks, filters, statuses, priorities, message, errors
  });
});

router.get('/new', (req, res) => {
  return showForm(res, emptyTask, {}, '/tasks', 'Add Task');
});

router.post('/', async (req, res) => {
  const { task, errors } = validateTask(req.body);
  if (Object.keys(errors).length > 0) {
    return showForm(res, task, errors, '/tasks', 'Add Task', 400);
  }

  await Task.create({ ...task, userId: req.session.userId });
  req.session.message = 'Task added.';
  return res.redirect(303, '/tasks');
});

router.get('/:id/edit', async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.session.userId }).lean();
  if (!task) return taskNotFound(res);

  return showForm(res, task, {}, `/tasks/${req.params.id}/edit`, 'Edit Task');
});

router.post('/:id/edit', async (req, res) => {
  const filter = { _id: req.params.id, userId: req.session.userId };
  const { task, errors } = validateTask(req.body);

  if (Object.keys(errors).length > 0) {
    if (!await Task.exists(filter)) return taskNotFound(res);
    return showForm(res, task, errors, `/tasks/${req.params.id}/edit`, 'Edit Task', 400);
  }

  const updatedTask = await Task.findOneAndUpdate(filter, { $set: task }, { runValidators: true });
  if (!updatedTask) return taskNotFound(res);

  req.session.message = 'Task updated.';
  return res.redirect(303, '/tasks');
});

router.post('/:id/delete', async (req, res) => {
  const result = await Task.deleteOne({ _id: req.params.id, userId: req.session.userId });
  if (result.deletedCount === 0) return taskNotFound(res);

  req.session.message = 'Task deleted.';
  return res.redirect(303, '/tasks');
});

module.exports = router;
