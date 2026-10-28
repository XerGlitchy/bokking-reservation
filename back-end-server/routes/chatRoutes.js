const express = require("express");

const router = express.Router();
const maxMessageLength = 2000;
const systemPrompt = [
  "You are the Evergreen Resort guest assistant. Be helpful and concise.",
  "Only state resort details when they are provided in the conversation or verified context.",
  "Do not invent prices, amenities, check-in times, cancellation policies, or booking availability.",
  "For reservation changes or sensitive account information, direct guests to resort staff."
].join(" ");

router.post("/", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: "The chatbot API key is not configured on the backend."
    });
  }

  const message = typeof req.body.message === "string"
    ? req.body.message.trim()
    : "";

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Enter a message to chat with the assistant."
    });
  }

  if (message.length > maxMessageLength) {
    return res.status(400).json({
      success: false,
      message: `Messages must be ${maxMessageLength} characters or fewer.`
    });
  }

  const history = Array.isArray(req.body.history)
    ? req.body.history
      .filter(item =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string"
      )
      .slice(-8)
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, maxMessageLength)
      }))
    : [];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Evergreen Resort Assistant"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: message }
        ],
        max_tokens: 500
      }),
      signal: AbortSignal.timeout(30000)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenRouter chat request failed:", response.status);
      return res.status(502).json({
        success: false,
        message: "The AI provider rejected the request. Check the OpenRouter key and model configuration."
      });
    }

    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        success: false,
        message: "The AI provider returned an empty response."
      });
    }

    return res.status(200).json({
      success: true,
      reply: reply.trim()
    });
  } catch (error) {
    console.error("OpenRouter connection error:", error.name);
    return res.status(error.name === "TimeoutError" ? 504 : 502).json({
      success: false,
      message: error.name === "TimeoutError"
        ? "The AI provider took too long to respond. Please try again."
        : "Could not connect to the AI provider. Check the backend network connection."
    });
  }
});

module.exports = router;