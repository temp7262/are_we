// routes/admin.js
// Dev 2 owns this file
// APIs:
//   GET /api/admin/logs                        — paginated AuditLog (admin-only, read-only)
//   GET /api/admin/tracking/:trackingId        — full tracking event history for an application

const express = require("express");
const router = express.Router();

// Dev 1 owns these — import only, never redefine
const AuditLog = require("../models/AuditLog");
const TrackingEvent = require("../models/TrackingEvent");

const authMiddleware = require("../middleware/auth");
const roleGuard = require("../middleware/role");
const { success, error } = require("../utils/response");

// ─────────────────────────────────────────────────────────────────
// RULE (from plan): Admin is GET-only.
//   Any PATCH / POST / PUT / DELETE on /api/admin/* → 403
//   Enforced at router level so it can never be accidentally bypassed.
// ─────────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  if (req.method !== "GET") {
    return res.status(403).json({
      success: false,
      data: {},
      message: "Forbidden — admin endpoints are read-only",
    });
  }
  next();
});

// ─────────────────────────────────────────────────────────────────
// GET /api/admin/logs
// Role: admin only
//
// Query params:
//   page      — page number, default 1
//   limit     — items per page, default 20, max 100
//   action    — optional filter by action string (exact match)
//   actorRole — optional filter by actorRole
//   startDate — optional ISO date filter (logs from this date)
//   endDate   — optional ISO date filter (logs up to this date)
//
// Returns paginated AuditLog sorted newest-first.
// actorId is populated with user name + email for readability.
// applicationId is populated with applicationId string.
// ─────────────────────────────────────────────────────────────────
router.get("/logs", authMiddleware, roleGuard("admin"), async (req, res) => {
  try {
    // ── Pagination ─────────────────────────────────────────────
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // ── Build filter ───────────────────────────────────────────
    const filter = {};

    if (req.query.action) {
      filter.action = req.query.action;
    }

    if (req.query.actorRole) {
      // Validate against known roles to prevent junk queries
      const validRoles = ["student", "clerk", "hod", "principal", "admin"];
      if (!validRoles.includes(req.query.actorRole)) {
        return error(
          res,
          `Invalid actorRole. Must be one of: ${validRoles.join(", ")}`,
          400
        );
      }
      filter.actorRole = req.query.actorRole;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) {
        const start = new Date(req.query.startDate);
        if (isNaN(start.getTime())) {
          return error(res, "Invalid startDate — use ISO 8601 format", 400);
        }
        filter.timestamp.$gte = start;
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        if (isNaN(end.getTime())) {
          return error(res, "Invalid endDate — use ISO 8601 format", 400);
        }
        filter.timestamp.$lte = end;
      }
    }

    // ── Query ──────────────────────────────────────────────────
    // AuditLog is APPEND-ONLY — no updates allowed, so we never call save/update here
    const [logs, totalCount] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })           // newest first
        .skip(skip)
        .limit(limit)
        .populate("actorId", "name email role")      // expand user ref
        .populate("applicationId", "applicationId trackingId status") // expand app ref
        .lean(),                           // plain JS objects, faster reads
      AuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return success(
      res,
      {
        logs,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Audit logs fetched successfully"
    );
  } catch (err) {
    console.error("[admin/logs]", err);
    return error(res, "Internal server error", 500);
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/admin/tracking/:trackingId
// Role: admin only
//
// Returns full event history for the given trackingId, sorted
// oldest-first so the flow reads top-to-bottom.
//
// changedBy is populated with user name + role for readability.
// ─────────────────────────────────────────────────────────────────
router.get(
  "/tracking/:trackingId",
  authMiddleware,
  roleGuard("admin"),
  async (req, res) => {
    try {
      const { trackingId } = req.params;

      if (!trackingId || trackingId.trim() === "") {
        return error(res, "trackingId param is required", 400);
      }

      const events = await TrackingEvent.find({ trackingId })
        .sort({ timestamp: 1 })           // oldest first — shows the flow in order
        .populate("changedBy", "name role email")
        .populate("applicationId", "applicationId status applicationType")
        .lean();

      if (events.length === 0) {
        return success(
          res,
          { trackingId, events: [] },
          "No tracking events found for this trackingId"
        );
      }

      // Derive current status from the most recent event's applicationId data
      const latestApp = events[events.length - 1].applicationId;

      return success(
        res,
        {
          trackingId,
          applicationId: latestApp?.applicationId ?? null,
          applicationType: latestApp?.applicationType ?? null,
          currentStatus: latestApp?.status ?? null,
          totalEvents: events.length,
          events,
        },
        "Tracking history fetched successfully"
      );
    } catch (err) {
      console.error("[admin/tracking]", err);
      return error(res, "Internal server error", 500);
    }
  }
);

module.exports = router;