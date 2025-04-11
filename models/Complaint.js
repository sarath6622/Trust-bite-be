const mongoose = require('mongoose');

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
  image: { // New field for storing image information
    url: { type: String }, // Path to the image file
    filename: { type: String }
  }
});

const Complaint = mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;