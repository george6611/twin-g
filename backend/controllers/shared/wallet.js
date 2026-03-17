const Wallet = require("../../models/Wallet");

exports.getWallet = async (req, res) => {
  try {
    const { userId, userType } = req.query;
    const wallet = await Wallet.findOne({ userId, userType });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateWallet = async (req, res) => {
  try {
    const { userId, userType, amount } = req.body;
    const wallet = await Wallet.findOneAndUpdate(
      { userId, userType },
      { $inc: { balance: amount }, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
