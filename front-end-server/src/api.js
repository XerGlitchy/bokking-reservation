
import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Get all reservations; optionally search or filter
export const getReservations = (params = {}) =>
  api.get("/reservations", { params });

// Get one reservation
export const getReservation = (id) =>
  api.get(`/reservations/${id}`);

// Get rooms for reservation selection
export const getRooms = () =>
  api.get("/rooms");

// Add a reservation
export const createReservation = (data) =>
  api.post("/reservations", data);

// Edit/update a reservation
export const updateReservation = (id, data) =>
  api.put(`/reservations/${id}`, data);

// Delete a reservation
export const deleteReservation = (id) =>
  api.delete(`/reservations/${id}`);

// Ask the resort FAQ chatbot
export const askChatbot = (message, history = []) =>
  api.post("/chat", { message, history });

export default api;
