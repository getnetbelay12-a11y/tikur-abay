# Tikur Abay Frontend Production Checklist

Use this checklist to validate user-facing behavior before release sign-off.

## Admin Console

Confirm all of the following in the admin console:

- login works with a seeded local admin account
- expired session redirects back to login cleanly
- executive dashboard loads without blank sections
- executive dashboard widgets show real data
- live fleet map loads markers and filters correctly
- maintenance dashboard loads due, overdue, and blocked vehicles
- performance pages load summary, list, and detail pages
- driver KYC list and review pages load
- chat page loads rooms and messages
- notifications unread count updates
- document list loads and document downloads work
- role-based sidebar hides unauthorized items
- unauthorized routes redirect safely

## Customer Portal

Confirm all of the following in the customer portal:

- login works with a seeded local customer account
- dashboard loads bookings, agreements, and payments
- customer documents list loads
- signed/downloadable agreement documents work
- payment history loads
- support/chat entry points load
- customer cannot access admin-only routes

## Mobile App

Confirm all of the following in the mobile app:

- login works for both customer and driver accounts
- registration role selection works
- driver KYC-pending users are blocked from trip operations
- customer tabs load:
  - Home
  - Book
  - My Trips
  - Documents
  - Payments
  - Profile
- driver tabs load:
  - Trip
  - Report
  - Activity
  - Chat
  - Docs
  - Alerts
  - Profile
- chat receives realtime updates
- alerts refresh through realtime updates
- document upload works
- fuel log and driver report submission works
- logout clears the session and returns to auth

## Realtime Checks

Confirm:

- admin dashboard receives fleet updates without reload
- admin chat receives live messages
- mobile chat receives live messages
- mobile notifications refresh on new events
- authenticated Socket.IO connection succeeds after token refresh

## Error-State Checks

Confirm:

- dashboard API failure shows a friendly retryable state
- empty map data shows an empty state instead of crashing
- document action failures show a readable message
- auth refresh failure clears the session and redirects correctly
- one widget failure does not blank the entire executive dashboard

## Final UI Sign-Off

Record:

- operator
- environment
- admin checked: yes/no
- customer checked: yes/no
- mobile checked: yes/no
- realtime checked: yes/no
- release approved: yes/no
