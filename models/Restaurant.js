const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const complaintSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ["Submitted", "Acknowledged", "Action Taken", "Resolved"],
    default: "Submitted",
  },
  remark: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  
  // ✅ New Field: Activity Log
  activityLog: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: { type: String },
      remark: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  contact: { type: String, required: true },
  cuisineType: { type: String, required: true },
  description: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Linked to RestaurantOwner
  reviews: [reviewSchema], // Array of reviews
  complaints: [complaintSchema], // Array of complaints
  avgRating: { type: Number, default: 0, min: 0, max: 5 }, // Auto-calculated
  createdAt: { type: Date, default: Date.now }
});

// Function to update avgRating whenever a new review is added
restaurantSchema.methods.updateAverageRating = function () {
  if (this.reviews.length === 0) {
    this.avgRating = 0;
  } else {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.avgRating = totalRating / this.reviews.length;
  }
  return this.save();
};

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

module.exports = Restaurant;