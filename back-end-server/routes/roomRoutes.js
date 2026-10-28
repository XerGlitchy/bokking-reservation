
const express = require("express");
const mongoose = require("mongoose");
const Room = require("../models/room");
const Reservation = require("../models/reservation");

const router = express.Router();

// GET /api/rooms
// Examples:
// /api/rooms?search=deluxe
// /api/rooms?type=Villa&guests=4&maxPrice=3000
// /api/rooms?checkIn=2026-11-01&checkOut=2026-11-03

router.get("/", async (req, res) => {
  try {
    const {
      search,
      type,
      guests,
      maxPrice,
      checkIn,
      checkOut,
      availableOnly
    } = req.query;

    const filter = {};

    if (search) {
      const safeSearch = String(search).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.name = { $regex: safeSearch, $options: "i" };
    }

    if (type) {
      filter.type = type;
    }

    if (guests !== undefined) {
      const count = Number(guests);

      if (!Number.isInteger(count) || count < 1) {
        return res.status(400).json({
          success: false,
          message: "Guests must be a positive integer."
        });
      }

      filter.capacity = { $gte: count };
    }

    if (maxPrice !== undefined) {
      const price = Number(maxPrice);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "maxPrice must be a valid non-negative number."
        });
      }

      filter.price = { $lte: price };
    }

    let rooms = await Room.find(filter).lean();

    if (availableOnly === "true" && (!checkIn || !checkOut)) {
      return res.status(400).json({
        success: false,
        message: "Provide checkIn and checkOut to check availability."
      });
    }

    if (checkIn || checkOut) {
      if (!checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: "Both checkIn and checkOut are required."
        });
      }

      const start = new Date(checkIn);
      const end = new Date(checkOut);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid dates. Check-out must be after check-in."
        });
      }

      // Find reservations that overlap the requested dates.
      const conflicts = await Reservation.find({
        checkIn: { $lt: end },
        checkOut: { $gt: start },
        status: { $nin: ["cancelled", "rejected"] }
      }).select("roomId").lean();

      const bookedIds = new Set(
        conflicts.map(item => String(item.roomId))
      );

      rooms = rooms.map(room => ({
        ...room,
        available: !bookedIds.has(String(room._id))
      }));

      if (availableOnly === "true") {
        rooms = rooms.filter(room => room.available);
      }
    }

    return res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error("GET rooms error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve rooms."
    });
  }
});

// GET /api/rooms/:id
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID."
      });
    }

    const room = await Room.findById(req.params.id).lean();

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error("GET room error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve room."
    });
  }
});

module.exports = router;
