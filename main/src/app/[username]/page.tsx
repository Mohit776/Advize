import { redirect } from 'next/navigation';

/**
 * Short-form public profile URLs: /@username or /username
 * Redirect to the canonical public profile route at /profile/[username].
 */
export default function UsernameShortlinkPage({
  params,
}: {
  params: { username: string };
}) {
  redirect(`/profile/${params.username}`);
}
