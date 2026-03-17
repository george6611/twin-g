// Mock data can be replaced with real DB queries
exports.getAllOrders = async (req, res) => {
  try {
    // Fetch orders for this vendor
    const orders = [
      /* Example order objects */
    ];
    res.status(200).json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

exports.getStockAnalytics = async (req, res) => {
  try {
    const stockData = {
      inStock: 120,
      outOfStock: 5,
      sold: 80,
      returned: 2,
    };
    res.status(200).json(stockData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stock analytics" });
  }
};

exports.getCustomerAnalytics = async (req, res) => {
  try {
    const customerData = {
      active: 45,
      visits: 120,
    };
    res.status(200).json(customerData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customer analytics" });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const revenueData = {
      daily: 1200,
      weekly: 7500,
      monthly: 30000,
    };
    res.status(200).json(revenueData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch revenue analytics" });
  }
};

exports.getCustomerReviews = async (req, res) => {
  try {
    const reviews = [
      { id: "1", customer: "Alice", text: "Great service!", rating: 5 },
      { id: "2", customer: "Bob", text: "Fast delivery", rating: 4 },
    ];
    res.status(200).json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customer reviews" });
  }
};
