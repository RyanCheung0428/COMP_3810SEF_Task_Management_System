const mongoose = require('mongoose');
const { inProgress, statuses } = require('../task-input');

// Match legacy values exactly, including missing fields, null, and unexpected BSON types.
const validStatus = { $in: [{ $ifNull: ['$status', null] }, statuses] };
const needsMigration = {
  $or: [
    { priority: { $exists: true } },
    { category: { $exists: true } },
    { $expr: { $not: [validStatus] } }
  ]
};

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI before migrating tasks.');

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    // Use the raw collection to preserve timestamps and remove retired schema fields.
    const tasks = mongoose.connection.db.collection('tasks');
    const result = await tasks.updateMany(needsMigration, [
      { $set: { status: { $cond: [validStatus, '$status', inProgress] } } },
      { $unset: ['priority', 'category'] }
    ]);
    const remaining = await tasks.countDocuments(needsMigration);
    console.log(`Migrated ${result.modifiedCount} task(s) in ${mongoose.connection.name}. ${remaining} still need migration.`);
    if (remaining > 0) throw new Error('Task migration verification failed.');
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((error) => {
  // Avoid logging connection details from database errors.
  console.error('Unable to complete task migration.', error.name);
  process.exitCode = 1;
});
