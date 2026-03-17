const Address = require("../../models/Address");

exports.addAddress = async (req, res) => {
  try {
    const address = await Address.create(req.body);
    res.status(201).json(address);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const { userId, userType } = req.query;
    const addresses = await Address.find({ userId, userType });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
