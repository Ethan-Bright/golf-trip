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
      <form onSubmit={handleSubmit} className="space-y-6 mobile-card p-6 border border-yellow-100 dark:border-gray-700">
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              What should I call it?
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={120}
              placeholder="e.g. Live skins tracker or allow multi-day events"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Suggestion type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {typeOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Urgency
              </label>
              <select
                name="urgency"
                value={form.urgency}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Describe the idea or pain point
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              placeholder="Let me know what you would like me to add, why it matters, and any context I should know."
              className="w-full px-4 py-3 rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              
            </p>
          </div>

          {feedback.message && (
            <div
              className={`p-4 rounded-2xl ${
                feedback.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700"
                  : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-3xl bg-yellow-500 text-white font-semibold shadow-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Suggestion"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(defaultForm);
                setFeedback({ type: null, message: "" });
              }}
              className="px-6 py-3 rounded-3xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Clear Form
            </button>
          </div>
      </form>
    </PageShell>
  );
}


