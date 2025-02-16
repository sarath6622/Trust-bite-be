const express = require('express');
const Restaurant = require('../models/Restaurant');
const authMiddleware = require('../middleware/auth'); // For JWT Authentication
const verifyRole = require('../middleware/role');
const router = express.Router();

module.exports = (io) => {
  const router = express.Router();

  // 🔹 Get all restaurants (Public)
router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/complaints", (req, res) => {
  const complaint = req.body;

  // Save to database...
  
  io.emit("newComplaint", { message: "New complaint submitted!" });

  res.status(201).json({ success: true });
});

router.put("/complaints/:id", (req, res) => {
  const { id } = req.params;
  const updatedStatus = req.body.status;

  // Update complaint in database...

  io.emit("complaintUpdated", { message: `Complaint ${id} status changed to ${updatedStatus}` });

  res.status(200).json({ success: true });
});

// 🔹 Register a new restaurant (Only RestaurantOwners)
router.post('/register', authMiddleware, verifyRole(['RestaurantOwner', 'Admin']), async (req, res) => {
  try {
    const { name, address, contact, cuisineType, description } = req.body;

    if (!name || !address || !contact || !cuisineType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newRestaurant = new Restaurant({
      name,
      address,
      contact,
      cuisineType,
      description,
      owner: req.user.id, // Associate restaurant with the logged-in owner (RestaurantOwner or Admin)
    });

    await newRestaurant.save();
    res.status(201).json({ message: 'Restaurant registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// 🔹 Get a specific restaurant (Public)
router.get('/id/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔹 Get all reviews submitted by the logged-in user
router.get("/my-reviews", authMiddleware, async (req, res) => {
  try {
    // Find restaurants where the user has submitted a review
    const restaurants = await Restaurant.find({ "reviews.user": req.user.id })
      .populate("reviews.user", "email") // Populate user email
      .select("name reviews"); // Select only necessary fields

    if (!restaurants || restaurants.length === 0) {
      return res.status(404).json({ message: "No reviews found for this user." });
    }

    // Extract only the user's reviews from each restaurant
    const userReviews = restaurants.flatMap((restaurant) =>
      restaurant.reviews
        .filter((review) => review.user._id.toString() === req.user.id)
        .map((review) => ({
          _id: review._id,
          restaurant: {
            _id: restaurant._id,
            name: restaurant.name,
          },
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
        }))
    );

    res.json({ reviews: userReviews });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Get all complaints submitted by the logged-in user
router.get("/my-complaints", authMiddleware, async (req, res) => {
  try {
    console.log("🔍 Logged-in User ID:", req.user.id);

    const restaurants = await Restaurant.find({ "complaints.user": req.user.id })
      .populate("complaints.user", "email")
      .select("name complaints");

    console.log("📌 Restaurants found:", JSON.stringify(restaurants, null, 2));

    if (!restaurants || restaurants.length === 0) {
      return res.status(404).json({ message: "No complaints found for this user." });
    }

    const userComplaints = restaurants.flatMap((restaurant) =>
      restaurant.complaints
        .filter((complaint) => {
          console.log(
            "🔎 Comparing Complaint User ID:",
            complaint.user._id.toString(),
            "| Request User ID:",
            req.user.id
          );
          return complaint.user._id.toString() === req.user.id; // ✅ FIX: Compare `_id.toString()`
        })
        .map((complaint) => ({
          _id: complaint._id,
          restaurant: {
            _id: restaurant._id,
            name: restaurant.name,
          },
          message: complaint.message,
          status: complaint.status,
          createdAt: complaint.createdAt,
        }))
    );

    console.log("✅ User complaints:", JSON.stringify(userComplaints, null, 2));

    res.json({ complaints: userComplaints });
  } catch (error) {
    console.error("❌ Error fetching complaints:", error.message, error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 🔹 Submit a complaint about a restaurant (Only authenticated users)
const Notification = require("../models/Notification");

router.post("/:id/complaint", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const restaurantId = req.params.id;

    if (!message) {
      return res.status(400).json({ message: "Complaint message is required" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // ✅ Create complaint
    const newComplaint = {
      user: req.user.id,
      restaurant: restaurantId,
      message,
      status: "Submitted",
      activityLog: [
        {
          user: req.user.id,
          status: "Submitted",
          remark: "Complaint submitted.",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
    };

    restaurant.complaints.push(newComplaint);
    await restaurant.save();

    // ✅ Create Notification for the restaurant owner
    const notification = new Notification({
      user: restaurant.owner, // Notify restaurant owner
      message: `New complaint submitted for ${restaurant.name}`,
      type: "Complaint",
      referenceId: restaurantId,
    });

    await notification.save(); // Save notification

    res.status(201).json({ message: "Complaint submitted successfully", complaint: newComplaint });
  } catch (error) {
    console.error("❌ Error submitting complaint:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// 🔹 Check if restaurant owner has any restaurants registered
router.get("/owner", authMiddleware, async (req, res) => {
  try {

    console.log("Restaurant Found: ");
    
    if (req.user.role !== "RestaurantOwner") {
      return res.status(403).json({ message: "Access denied. Only Restaurant Owners can access this." });
    }

    const restaurant = await Restaurant.findOne({ owner: req.user.id });

    console.log("Restaurant Found: ", restaurant);

    res.json({ restaurant: restaurant || null });
  } catch (error) {
    console.error("Error in /owner route:", error.stack); // Logs full stack trace
    res.status(500).json({ message: "Error fetching restaurant details", error: error.message });
  }
});

// 🔹 Update restaurant details (Only Owner)
router.put('/manage/:id', authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    // Ensure only the owner can update the restaurant
    if (restaurant.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { name, address, contact, cuisineType, description } = req.body;
    restaurant.name = name || restaurant.name;
    restaurant.address = address || restaurant.address;
    restaurant.contact = contact || restaurant.contact;
    restaurant.cuisineType = cuisineType || restaurant.cuisineType;
    restaurant.description = description || restaurant.description;

    await restaurant.save();
    res.json({ message: 'Restaurant updated successfully', restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔹 Delete a restaurant (Only Owner/Admin)
router.delete('/manage/:id', authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    if (restaurant.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await restaurant.deleteOne();
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get("/:id/reviews", async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate("reviews.user", "email"); // Populate user email

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({ reviews: restaurant.reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/review", authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Add review
    const newReview = {
      user: req.user.id,
      rating,
      comment,
    };

    restaurant.reviews.push(newReview);
    
    // Update average rating
    await restaurant.updateAverageRating();

    res.status(201).json({ message: "Review added successfully", restaurant });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Get all complaints for a specific restaurant
router.get("/:id/complaints", authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate("complaints.user", "email"); // Ensure user is populated

    if (!restaurant) {
      console.log("❌ Restaurant not found for complaints.");
      return res.status(404).json({ message: "Restaurant not found" });
    }

    console.log("📌 Complaints Found:", JSON.stringify(restaurant.complaints, null, 2));
    res.json({ complaints: restaurant.complaints || [] }); // Ensure empty array if null
  } catch (error) {
    console.error("❌ Error fetching complaints:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// 🔹 Get a specific complaint by ID
router.get("/complaint/:complaintId", authMiddleware, async (req, res) => {
  try {
    const { complaintId } = req.params;

    // Search for the complaint inside any restaurant
    const restaurant = await Restaurant.findOne({ "complaints._id": complaintId })
      .populate("complaints.user", "email")
      .select("name complaints");

    if (!restaurant) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Find the specific complaint from the restaurant's complaints array
    const complaint = restaurant.complaints.find(
      (comp) => comp._id.toString() === complaintId
    );

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Attach restaurant details to complaint response
    const complaintData = {
      ...complaint.toObject(),
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
      },
    };

    res.json(complaintData);
  } catch (error) {
    console.error("❌ Error fetching complaint:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 🔹 Update complaint status (Only Admins or FoodSafetyOfficer)
// 🔹 Update complaint status (Only FoodSafetyOfficer)
router.put("/complaint/:id/status", authMiddleware, verifyRole(["FoodSafetyOfficeUser"]), async (req, res) => {
  try {
    const { status, remark } = req.body;
    const complaintId = req.params.id;
    const userId = req.user.id;

    // 🔍 Find the restaurant containing the complaint
    const restaurant = await Restaurant.findOne({ "complaints._id": complaintId });

    if (!restaurant) return res.status(404).json({ message: "Complaint not found" });

    // 🔎 Find complaint
    const complaint = restaurant.complaints.find(comp => comp._id.toString() === complaintId);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    // 🔥 Ensure `restaurant` field is set
    complaint.restaurant = restaurant._id;

    // 🔥 Prevent backward status movement
    const statusOrder = ["Submitted", "Acknowledged", "Action Taken", "Resolved"];
    if (statusOrder.indexOf(status) < statusOrder.indexOf(complaint.status)) {
      return res.status(400).json({ message: "Cannot move status backward." });
    }

    // 🔹 Ensure remarks are required for "Action Taken" and "Resolved"
    if ((status === "Action Taken" || status === "Resolved") && !remark?.trim()) {
      return res.status(400).json({ message: "Remark is required for this status update." });
    }

    // ✅ Update status and add activity log
    complaint.status = status;
    complaint.remark = remark;
    complaint.activityLog.push({ user: userId, status, remark, timestamp: new Date() });

    await restaurant.save();

    res.json({ message: "Complaint status updated successfully", complaint });
  } catch (error) {
    console.error("❌ Server Error Updating Complaint:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// 🔹 Get all complaints (Only Admins & FoodSafetyOfficer)
router.get("/all-complaints", authMiddleware, verifyRole(["Admin", "FoodSafetyOfficeUser"]), async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate("complaints.user", "email").select("name complaints");

    const allComplaints = restaurants.flatMap((restaurant) =>
      restaurant.complaints.map((complaint) => ({
        _id: complaint._id,
        restaurant: { _id: restaurant._id, name: restaurant.name },
        user: complaint.user.email,
        message: complaint.message,
        status: complaint.status,
        createdAt: complaint.createdAt,
      }))
    );

    res.json({ complaints: allComplaints });
  } catch (error) {
    console.error("❌ Error fetching complaints:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/notifications", authMiddleware, async (req, res) => {
  try {
    let notifications;
    
    if (req.user.role === "Admin") {
      // Admin can view all notifications
      notifications = await Notification.find().sort({ createdAt: -1 });
      console.log(notifications);

    } else {
      // Regular users can only see their own notifications
      notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    }

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Server error" });
  }
});

  return router; // Ensure the router is returned
};