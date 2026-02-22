const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');
const complaintRoutes = require('./routes/complaints');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for your frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/complaints', complaintRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

// Serve your main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/org_index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
const startServer = async () => {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.warn('⚠️  Server starting without database connection');
    }

    app.listen(PORT, () => {
        console.log(`🚀 CivicFix server running on http://localhost:${PORT}`);
        console.log(`📁 Serving frontend from: ${path.join(__dirname, '../frontend')}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
};

startServer();