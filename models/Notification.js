const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who will receive the notification
  message: { type: String, required: true }, // Notification content
  type: { type: String, enum: ["Complaint", "Review", "System"], required: true }, // Type of notification
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: false }, // ID of related complaint/review
  isRead: { type: Boolean, default: false }, // Track if user has seen it
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;