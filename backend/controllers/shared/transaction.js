const Transaction = require("../../models/Transaction");

exports.recordTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.create(req.body);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { userId, userType } = req.query;
    const query = {};
    if (userId) query.userId = userId;
    if (userType) query.userType = userType;

    const txns = await Transaction.find(query).sort({ createdAt: -1 });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
