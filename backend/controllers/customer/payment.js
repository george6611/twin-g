const Payment = require("../../models/Payment");
const Transaction = require("../../models/Transaction");

// ---------------------- INITIATE PAYMENT ----------------------
const initiatePayment = async (req, res) => {
  try {
    const { amount, method, orderId } = req.body; // method = "mpesa", "card", etc.
    const customerId = req.customer._id;

    // TODO: Add M-Pesa STK Push logic here
    // For now, simulate a payment request
    const simulatedResponse = {
      status: "pending",
      reference: `MPESA-${Date.now()}`,
      message: "Simulated M-Pesa request initiated",
    };

    // Create a Transaction record
    const transaction = await Transaction.create({
      customer: customerId,
      orderId,
      amount,
      method,
      status: simulatedResponse.status, // 'pending'
      reference: simulatedResponse.reference,
    });

    // Create Payment record (linked to transaction)
    const payment = await Payment.create({
      customer: customerId,
      orderId,
      transactionId: transaction._id,
      amount,
      method,
      status: simulatedResponse.status,
    });

    res.status(201).json({
      message: simulatedResponse.message,
      payment,
      transaction,
    });
  } catch (err) {
    console.error("Payment initiation error:", err);
    res.status(500).json({ message: "Error initiating payment" });
  }
};

// ---------------------- PAYMENT CALLBACK (M-PESA) ----------------------
// This will handle M-Pesa callback confirmation later
const mpesaCallback = async (req, res) => {
  try {
    const { Body } = req.body;
    console.log("Received M-Pesa Callback:", JSON.stringify(Body, null, 2));

    // Example logic for updating transaction/payment after confirmation
    // const reference = Body.stkCallback.CheckoutRequestID;
    // const resultCode = Body.stkCallback.ResultCode;
    // if (resultCode === 0) {
    //   await Transaction.findOneAndUpdate(
    //     { reference },
    //     { status: "success" },
    //     { new: true }
    //   );
    //   await Payment.findOneAndUpdate(
    //     { reference },
    //     { status: "success" },
    //     { new: true }
    //   );
    // }

    res.json({ message: "Callback received" });
  } catch (err) {
    console.error("M-Pesa callback error:", err);
    res.status(500).json({ message: "Callback processing error" });
  }
};

// ---------------------- PAYMENT HISTORY ----------------------
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ customer: req.customer._id })
      .sort({ createdAt: -1 })
      .populate("orderId", "total status")
      .populate("transactionId", "status reference");
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: "Error fetching payment history" });
  }
};

module.exports = {
  initiatePayment,
  getPaymentHistory,
  mpesaCallback,
};
