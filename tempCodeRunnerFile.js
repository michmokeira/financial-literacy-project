//routes
const authRoutes = require('./routes/authRoutes');// Import authentication routes
const dashboardRoutes = require('./routes/dashboardRoutes');// Import dashboard routes
app.use('/', authRoutes);// Use authentication routes for the root path
app.use('/dashboard', dashboardRoutes);// Use dashboard routes for the "/dashboard" path