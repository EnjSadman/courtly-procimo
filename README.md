# Courtly - sports court booking web app

A fullstack app, where users can book sports cours, see availability.
Admins manage courts, and view stats on the courts.

## How to run

``` bash
git clone git@github.com:EnjSadman/courtly-procimo.git
cd courtly-procimo
docker compose up
```

wait for install, and services start, then visit http://localhost:3000

Existing credentials

admin - mail: admin@courtly.local	password: admin123
user - mail: user@courtly.local password: user123


## Available pages

http://localhost:3000 - Landing
http://localhost:3000/dashboard - User dashboard. Allows to pick
http://localhost:3000/dashboard/my-bookings - User own bookings
http://localhost:3000/admin/dashboard -Admin managing courts


## Tech choice

Next.js over React - file based routing: easier organize pages, SSR: most of pages are server, except bookings forms, where those interactive
Express over Nest - smaller scope, no need in overhead that Nest provides. Flexibility
PostgreSQL + Prisma over MySQL or MongoDB - PostgreSQL handles concurrency natively. Prisma provides a type-safe query client generated from the schema. Prisma has less capabilities for MySql, and Mongo do not fit, because we work with data, where prescision is a must. When mongo, do not provide much of relational database

## Double bookings concurrency

1. in backend/src/routes/booking.ts - line 260. Used prisma transaction, that executes ```SELECT id FROM "Court" WHERE id = $1 FOR UPDATE```, which locks row in PostgreSQL. After first request finishes, second re-runs check if slot is taken, and throws 409, if it was taken.
2. Booking slots have a @unique property on time and court id. Which secures, from direct upload in db, as same court cannot have taken same time

## What I would do next with more time

1. Realtime availability with SSE.
2. Booking Waitlist
3. Improve auth auth. Current version, do not verifies mail, do not provides password reset, and do not provides session termination
4. Logging. Add logging, to receive more insights, on user interactions. To adjust rates, and make user experience better
