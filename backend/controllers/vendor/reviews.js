// controllers/vendor/reviews.js
const Review = require("../../models/Review");
const Vendor = require("../../models/Vendor");

// 🟢 Add a review for a vendor (usually done by a customer)
exports.createReview = async (req, res) => {
  try {
    const { vendorId, rating, comment } = req.body;
    const customerId = req.user?._id || req.body.customer; // depending on auth middleware

    if (!vendorId || !rating) {
      return res.status(400).json({ message: "Vendor and rating are required" });
    }

    // Prevent duplicate reviews by same customer
    const existing = await Review.findOne({ vendor: vendorId, customer: customerId });
    if (existing) {
      return res.status(400).json({ message: "You already reviewed this vendor" });
    }

    const review = await Review.create({
      vendor: vendorId,
      customer: customerId,
      rating,
      comment,
    });

    // Update vendor’s average rating
    const allReviews = await Review.find({ vendor: vendorId });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Vendor.findByIdAndUpdate(vendorId, { averageRating: avgRating });

    res.status(201).json({ message: "Review added", review });
  } catch (err) {
    console.error("Create Review Error:", err);
    res.status(500).json({ message: "Failed to add review" });
  }
};

// 🟣 Get all reviews for a vendor
exports.getVendorReviews = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.params.vendorId;
    const reviews = await Review.find({ vendor: vendorId })
      .populate("customer", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (err) {
    console.error("Get Reviews Error:", err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

// 🟡 Update a review (customer editing their review)
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    await review.save();

    res.json({ message: "Review updated", review });
  } catch (err) {
    console.error("Update Review Error:", err);
    res.status(500).json({ message: "Failed to update review" });
  }
};

// 🔴 Delete review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    await review.remove();
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error("Delete Review Error:", err);
    res.status(500).json({ message: "Failed to delete review" });
  }
};
