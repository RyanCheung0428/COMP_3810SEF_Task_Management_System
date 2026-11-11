const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seed() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.trim().length < 8 || Buffer.byteLength(password) > 72) {
    console.error('Set DEMO_PASSWORD to at least 8 characters and at most 72 bytes.');
    process.exitCode = 1;
    return;
  }
  if (!process.env.MONGODB_URI) {
    console.error('Set MONGODB_URI before seeding.');
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await User.init();

    for (const username of ['student1', 'student2']) {
      if (await User.exists({ username })) {
        console.log(`${username} already exists; left unchanged.`);
        continue;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await User.create({ username, passwordHash });
      console.log(`Created ${username}.`);
    }
  } catch (error) {
    console.error('Unable to seed demo accounts.', error.name);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
