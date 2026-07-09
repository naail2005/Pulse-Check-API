import express from "express"
const app = express();

app.use(express.json())
// In-memory store for monitors and their timers
const monitors = {};



//User Story 1
const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype']);

app.post('/monitors', (req, res) => {
    const monitor = req.body;

    if (typeof monitor.id !== 'string' || monitor.id.trim() === '' || FORBIDDEN_IDS.has(monitor.id)) {
        return res.status(400).json({ message: 'A valid monitor id is required' });
    }

    if (Object.prototype.hasOwnProperty.call(monitors, monitor.id)) {
        return res.status(409).json({ message: `Monitor ${monitor.id} already exists` });
    }

    const now = new Date().toISOString();
    monitor.createdAt = now;
    monitor.updatedAt = now;

    monitors[monitor.id] = monitor;

    res.status(201)
        .json({
        message: `Monitor created for ${monitor.id}`
    });
});
app.listen(3000, () => console.log('Server running on port 3000'));