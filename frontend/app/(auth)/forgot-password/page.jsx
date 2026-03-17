"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError("");
		setMessage("");
		setLoading(true);

		try {
			const response = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || "Unable to send reset link");
			}

			setMessage(data?.message || "If that email exists, a reset link has been sent.");
		} catch (submitError) {
			setError(submitError.message || "Failed to process request");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white px-6 py-12">
			<div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
				<h1 className="text-2xl font-bold text-orange-600 text-center">Forgot Password</h1>
				<p className="text-sm text-gray-600 text-center mt-2">
					Enter your account email and we&apos;ll send password reset instructions.
				</p>

				{error ? (
					<div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
						{error}
					</div>
				) : null}

				{message ? (
					<div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
						{message}
					</div>
				) : null}

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<input
						type="email"
						name="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
						placeholder="Email address"
						className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
					/>
					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 px-4 rounded-lg text-white font-semibold bg-orange-600 hover:bg-orange-700 disabled:opacity-60"
					>
						{loading ? "Sending..." : "Send reset link"}
					</button>
				</form>
			</div>
		</div>
	);
}
