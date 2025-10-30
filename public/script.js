class MovieBookingApp {
    constructor() {
        this.apiBase = 'http://localhost:3000/api';
        this.currentUser = null;
        this.selectedShow = null;
        this.selectedSeats = [];
        this.allMovies = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.restoreUserSession();
        this.loadInitialData();
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(link.getAttribute('href').substring(1));
                this.updateActiveNavLink(link);
            });
        });

        const events = [
            ['loginBtn', 'click', () => this.showModal('loginModal')],
            ['registerBtn', 'click', () => this.showModal('registerModal')],
            ['logoutBtn', 'click', () => this.logout()],
            ['searchBtn', 'click', () => this.searchMovies()],
            ['movieSearch', 'keypress', (e) => e.key === 'Enter' && this.searchMovies()],
            ['loginForm', 'submit', (e) => this.handleAuth(e, 'login')],
            ['registerForm', 'submit', (e) => this.handleAuth(e, 'register')]
        ];

        events.forEach(([id, event, handler]) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener(event, handler);
        });

        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => this.hideModal(e.target.closest('.modal')));
        });

        setTimeout(() => {
            const filters = [
                ['dateFilter', 'change', () => this.loadShows()],
                ['theaterFilter', 'change', () => this.loadShows()],
                ['genreFilter', 'change', () => this.filterMovies()],
                ['ratingFilter', 'change', () => this.filterMovies()],
                ['clearFiltersBtn', 'click', () => this.clearFilters()]
            ];
            filters.forEach(([id, event, handler]) => {
                const element = document.getElementById(id);
                if (element) element.addEventListener(event, handler);
            });
        }, 100);
    }

    async loadInitialData() {
        try {
            this.setupDateFilters();
            await Promise.all([this.loadMovies(), this.loadTheaters(), this.loadShows()]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Error loading data', 'error');
        }
    }

    setupDateFilters() {
        const dates = ['today', 'tomorrow', 'dayAfter'];
        const today = new Date();
        
        dates.forEach((date, i) => {
            const option = document.getElementById(`${date}Option`);
            if (option) {
                const dateObj = new Date(today);
                dateObj.setDate(today.getDate() + i);
                option.value = dateObj.toISOString().split('T')[0];
                option.textContent = `${date === 'today' ? 'Today' : date === 'tomorrow' ? 'Tomorrow' : 'Day After'} (${dateObj.toLocaleDateString()})`;
            }
        });
    }

    restoreUserSession() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateAuthUI();
        }
    }

    updateAuthUI() {
        const navAuth = document.getElementById('navAuth');
        const navUser = document.getElementById('navUser');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            navAuth.style.display = 'none';
            navUser.style.display = 'flex';
            userName.textContent = this.currentUser.username;
        } else {
            navAuth.style.display = 'flex';
            navUser.style.display = 'none';
        }
    }

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            if (sectionId === 'bookings' && this.currentUser) this.loadUserBookings();
            if (sectionId === 'shows') this.loadShows();
        }
    }

    updateActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        activeLink.classList.add('active');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const config = {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Request failed');
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async handleAuth(e, type) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await this.makeRequest(`/auth/${type}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            this.currentUser = response.user;
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.updateAuthUI();
            this.hideModal(document.getElementById(`${type}Modal`));
            this.showToast(`${type === 'login' ? 'Login' : 'Registration'} successful!`, 'success');
            form.reset();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateAuthUI();
        this.showToast('Logged out successfully', 'info');
        this.showSection('home');
    }

    async loadMovies() {
        try {
            const movies = await this.makeRequest('/movies');
            this.allMovies = movies;
            this.displayMovies(movies, 'featuredMovies');
            this.displayMovies(movies, 'allMovies');
        } catch (error) {
            console.error('Error loading movies:', error);
            this.showToast('Error loading movies', 'error');
        }
    }

    filterMovies() {
        if (!this.allMovies?.length) return;

        const genreFilter = document.getElementById('genreFilter')?.value || '';
        const ratingFilter = document.getElementById('ratingFilter')?.value || '';

        const filteredMovies = this.allMovies.filter(movie => {
            if (genreFilter && movie.genre !== genreFilter) return false;
            if (ratingFilter && movie.rating < parseFloat(ratingFilter)) return false;
            return true;
        });

        this.displayMovies(filteredMovies, 'allMovies');
    }

    clearFilters() {
        document.getElementById('genreFilter').value = '';
        document.getElementById('ratingFilter').value = '';
        if (this.allMovies?.length) this.displayMovies(this.allMovies, 'allMovies');
    }

    displayMovies(movies, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        movies.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `
                <div class="movie-poster">
                    ${movie.poster_url ? `<img src="${movie.poster_url}" alt="${movie.title}">` : '<i class="fas fa-film"></i>'}
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <p class="movie-genre">${movie.genre}</p>
                    <div class="movie-rating">
                        <span class="rating-value">${movie.rating}/10</span>
                    </div>
                    <p class="movie-duration">${movie.duration} minutes</p>
                    <p class="movie-description">${movie.description ? movie.description.substring(0, 100) + '...' : 'No description available'}</p>
                    <button class="btn btn-primary" onclick="app.showMovieDetails(${movie.movie_id})">View Details</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    formatShowDateTime(dateStr, timeStr) {
        try {
            const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T' + timeStr);
            return isNaN(date.getTime()) ? `${dateStr} at ${timeStr}` : 
                date.toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit', hour12: true
                });
        } catch (error) {
            return `${dateStr} at ${timeStr}`;
        }
    }

    async showMovieDetails(movieId) {
        try {
            const [movie, shows] = await Promise.all([
                this.makeRequest(`/movies/${movieId}`),
                this.makeRequest(`/shows?movieId=${movieId}`)
            ]);

            const modal = document.getElementById('movieModal');
            const detailsContainer = document.getElementById('movieDetails');

            detailsContainer.innerHTML = `
                <div class="movie-details-poster">
                    ${movie.poster_url ? `<img src="${movie.poster_url}" alt="${movie.title}">` : '<i class="fas fa-film"></i>'}
                </div>
                <div class="movie-details-info">
                    <h2>${movie.title}</h2>
                    <p class="genre">${movie.genre}</p>
                    <div class="rating">
                        <span class="rating-value">${movie.rating}/10</span>
                    </div>
                    <p class="duration">Duration: ${movie.duration} minutes</p>
                    <p class="description">${movie.description || 'No description available'}</p>
                    <div class="shows-list">
                        <h3>Available Shows</h3>
                        ${shows.length > 0 ? shows.map(show => `
                            <div class="show-card" onclick="app.selectShow(${show.show_id})">
                                <div class="show-info">
                                    <div class="show-details">
                                        <div class="show-time">${this.formatShowDateTime(show.show_date, show.show_time)}</div>
                                        <div class="show-theater">${show.theater_name}</div>
                                    </div>
                                    <div class="show-price">$${show.price_per_ticket}</div>
                                </div>
                            </div>
                        `).join('') : '<p>No shows available</p>'}
                    </div>
                </div>
            `;

            this.showModal('movieModal');
        } catch (error) {
            console.error('Error loading movie details:', error);
            this.showToast('Error loading movie details', 'error');
        }
    }

    selectShow(showId) {
        this.selectedShow = showId;
        this.hideModal(document.getElementById('movieModal'));
        this.showBookingModal(showId);
    }

    async showBookingModal(showId) {
        if (!this.currentUser) {
            this.showToast('Please login to book tickets', 'warning');
            this.showModal('loginModal');
            return;
        }

        try {
            const seats = await this.makeRequest(`/shows/${showId}/seats`);
            if (!seats?.length) {
                this.showToast('No seats available for this show', 'error');
                return;
            }

            const modal = document.getElementById('bookingModal');
            const contentContainer = document.getElementById('bookingContent');

            const rowsMap = seats.reduce((acc, seat) => {
                const key = seat.row_number || 'Row';
                if (!acc[key]) acc[key] = [];
                acc[key].push(seat);
                return acc;
            }, {});
            const rowKeys = Object.keys(rowsMap).sort();
            const seatRowsHtml = rowKeys.map(row => {
                const rowSeats = rowsMap[row].sort((a, b) => {
                    const na = parseInt(String(a.seat_number).replace(/\D/g, '')) || 0;
                    const nb = parseInt(String(b.seat_number).replace(/\D/g, '')) || 0;
                    return na - nb;
                });
                return `
                    <div class="seat-row">
                        <span class="row-label">${row}</span>
                        <div class="row-seats" style="grid-template-columns: repeat(${rowSeats.length}, 44px);">
                            ${rowSeats.map(seat => `
                                <div class="seat ${seat.availability.toLowerCase()}" 
                                     title="${seat.seat_number} (${seat.seat_type})"
                                     data-seat-id="${seat.seat_id}"
                                     onclick="app.selectSeat(${seat.seat_id}, '${seat.availability}')">
                                    ${seat.seat_number}
                                </div>
                            `).join('')}
                        </div>
                        <span class="row-label">${row}</span>
                    </div>
                `;
            }).join('');

            contentContainer.innerHTML = `
                <div class="seat-layout">
                    <div class="screen-bar">SCREEN</div>
                    <div class="legend">
                        <span><i class="legend-box available"></i>Available</span>
                        <span><i class="legend-box selected"></i>Selected</span>
                        <span><i class="legend-box booked"></i>Booked</span>
                    </div>
                    <div class="seat-grid" id="seatGrid">
                        ${seatRowsHtml}
                    </div>
                </div>
                <div class="booking-summary" id="bookingSummary">
                    <h3>Booking Summary</h3>
                    <div class="summary-item">
                        <span>Selected Seats:</span>
                        <span id="selectedSeatsList">None</span>
                    </div>
                    <div class="summary-item">
                        <span>Price per ticket:</span>
                        <span id="pricePerTicket">$12</span>
                    </div>
                    <div class="summary-total">
                        <span>Total:</span>
                        <span id="totalAmount">$0</span>
                    </div>
                    <button class="btn btn-primary" id="confirmBooking" onclick="app.confirmBooking()">Confirm Booking</button>
                </div>
            `;

            this.selectedSeats = [];
            this.showModal('bookingModal');
        } catch (error) {
            this.showToast('Error loading seat information', 'error');
        }
    }

    selectSeat(seatId, availability) {
        if (availability === 'Booked') return;

        const seatElement = document.querySelector(`[data-seat-id="${seatId}"]`);
        const seatIndex = this.selectedSeats.indexOf(seatId);

        if (seatIndex > -1) {
            this.selectedSeats.splice(seatIndex, 1);
            seatElement.classList.remove('selected');
        } else {
            this.selectedSeats.push(seatId);
            seatElement.classList.add('selected');
        }

        this.updateBookingSummary();
    }

    updateBookingSummary() {
        const selectedSeatsList = document.getElementById('selectedSeatsList');
        const totalAmount = document.getElementById('totalAmount');

        if (this.selectedSeats.length > 0) {
            const seatNumbers = this.selectedSeats.map(seatId => 
                document.querySelector(`[data-seat-id="${seatId}"]`).textContent
            ).join(', ');

            selectedSeatsList.textContent = seatNumbers;
            const pricePerTicket = 12;
            const total = this.selectedSeats.length * pricePerTicket;
            totalAmount.textContent = `$${total}`;
        } else {
            selectedSeatsList.textContent = 'None';
            totalAmount.textContent = '$0';
        }
    }

    async confirmBooking() {
        if (this.selectedSeats.length === 0) {
            this.showToast('Please select at least one seat', 'warning');
            return;
        }

        try {
            const response = await this.makeRequest('/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    showId: this.selectedShow,
                    seatIds: this.selectedSeats,
                    userId: this.currentUser.userId
                })
            });

            this.hideModal(document.getElementById('bookingModal'));
            this.showToast(`Booking confirmed! Booking ID: ${response.bookingId}`, 'success');
            this.selectedSeats = [];
            this.selectedShow = null;
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async loadTheaters() {
        try {
            const theaters = await this.makeRequest('/theaters');
            this.displayTheaters(theaters);
        } catch (error) {
            console.error('Error loading theaters:', error);
            this.showToast('Error loading theaters', 'error');
        }
    }

    async loadShows() {
        try {
            const dateFilter = document.getElementById('dateFilter')?.value || '';
            const theaterFilter = document.getElementById('theaterFilter')?.value || '';
            
            let url = '/shows';
            const params = [];
            if (dateFilter) params.push(`date=${dateFilter}`);
            if (theaterFilter) params.push(`theaterId=${theaterFilter}`);
            if (params.length > 0) url += '?' + params.join('&');
            
            const shows = await this.makeRequest(url);
            this.displayShows(shows);
        } catch (error) {
            console.error('Error loading shows:', error);
            this.showToast('Error loading shows', 'error');
        }
    }

    displayTheaters(theaters) {
        const container = document.getElementById('theatersList');
        if (!container) return;

        container.innerHTML = '';
        theaters.forEach(theater => {
            const theaterCard = document.createElement('div');
            theaterCard.className = 'theater-card';
            theaterCard.innerHTML = `
                <h3 class="theater-name">${theater.theater_name}</h3>
                <p class="theater-location">${theater.location}, ${theater.city}</p>
                <div class="theater-info">
                    <span>Seats: ${theater.total_seats}</span>
                </div>
                <p class="theater-contact">Phone: ${theater.contact_phone || 'N/A'}</p>
            `;
            container.appendChild(theaterCard);
        });

        const theaterFilter = document.getElementById('theaterFilter');
        if (theaterFilter) {
            theaterFilter.innerHTML = '<option value="">All Theaters</option>';
            theaters.forEach(theater => {
                const option = document.createElement('option');
                option.value = theater.theater_id;
                option.textContent = theater.theater_name;
                theaterFilter.appendChild(option);
            });
        }
    }

    displayShows(shows) {
        const container = document.getElementById('showsList');
        if (!container) return;

        container.innerHTML = '';
        if (shows.length === 0) {
            container.innerHTML = '<p class="no-data">No shows available</p>';
            return;
        }

        shows.forEach(show => {
            const showCard = document.createElement('div');
            showCard.className = 'show-card';
            showCard.innerHTML = `
                <div class="show-info">
                    <h3 class="movie-title">${show.movie_title}</h3>
                    <div class="show-details">
                        <div class="show-time">${this.formatShowDateTime(show.show_date, show.show_time)}</div>
                        <div class="show-theater">${show.theater_name}</div>
                        <div class="show-location">${show.location}</div>
                    </div>
                    <div class="show-price">$${show.price_per_ticket}</div>
                    <div class="show-seats">Available: ${show.available_seats} seats</div>
                </div>
                <button class="btn btn-primary" onclick="app.selectShow(${show.show_id})">Book Now</button>
            `;
            container.appendChild(showCard);
        });
    }

    async loadUserBookings() {
        if (!this.currentUser) return;

        try {
            const bookings = await this.makeRequest(`/bookings/${this.currentUser.userId}`);
            this.displayBookings(bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showToast('Error loading bookings', 'error');
        }
    }

    displayBookings(bookings) {
        const container = document.getElementById('bookingsList');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = '<p>No bookings found.</p>';
            return;
        }

        container.innerHTML = '';
        bookings.forEach(booking => {
            const bookingCard = document.createElement('div');
            bookingCard.className = 'booking-card';
            bookingCard.innerHTML = `
                <div class="booking-header">
                    <span class="booking-reference">Booking #${booking.booking_id}</span>
                    <span class="booking-status ${booking.booking_status.toLowerCase()}">${booking.booking_status}</span>
                </div>
                <div class="booking-details">
                    <div class="booking-detail">
                        <label>Movie</label>
                        <span>${booking.movie_title}</span>
                    </div>
                    <div class="booking-detail">
                        <label>Theater</label>
                        <span>${booking.theater_name}</span>
                    </div>
                    <div class="booking-detail">
                        <label>Show Time</label>
                        <span>${this.formatShowDateTime(booking.show_date, booking.show_time)}</span>
                    </div>
                    <div class="booking-detail">
                        <label>Seats</label>
                        <span>${booking.seats_count} seats</span>
                    </div>
                    <div class="booking-detail">
                        <label>Total Amount</label>
                        <span>$${booking.total_amount}</span>
                    </div>
                </div>
                <div class="booking-actions">
                    ${booking.booking_status === 'Confirmed' ? 
                        `<button class="btn btn-danger" onclick="app.cancelBooking(${booking.booking_id})">Cancel Booking</button>` : 
                        ''
                    }
                </div>
            `;
            container.appendChild(bookingCard);
        });
    }

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            const response = await this.makeRequest(`/bookings/${bookingId}/cancel`, {
                method: 'PUT'
            });

            this.showToast(`Booking cancelled. Refund: $${response.refundAmount}`, 'info');
            this.loadUserBookings();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async searchMovies() {
        const searchTerm = document.getElementById('movieSearch').value.trim();
        if (!searchTerm) {
            document.getElementById('genreFilter').value = '';
            document.getElementById('ratingFilter').value = '';
            this.loadMovies();
            return;
        }

        try {
            const movies = this.allMovies.length > 0 ? this.allMovies : await this.makeRequest('/movies');
            const filteredMovies = movies.filter(movie => 
                movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                movie.genre.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            this.displayMovies(filteredMovies, 'featuredMovies');
            this.displayMovies(filteredMovies, 'allMovies');
        } catch (error) {
            this.showToast('Error searching movies', 'error');
        }
    }
}

const app = new MovieBookingApp();