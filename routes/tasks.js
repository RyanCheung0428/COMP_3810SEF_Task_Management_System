// Handles pages under /tasks. Every task operation uses the signed-in user's ID from the session.
const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { emptyTask, statuses, priorities, validateTask, readTaskFilters } = require('../task-input');

const router = express.Router();

// Use the same EJS form for new and existing tasks with a different heading and submit URL.
function showForm(res, task, errors, action, heading, status = 200) {
  return res.status(status).render('task-form', { task, errors, statuses, priorities, action, heading });
}

// Show the same 404 page when a task is missing or belongs to another user.
function taskNotFound(res) {
  return res.status(404).render('error', { status: 404, message: 'Task not found.' });
}

// Check the MongoDB ID before querying. Return 400 if its format is invalid.
router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).render('error', { status: 400, message: 'Invalid task ID.' });
  }
  next();
});

// GET /tasks checks the search filters and lists the user's tasks from newest to oldest.
router.get('/', async (req, res) => {
  const { filters, query, errors } = readTaskFilters(req.query);
  const hasErrors = Object.keys(errors).length > 0;
  const tasks = hasErrors ? [] : await Task.find({ userId: req.session.userId, ...query })
    .sort({ createdAt: -1 }).lean();

  // Read and clear the success message so it only appears once after a redirect.
  const message = req.session.message || '';
  delete req.session.message;

  return res.status(hasErrors ? 400 : 200).render('tasks', {
    tasks, filters, statuses, priorities, message, errors
  });
});

// GET /tasks/new shows the form with the default values filled in.
router.get('/new', (req, res) => {
  return showForm(res, emptyTask, {}, '/tasks', 'Add Task');
});

// POST /tasks validates the form and creates a task owned by the user in the session.
router.post('/', async (req, res) => {
  const { task, errors } = validateTask(req.body);
  if (Object.keys(errors).length > 0) {
    return showForm(res, task, errors, '/tasks', 'Add Task', 400);
  }

  await Task.create({ ...task, userId: req.session.userId });
  // A 303 redirect makes the browser load the list with GET, so refresh cannot repeat the POST.
  req.session.message = 'Task added.';
  return res.redirect(303, '/tasks');
});

// GET /tasks/:id/edit loads the form using both the task ID and the owner's ID.
router.get('/:id/edit', async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.session.userId }).lean();
  if (!task) return taskNotFound(res);

  return showForm(res, task, {}, `/tasks/${req.params.id}/edit`, 'Edit Task');
});

// POST /tasks/:id/edit updates the user's task or shows the form again with validation errors.
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

// POST /tasks/:id/delete removes a task only when both the task ID and the owner's ID match.
router.post('/:id/delete', async (req, res) => {
  const result = await Task.deleteOne({ _id: req.params.id, userId: req.session.userId });
  if (result.deletedCount === 0) return taskNotFound(res);

  req.session.message = 'Task deleted.';
  return res.redirect(303, '/tasks');
});

module.exports = router;
