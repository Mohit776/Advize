import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import * as nodemailer from "nodemailer";
import {defineSecret} from "firebase-functions/params";

const gmailEmail = defineSecret("GMAIL_EMAIL");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

const db = getFirestore();

function generateOtp(): string {
	const otp = Math.floor(100000 + Math.random() * 900000);
	return otp.toString();
}

function buildOtpEmailHtml(otp: string): string {
	return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0;">Advize</h1>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 8px;">Your verification code is:</p>
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 20px 32px; display: inline-block;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff;">${otp}</span>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0 0 8px;">
        This code expires in <strong>10 minutes</strong>.
      </p>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 24px 0 0;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;
}

export const sendOtp = onCall(
	{
		region: "us-central1",
		secrets: [gmailEmail, gmailAppPassword],
	},
	async (request) => {
		const uid = request.data?.uid;
		if (!uid || typeof uid !== "string") {
			throw new HttpsError("invalid-argument", "User ID is required.");
		}

		// Get user email from Firebase Auth
		let userRecord;
		try {
			userRecord = await getAuth().getUser(uid);
		} catch {
			throw new HttpsError("not-found", "User not found.");
		}

		const email = userRecord.email;
		if (!email) {
			throw new HttpsError(
				"failed-precondition",
				"User does not have an email address."
			);
		}

		// Rate limit: check if an OTP was sent in the last 60 seconds
		const otpDocRef = db.collection("otpVerifications").doc(uid);
		const existingDoc = await otpDocRef.get();
		if (existingDoc.exists) {
			const data = existingDoc.data();
			if (data?.createdAt) {
				const createdAt = data.createdAt.toDate();
				const secondsSince =
					(Date.now() - createdAt.getTime()) / 1000;
				if (secondsSince < 60) {
					throw new HttpsError(
						"resource-exhausted",
						`Please wait ${Math.ceil(60 - secondsSince)} seconds before requesting a new code.`
					);
				}
			}
		}

		// Generate and store OTP
		const otp = generateOtp();
		await otpDocRef.set({
			otp,
			email,
			createdAt: FieldValue.serverTimestamp(),
			attempts: 0,
		});

		// Send email
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: gmailEmail.value(),
				pass: gmailAppPassword.value(),
			},
		});

		try {
			await transporter.sendMail({
				from: `"Advize" <${gmailEmail.value()}>`,
				to: email,
				subject: "Your Advize Verification Code",
				html: buildOtpEmailHtml(otp),
			});
		} catch (err) {
			console.error("Failed to send OTP email:", err);
			throw new HttpsError("internal", "Failed to send verification email.");
		}

		return {success: true};
	}
);
