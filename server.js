const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));


const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'movie_ticket_system',
    connectionLimit: 10
});

function initializeDatabase() {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'admin'
    });

    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to MySQL:', err);
            return;
        }

        console.log('Connected to MySQL server');

        connection.query('CREATE DATABASE IF NOT EXISTS movie_ticket_system', (err) => {
            if (err) {
                console.error('Error creating database:', err);
                return;
            }

            console.log('Database created or already exists');

            connection.query('USE movie_ticket_system', (err) => {
                if (err) {
                    console.error('Error using database:', err);
                    return;
                }

                // Check if data already exists and if shows are current
                connection.query('SELECT COUNT(*) as count FROM movies', (err, result) => {
                    if (err) {
                        // Tables don't exist, run full schema
                        console.log('Tables not found, initializing schema...');
                        runSchema(connection);
                    } else if (result[0].count === 0) {
                        // Tables exist but no data, run full schema
                        console.log('Tables exist but no data, initializing schema...');
                        runSchema(connection);
                    } else {
                        // Check if shows are current (have shows for today)
                        connection.query('SELECT COUNT(*) as count FROM shows WHERE show_date = CURDATE()', (err, showResult) => {
                            if (err) {
                                console.log('Error checking shows, reinitializing...');
                                runSchema(connection);
                            } else if (showResult[0].count === 0) {
                                // No shows for today, recreate shows
                                console.log('No current shows found, recreating shows...');
                                recreateShows(connection);
                            } else {
                                // Data exists and shows are current
                                console.log('Database already initialized with current data');
                                connection.end();
                                startServer();
                            }
                        });
                    }
                });
            });
        });
    });
}

function runSchema(connection) {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const statements = schema.split(';').filter(stmt => stmt.trim());

    let completed = 0;
    statements.forEach((statement, index) => {
        if (statement.trim()) {
            connection.query(statement, (err) => {
                if (err && !err.message.includes('already exists')) {
                    console.error(`Error executing statement ${index + 1}:`, err.message);
                }

                completed++;
                if (completed === statements.length) {
                    console.log('Database schema initialized successfully');
                    connection.end();
                    startServer();
                }
            });
        } else {
            completed++;
            if (completed === statements.length) {
                console.log('Database schema initialized successfully');
                connection.end();
                startServer();
            }
        }
    });
}

function recreateShows(connection) {
    // Clear existing shows
    connection.query('DELETE FROM shows', (err) => {
        if (err) {
            console.error('Error clearing shows:', err);
            return;
        }

        // Insert fresh shows for current dates
        const showInserts = [
            // Today's shows
            [1, 1, 1, 'CURDATE()', '10:00:00', 12.00, 9],
            [1, 1, 1, 'CURDATE()', '14:00:00', 15.00, 9],
            [2, 1, 2, 'CURDATE()', '18:00:00', 12.00, 9],
            [3, 2, 4, 'CURDATE()', '20:00:00', 18.00, 9],
            // Tomorrow's shows
            [4, 1, 3, 'DATE_ADD(CURDATE(), INTERVAL 1 DAY)', '10:00:00', 12.00, 9],
            [5, 2, 5, 'DATE_ADD(CURDATE(), INTERVAL 1 DAY)', '14:00:00', 15.00, 9],
            [6, 1, 1, 'DATE_ADD(CURDATE(), INTERVAL 1 DAY)', '16:00:00', 12.00, 9],
            [7, 2, 6, 'DATE_ADD(CURDATE(), INTERVAL 1 DAY)', '19:00:00', 18.00, 9],
            // Day after tomorrow's shows
            [8, 1, 2, 'DATE_ADD(CURDATE(), INTERVAL 2 DAY)', '21:00:00', 15.00, 9],
            [1, 2, 4, 'DATE_ADD(CURDATE(), INTERVAL 2 DAY)', '11:00:00', 12.00, 9],
            [2, 1, 3, 'DATE_ADD(CURDATE(), INTERVAL 2 DAY)', '15:00:00', 14.00, 9],
            [3, 2, 5, 'DATE_ADD(CURDATE(), INTERVAL 2 DAY)', '19:00:00', 16.00, 9]
        ];

        let completed = 0;
        showInserts.forEach((show, index) => {
            const query = `INSERT INTO shows (movie_id, theater_id, screen_id, show_date, show_time, price_per_ticket, available_seats) VALUES (?, ?, ?, ${show[3]}, ?, ?, ?)`;
            const values = [show[0], show[1], show[2], show[4], show[5], show[6]];

            connection.query(query, values, (err) => {
                if (err) {
                    console.error(`Error inserting show ${index + 1}:`, err.message);
                }

                completed++;
                if (completed === showInserts.length) {
                    console.log('Shows recreated successfully');
                    connection.end();
                    startServer();
                }
            });
        });
    });
}

function startServer() {
    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database pool:', err);
        } else {
            console.log('✅ Connected to movie_ticket_system using pool');
            connection.release();
        }
    });

    app.post('/api/auth/register', async (req, res) => {
        try {
            const { username, email, password, firstName, lastName } = req.body;

            if (!username || !email || !password || !firstName || !lastName) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const checkUser = 'SELECT user_id FROM users WHERE username = ? OR email = ?';
            db.query(checkUser, [username, email], (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (result.length > 0) {
                    return res.status(409).json({ error: 'Username or email already exists' });
                }

                const insertUser = 'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)';
                db.query(insertUser, [username, email, password, firstName, lastName], (err, result) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    res.status(201).json({
                        message: 'User registered successfully',
                        user: {
                            userId: result.insertId,
                            username,
                            email,
                            firstName,
                            lastName
                        }
                    });
                });
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/auth/login', async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }

            const findUser = 'SELECT user_id, username, email, password_hash, first_name, last_name FROM users WHERE username = ? AND password_hash = ?';
            db.query(findUser, [username, password], (err, users) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (users.length === 0) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const user = users[0];

                res.json({
                    message: 'Login successful',
                    user: {
                        userId: user.user_id,
                        username: user.username,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name
                    }
                });
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/movies', (req, res) => {
        const query = 'SELECT movie_id, title, genre, duration, rating, description, release_date, poster_url FROM movies ORDER BY release_date DESC';
        db.query(query, (err, movies) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(movies);
        });
    });

    app.get('/api/movies/:id', (req, res) => {
        const movieId = req.params.id;
        const query = 'SELECT movie_id, title, genre, duration, rating, description, release_date, poster_url FROM movies WHERE movie_id = ?';

        db.query(query, [movieId], (err, movies) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (movies.length === 0) {
                return res.status(404).json({ error: 'Movie not found' });
            }

            res.json(movies[0]);
        });
    });

    app.get('/api/theaters', (req, res) => {
        const query = 'SELECT theater_id, theater_name, location, city, contact_phone, total_seats FROM theaters ORDER BY theater_name';
        db.query(query, (err, theaters) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(theaters);
        });
    });

    app.get('/api/shows', (req, res) => {
        const { movieId, date, theaterId } = req.query;

        let query = `
        SELECT s.show_id, s.movie_id, s.theater_id, s.show_date, s.show_time, 
               s.price_per_ticket, s.available_seats,
               m.title as movie_title, m.duration,
               t.theater_name, t.location
        FROM shows s
        JOIN movies m ON m.movie_id = s.movie_id
        JOIN theaters t ON t.theater_id = s.theater_id
        WHERE s.show_status = 'Active'
    `;

        const params = [];

        if (movieId) {
            query += ' AND s.movie_id = ?';
            params.push(movieId);
        }

        if (date) {
            query += ' AND s.show_date = ?';
            params.push(date);
        }

        if (theaterId) {
            query += ' AND s.theater_id = ?';
            params.push(theaterId);
        }

        query += ' ORDER BY s.show_date, s.show_time';

        db.query(query, params, (err, shows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(shows);
        });
    });

    app.get('/api/shows/:showId/seats', (req, res) => {
        const showId = req.params.showId;

        const query = `
        SELECT s.seat_id, s.seat_number, s.\`row_number\`, s.seat_type,
               CASE WHEN bs.booking_id IS NOT NULL THEN 'Booked' ELSE 'Available' END as availability
        FROM seats s
        LEFT JOIN booking_seats bs ON bs.seat_id = s.seat_id 
        LEFT JOIN bookings b ON b.booking_id = bs.booking_id AND b.show_id = ? AND b.booking_status = 'Confirmed'
        WHERE s.screen_id = (SELECT screen_id FROM shows WHERE show_id = ?)
        ORDER BY s.\`row_number\`, s.seat_number
    `;

        db.query(query, [showId, showId], (err, seats) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            console.log(`Loaded ${seats.length} seats for show ${showId}`);
            res.json(seats);
        });
    });

    app.post('/api/bookings', (req, res) => {
        try {
            const { showId, seatIds, userId } = req.body;

            if (!showId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0 || !userId) {
                return res.status(400).json({ error: 'Show ID, seat IDs, and user ID are required' });
            }

            const getShow = 'SELECT price_per_ticket, available_seats FROM shows WHERE show_id = ?';
            db.query(getShow, [showId], (err, shows) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (shows.length === 0) {
                    return res.status(404).json({ error: 'Show not found' });
                }

                const show = shows[0];
                const totalAmount = show.price_per_ticket * seatIds.length;

                if (show.available_seats < seatIds.length) {
                    return res.status(400).json({ error: 'Not enough seats available' });
                }

                db.getConnection((err, connection) => {
                    if (err) {
                        console.error('Connection error:', err);
                        return res.status(500).json({ error: 'Database connection failed' });
                    }

                    connection.beginTransaction(err => {
                        if (err) {
                            connection.release();
                            console.error('Transaction start failed:', err);
                            return res.status(500).json({ error: 'Transaction start failed' });
                        }

                        const createBooking = 'INSERT INTO bookings (user_id, show_id, total_amount, booking_status) VALUES (?, ?, ?, ?)';
                        connection.query(createBooking, [Number(userId), Number(showId), Number(totalAmount), 'Confirmed'], (err, bookingResult) => {
                            if (err) {
                                console.error('Create booking failed:', err);
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({ error: 'Database error during booking creation', details: err.code || err.message });
                                });
                            }

                            const bookingId = bookingResult.insertId;
                            const seatQueries = seatIds.map(seatId => [bookingId, seatId, show.price_per_ticket]);
                            const bookSeatQuery = 'INSERT INTO booking_seats (booking_id, seat_id, seat_price) VALUES ?';

                            connection.query(bookSeatQuery, [seatQueries], (err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        res.status(500).json({ error: 'Seat booking failed' });
                                    });
                                }

                                connection.query('UPDATE shows SET available_seats = available_seats - ? WHERE show_id = ?', [seatIds.length, showId], (err) => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            res.status(500).json({ error: 'Seat update failed' });
                                        });
                                    }

                                    connection.commit(err => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                connection.release();
                                                res.status(500).json({ error: 'Commit failed' });
                                            });
                                        }

                                        connection.release();
                                        res.status(201).json({ message: 'Tickets booked successfully', bookingId, totalAmount });
                                    });
                                });
                            });
                        });
                    });
                });

            });
        } catch (error) {
            console.error('Booking error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/bookings/:userId', (req, res) => {
        const userId = req.params.userId;

        const query = `
        SELECT b.booking_id, b.booking_date, b.total_amount, b.booking_status,
               m.title as movie_title, t.theater_name, s.show_date, s.show_time,
               COUNT(bs.seat_id) as seats_count
        FROM bookings b
        JOIN shows s ON s.show_id = b.show_id
        JOIN movies m ON m.movie_id = s.movie_id
        JOIN theaters t ON t.theater_id = s.theater_id
        LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
        WHERE b.user_id = ?
        GROUP BY b.booking_id
        ORDER BY b.booking_date DESC
    `;

        db.query(query, [userId], (err, bookings) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(bookings);
        });
    });

    app.put('/api/bookings/:bookingId/cancel', (req, res) => {
        const bookingId = req.params.bookingId;

        const verifyBooking = 'SELECT booking_id, show_id, total_amount FROM bookings WHERE booking_id = ?';
        db.query(verifyBooking, [bookingId], (err, bookings) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (bookings.length === 0) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            const booking = bookings[0];

            const cancelBooking = 'UPDATE bookings SET booking_status = ? WHERE booking_id = ?';
            db.query(cancelBooking, ['Cancelled', bookingId], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                const restoreSeats = 'UPDATE shows SET available_seats = available_seats + (SELECT COUNT(*) FROM booking_seats WHERE booking_id = ?) WHERE show_id = ?';
                db.query(restoreSeats, [bookingId, booking.show_id], (err) => {
                    if (err) {
                        console.error('Database error:', err);
                    }

                    res.json({
                        message: 'Booking cancelled successfully',
                        refundAmount: booking.total_amount
                    });
                });
            });
        });
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Something went wrong!' });
    });

    app.use((req, res) => {
        res.status(404).json({ error: 'Route not found' });
    });

    app.listen(PORT, () => {
        console.log(`Movie Ticket Booking System server running on port ${PORT}`);
        console.log(`Frontend: http://localhost:${PORT}`);
    });
}

initializeDatabase();