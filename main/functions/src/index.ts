import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

initializeApp();

const db = getFirestore();

function normalizeToDate(value: unknown): Date | null {
	if (!value) return null;

	if (value instanceof Timestamp) {
		return value.toDate();
	}

	if (value instanceof Date) {
		return value;
	}

	if (typeof value === "object" && value !== null && "toDate" in value) {
		const maybeTimestamp = value as {toDate: () => Date};
		try {
			return maybeTimestamp.toDate();
		} catch {
			return null;
		}
	}

	const parsed = new Date(value as string | number);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const closeExpiredCampaigns = onSchedule(
	{
		schedule: "every 60 minutes",
		timeZone: "UTC",
		region: "us-central1",
	},
	async () => {
		const now = new Date();
		const activeCampaignsSnapshot = await db
			.collection("campaigns")
			.where("status", "==", "Active")
			.get();

		if (activeCampaignsSnapshot.empty) {
			logger.info("No active campaigns found to evaluate.");
			return;
		}

		const batch = db.batch();
		let closedCount = 0;

		activeCampaignsSnapshot.docs.forEach((campaignDoc) => {
			const data = campaignDoc.data();
			const endDate = normalizeToDate(data.endDate);

			if (!endDate) {
				return;
			}

			if (endDate.getTime() <= now.getTime()) {
				batch.update(campaignDoc.ref, {
					status: "Completed",
					updatedAt: Timestamp.now(),
				});
				closedCount += 1;
			}
		});

		if (closedCount === 0) {
			logger.info("No campaigns reached end date yet.");
			return;
		}

		await batch.commit();
		logger.info(`Closed ${closedCount} campaign(s) based on end date.`);
	}
);
