import React from "react";
import { useEffect, useState } from "react";
import {
  Routes, Route, NavLink, Link, useNavigate, useParams
} from "react-router-dom";
import {
  Waves, LayoutDashboard, CalendarDays, MessageCircle,
  Plus, Search, Pencil, Trash2, Users, BedDouble,
  CircleDollarSign, Send, Sparkles, ArrowLeft
} from "lucide-react";

import {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  deleteReservation,
  getRooms,
  askChatbot,
  API_URL
} from "./api";

const emptyForm = {
  guestName: "",
  email: "",
  phone: "",
  roomId: "",
  accommodationType: "Cottage",
  checkIn: "",
  checkOut: "",
  guestCount: 2,
  totalPrice: 0,
  status: "pending",
  notes: ""
};

const peso = value =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const showDate = value =>
  value
    ? new Date(value).toLocaleDateString("en-PH")
    : "—";

function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <Waves size={28} />
          <div>
            <b>evergreen</b>
            <small>RESORT MANAGEMENT</small>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav>
          <NavLink to="/" end>
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink to="/reservations">
            <CalendarDays size={18} /> Reservations
          </NavLink>
          <NavLink to="/assistant">
            <MessageCircle size={18} /> AI Assistant
          </NavLink>
        </nav>

        <div className="sidebar-note">
          <Sparkles size={20} />
          <b>Need assistance?</b>
          <p>Ask the resort FAQ assistant a question.</p>
          <Link to="/assistant">Ask a question →</Link>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span>Evergreen Resort / Management</span>
          <span className="admin">ER &nbsp; Resort Admin</span>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/reservations"
              element={<Reservations />}
            />
            <Route
              path="/reservations/new"
              element={<ReservationForm />}
            />
            <Route
              path="/reservations/:id/edit"
              element={<ReservationForm />}
            />
            <Route path="/assistant" element={<Chatbot />} />
          </Routes>
        </main>

        <footer>© 2026 Evergreen Resort</footer>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data } = await getReservations();
      setRows(Array.isArray(data) ? data : data.data || []);
      setError("");
    } catch {
      setError(
        "Cannot connect to the backend. Check your server and API URL."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  const active = rows.filter(
    r => !["cancelled", "rejected", "completed"].includes(r.status)
  );

  const revenue = rows
    .filter(r => !["cancelled", "rejected"].includes(r.status))
    .reduce((sum, r) => sum + Number(r.totalPrice || 0), 0);

  return (
    <>
      <PageHeading
        eyebrow="RESORT OVERVIEW"
        title="Good day, Admin!"
        description="Here's what's happening with your resort."
      >
        <Link className="button primary" to="/reservations/new">
          <Plus size={17} /> New reservation
        </Link>
      </PageHeading>

      {error && <div className="alert">{error}</div>}

      <section className="hero">
        <div>
          <span>YOUR RESORT, AT A GLANCE</span>
          <h2>Make every stay<br />memorable.</h2>
          <p>Manage guest bookings in one convenient place.</p>
          <Link to="/reservations">Manage reservations →</Link>
        </div>
        <div className="hero-art">🌴</div>
      </section>

      <div className="section-heading">
        <h2>Booking snapshot</h2>
        <button className="button light" onClick={load}>
          Refresh data
        </button>
      </div>

      <div className="stats">
        <Stat
          icon={<CalendarDays />}
          label="Total reservations"
          value={rows.length}
        />
        <Stat
          icon={<Users />}
          label="Active bookings"
          value={active.length}
        />
        <Stat
          icon={<BedDouble />}
          label="Confirmed stays"
          value={rows.filter(r => r.status === "confirmed").length}
        />
        <Stat
          icon={<CircleDollarSign />}
          label="Recorded revenue"
          value={peso(revenue)}
        />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent reservations</h2>
            <p>Latest guest bookings from your database</p>
          </div>
          <Link to="/reservations">View all →</Link>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <CalendarDays size={30} />
            <h3>No reservations yet</h3>
            <p>Create your first guest reservation.</p>
            <Link className="button primary" to="/reservations/new">
              Add reservation
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>GUEST</th>
                  <th>CHECK-IN</th>
                  <th>CHECK-OUT</th>
                  <th>STATUS</th>
                  <th>PRICE</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map(r => (
                  <tr key={r._id}>
                    <td>{r.guestName}</td>
                    <td>{showDate(r.checkIn)}</td>
                    <td>{showDate(r.checkOut)}</td>
                    <td><Status value={r.status} /></td>
                    <td>{peso(r.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ icon, label, value }) {
  return (
    <article className="stat">
      <div className="stat-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function Status({ value }) {
  const status = value || "Pending";
  return (
    <span className={
      "status status-" + status.toLowerCase().replaceAll(" ", "-")
    }>
      {status}
    </span>
  );
}

function Reservations() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data } = await getReservations({
        ...(search ? { search } : {}),
        ...(status ? { status } : {})
      });
      setRows(Array.isArray(data) ? data : data.data || []);
      setError("");
    } catch {
      setError("Unable to load bookings. Check your backend routes.");
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search, status]);

  async function remove(r) {
    if (!window.confirm(`Delete booking for ${r.guestName}?`)) {
      return;
    }

    try {
      await deleteReservation(r._id);
      await load();
    } catch {
      setError("Delete failed. Check your DELETE route.");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="BOOKING MANAGEMENT"
        title="Reservations"
        description="Search, review, and manage guest stays."
      >
        <Link className="button primary" to="/reservations/new">
          <Plus size={17} /> Add booking
        </Link>
      </PageHeading>

      {error && <div className="alert">{error}</div>}

      <section className="panel">
        <div className="filters">
          <div className="searchbox">
            <Search size={18} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search guest name or reference..."
            />
          </div>

          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            { ["pending", "confirmed", "cancelled", "rejected", "completed"].map(s => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>GUEST</th>
                <th>ACCOMMODATION</th>
                <th>CHECK-IN / OUT</th>
                <th>GUESTS</th>
                <th>STATUS</th>
                <th>PRICE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id}>
                  <td>
                    <b>{r.guestName}</b>
                    <small>{r.email || r.phone || "—"}</small>
                  </td>
                  <td>{r.accommodationType || "—"}</td>
                  <td>
                    {showDate(r.checkIn)}
                    <small>{showDate(r.checkOut)}</small>
                  </td>
                  <td>{r.guestCount ?? "—"}</td>
                  <td><Status value={r.status} /></td>
                  <td>{peso(r.totalPrice)}</td>
                  <td>
                    <div className="row-actions">
                      <Link
                        title="Edit booking"
                        to={`/reservations/${r._id}/edit`}
                      >
                        <Pencil size={17} />
                      </Link>
                      <button
                        title="Delete booking"
                        onClick={() => remove(r)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="empty">
            <p>No matching reservations found.</p>
          </div>
        )}
      </section>
    </>
  );
}

function ReservationForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    getRooms()
      .then(({ data }) => setRooms(data.data || []))
      .catch(() => setError("Could not load rooms. Check your room inventory."));
  }, []);

  const selectedRoom = rooms.find(room => room._id === String(form.roomId));
  const nights = form.checkIn && form.checkOut
    ? Math.max(0, Math.ceil(
      (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) /
      (24 * 60 * 60 * 1000)
    ))
    : 0;
  const estimatedTotal = selectedRoom ? nights * selectedRoom.price : Number(form.totalPrice) || 0;

  useEffect(() => {
    if (!editing) return;

    getReservation(id)
      .then(({ data }) => {
        const r = data.data || data;
        setForm({
          ...emptyForm,
          ...r,
          roomId: typeof r.roomId === "object" ? r.roomId?._id : r.roomId,
          checkIn: r.checkIn?.slice(0, 10) || "",
          checkOut: r.checkOut?.slice(0, 10) || ""
        });
      })
      .catch(() => setError("Could not load this reservation."));
  }, [id, editing]);

  function change(e) {
    setForm(old => ({
      ...old,
      [e.target.name]: e.target.value
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (form.checkOut <= form.checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }

    setSaving(true);

    const data = {
      ...form,
      guestCount: Number(form.guestCount)
    };

    ["_id", "__v", "createdAt", "updatedAt"].forEach(
      key => delete data[key]
    );

    try {
      if (editing) {
        await updateReservation(id, data);
      } else {
        await createReservation(data);
      }
      navigate("/reservations");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.request
          ? `No response from ${API_URL}. Check that the backend is running and the API URL is correct.`
          : err.message || "Could not save this booking.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link className="back-link" to="/reservations">
        <ArrowLeft size={17} /> Back to reservations
      </Link>

      <PageHeading
        eyebrow="BOOKING DETAILS"
        title={editing ? "Edit reservation" : "New reservation"}
        description="Enter the guest's information and stay details."
      />

      {error && <div className="alert">{error}</div>}

      <form className="panel reservation-form" onSubmit={submit}>
        <h2>Guest information</h2>

        <div className="form-grid">
          <label>
            Guest full name *
            <input
              name="guestName"
              value={form.guestName}
              onChange={change}
              required
            />
          </label>

          <label>
            Email address *
            <input
              name="email"
              type="email"
              value={form.email || ""}
              onChange={change}
              required
            />
          </label>

          <label>
            Phone number *
            <input
              name="phone"
              value={form.phone || ""}
              onChange={change}
              required
            />
          </label>

          {rooms.length > 0 ? (
            <label>
              Room *
              <select
                name="roomId"
                value={form.roomId || ""}
                onChange={change}
                required
              >
                <option value="">Select a room</option>
                {rooms.map(room => (
                  <option key={room._id} value={room._id} disabled={!room.available}>
                    {room.name} ({room.type}) - {peso(room.price)} / night
                    {!room.available ? " - unavailable" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Accommodation *
              <select
                name="accommodationType"
                value={form.accommodationType}
                onChange={change}
                required
              >
                {["Cottage", "Standard Room", "Deluxe Room", "Villa", "Family Room"].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            Check-in date *
            <input
              type="date"
              name="checkIn"
              value={form.checkIn}
              onChange={change}
              required
            />
          </label>

          <label>
            Check-out date *
            <input
              type="date"
              name="checkOut"
              min={form.checkIn || undefined}
              value={form.checkOut}
              onChange={change}
              required
            />
          </label>

          <label>
            Number of guests *
            <input
              type="number"
              name="guestCount"
              min="1"
              value={form.guestCount}
              onChange={change}
              required
            />
          </label>

          <label>
            {selectedRoom ? "Estimated total (PHP)" : "Total price (PHP) *"}
            <input
              type="number"
              name="totalPrice"
              min="0"
              value={selectedRoom ? estimatedTotal : form.totalPrice}
              onChange={selectedRoom ? undefined : change}
              readOnly={Boolean(selectedRoom)}
              required={!selectedRoom}
            />
          </label>

          <label>
            Booking status
            <select
              name="status"
              value={form.status}
              onChange={change}
            >
              { ["pending", "confirmed", "cancelled", "rejected", "completed"].map(s => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </label>

          <label className="wide">
            Additional notes
            <textarea
              name="notes"
              rows="3"
              value={form.notes || ""}
              onChange={change}
              placeholder="Special requests or other information"
            />
          </label>
        </div>

        <div className="form-actions">
          <Link className="button light" to="/reservations">
            Cancel
          </Link>
          <button
            className="button primary"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : editing ? "Update booking" : "Save booking"}
          </button>
        </div>
      </form>
    </>
  );
}

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! Welcome to Evergreen Resort. What would you like to know about our resort?"
    }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send(e) {
    e.preventDefault();
    const message = input.trim();

    if (!message || sending) return;

    const history = messages.slice(-8);
    setMessages(old => [...old, { role: "user", content: message }]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const { data } = await askChatbot(message, history);
      setMessages(old => [
        ...old,
        {
          role: "assistant",
          content: data.reply || data.answer ||
            "I couldn't find an answer. Please contact resort staff."
        }
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "The chatbot could not reach the backend. Check that the server is running."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="GUEST SUPPORT"
        title="Resort AI Assistant"
        description="Answer common questions about your resort."
      />

      <section className="panel chat-panel">
        <div className="chat-title">
          <div className="stat-icon"><Sparkles /></div>
          <div>
            <b>Evergreen Assistant</b>
            <small>Powered by your backend AI integration</small>
          </div>
        </div>

        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <b>{m.role === "user" ? "You" : "Resort Assistant"}</b>
              <p>{m.content}</p>
            </div>
          ))}
          {sending && <p className="muted">Assistant is responding...</p>}
        </div>

        {error && <div className="alert">{error}</div>}

        <form className="chat-input" onSubmit={send}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about check-in, amenities, or policies..."
            disabled={sending}
          />
          <button
            className="button primary"
            type="submit"
            disabled={sending || !input.trim()}
          >
            <Send size={17} /> Send
          </button>
        </form>
        <p className="muted">
          For booking changes or sensitive account information, contact resort staff.
        </p>
      </section>
    </>
  );
}

function App() {
  return <Layout />;
}

export default App;
