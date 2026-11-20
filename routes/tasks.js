// Render page shells. All task data comes from the authenticated REST API.
const express = require('express');
const mongoose = require('mongoose');
const { readTaskFilters } = require('../task-input');

const router = express.Router();

// Keep the search and status when navigating between the list and task forms.
router.use((req, res, next) => {
  const { errors } = readTaskFilters({ title: req.query.title });
  if (errors.title) {
    return res.status(400).render('error', { status: 400, message: errors.title });
  }
  const completed = req.query.view === 'completed';
  const searchTitle = (req.query.title || '').trim();
  const listUrl = (completedView) => {
    const query = new URLSearchParams();
    if (completedView) query.set('view', 'completed');
    if (searchTitle) query.set('title', searchTitle);
    return '/tasks' + (query.size ? '?' + query.toString() : '');
  };
  Object.assign(res.locals, {
    completed,
    searchTitle,
    viewQuery: listUrl(completed).slice('/tasks'.length),
    inProgressUrl: listUrl(false),
    completedUrl: listUrl(true),
    returnUrl: listUrl(completed)
  });
  return next();
});

router.get('/', (req, res) => res.render('tasks'));

router.get('/new', (req, res) => res.render('task-form', {
  heading: 'Add task', taskId: ''
}));

router.get('/:id/edit', (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).render('error', { status: 400, message: 'Invalid task ID.' });
  }
  return res.render('task-form', {
    heading: 'Edit task', taskId: req.params.id
  });
});

module.exports = router;
