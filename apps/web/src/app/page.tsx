import { redirect } from 'next/navigation';

// This is a static server redirect, so it can't know the visitor's role
// (that lives in localStorage, client-side only) — it always lands on the
// login page, and AuthProvider takes it from there: an already-authenticated
// visitor is bounced straight to their own role's app (roleHomePath) before
// anything renders. Redirecting here to '/dashboard' directly, as before,
// used to flash the PM staff sidebar for every role on every app launch,
// since that route has no role guard of its own.
export default function HomePage() {
  redirect('/auth/login');
}
