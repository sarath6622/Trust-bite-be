const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who submitted
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true }, // Which restaurant
  message: { type: String, required: true }, // Complaint message
  status: {
    type: String,
    enum: ["Submitted", "Acknowledged", "Action Taken", "Resolved"],
    default: "Submitted",
  },
  remark: { type: String, default: "" }, // ✅ Stores remarks when status is updated
  createdAt: { type: Date, default: Date.now },
});

const Complaint = mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;