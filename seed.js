// Run npm run seed to create the two demo users in MongoDB.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seed() {
  // Read the initial password from the environment and check bcrypt's input limit.
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.trim().length < 8 || Buffer.byteLength(password) > 72) {
    console.error('Set DEMO_PASSWORD to at least 8 characters and at most 72 bytes.');
    process.exitCode = 1;
    return;
  }
  if (!process.env.MONGODB_URI) {
    console.error('Set the Atlas connection string in MONGODB_URI before seeding.');
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    // Wait for the unique username index before creating any users.
    await User.init();

    // Keep existing accounts so that running the seed command again preserves their passwords.
    for (const username of ['student1', 'student2']) {
      if (await User.exists({ username })) {
        console.log(`${username} already exists; left unchanged.`);
        continue;
      }
      // Save a bcrypt hash in the database. Login checks the password against this hash.
      const passwordHash = await bcrypt.hash(password, 10);
      await User.create({ username, passwordHash });
      console.log(`Created ${username}.`);
    }
  } catch (error) {
    console.error('Unable to seed demo accounts.', error.name);
    process.exitCode = 1;
  } finally {
    // Release the database connection when the seed command finishes or fails.
    await mongoose.disconnect();
  }
}

seed();
