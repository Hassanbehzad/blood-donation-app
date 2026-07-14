const Database = require('better-sqlite3');
const db = new Database('blood_donation.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS donors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    city TEXT NOT NULL,
    last_donation_date TEXT,
    available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    units_needed INTEGER DEFAULT 1,
    hospital TEXT NOT NULL,
    city TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    urgency TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id INTEGER NOT NULL,
    donation_date TEXT DEFAULT CURRENT_TIMESTAMP,
    units INTEGER DEFAULT 1,
    location TEXT,
    FOREIGN KEY (donor_id) REFERENCES donors(id)
  );
`);

module.exports = db;
