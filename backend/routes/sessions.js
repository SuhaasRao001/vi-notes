const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const SECRET = process.env.JWT_SECRET || 'vinotes_secret';

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Save session
router.post('/', auth, async (req, res) => {
  try {
    const { text, keystrokes, snapshots, pasteEvents, duration } = req.body;
    console.log('snapshots received:', snapshots?.length);
    const session = await Session.create({
      userId: req.user.userId,
      text, keystrokes, snapshots, pasteEvents, duration,
    });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all sessions for user
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;