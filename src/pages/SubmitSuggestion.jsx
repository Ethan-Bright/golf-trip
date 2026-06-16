import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import PageShell from "../components/layout/PageShell";

const defaultForm = {
  title: "",
  description: "",
  type: "feature",
  urgency: "nice-to-have",
};

const typeOptions = [
  { value: "feature", label: "Feature idea" },
  { value: "improvement", label: "Improve existing flow" },
  { value: "bug", label: "Bug or issue" },
  { value: "other", label: "Something else" },
];

const urgencyOptions = [
  { value: "nice-to-have", label: "Nice to have" },
  { value: "soon", label: "Needed soon" },
  { value: "urgent", label: "Blocking our trip" },
];

export default function SubmitSuggestion() {
  const { user } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: null, message: "" });
    if (!form.title.trim() || !form.description.trim()) {
      setFeedback({ type: "error", message: "Please fill out every field." });
      return;
    }
    setLoading(true);

    try {
      await addDoc(collection(db, "suggestions"), {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        userId: user?.uid ?? null,
        userName: user?.displayName ?? user?.email ?? "Anonymous",
        userEmail: user?.email ?? null,
        createdAt: serverTimestamp(),
      });
      setForm(defaultForm);
      setFeedback({
        type: "success",
        message: "Thanks! Your suggestion has been logged and will be reviewed soon.",
      });
    } catch (error) {
      console.error("Suggestion submission failed", error);
      setFeedback({
        type: "error",
        message: "Something went wrong saving your suggestion. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      eyebrow="Feedback"
      title="Submit a Suggestion"
      description="Tell us what would make Golf Trip Leaderboard better for your group."
    >
      <form onSubmit={handleSubmit} className="space-y-6 mobile-card p-6">
          <div>
            <label className="field-label">
              What should I call it?
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={120}
              placeholder="e.g. Live skins tracker or allow multi-day events"
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">
                Suggestion type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="select"
              >
                {typeOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">
                Urgency
              </label>
              <select
                name="urgency"
                value={form.urgency}
                onChange={handleChange}
                className="select"
              >
                {urgencyOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">
              Describe the idea or pain point
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              placeholder="Let me know what you would like me to add, why it matters, and any context I should know."
              className="textarea"
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              
            </p>
          </div>

          {feedback.message && (
            <div
              className={`p-4 rounded-2xl border ${
                feedback.type === "success"
                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-300 border-brand-500/40"
                  : "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/40"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent flex-1"
            >
              {loading ? "Sending..." : "Send Suggestion"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(defaultForm);
                setFeedback({ type: null, message: "" });
              }}
              className="btn btn-secondary"
            >
              Clear Form
            </button>
          </div>
      </form>
    </PageShell>
  );
}


