const express = require('express');
const cors = require('cors');
const cookieP = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const homeRoutes = require('./routes/home.routes');
const adminRoutes = require('./routes/admin.routes')
const roomRoutes = require('./routes/room.routes');
const hotelRoutes = require('./routes/hotel.routes');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const bookingRoutes = require('./routes/booking.routes');

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(cookieP());

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth',authRoutes);
app.use('/api',homeRoutes);
app.use('/api/admin',adminRoutes)
app.use('/api/Hotel',hotelRoutes);
app.use('/api/Room',roomRoutes);
app.use('/api/bookings', bookingRoutes);

module.exports = app;
