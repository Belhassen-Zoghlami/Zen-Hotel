const express = require('express');
const cors = require('cors');
const cookieP = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const homeRoutes = require('./routes/home.routes');
const adminRoutes = require('./routes/admin.routes')
const roomRoutes = require('./routes/room.routes');
const hotelRoutes = require('./routes/hotel.routes');
const app = express();

app.use(express.json());
app.use(cors());
app.use(cookieP());
app.use('/api/auth',authRoutes);
app.use('/api',homeRoutes);
app.use('/api/admin',adminRoutes)
app.use('/api/Hotel',hotelRoutes);
app.use('/api/Room',roomRoutes);

module.exports = app;
