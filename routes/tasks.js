// Handles pages under /tasks. Every task operation uses the signed-in user's ID from the session.
const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { emptyTask, inProgress, completed, validateTask } = require('../task-input');

const router = express.Router();

function readListView(input = {}) {
  return input.view === 'completed' ? 'completed' : '';
}

function taskListUrl(view) {
  return view ? '/tasks?view=completed' : '/tasks';
}

async function showList(req, res, view) {
  const owner = { userId: req.session.userId };
  const unfinished = { $ne: completed };
  const [tasks, inProgressCount, completedCount] = await Promise.all([
    Task.find({ ...owner, status: view ? completed : unfinished })
      .sort({ createdAt: -1 }).lean(),
    Task.countDocuments({ ...owner, status: unfinished }),
    Task.countDocuments({ ...owner, status: completed })
  ]);

  const message = req.session.message || '';
  delete req.session.message;
  return res.render('tasks', {
    view, tasks, message,
    stats: { inProgress: inProgressCount, completed: completedCount }
  });
}

function showForm(req, res, task, errors, action, heading, status = 200) {
  const isFormPage = req.method === 'GET' || req.method === 'HEAD';
  const input = isFormPage ? req.query : req.body ?? {};
  const view = readListView(input);
  return res.status(status).render('task-form', {
    task, errors, action, heading, view, listUrl: taskListUrl(view)
  });
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

router.get('/', (req, res) => showList(req, res, readListView(req.query)));

// GET /tasks/new shows the form with the default values filled in.
router.get('/new', (req, res) => {
  return showForm(req, res, emptyTask, {}, '/tasks', 'Add Task');
});

// POST /tasks validates the form and creates a task owned by the user in the session.
router.post('/', async (req, res) => {
  const { task, errors } = validateTask(req.body, { allowStatus: false });
  if (Object.keys(errors).length > 0) {
    return showForm(req, res, task, errors, '/tasks', 'Add Task', 400);
  }

  await Task.create({ ...task, userId: req.session.userId });
  // A 303 redirect makes the browser load the list with GET, so refresh cannot repeat the POST.
  req.session.message = 'Task added.';
  return res.redirect(303, taskListUrl(readListView(req.body)));
});

// GET /tasks/:id/edit loads the form using both the task ID and the owner's ID.
router.get('/:id/edit', async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.session.userId }).lean();
  if (!task) return taskNotFound(res);

  return showForm(req, res, task, {}, `/tasks/${req.params.id}/edit`, 'Edit Task');
});

// POST /tasks/:id/edit updates the user's task or shows the form again with validation errors.
router.post('/:id/edit', async (req, res) => {
  const filter = { _id: req.params.id, userId: req.session.userId };
  const { task, errors } = validateTask(req.body, { allowStatus: false });

  if (Object.keys(errors).length > 0) {
    if (!await Task.exists(filter)) return taskNotFound(res);
    return showForm(req, res, task, errors, `/tasks/${req.params.id}/edit`, 'Edit Task', 400);
  }

  const updatedTask = await Task.findOneAndUpdate(filter, { $set: task }, { runValidators: true });
  if (!updatedTask) return taskNotFound(res);

  req.session.message = 'Task updated.';
  return res.redirect(303, taskListUrl(readListView(req.body)));
});

// Complete or reopen an owned task and return to the current list.
async function changeStatus(req, res, status, message) {
  const filter = { _id: req.params.id, userId: req.session.userId };
  const result = await Task.updateOne(
    { ...filter, status: { $ne: status } },
    { $set: { status } },
    { runValidators: true }
  );
  // Repeating the action succeeds without changing the task again.
  if (result.matchedCount === 0 && !await Task.exists(filter)) return taskNotFound(res);

  req.session.message = message;
  return res.redirect(303, taskListUrl(readListView(req.body)));
}

router.post('/:id/complete', (req, res) => changeStatus(req, res, completed, 'Task completed.'));
router.post('/:id/reopen', (req, res) => changeStatus(req, res, inProgress, 'Task reopened.'));

// POST /tasks/:id/delete removes a task only when both the task ID and the owner's ID match.
router.post('/:id/delete', async (req, res) => {
  const result = await Task.deleteOne({ _id: req.params.id, userId: req.session.userId });
  if (result.deletedCount === 0) return taskNotFound(res);

  req.session.message = 'Task deleted.';
  return res.redirect(303, taskListUrl(readListView(req.body)));
});

module.exports = router;
