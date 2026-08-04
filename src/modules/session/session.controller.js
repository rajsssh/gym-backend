import {
  createSessionService,
  listSessionsService,
  updateSessionService,
  updateSessionStatusService,
  deleteSessionService,
  getMemberSessionsService,
  joinSessionService,
  getSessionMembersService
} from "./session.service.js";

// ➤ Create
export const createSession = async (req, res, next) => {
  try {
    const r = await createSessionService(req.body);
    res.json({
      success: true,
      message: "Session added successfully",
      session: r
    });
  } catch (err) {
    next(err);
  }
};


// ➤ List (with search)
export const listSessions = async (req, res) => {
  try {
    const { adminId, trainerId } = req.params;
    const { search } = req.query;

    const data = await listSessionsService({
      adminId,
      trainerId,
      search,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Failed to fetch sessions",
    });
  }
};


// ➤ Full Update (Edit Session)
export const updateSession = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const r = await updateSessionService(sessionId, req.body);
    res.json({ success: true, message: "Session updated successfully", session: r });
  } catch (err) {
    next(err);
  }
};

// ➤ Status Update Only
export const updateSessionStatus = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const { status } = req.body;
    const r = await updateSessionStatusService(sessionId, status);
    res.json({ success: true, message: "Status updated", session: r });
  } catch (err) {
    next(err);
  }
};

// ➤ Delete
export const deleteSession = async (req, res, next) => {
  try {
    console.log("Delete session request received");
    const sessionId = Number(req.params.sessionId);
    await deleteSessionService(sessionId);
    res.json({ success: true, message: "Session deleted" });
  } catch (err) {
    next(err);
  }
};

// ➤ Get Member Sessions
export const getMemberSessions = async (req, res, next) => {
  try {
    const data = await getMemberSessionsService(req.params.memberId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ➤ Join Session
export const joinSession = async (req, res, next) => {
  try {
    const { memberId, sessionId } = req.body;
    const data = await joinSessionService(memberId, sessionId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ➤ Get Session Members
export const getSessionMembers = async (req, res, next) => {
  try {
    const data = await getSessionMembersService(req.params.sessionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
