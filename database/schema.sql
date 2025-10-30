-- Movie Ticket Booking System Database Schema

CREATE DATABASE IF NOT EXISTS movie_ticket_system;
USE movie_ticket_system;

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. MOVIES TABLE
-- =============================================
CREATE TABLE movies (
    movie_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    duration INT NOT NULL,
    rating DECIMAL(3,1),
    description TEXT,
    release_date DATE NOT NULL,
    poster_url VARCHAR(500)
);

-- =============================================
-- 3. THEATERS TABLE
-- =============================================
CREATE TABLE theaters (
    theater_id INT AUTO_INCREMENT PRIMARY KEY,
    theater_name VARCHAR(200) NOT NULL,
    location VARCHAR(300) NOT NULL,
    city VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(15),
    total_seats INT NOT NULL
);

-- =============================================
-- 4. SCREENS TABLE
-- =============================================
CREATE TABLE screens (
    screen_id INT AUTO_INCREMENT PRIMARY KEY,
    theater_id INT NOT NULL,
    screen_name VARCHAR(100) NOT NULL,
    total_seats INT NOT NULL,
    
    FOREIGN KEY (theater_id) REFERENCES theaters(theater_id) ON DELETE CASCADE
);

-- =============================================
-- 5. SHOWS TABLE
-- =============================================
CREATE TABLE shows (
    show_id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    theater_id INT NOT NULL,
    screen_id INT NOT NULL,
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    price_per_ticket DECIMAL(10,2) NOT NULL,
    available_seats INT NOT NULL,
    show_status ENUM('Active', 'Cancelled', 'Completed') DEFAULT 'Active',
    
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (theater_id) REFERENCES theaters(theater_id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES screens(screen_id) ON DELETE CASCADE
);

-- =============================================
-- 6. SEATS TABLE
-- =============================================
CREATE TABLE seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    screen_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    `row_number` VARCHAR(5) NOT NULL,
    seat_type ENUM('Standard', 'Premium', 'VIP') DEFAULT 'Standard',
    
    FOREIGN KEY (screen_id) REFERENCES screens(screen_id) ON DELETE CASCADE
);

-- =============================================
-- 7. BOOKINGS TABLE
-- =============================================
CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    show_id INT NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    booking_status ENUM('Confirmed', 'Cancelled', 'Completed') DEFAULT 'Confirmed',
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (show_id) REFERENCES shows(show_id) ON DELETE CASCADE
);

-- =============================================
-- 8. BOOKING_SEATS TABLE
-- =============================================
CREATE TABLE booking_seats (
    booking_seat_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    seat_id INT NOT NULL,
    seat_price DECIMAL(10,2) NOT NULL,
    
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id) ON DELETE CASCADE
);

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Insert sample users
INSERT IGNORE INTO users (username, email, password_hash, first_name, last_name, phone) VALUES
('john_doe', 'john@example.com', '$2b$10$example_hash', 'John', 'Doe', '1234567890'),
('jane_smith', 'jane@example.com', '$2b$10$example_hash', 'Jane', 'Smith', '0987654321');

-- Insert sample movies
INSERT IGNORE INTO movies (title, genre, duration, rating, description, release_date, poster_url) VALUES
('The Avengers', 'Action', 143, 8.0, 'Superhero team-up movie', '2012-05-04', 'https://m.media-amazon.com/images/M/MV5BNDYxNjQyMjAtNTdiOS00NGYwLWFmNTAtNThmYjU5ZGI2YTI1XkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg'),
('Inception', 'Sci-Fi', 148, 8.8, 'Mind-bending thriller', '2010-07-16', 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg'),
('The Dark Knight', 'Action', 152, 9.0, 'Batman vs Joker', '2008-07-18', 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg'),
('Avatar', 'Sci-Fi', 162, 7.8, 'Epic sci-fi adventure', '2009-12-18', 'https://image.tmdb.org/t/p/w500/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg'),
('Titanic', 'Romance', 194, 7.8, 'Epic romance disaster film', '1997-12-19', 'https://m.media-amazon.com/images/M/MV5BMDdmZGU3NDQtY2E5My00ZTliLWIzOTUtMTY4ZGI1YjdiNjk3XkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_.jpg'),
('Jurassic Park', 'Adventure', 127, 8.1, 'Dinosaurs come to life', '1993-06-11', 'https://m.media-amazon.com/images/M/MV5BMjM2MDgxMDg0Nl5BMl5BanBnXkFtZTgwNTM2OTM5NDE@._V1_.jpg'),
('Forrest Gump', 'Drama', 142, 8.8, 'Life story of Forrest Gump', '1994-07-06', 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_.jpg'),
('The Matrix', 'Sci-Fi', 136, 8.7, 'Reality is not what it seems', '1999-03-31', 'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg');

-- Insert sample theaters
INSERT IGNORE INTO theaters (theater_name, location, city, contact_phone, total_seats) VALUES
('CineMax Downtown', '123 Main Street', 'New York', '212-555-0123', 300),
('MegaPlex Mall', '456 Shopping Blvd', 'Los Angeles', '323-555-0456', 400),
('Family Cinema', '789 Suburb Lane', 'Chicago', '312-555-0789', 200);

-- Insert sample screens
INSERT IGNORE INTO screens (theater_id, screen_name, total_seats) VALUES
(1, 'Screen 1', 100),
(1, 'Screen 2', 100),
(1, 'Screen 3', 100),
(2, 'Screen 1', 100),
(2, 'Screen 2', 100),
(2, 'Screen 3', 100),
(2, 'Screen 4', 100),
(3, 'Screen 1', 100),
(3, 'Screen 2', 100);

-- Insert sample seats (just a few for each screen)
INSERT IGNORE INTO seats (screen_id, seat_number, `row_number`, seat_type) VALUES
-- Screen 1 seats
(1, 'A1', 'A', 'Standard'), (1, 'A2', 'A', 'Standard'), (1, 'A3', 'A', 'Standard'),
(1, 'B1', 'B', 'Premium'), (1, 'B2', 'B', 'Premium'), (1, 'B3', 'B', 'Premium'),
(1, 'C1', 'C', 'VIP'), (1, 'C2', 'C', 'VIP'), (1, 'C3', 'C', 'VIP'),
-- Screen 2 seats
(2, 'A1', 'A', 'Standard'), (2, 'A2', 'A', 'Standard'), (2, 'A3', 'A', 'Standard'),
(2, 'B1', 'B', 'Premium'), (2, 'B2', 'B', 'Premium'), (2, 'B3', 'B', 'Premium'),
(2, 'C1', 'C', 'VIP'), (2, 'C2', 'C', 'VIP'), (2, 'C3', 'C', 'VIP'),
-- Screen 3 seats
(3, 'A1', 'A', 'Standard'), (3, 'A2', 'A', 'Standard'), (3, 'A3', 'A', 'Standard'),
(3, 'B1', 'B', 'Premium'), (3, 'B2', 'B', 'Premium'), (3, 'B3', 'B', 'Premium'),
(3, 'C1', 'C', 'VIP'), (3, 'C2', 'C', 'VIP'), (3, 'C3', 'C', 'VIP'),
-- Screen 4 seats
(4, 'A1', 'A', 'Standard'), (4, 'A2', 'A', 'Standard'), (4, 'A3', 'A', 'Standard'),
(4, 'B1', 'B', 'Premium'), (4, 'B2', 'B', 'Premium'), (4, 'B3', 'B', 'Premium'),
(4, 'C1', 'C', 'VIP'), (4, 'C2', 'C', 'VIP'), (4, 'C3', 'C', 'VIP'),
-- Screen 5 seats
(5, 'A1', 'A', 'Standard'), (5, 'A2', 'A', 'Standard'), (5, 'A3', 'A', 'Standard'),
(5, 'B1', 'B', 'Premium'), (5, 'B2', 'B', 'Premium'), (5, 'B3', 'B', 'Premium'),
(5, 'C1', 'C', 'VIP'), (5, 'C2', 'C', 'VIP'), (5, 'C3', 'C', 'VIP'),
-- Screen 6 seats
(6, 'A1', 'A', 'Standard'), (6, 'A2', 'A', 'Standard'), (6, 'A3', 'A', 'Standard'),
(6, 'B1', 'B', 'Premium'), (6, 'B2', 'B', 'Premium'), (6, 'B3', 'B', 'Premium'),
(6, 'C1', 'C', 'VIP'), (6, 'C2', 'C', 'VIP'), (6, 'C3', 'C', 'VIP');

-- Insert sample shows (for today and next few days)
INSERT IGNORE INTO shows (movie_id, theater_id, screen_id, show_date, show_time, price_per_ticket, available_seats) VALUES
-- Today's shows
(1, 1, 1, CURDATE(), '10:00:00', 12.00, 9),
(1, 1, 1, CURDATE(), '14:00:00', 15.00, 9),
(2, 1, 2, CURDATE(), '18:00:00', 12.00, 9),
(3, 2, 4, CURDATE(), '20:00:00', 18.00, 9),
-- Tomorrow's shows
(4, 1, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', 12.00, 9),
(5, 2, 5, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', 15.00, 9),
(6, 1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '16:00:00', 12.00, 9),
(7, 2, 6, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '19:00:00', 18.00, 9),
-- Day after tomorrow's shows
(8, 1, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '21:00:00', 15.00, 9),
(1, 2, 4, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00:00', 12.00, 9),
(2, 1, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '15:00:00', 14.00, 9),
(3, 2, 5, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '19:00:00', 16.00, 9);