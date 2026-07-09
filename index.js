import express from "express";
import fs from "fs";
const app = express();

app.use(express.json());

const monitors = {};
const timers = {};
const ALERTS_LOG_PATH = "alerts.log";


const FORBIDDEN_IDS = new Set(["__proto__", "constructor", "prototype"]);
const MONITOR_STATUSES = new Set(["up", "down", "paused"]);

// developer's choice: audit trail of failure events for support engineers,
// in addition to the console log, so alerts survive a process restart.
function logAlert(alert) {
  console.log(alert);
  fs.appendFile(ALERTS_LOG_PATH, JSON.stringify(alert) + "\n", (err) => {
    if (err) console.error("Failed to write to alerts.log:", err);
  });
}

// user stroy 3 and timer function called in registering a monitor or reseting the timer on a device
function startTimer(monitor) {
  clearTimeout(timers[monitor.id]);
  timers[monitor.id] = setTimeout(() => {
    monitor.status = "down";
    monitor.updatedAt = new Date().toISOString();
    console.log({
        ALERT: `Device ${monitor.id} is down!`,
        time: monitor.updatedAt,
    });
    
    logAlert({
      ALERT: `Device ${monitor.id} is down!`,
      time: monitor.updatedAt,
    });

  }, monitor.timeout * 1000);
}

//fetch all monitors, optionally filtered by id (?id=) and/or status (?status=up|down|paused)
app.get("/monitors", (req, res) => {
  const { status, id } = req.query;

  if (status !== undefined && !MONITOR_STATUSES.has(status)) {
    return res.status(400).json({
      message: `Invalid status filter. Must be one of: ${[...MONITOR_STATUSES].join(", ")}`,
    });
  }

  let result;
  if (id !== undefined) {
    const monitor = monitors[id];
    result = monitor ? [monitor] : [];
  } else {
    result = Object.values(monitors);
  }

  if (status !== undefined) {
    result = result.filter((monitor) => monitor.status === status);
  }

  res.status(200).json(result);
});

//user story 1(registering a monitor)
app.post("/monitors", (req, res) => {
  const monitor = req.body;

  if (
    typeof monitor.id !== "string" ||
    monitor.id.trim() === "" ||
    FORBIDDEN_IDS.has(monitor.id)
  ) {
    return res.status(400).json({ message: "A valid monitor id is required" });
  }

  if (Object.prototype.hasOwnProperty.call(monitors, monitor.id)) {
    return res
      .status(409)
      .json({ message: `Monitor ${monitor.id} already exists` });
  }

  if (typeof monitor.timeout !== "number" || monitor.timeout <= 0) {
    return res
      .status(400)
      .json({ message: "A valid timeout (in seconds) is required" });
  }

  const now = new Date().toISOString();
  monitor.createdAt = now;
  monitor.updatedAt = now;
  monitor.status = "up";

  monitors[monitor.id] = monitor;
  startTimer(monitor);

  console.log(monitors);

  res.status(201).json({
    message: `Monitor created for ${monitor.id}`,
  });
});


//user story 2(checking if the monitor exists and calls the startTimer functions to reste the timer or alert)
app.post("/monitors/:id/heartbeat", (req, res) => {
  const monitor = monitors[req.params.id];

  if (!monitor) {
    return res
      .status(404)
      .json({ message: `Monitor ${req.params.id} not found` });
  }

  monitor.status = "up";
  monitor.updatedAt = new Date().toISOString();
  startTimer(monitor);

  res.status(200).json({ message: `Heartbeat received for ${monitor.id}` });
});

//bonus user story (pausing a monitor)
app.post("/monitors/:id/pause", (req, res) => {
  const monitor = monitors[req.params.id];

  if (!monitor) {
    return res
      .status(404)
      .json({ message: `Monitor ${req.params.id} not found` });
  }

  clearTimeout(timers[monitor.id]);
  monitor.status = "paused";
  monitor.updatedAt = new Date().toISOString();

  res.status(200).json({ message: `Monitor ${monitor.id} paused` });
});


app.listen(3000, () => console.log("Server running on port 3000"));
