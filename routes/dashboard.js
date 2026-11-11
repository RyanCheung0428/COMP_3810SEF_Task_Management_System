// The dashboard route calculates task totals for the signed-in user.
const express = require('express');
const Task = require('../models/Task');

const router = express.Router();

// GET /dashboard reads only the user's task statuses and counts each status.
router.get('/', async (req, res) => {
  const tasks = await Task.find({ userId: req.session.userId }).select('status').lean();
  const stats = { total: tasks.length, pending: 0, inProgress: 0, completed: 0, percentage: 0 };

  for (const task of tasks) {
    if (task.status === 'Pending') stats.pending++;
    if (task.status === 'In Progress') stats.inProgress++;
    if (task.status === 'Completed') stats.completed++;
  }
  // Round the completion rate to a whole percent. Keep it at zero when there are no tasks.
  if (stats.total > 0) stats.percentage = Math.round((stats.completed / stats.total) * 100);

  return res.render('dashboard', { stats });
});

module.exports = router;
