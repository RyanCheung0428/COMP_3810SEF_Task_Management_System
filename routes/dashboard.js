const express = require('express');
const Task = require('../models/Task');

const router = express.Router();

router.get('/', async (req, res) => {
  const tasks = await Task.find({ userId: req.session.userId }).select('status').lean();
  const stats = { total: tasks.length, pending: 0, inProgress: 0, completed: 0, percentage: 0 };

  for (const task of tasks) {
    if (task.status === 'Pending') stats.pending++;
    if (task.status === 'In Progress') stats.inProgress++;
    if (task.status === 'Completed') stats.completed++;
  }
  if (stats.total > 0) stats.percentage = Math.round((stats.completed / stats.total) * 100);

  return res.render('dashboard', { stats });
});

module.exports = router;
