const Room = require("../models/room");
const { randomBytes } = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const Reservation = require("../models/reservation");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();


const allowedStatuses = [
  "pending",
  "confirmed",
  "cancelled",
  "rejected",
  "completed"
];

function getBookingDates(checkInValue, checkOutValue) {
  const checkIn = new Date(checkInValue);
  const checkOut = new Date(checkOutValue);

  if (
    !checkInValue ||
    !checkOutValue ||
    Number.isNaN(checkIn.getTime()) ||
    Number.isNaN(checkOut.getTime()) ||
    checkOut <= checkIn
  ) {
    return null;
  }

  return { checkIn, checkOut };
}

async function calculateBooking(roomId, checkIn, checkOut, guestCount, excludeId) {
  if (!mongoose.isValidObjectId(roomId)) {
    return { error: "Invalid room ID." };
  }

  const room = await Room.findById(roomId);

  if (!room || !room.available) {
    return { error: "The selected room is unavailable." };
  }

  if (
    !Number.isInteger(Number(guestCount)) ||
    Number(guestCount) < 1 ||
    Number(guestCount) > room.capacity
  ) {
    return {
      error: `Guest count must be between 1 and ${room.capacity}.`
    };
  }

  const overlapFilter = {
    roomId: room._id,
    status: { $nin: ["cancelled", "rejected"] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn }
  };

  if (excludeId) {
    overlapFilter._id = { $ne: excludeId };
  }

  const conflict = await Reservation.exists(overlapFilter);

  if (conflict) {
    return {
      error: "This room is already booked for the selected dates."
    };
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / millisecondsPerDay
  );

  return {
    room,
    guestCount: Number(guestCount),
    totalPrice: nights * room.price
  };
}

function serializeReservation(reservation) {
  const data = reservation.toObject ? reservation.toObject() : reservation;
  const room = data.roomId && typeof data.roomId === "object"
    ? data.roomId
    : null;

  return {
    ...data,
    accommodationType: room?.type || room?.name || data.accommodationType || "—",
    roomName: room?.name || ""
  };
}

function normalizeStatus(status) {
  return String(status || "pending").trim().toLowerCase();
}

router.get("/", async (req, res) => {
  try {
    const filter = {};
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { guestName: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { bookingReference: { $regex: safeSearch, $options: "i" } }
      ];
    }

    if (status) {
      filter.status = normalizeStatus(status);
    }

    const reservations = await Reservation.find(filter)
      .populate("roomId", "name type")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations.map(serializeReservation)
    });
  } catch (error) {
    console.error("GET reservations error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reservations."
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reservation ID." });
    }

    const reservation = await Reservation.findById(req.params.id)
      .populate("roomId", "name type")
      .lean();

    if (!reservation) {
      return res.status(404).json({ success: false, message: "Reservation not found." });
    }

    return res.status(200).json({
      success: true,
      data: serializeReservation(reservation)
    });
  } catch (error) {
    console.error("GET reservation error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reservation."
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      guestName,
      email,
      phone,
      roomId,
      accommodationType,
      guestCount,
      totalPrice,
      notes
    } = req.body;
    const dates = getBookingDates(req.body.checkIn, req.body.checkOut);
    const status = normalizeStatus(req.body.status);

    if (!guestName?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Guest name, email, and phone are required."
      });
    }

    if (!dates) {
      return res.status(400).json({
        success: false,
        message: "Check-out must be after a valid check-in date."
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid reservation status." });
    }

    let booking;
    if (roomId) {
      booking = await calculateBooking(
        roomId,
        dates.checkIn,
        dates.checkOut,
        guestCount
      );

      if (booking.error) {
        return res.status(400).json({ success: false, message: booking.error });
      }
    } else {
      const price = Number(totalPrice);
      if (!accommodationType?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Choose an accommodation type."
        });
      }
      if (!Number.isInteger(Number(guestCount)) || Number(guestCount) < 1) {
        return res.status(400).json({
          success: false,
          message: "Guest count must be at least 1."
        });
      }
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid non-negative total price."
        });
      }
      booking = {
        room: null,
        guestCount: Number(guestCount),
        totalPrice: price
      };
    }

    const reservation = await Reservation.create({
      bookingReference: `ER-${randomBytes(4).toString("hex").toUpperCase()}`,
      guestName,
      email,
      phone,
      roomId: booking.room?._id || null,
      accommodationType: booking.room?.type || booking.room?.name || accommodationType,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      guestCount: booking.guestCount,
      totalPrice: booking.totalPrice,
      status,
      notes: notes || ""
    });

    await reservation.populate("roomId", "name type");
    return res.status(201).json({
      success: true,
      message: "Reservation created successfully.",
      data: serializeReservation(reservation)
    });
  } catch (error) {
    console.error("POST reservation error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to save reservation."
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reservation ID." });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: "Reservation not found." });
    }

    const body = req.body;
    const guestName = body.guestName ?? reservation.guestName;
    const email = body.email ?? reservation.email;
    const phone = body.phone ?? reservation.phone;
    const dates = getBookingDates(
      body.checkIn ?? reservation.checkIn,
      body.checkOut ?? reservation.checkOut
    );
    const status = normalizeStatus(body.status ?? reservation.status);

    if (!guestName?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Guest name, email, and phone are required."
      });
    }

    if (!dates) {
      return res.status(400).json({
        success: false,
        message: "Check-out must be after a valid check-in date."
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid reservation status." });
    }

    const roomId = body.roomId ?? reservation.roomId;
    let booking;
    if (roomId) {
      booking = await calculateBooking(
        roomId,
        dates.checkIn,
        dates.checkOut,
        body.guestCount ?? reservation.guestCount,
        reservation._id
      );

      if (booking.error) {
        return res.status(400).json({ success: false, message: booking.error });
      }
    } else {
      const price = Number(body.totalPrice ?? reservation.totalPrice);
      const type = body.accommodationType ?? reservation.accommodationType;
      const count = Number(body.guestCount ?? reservation.guestCount);
      if (!type?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Choose an accommodation type."
        });
      }
      if (!Number.isInteger(count) || count < 1) {
        return res.status(400).json({
          success: false,
          message: "Guest count must be at least 1."
        });
      }
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid non-negative total price."
        });
      }
      booking = { room: null, guestCount: count, totalPrice: price };
    }

    reservation.set({
      guestName,
      email,
      phone,
      roomId: booking.room?._id || null,
      accommodationType: booking.room?.type || booking.room?.name || body.accommodationType || reservation.accommodationType,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      guestCount: booking.guestCount,
      totalPrice: booking.totalPrice,
      status,
      notes: body.notes ?? reservation.notes
    });

    await reservation.save();
    await reservation.populate("roomId", "name type");
    return res.status(200).json({
      success: true,
      message: "Reservation updated successfully.",
      data: serializeReservation(reservation)
    });
  } catch (error) {
    console.error("PUT reservation error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update reservation."
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reservation ID." });
    }

    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: "Reservation not found." });
    }

    return res.status(200).json({ success: true, message: "Reservation deleted." });
  } catch (error) {
    console.error("DELETE reservation error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete reservation."
    });
  }
});

module.exports = router;
