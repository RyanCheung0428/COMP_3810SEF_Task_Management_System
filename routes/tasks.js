// Render page shells. All task data comes from the authenticated REST API.
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();
const completedView = (req) => req.query.view === 'completed';

router.get('/', (req, res) => res.render('tasks', { completed: completedView(req) }));

router.get('/new', (req, res) => res.render('task-form', {
  heading: 'Add task', taskId: '', completed: completedView(req)
}));

router.get('/:id/edit', (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).render('error', { status: 400, message: 'Invalid task ID.' });
  }
  return res.render('task-form', {
    heading: 'Edit task', taskId: req.params.id, completed: completedView(req)
  });
});

module.exports = router;
