const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieP = require('cookie-parser');
const compression = require('compression');
const authRoutes = require('./routes/auth.routes');
const homeRoutes = require('./routes/home.routes');
const adminRoutes = require('./routes/admin.routes')
const roomRoutes = require('./routes/room.routes');
const hotelRoutes = require('./routes/hotel.routes');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const bookingRoutes = require('./routes/booking.routes');
const aiRoutes = require('./routes/ai.routes');
const { cacheMiddleware } = require('./middleware/cache.middleware');

// Compression middleware for all responses
app.use(compression());

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(cookieP());

// Serve static files with caching headers
app.use('/images', express.static(path.join(__dirname, '..', 'images'), {
  maxAge: '7d', // Cache images for 7 days
  etag: true,
  lastModified: true
}));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth',authRoutes);
app.use('/api',homeRoutes);
app.use('/api/admin',adminRoutes)
app.use('/api/Hotel', hotelRoutes); // Add caching to hotel routes
app.use('/api/Room', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ai', aiRoutes);

module.exports = app;
