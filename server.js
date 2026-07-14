const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const VALID_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ---------- DONORS ----------

// Register a new donor
app.post('/api/donors', (req, res) => {
  const { name, blood_group, phone, email, city, last_donation_date } = req.body;
  if (!name || !blood_group || !phone || !city) {
    return res.status(400).json({ error: 'name, blood_group, phone, and city are required' });
  }
  if (!VALID_GROUPS.includes(blood_group)) {
    return res.status(400).json({ error: 'Invalid blood group' });
  }
  const stmt = db.prepare(`
    INSERT INTO donors (name, blood_group, phone, email, city, last_donation_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(name, blood_group, phone, email || null, city, last_donation_date || null);
  const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(donor);
});

// List / search donors (filter by blood_group, city, available)
app.get('/api/donors', (req, res) => {
  const { blood_group, city, available } = req.query;
  let query = 'SELECT * FROM donors WHERE 1=1';
  const params = [];
  if (blood_group) {
    query += ' AND blood_group = ?';
    params.push(blood_group);
  }
  if (city) {
    query += ' AND city LIKE ?';
    params.push(`%${city}%`);
  }
  if (available !== undefined) {
    query += ' AND available = ?';
    params.push(available === 'true' ? 1 : 0);
  }
  query += ' ORDER BY created_at DESC';
  const donors = db.prepare(query).all(...params);
  res.json(donors);
});

// Get single donor
app.get('/api/donors/:id', (req, res) => {
  const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });
  res.json(donor);
});

// Update donor (e.g. toggle availability)
app.put('/api/donors/:id', (req, res) => {
  const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });
  const { name, blood_group, phone, email, city, available, last_donation_date } = req.body;
  db.prepare(`
    UPDATE donors SET
      name = COALESCE(?, name),
      blood_group = COALESCE(?, blood_group),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      city = COALESCE(?, city),
      available = COALESCE(?, available),
      last_donation_date = COALESCE(?, last_donation_date)
    WHERE id = ?
  `).run(name, blood_group, phone, email, city, available === undefined ? undefined : (available ? 1 : 0), last_donation_date, req.params.id);
  const updated = db.prepare('SELECT * FROM donors WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete donor
app.delete('/api/donors/:id', (req, res) => {
  const info = db.prepare('DELETE FROM donors WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Donor not found' });
  res.status(204).send();
});

// ---------- BLOOD REQUESTS ----------

app.post('/api/requests', (req, res) => {
  const { patient_name, blood_group, units_needed, hospital, city, contact_phone, urgency } = req.body;
  if (!patient_name || !blood_group || !hospital || !city || !contact_phone) {
    return res.status(400).json({ error: 'patient_name, blood_group, hospital, city, and contact_phone are required' });
  }
  if (!VALID_GROUPS.includes(blood_group)) {
    return res.status(400).json({ error: 'Invalid blood group' });
  }
  const stmt = db.prepare(`
    INSERT INTO requests (patient_name, blood_group, units_needed, hospital, city, contact_phone, urgency)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(patient_name, blood_group, units_needed || 1, hospital, city, contact_phone, urgency || 'normal');
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(request);
});

app.get('/api/requests', (req, res) => {
  const { status, blood_group, city } = req.query;
  let query = 'SELECT * FROM requests WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (blood_group) { query += ' AND blood_group = ?'; params.push(blood_group); }
  if (city) { query += ' AND city LIKE ?'; params.push(`%${city}%`); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

app.put('/api/requests/:id', (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  const { status } = req.body;
  db.prepare('UPDATE requests SET status = COALESCE(?, status) WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id));
});

app.delete('/api/requests/:id', (req, res) => {
  const info = db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Request not found' });
  res.status(204).send();
});

// ---------- DONATIONS (history) ----------

app.post('/api/donations', (req, res) => {
  const { donor_id, units, location } = req.body;
  if (!donor_id) return res.status(400).json({ error: 'donor_id is required' });
  const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(donor_id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });

  const info = db.prepare('INSERT INTO donations (donor_id, units, location) VALUES (?, ?, ?)')
    .run(donor_id, units || 1, location || null);

  // update donor's last donation date
  db.prepare("UPDATE donors SET last_donation_date = date('now') WHERE id = ?").run(donor_id);

  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(donation);
});

app.get('/api/donations', (req, res) => {
  const { donor_id } = req.query;
  let query = `
    SELECT donations.*, donors.name as donor_name, donors.blood_group
    FROM donations JOIN donors ON donations.donor_id = donors.id
    WHERE 1=1
  `;
  const params = [];
  if (donor_id) { query += ' AND donor_id = ?'; params.push(donor_id); }
  query += ' ORDER BY donation_date DESC';
  res.json(db.prepare(query).all(...params));
});

// ---------- DASHBOARD STATS ----------

app.get('/api/stats', (req, res) => {
  const totalDonors = db.prepare('SELECT COUNT(*) as c FROM donors').get().c;
  const availableDonors = db.prepare('SELECT COUNT(*) as c FROM donors WHERE available = 1').get().c;
  const pendingRequests = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'pending'").get().c;
  const totalDonations = db.prepare('SELECT COUNT(*) as c FROM donations').get().c;
  const byGroup = db.prepare('SELECT blood_group, COUNT(*) as count FROM donors GROUP BY blood_group').all();
  res.json({ totalDonors, availableDonors, pendingRequests, totalDonations, byGroup });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
