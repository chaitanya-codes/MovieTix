# Movie Ticket Booking System

A simple movie ticket booking system built with Node.js, Express, MySQL, and vanilla JavaScript for a DBMS assignment.

## Quick Setup

### Manual Setup
```bash
# Install dependencies
npm install

# Start the server (auto-creates database)
npm start
```

## Prerequisites
- Node.js installed
- MySQL server running
- MySQL password set to 'admin' (or update server.js)

## Features
- User registration and login
- Movie browsing with posters
- Theater information
- Seat selection and booking
- Booking management
- Search functionality

## Access (after setup)
- Frontend: http://localhost:3000
- API: http://localhost:3000/api

## Database
The system automatically creates:
- Database: `movie_ticket_system`
- Tables: users, movies, theaters, screens, shows, seats, bookings, booking_seats
- Sample data: 8 movies, 3 theaters, shows for today and next few days

## Sample Users
- Username: john_doe, Password: (stored as plain text for simplicity)
- Username: jane_smith, Password: (stored as plain text for simplicity)

## API Endpoints
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- GET /api/movies - Get all movies
- GET /api/theaters - Get all theaters
- GET /api/shows - Get shows (with filters)
- POST /api/bookings - Book tickets
- GET /api/bookings/:userId - Get user bookings
- PUT /api/bookings/:id/cancel - Cancel booking
