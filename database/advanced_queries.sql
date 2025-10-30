-- Advanced SQL Queries and Stored Procedures
-- Movie Ticket Booking System - Query Demonstrations

USE movie_ticket_system;

-- =============================================
-- ADVANCED QUERY DEMONSTRATIONS
-- =============================================

-- 1. COMPLEX JOIN QUERIES

-- Query 1: Get detailed booking information with user, movie, theater, and seat details
SELECT 
    b.booking_id,
    b.booking_reference,
    u.username,
    u.email,
    m.title as movie_title,
    m.genre,
    t.theater_name,
    t.city,
    sc.screen_name,
    s.show_date,
    s.show_time,
    s.price_per_ticket,
    b.total_amount,
    b.booking_status,
    b.payment_status,
    COUNT(bs.seat_id) as seats_booked,
    GROUP_CONCAT(st.seat_number ORDER BY st.seat_number) as seat_numbers,
    GROUP_CONCAT(st.seat_type) as seat_types
FROM bookings b
JOIN users u ON u.user_id = b.user_id
JOIN shows s ON s.show_id = b.show_id
JOIN movies m ON m.movie_id = s.movie_id
JOIN theaters t ON t.theater_id = s.theater_id
JOIN screens sc ON sc.screen_id = s.screen_id
JOIN booking_seats bs ON bs.booking_id = b.booking_id
JOIN seats st ON st.seat_id = bs.seat_id
WHERE b.booking_status = 'Confirmed'
GROUP BY b.booking_id
ORDER BY b.booking_date DESC;

-- Query 2: Revenue analysis by movie genre
SELECT 
    m.genre,
    COUNT(DISTINCT b.booking_id) as total_bookings,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as avg_booking_amount,
    COUNT(DISTINCT s.show_id) as total_shows,
    ROUND((SUM(b.total_amount) / COUNT(DISTINCT s.show_id)), 2) as revenue_per_show
FROM movies m
JOIN shows s ON s.movie_id = m.movie_id
LEFT JOIN bookings b ON b.show_id = s.show_id AND b.booking_status = 'Confirmed'
GROUP BY m.genre
ORDER BY total_revenue DESC;

-- Query 3: Theater performance comparison
SELECT 
    t.theater_id,
    t.theater_name,
    t.city,
    COUNT(DISTINCT s.show_id) as total_shows,
    COUNT(b.booking_id) as total_bookings,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as avg_booking_amount,
    ROUND((COUNT(b.booking_id) / COUNT(DISTINCT s.show_id)) * 100, 2) as booking_rate_percentage,
    ROUND((SUM(b.total_amount) / COUNT(DISTINCT s.show_id)), 2) as revenue_per_show
FROM theaters t
JOIN shows s ON s.theater_id = t.theater_id
LEFT JOIN bookings b ON b.show_id = s.show_id AND b.booking_status = 'Confirmed'
GROUP BY t.theater_id
ORDER BY total_revenue DESC;

-- =============================================
-- NESTED QUERIES AND SUBQUERIES
-- =============================================

-- Query 4: Find users who have booked tickets for movies with rating above 8.0
SELECT 
    u.username,
    u.email,
    COUNT(b.booking_id) as high_rated_movie_bookings,
    SUM(b.total_amount) as total_spent_on_high_rated
FROM users u
JOIN bookings b ON b.user_id = u.user_id
WHERE b.show_id IN (
    SELECT s.show_id 
    FROM shows s 
    JOIN movies m ON m.movie_id = s.movie_id 
    WHERE m.rating > 8.0
)
AND b.booking_status = 'Confirmed'
GROUP BY u.user_id
ORDER BY high_rated_movie_bookings DESC;

-- Query 5: Movies that have never been booked
SELECT 
    m.movie_id,
    m.title,
    m.genre,
    m.rating,
    COUNT(s.show_id) as total_shows_scheduled
FROM movies m
LEFT JOIN shows s ON s.movie_id = m.movie_id
LEFT JOIN bookings b ON b.show_id = s.show_id AND b.booking_status = 'Confirmed'
WHERE b.booking_id IS NULL
GROUP BY m.movie_id
ORDER BY m.rating DESC;

-- Query 6: Users who have booked tickets for all movies in a specific genre
SELECT 
    u.username,
    u.email,
    COUNT(DISTINCT m.movie_id) as movies_booked_in_genre,
    COUNT(DISTINCT b.booking_id) as total_bookings_in_genre
FROM users u
JOIN bookings b ON b.user_id = u.user_id
JOIN shows s ON s.show_id = b.show_id
JOIN movies m ON m.movie_id = s.movie_id
WHERE m.genre = 'Action' 
AND b.booking_status = 'Confirmed'
GROUP BY u.user_id
HAVING movies_booked_in_genre = (
    SELECT COUNT(DISTINCT movie_id) 
    FROM movies 
    WHERE genre = 'Action'
);

-- =============================================
-- AGGREGATE QUERIES WITH WINDOW FUNCTIONS
-- =============================================

-- Query 7: Monthly revenue trends with running totals
SELECT 
    DATE_FORMAT(s.show_date, '%Y-%m') as month,
    COUNT(b.booking_id) as monthly_bookings,
    SUM(b.total_amount) as monthly_revenue,
    AVG(b.total_amount) as avg_booking_amount,
    SUM(SUM(b.total_amount)) OVER (ORDER BY DATE_FORMAT(s.show_date, '%Y-%m')) as running_total_revenue,
    ROUND(
        (SUM(b.total_amount) - LAG(SUM(b.total_amount)) OVER (ORDER BY DATE_FORMAT(s.show_date, '%Y-%m'))) / 
        LAG(SUM(b.total_amount)) OVER (ORDER BY DATE_FORMAT(s.show_date, '%Y-%m')) * 100, 2
    ) as month_over_month_growth
FROM shows s
LEFT JOIN bookings b ON b.show_id = s.show_id AND b.booking_status = 'Confirmed'
GROUP BY DATE_FORMAT(s.show_date, '%Y-%m')
ORDER BY month;

-- Query 8: Top performing movies by revenue percentile
SELECT 
    m.title,
    m.genre,
    m.rating,
    COUNT(b.booking_id) as total_bookings,
    SUM(b.total_amount) as total_revenue,
    PERCENT_RANK() OVER (ORDER BY SUM(b.total_amount)) as revenue_percentile,
    NTILE(4) OVER (ORDER BY SUM(b.total_amount)) as revenue_quartile
FROM movies m
JOIN shows s ON s.movie_id = m.movie_id
LEFT JOIN bookings b ON b.show_id = s.show_id AND b.booking_status = 'Confirmed'
GROUP BY m.movie_id
ORDER BY total_revenue DESC;

-- =============================================
-- ADVANCED STORED PROCEDURES
-- =============================================

-- Procedure 1: Get comprehensive booking analytics
DELIMITER //
CREATE PROCEDURE GetBookingAnalytics(
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_theater_id INT,
    IN p_movie_id INT
)
BEGIN
    DECLARE v_total_bookings INT DEFAULT 0;
    DECLARE v_total_revenue DECIMAL(10,2) DEFAULT 0;
    DECLARE v_avg_booking_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_cancellation_rate DECIMAL(5,2) DEFAULT 0;
    
    -- Calculate basic metrics
    SELECT 
        COUNT(booking_id),
        COALESCE(SUM(total_amount), 0),
        COALESCE(AVG(total_amount), 0)
    INTO v_total_bookings, v_total_revenue, v_avg_booking_amount
    FROM bookings b
    JOIN shows s ON s.show_id = b.show_id
    WHERE (p_start_date IS NULL OR s.show_date >= p_start_date)
    AND (p_end_date IS NULL OR s.show_date <= p_end_date)
    AND (p_theater_id IS NULL OR s.theater_id = p_theater_id)
    AND (p_movie_id IS NULL OR s.movie_id = p_movie_id)
    AND b.booking_status = 'Confirmed';
    
    -- Calculate cancellation rate
    SELECT 
        ROUND(
            (COUNT(CASE WHEN booking_status = 'Cancelled' THEN 1 END) * 100.0) / 
            COUNT(booking_id), 2
        )
    INTO v_cancellation_rate
    FROM bookings b
    JOIN shows s ON s.show_id = b.show_id
    WHERE (p_start_date IS NULL OR s.show_date >= p_start_date)
    AND (p_end_date IS NULL OR s.show_date <= p_end_date)
    AND (p_theater_id IS NULL OR s.theater_id = p_theater_id)
    AND (p_movie_id IS NULL OR s.movie_id = p_movie_id);
    
    -- Return analytics summary
    SELECT 
        v_total_bookings as total_bookings,
        v_total_revenue as total_revenue,
        v_avg_booking_amount as avg_booking_amount,
        v_cancellation_rate as cancellation_rate_percent;
    
    -- Return detailed breakdown by status
    SELECT 
        booking_status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount,
        AVG(total_amount) as avg_amount
    FROM bookings b
    JOIN shows s ON s.show_id = b.show_id
    WHERE (p_start_date IS NULL OR s.show_date >= p_start_date)
    AND (p_end_date IS NULL OR s.show_date <= p_end_date)
    AND (p_theater_id IS NULL OR s.theater_id = p_theater_id)
    AND (p_movie_id IS NULL OR s.movie_id = p_movie_id)
    GROUP BY booking_status;
    
END//

-- Procedure 2: Generate seat availability report for a specific show
CREATE PROCEDURE GetSeatAvailabilityReport(
    IN p_show_id INT
)
BEGIN
    DECLARE v_total_seats INT DEFAULT 0;
    DECLARE v_available_seats INT DEFAULT 0;
    DECLARE v_booked_seats INT DEFAULT 0;
    DECLARE v_availability_percentage DECIMAL(5,2) DEFAULT 0;
    
    -- Get total seats for the show's screen
    SELECT COUNT(*) INTO v_total_seats
    FROM seats s
    JOIN screens sc ON sc.screen_id = s.screen_id
    JOIN shows sh ON sh.screen_id = sc.screen_id
    WHERE sh.show_id = p_show_id;
    
    -- Get booked seats
    SELECT COUNT(*) INTO v_booked_seats
    FROM booking_seats bs
    JOIN bookings b ON b.booking_id = bs.booking_id
    WHERE b.show_id = p_show_id AND b.booking_status = 'Confirmed';
    
    -- Calculate available seats
    SET v_available_seats = v_total_seats - v_booked_seats;
    SET v_availability_percentage = ROUND((v_available_seats / v_total_seats) * 100, 2);
    
    -- Return summary
    SELECT 
        p_show_id as show_id,
        v_total_seats as total_seats,
        v_available_seats as available_seats,
        v_booked_seats as booked_seats,
        v_availability_percentage as availability_percentage;
    
    -- Return detailed seat map
    SELECT 
        s.seat_id,
        s.seat_number,
        s.row_number,
        s.seat_type,
        CASE 
            WHEN bs.booking_id IS NOT NULL THEN 'Booked'
            WHEN s.seat_status = 'Maintenance' THEN 'Maintenance'
            ELSE 'Available'
        END as availability_status,
        CASE 
            WHEN bs.booking_id IS NOT NULL THEN b.booking_reference
            ELSE NULL
        END as booking_reference
    FROM seats s
    JOIN screens sc ON sc.screen_id = s.screen_id
    JOIN shows sh ON sh.screen_id = sc.screen_id
    LEFT JOIN booking_seats bs ON bs.seat_id = s.seat_id
    LEFT JOIN bookings b ON b.booking_id = bs.booking_id AND b.show_id = p_show_id AND b.booking_status = 'Confirmed'
    WHERE sh.show_id = p_show_id
    ORDER BY s.row_number, s.seat_number;
    
END//

-- Procedure 3: User loyalty analysis
CREATE PROCEDURE GetUserLoyaltyAnalysis(
    IN p_user_id INT
)
BEGIN
    DECLARE v_total_bookings INT DEFAULT 0;
    DECLARE v_total_spent DECIMAL(10,2) DEFAULT 0;
    DECLARE v_unique_movies INT DEFAULT 0;
    DECLARE v_unique_theaters INT DEFAULT 0;
    DECLARE v_avg_booking_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_loyalty_tier VARCHAR(20) DEFAULT 'Bronze';
    
    -- Calculate user metrics
    SELECT 
        COUNT(b.booking_id),
        COALESCE(SUM(b.total_amount), 0),
        COUNT(DISTINCT m.movie_id),
        COUNT(DISTINCT t.theater_id),
        COALESCE(AVG(b.total_amount), 0)
    INTO v_total_bookings, v_total_spent, v_unique_movies, v_unique_theaters, v_avg_booking_amount
    FROM bookings b
    JOIN shows s ON s.show_id = b.show_id
    JOIN movies m ON m.movie_id = s.movie_id
    JOIN theaters t ON t.theater_id = s.theater_id
    WHERE b.user_id = p_user_id AND b.booking_status = 'Confirmed';
    
    -- Determine loyalty tier
    IF v_total_spent >= 500 THEN
        SET v_loyalty_tier = 'Gold';
    ELSEIF v_total_spent >= 200 THEN
        SET v_loyalty_tier = 'Silver';
    ELSE
        SET v_loyalty_tier = 'Bronze';
    END IF;
    
    -- Return user analysis
    SELECT 
        p_user_id as user_id,
        v_total_bookings as total_bookings,
        v_total_spent as total_spent,
        v_unique_movies as unique_movies_watched,
        v_unique_theaters as theaters_visited,
        v_avg_booking_amount as avg_booking_amount,
        v_loyalty_tier as loyalty_tier;
    
    -- Return favorite genres
    SELECT 
        m.genre,
        COUNT(b.booking_id) as bookings_count,
        SUM(b.total_amount) as total_spent_on_genre
    FROM bookings b
    JOIN shows s ON s.show_id = b.show_id
    JOIN movies m ON m.movie_id = s.movie_id
    WHERE b.user_id = p_user_id AND b.booking_status = 'Confirmed'
    GROUP BY m.genre
    ORDER BY bookings_count DESC;
    
END//

-- Procedure 4: Theater capacity utilization analysis
CREATE PROCEDURE GetTheaterCapacityAnalysis(
    IN p_theater_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_total_capacity INT DEFAULT 0;
    DECLARE v_total_bookings INT DEFAULT 0;
    DECLARE v_utilization_percentage DECIMAL(5,2) DEFAULT 0;
    
    -- Get total capacity
    SELECT SUM(sc.total_seats) INTO v_total_capacity
    FROM screens sc
    WHERE sc.theater_id = p_theater_id;
    
    -- Get total bookings
    SELECT COUNT(bs.seat_id) INTO v_total_bookings
    FROM booking_seats bs
    JOIN bookings b ON b.booking_id = bs.booking_id
    JOIN shows s ON s.show_id = b.show_id
    WHERE s.theater_id = p_theater_id
    AND (p_start_date IS NULL OR s.show_date >= p_start_date)
    AND (p_end_date IS NULL OR s.show_date <= p_end_date)
    AND b.booking_status = 'Confirmed';
    
    -- Calculate utilization
    SET v_utilization_percentage = ROUND((v_total_bookings / (v_total_capacity * DATEDIFF(COALESCE(p_end_date, CURDATE()), COALESCE(p_start_date, CURDATE())))) * 100, 2);
    
    -- Return capacity analysis
    SELECT 
        p_theater_id as theater_id,
        v_total_capacity as total_capacity,
        v_total_bookings as total_bookings,
        v_utilization_percentage as utilization_percentage;
    
    -- Return daily utilization breakdown
    SELECT 
        s.show_date,
        COUNT(DISTINCT s.show_id) as shows_count,
        COUNT(bs.seat_id) as seats_booked,
        SUM(sc.total_seats) as total_seats_available,
        ROUND((COUNT(bs.seat_id) / SUM(sc.total_seats)) * 100, 2) as daily_utilization
    FROM shows s
    JOIN screens sc ON sc.screen_id = s.screen_id
    LEFT JOIN bookings b ON b.show_id = s.show_id AND b.booking_status = 'Confirmed'
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    WHERE s.theater_id = p_theater_id
    AND (p_start_date IS NULL OR s.show_date >= p_start_date)
    AND (p_end_date IS NULL OR s.show_date <= p_end_date)
    GROUP BY s.show_date
    ORDER BY s.show_date;
    
END//

DELIMITER ;

-- =============================================
-- ADVANCED VIEWS FOR REPORTING
-- =============================================

-- View 1: Comprehensive booking analytics
CREATE VIEW booking_analytics AS
SELECT 
    DATE(b.booking_date) as booking_date,
    m.title as movie_title,
    m.genre,
    t.theater_name,
    t.city,
    COUNT(b.booking_id) as total_bookings,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as avg_booking_amount,
    COUNT(DISTINCT b.user_id) as unique_customers,
    COUNT(bs.seat_id) as total_seats_booked,
    ROUND((COUNT(b.booking_id) / COUNT(DISTINCT s.show_id)) * 100, 2) as booking_rate
FROM bookings b
JOIN shows s ON s.show_id = b.show_id
JOIN movies m ON m.movie_id = s.movie_id
JOIN theaters t ON t.theater_id = s.theater_id
JOIN booking_seats bs ON bs.booking_id = b.booking_id
WHERE b.booking_status = 'Confirmed'
GROUP BY DATE(b.booking_date), s.movie_id, s.theater_id;

-- View 2: Customer segmentation analysis
CREATE VIEW customer_segmentation AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    COUNT(b.booking_id) as total_bookings,
    SUM(b.total_amount) as total_spent,
    AVG(b.total_amount) as avg_booking_amount,
    COUNT(DISTINCT m.movie_id) as unique_movies,
    COUNT(DISTINCT t.theater_id) as unique_theaters,
    MAX(b.booking_date) as last_booking_date,
    MIN(b.booking_date) as first_booking_date,
    DATEDIFF(CURDATE(), MAX(b.booking_date)) as days_since_last_booking,
    CASE 
        WHEN SUM(b.total_amount) >= 500 THEN 'Gold'
        WHEN SUM(b.total_amount) >= 200 THEN 'Silver'
        ELSE 'Bronze'
    END as customer_tier,
    CASE 
        WHEN COUNT(b.booking_id) >= 10 THEN 'Frequent'
        WHEN COUNT(b.booking_id) >= 5 THEN 'Regular'
        ELSE 'Occasional'
    END as booking_frequency
FROM users u
LEFT JOIN bookings b ON b.user_id = u.user_id AND b.booking_status = 'Confirmed'
LEFT JOIN shows s ON s.show_id = b.show_id
LEFT JOIN movies m ON m.movie_id = s.movie_id
LEFT JOIN theaters t ON t.theater_id = s.theater_id
GROUP BY u.user_id;

-- View 3: Movie performance metrics
CREATE VIEW movie_performance AS
SELECT 
    m.movie_id,
    m.title,
    m.genre,
    m.rating,
    m.duration,
    COUNT(DISTINCT s.show_id) as total_shows,
    COUNT(b.booking_id) as total_bookings,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as avg_booking_amount,
    COUNT(DISTINCT b.user_id) as unique_customers,
    COUNT(bs.seat_id) as total_seats_booked,
    ROUND((COUNT(b.booking_id) / COUNT(DISTINCT s.show_id)) * 100, 2) as booking_rate,
    ROUND((COUNT(bs.seat_id) / (COUNT(DISTINCT s.show_id) * AVG(sc.total_seats))) * 100, 2) as seat_utilization
FROM movies m
LEFT JOIN shows s ON s.movie_id = m.movie_id
LEFT JOIN screens sc ON sc.screen_id = s.screen_id
LEFT JOIN bookings b ON b.show_id = s.show_id AND b.booking_status = 'Confirmed'
LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
GROUP BY m.movie_id;

-- =============================================
-- SAMPLE QUERY EXECUTIONS
-- =============================================

-- Execute some sample queries to demonstrate functionality
SELECT '=== COMPLEX JOIN QUERY DEMONSTRATION ===' as query_type;
SELECT * FROM booking_analytics LIMIT 5;

SELECT '=== CUSTOMER SEGMENTATION DEMONSTRATION ===' as query_type;
SELECT * FROM customer_segmentation LIMIT 5;

SELECT '=== MOVIE PERFORMANCE DEMONSTRATION ===' as query_type;
SELECT * FROM movie_performance LIMIT 5;

-- Call stored procedures with sample data
SELECT '=== BOOKING ANALYTICS PROCEDURE DEMONSTRATION ===' as query_type;
CALL GetBookingAnalytics('2024-01-01', '2024-12-31', NULL, NULL);

SELECT '=== USER LOYALTY ANALYSIS DEMONSTRATION ===' as query_type;
CALL GetUserLoyaltyAnalysis(1);

SELECT '=== THEATER CAPACITY ANALYSIS DEMONSTRATION ===' as query_type;
CALL GetTheaterCapacityAnalysis(1, '2024-01-01', '2024-12-31');
