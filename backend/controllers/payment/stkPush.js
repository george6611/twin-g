const axios = require("axios");
const moment = require("moment");
const { getNgrokUrl } = require("../../utils/ngrokHelper");
const Transaction = require("../../models/Transaction");
const Order = require("../../models/Order");
const mongoose = require("mongoose");

const consumer_key = process.env.CONSUMER_KEY;
const consumer_secret = process.env.CONSUMER_SECRET;
const shortCode = process.env.SHORTCODE;
const RENDER_URL = "https://gndelivery-backend.onrender.com";

// 🔐 Get M-Pesa access token
async function getAccessToken() {
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = "Basic " + Buffer.from(`${consumer_key}:${consumer_secret}`).toString("base64");

  const response = await axios.get(url, {
    headers: { Authorization: auth },
  });
  return response.data.access_token;
}

// 🌐 Get callback URL dynamically
async function getCallbackUrl() {
  if (process.env.NODE_ENV === "production") {
    return `${RENDER_URL}/api/stkpush/callback`;
  } else {
    const ngrokUrl = await getNgrokUrl(5000);
    console.log("📡 Callback URL for STK Push:", ngrokUrl);
    return `${ngrokUrl}/api/stkpush/callback`;
  }
}

// 🚀 Initiate STK Push
exports.initiateStkPush = async (req, res) => {
  try {
    const { amount, phone, socketId, userId, orderId } = req.body;

    if (!phone || !amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (phone, amount, orderId)",
      });
    }

    const validPhone = phone.startsWith("254") ? phone : `254${phone.slice(1)}`;
    const accessToken = await getAccessToken();
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(shortCode + process.env.PASSKEY + timestamp).toString("base64");
    const callbackUrl = await getCallbackUrl();

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: validPhone,
      PartyB: shortCode,
      PhoneNumber: validPhone,
      CallBackURL: callbackUrl,
      AccountReference: `Order-${orderId}`,
      TransactionDesc: `Payment for Order ${orderId}`,
    };

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // 🧠 Save pending transaction in memory
    const pendingTransactions = req.app.get("pendingTransactions");
    pendingTransactions[response.data.CheckoutRequestID] = {
      status: "pending",
      socketId,
      phone,
      amount,
      orderId,
      // 🧩 Fallback if userId invalid — avoid Cast error
      userId: mongoose.Types.ObjectId.isValid(userId) ? userId : null,
    };

    res.status(200).json({
      success: true,
      message: "STK push request sent successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("❌ STK Push Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "STK Push failed",
      details: error.message,
    });
  }
};

// 📩 Handle STK Callback from Safaricom
exports.handleStkCallback = async (req, res) => {
  try {
    const callback = req.body.Body?.stkCallback;
    if (!callback) return res.status(400).json({ error: "Invalid callback data" });

    const checkoutRequestID = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;

    const pendingTransactions = req.app.get("pendingTransactions");
    const pending = pendingTransactions[checkoutRequestID];
    const io = req.app.get("io");

    if (!pending) {
      console.warn("⚠️ Unknown or expired CheckoutRequestID:", checkoutRequestID);
      return res.status(404).json({ message: "Unknown checkout ID" });
    }

    const transactionData = {
      checkoutRequestId: checkoutRequestID,
      resultCode,
      resultDesc,
      status: "",
      amount: null,
      mpesaReceiptNumber: null,
      phoneNumber: null,
      timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
    };

    switch (resultCode) {
      case 0:
        transactionData.status = "successful";
        callback.CallbackMetadata.Item.forEach((item) => {
          if (item.Name === "Amount") transactionData.amount = item.Value;
          if (item.Name === "MpesaReceiptNumber") transactionData.mpesaReceiptNumber = item.Value;
          if (item.Name === "PhoneNumber") transactionData.phoneNumber = item.Value;
        });

        // ✅ Mark order as paid
        await Order.findByIdAndUpdate(pending.orderId, {
          "payment.status": "paid",
          "payment.reference": transactionData.mpesaReceiptNumber,
          status: "confirmed",
          $push: {
            statusHistory: {
              status: "paid",
              changedAt: new Date(),
              changedBy: pending.userId || null,
            },
          },
        });

        break;

      case 1032:
        transactionData.status = "cancelled";
        break;

      case 1:
        transactionData.status = "failed";
        transactionData.resultDesc = "Insufficient funds";
        break;

      case 1037:
        transactionData.status = "timeout";
        break;

      case 2001:
        transactionData.status = "failed";
        transactionData.resultDesc = "Wrong PIN entered";
        break;

      default:
        transactionData.status = "failed";
    }

    // 💾 Record transaction safely
    const newTransaction = new Transaction({
      type: "order_payment",
      direction: "credit",
      amount: transactionData.amount || pending.amount,
      currency: "KES",
      status: transactionData.status,
      referenceCode: transactionData.mpesaReceiptNumber || checkoutRequestID,
      description: "M-Pesa STK Push Payment",
      mpesaReceiptNumber: transactionData.mpesaReceiptNumber,
      checkoutRequestId: checkoutRequestID,
      phoneNumber: transactionData.phoneNumber || pending.phone,
      resultCode: transactionData.resultCode,
      resultDesc: transactionData.resultDesc,
      metadata: transactionData,
      processedAt: new Date(),
      orderId: pending.orderId,
      // ✅ No ObjectId cast error anymore
      userId: mongoose.Types.ObjectId.isValid(pending.userId)
        ? pending.userId
        : undefined,
    });

    await newTransaction.save();
    console.log("💾 Transaction saved:", newTransaction);

    // 🔔 Notify frontend via socket
    if (pending.socketId && io) {
      io.to(pending.socketId).emit("stkResult", {
        status: transactionData.status === "successful" ? "success" : transactionData.status,
        message: transactionData.resultDesc,
        orderId: pending.orderId,
      });
    }

    // 🧹 Clean up
    delete pendingTransactions[checkoutRequestID];

    res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Callback received successfully",
    });
  } catch (err) {
    console.error("❌ Error in STK Callback:", err.message);
    res.status(500).json({ error: "Error handling STK callback" });
  }
};
