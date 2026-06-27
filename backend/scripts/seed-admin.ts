import { auth } from '../src/config/auth.js';
import pool from '../src/config/db.js';

async function run() {
  console.log('⏳ Seeding admin user...');
  try {
    // Check if admin already exists
    const existing = await pool.query('SELECT * FROM "user" WHERE email = $1', ['admin@aerosent.com']);
    if (existing.rows.length > 0) {
      console.log('⚠️ Admin user (admin@aerosent.com) already exists. Skipping.');
      return;
    }

    // Call better-auth API to sign up the admin user
    // This automatically hashes the password and inserts into user & account tables
    await auth.api.signUpEmail({
      body: {
        email: 'admin@aerosent.com',
        password: 'adminsecretpassword123',
        name: 'System Admin',
        role: 'Admin',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('Credentials: admin@aerosent.com / adminsecretpassword123');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
