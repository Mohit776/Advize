import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";

const db = getFirestore();

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export const verifyOtp = onCall(
	{region: "us-central1"},
	async (request) => {
		const {uid, otp} = request.data || {};

		if (!uid || typeof uid !== "string") {
			throw new HttpsError("invalid-argument", "User ID is required.");
		}
		if (!otp || typeof otp !== "string") {
			throw new HttpsError("invalid-argument", "OTP is required.");
		}

		const otpDocRef = db.collection("otpVerifications").doc(uid);
		const otpDoc = await otpDocRef.get();

		if (!otpDoc.exists) {
			throw new HttpsError(
				"not-found",
				"No verification code found. Please request a new one."
			);
		}

		const data = otpDoc.data()!;
		const createdAt = data.createdAt?.toDate();

		// Check expiry
		if (createdAt) {
			const minutesSince =
				(Date.now() - createdAt.getTime()) / 1000 / 60;
			if (minutesSince > OTP_EXPIRY_MINUTES) {
				await otpDocRef.delete();
				throw new HttpsError(
					"deadline-exceeded",
					"Verification code has expired. Please request a new one."
				);
			}
		}

		// Check max attempts
		if (data.attempts >= MAX_ATTEMPTS) {
			await otpDocRef.delete();
			throw new HttpsError(
				"resource-exhausted",
				"Too many failed attempts. Please request a new code."
			);
		}

		// Verify OTP
		if (data.otp !== otp) {
			await otpDocRef.update({
				attempts: FieldValue.increment(1),
			});
			const remaining = MAX_ATTEMPTS - (data.attempts + 1);
			throw new HttpsError(
				"permission-denied",
				`Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
			);
		}

		// OTP is correct — mark email as verified via Admin SDK
		try {
			await getAuth().updateUser(uid, {emailVerified: true});
		} catch (err) {
			console.error("Failed to update emailVerified:", err);
			throw new HttpsError(
				"internal",
				"Verification succeeded but failed to update account. Please try logging in."
			);
		}

		// Clean up the OTP document
		await otpDocRef.delete();

		return {success: true};
	}
);
