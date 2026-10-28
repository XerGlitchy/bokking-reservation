
const express = require("express");
const Room = require("../models/room");
const Reservation = require("../models/reservation");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/stats
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const [
      totalRooms,
      totalReservations,
      pendingReservations,
      confirmedReservations,
      cancelledReservations
    ] = await Promise.all([
      Room.countDocuments(),
      Reservation.countDocuments(),
      Reservation.countDocuments({ status: "pending" }),
      Reservation.countDocuments({ status: "confirmed" }),
      Reservation.countDocuments({ status: "cancelled" })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalRooms,
        totalReservations,
        pendingReservations,
        confirmedReservations,
        cancelledReservations
      }
    });
  } catch (error) {
    console.error("GET admin stats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard statistics."
    });
  }
});

module.exports = router;
