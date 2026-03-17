const Session = require("../../models/Session");

exports.createSession = async (req, res) => {
  try {
    const session = await Session.create(req.body);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifySession = async (req, res) => {
  try {
    const { token } = req.query;
    const session = await Session.findOne({ token });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const expired = session.expiresAt && new Date(session.expiresAt) < new Date();
    res.json({ valid: !expired, session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
