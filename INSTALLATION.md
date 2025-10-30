# Movie Ticket Booking System - Installation and Setup Guide

## Prerequisites

Before setting up the Movie Ticket Booking System, ensure you have the following installed:

- **Node.js** (version 14 or higher)
- **MySQL** (version 8.0 or higher)
- **npm** (comes with Node.js)
- **Git** (for version control)

## Installation Steps

### 1. Clone or Download the Project

```bash
# If using Git
git clone <repository-url>
cd movie-ticket-project

# Or extract the downloaded ZIP file
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- express (web framework)
- mysql2 (MySQL database driver)
- cors (cross-origin resource sharing)
- body-parser (request parsing)

### 3. Database Setup

#### 3.1 Create MySQL Database

1. Open MySQL command line or MySQL Workbench
2. Run the following commands:

```sql
-- Create database
CREATE DATABASE movie_ticket_system;
USE movie_ticket_system;

-- Run the schema file
SOURCE database/schema.sql;
```

#### 3.2 Alternative: Use MySQL Workbench

1. Open MySQL Workbench
2. Create a new schema named `movie_ticket_system`
3. Open and execute `database/schema.sql`
4. Verify tables are created successfully

### 4. Database Configuration

The system automatically creates the database and tables. Just ensure MySQL is running with password 'admin' or update the password in `server.js`.

### 5. Start the Application

```bash
npm start
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api

## Project Structure

```
movie-ticket-project/
├── database/
│   ├── schema.sql              # Database schema and sample data
│   └── advanced_queries.sql    # Advanced SQL queries and procedures
├── public/
│   ├── index.html              # Main frontend page
│   ├── styles.css              # CSS styles
│   └── script.js               # Frontend JavaScript
├── package.json                # Node.js dependencies
├── server.js                   # Express.js backend server
├── env.example                 # Environment variables template
└── README.md                   # Project documentation
```

## Database Schema Overview

### Core Tables

1. **users** - User account information
2. **movies** - Movie catalog
3. **theaters** - Theater locations and details
4. **screens** - Individual screens within theaters
5. **shows** - Movie showtimes
6. **seats** - Seat information for each screen
7. **bookings** - User booking records
8. **booking_seats** - Junction table for bookings and seats
9. **payments** - Payment transaction records

### Key Features

- **Normalization**: Database normalized up to BCNF
- **Triggers**: Automatic seat availability updates
- **Stored Procedures**: Complex booking operations
- **Views**: Predefined queries for reporting
- **Indexes**: Optimized for performance
- **Constraints**: Data integrity enforcement

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Movies
- `GET /api/movies` - Get all movies
- `GET /api/movies/:id` - Get movie by ID
- `POST /api/movies` - Add new movie (Admin)

### Theaters
- `GET /api/theaters` - Get all theaters
- `GET /api/theaters/city/:city` - Get theaters by city

### Shows
- `GET /api/shows` - Get shows with filters
- `GET /api/shows/:showId/seats` - Get available seats

### Bookings
- `POST /api/bookings` - Book tickets
- `GET /api/bookings` - Get user bookings
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Reports
- `GET /api/reports/booking-summary` - Booking summary report
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/seat-availability` - Seat availability report

### Analytics
- `GET /api/analytics/popular-movies` - Popular movies analysis
- `GET /api/analytics/theater-performance` - Theater performance
- `GET /api/analytics/user-history/:userId` - User booking history

## Usage Examples

### 1. User Registration
```javascript
const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'securepassword',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890'
    })
});
```

### 2. Book Tickets
```javascript
const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        showId: 1,
        seatIds: [1, 2, 3],
        paymentMethod: 'Credit Card'
    })
});
```

### 3. Get Movie Shows
```javascript
const response = await fetch('/api/shows?movieId=1&date=2024-01-15');
const shows = await response.json();
```

## Testing the System

### 1. Test User Registration
1. Open http://localhost:3000
2. Click "Register"
3. Fill in user details
4. Submit form

### 2. Test Movie Booking
1. Login with registered user
2. Browse movies
3. Select a movie and show time
4. Choose seats
5. Confirm booking

### 3. Test Database Queries
Run the advanced queries from `database/advanced_queries.sql` to see:
- Complex joins
- Aggregate functions
- Stored procedures
- Views and reporting

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL service is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing process: `lsof -ti:3000 | xargs kill`

3. **Module Not Found**
   - Run `npm install` again
   - Check Node.js version compatibility

4. **CORS Issues**
   - Ensure frontend and backend are on same domain
   - Check CORS configuration in server.js

### Database Issues

1. **Schema Creation Failed**
   - Check MySQL user permissions
   - Verify MySQL version compatibility
   - Run schema.sql step by step

2. **Sample Data Not Loading**
   - Check foreign key constraints
   - Verify table creation order
   - Review error messages

## Performance Optimization

### Database Optimization
- Indexes on frequently queried columns
- Query optimization with EXPLAIN
- Connection pooling for better performance

### Application Optimization
- Caching frequently accessed data
- Pagination for large result sets
- Compression for API responses

## Security Considerations

### Database Security
- Use parameterized queries (prevented SQL injection)
- Implement proper user permissions
- Regular database backups

### Application Security
- Simple username/password authentication
- Input validation and sanitization
- CORS configuration

## Deployment

### Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure production database

2. **Database Configuration**
   - Create production database
   - Set up proper user permissions
   - Configure connection pooling

3. **Server Configuration**
   - Use process manager (PM2)
   - Configure reverse proxy (Nginx)
   - Set up SSL certificates

### Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Support and Maintenance

### Regular Maintenance Tasks
- Database backup and recovery testing
- Performance monitoring
- Security updates
- Log analysis

### Monitoring
- Application performance metrics
- Database query performance
- Error tracking and logging
- User activity monitoring

## Conclusion

This Movie Ticket Booking System demonstrates comprehensive database design principles, advanced SQL techniques, and modern web development practices. The system provides a solid foundation for understanding database management systems and their practical applications in real-world scenarios.

For additional support or questions, refer to the project documentation or contact the development team.
