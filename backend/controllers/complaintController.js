const { pool } = require('../config/db');

// GET all complaints
const getAllComplaints = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                c.id,
                c.title,
                c.description,
                c.status,
                c.priority,
                c.location,
                c.latitude,
                c.longitude,
                c.created_at,
                c.sla_deadline,
                c.upvotes,
                cat.name as category_name,
                d.name as department_name,
                w.name as ward_name,
                CONCAT(ct.first_name, ' ', ct.last_name) as citizen_name
            FROM complaints c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN wards w ON c.ward_id = w.id
            LEFT JOIN citizens ct ON c.citizen_id = ct.id
            ORDER BY c.created_at DESC
            LIMIT 50
        `);

        // Add image URLs (you'll implement image upload later)
        const complaintsWithImages = rows.map(complaint => ({
            ...complaint,
            image: getComplaintImage(complaint.id) // Function to get image path
        }));

        res.json({
            success: true,
            count: rows.length,
            data: complaintsWithImages
        });
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching complaints',
            error: error.message
        });
    }
};

// GET single complaint by ID
const getComplaintById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.query(`
            SELECT 
                c.*,
                cat.name as category_name,
                d.name as department_name,
                w.name as ward_name,
                CONCAT(ct.first_name, ' ', ct.last_name) as citizen_name
            FROM complaints c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN wards w ON c.ward_id = w.id
            LEFT JOIN citizens ct ON c.citizen_id = ct.id
            WHERE c.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Get comments for this complaint
        const [comments] = await pool.query(`
            SELECT 
                ch.*,
                CONCAT(ct.first_name, ' ', ct.last_name) as user_name
            FROM complaint_history ch
            LEFT JOIN citizens ct ON ch.changed_by = ct.id
            WHERE ch.complaint_id = ?
            ORDER BY ch.created_at DESC
        `, [id]);

        res.json({
            success: true,
            data: {
                ...rows[0],
                comments
            }
        });
    } catch (error) {
        console.error('Error fetching complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching complaint',
            error: error.message
        });
    }
};

// POST new complaint
const createComplaint = async (req, res) => {
    try {
        const {
            title,
            description,
            category_id,
            location,
            latitude,
            longitude,
            ward_id,
            citizen_id = 1, // Temporary until auth is implemented
            priority = 'MEDIUM'
        } = req.body;

        // Validate required fields
        if (!title || !description || !category_id || !location) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, description, category_id, location'
            });
        }

        // Get department ID from category
        const [category] = await pool.query(
            'SELECT department_id, sla_hours FROM categories WHERE id = ?',
            [category_id]
        );

        if (category.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            });
        }

        const department_id = category[0].department_id;
        const sla_hours = category[0].sla_hours || 48; // Default 48 hours if not set

        // Calculate SLA deadline
        const sla_deadline = new Date();
        sla_deadline.setHours(sla_deadline.getHours() + sla_hours);

        // Insert complaint
        const [result] = await pool.query(`
            INSERT INTO complaints (
                title, description, category_id, department_id, 
                ward_id, citizen_id, location, latitude, longitude,
                status, priority, sla_deadline, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, NOW(), NOW())
        `, [
            title, description, category_id, department_id,
            ward_id || null, citizen_id, location, latitude || null, longitude || null,
            priority, sla_deadline
        ]);

        // Add entry to complaint history
        await pool.query(`
            INSERT INTO complaint_history (complaint_id, status, changed_by, remarks, created_at)
            VALUES (?, 'SUBMITTED', ?, ?, NOW())
        `, [result.insertId, citizen_id, 'Complaint submitted by citizen']);

        // Get the newly created complaint
        const [newComplaint] = await pool.query(`
            SELECT 
                c.*,
                cat.name as category_name,
                d.name as department_name
            FROM complaints c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN departments d ON c.department_id = d.id
            WHERE c.id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Complaint created successfully',
            data: newComplaint[0]
        });

    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating complaint',
            error: error.message
        });
    }
};

// UPDATE complaint status
const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks, changed_by = 1 } = req.body;

        const validStatuses = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Update complaint status
        await pool.query(
            'UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        // Add to history
        await pool.query(`
            INSERT INTO complaint_history (complaint_id, status, changed_by, remarks, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [id, status, changed_by, remarks || `Status updated to ${status}`]);

        res.json({
            success: true,
            message: 'Complaint status updated successfully'
        });

    } catch (error) {
        console.error('Error updating complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating complaint',
            error: error.message
        });
    }
};

// UPVOTE complaint
const upvoteComplaint = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE complaints SET upvotes = upvotes + 1 WHERE id = ?',
            [id]
        );

        const [result] = await pool.query(
            'SELECT upvotes FROM complaints WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Upvoted successfully',
            upvotes: result[0].upvotes
        });

    } catch (error) {
        console.error('Error upvoting complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Error upvoting complaint',
            error: error.message
        });
    }
};

// GET dashboard statistics
const getStats = async (req, res) => {
    try {
        // Total complaints
        const [total] = await pool.query('SELECT COUNT(*) as count FROM complaints');
        
        // Complaints by status
        const [byStatus] = await pool.query(`
            SELECT status, COUNT(*) as count 
            FROM complaints 
            GROUP BY status
        `);
        
        // Complaints by category
        const [byCategory] = await pool.query(`
            SELECT cat.name, COUNT(*) as count 
            FROM complaints c
            JOIN categories cat ON c.category_id = cat.id
            GROUP BY cat.name
        `);
        
        // SLA breach rate
        const [sla] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN sla_deadline < NOW() AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as breached
            FROM complaints
        `);
        
        // Average resolution time
        const [avgTime] = await pool.query(`
            SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours
            FROM complaints
            WHERE status IN ('RESOLVED', 'CLOSED')
        `);

        res.json({
            success: true,
            data: {
                total: total[0].count,
                byStatus: byStatus.reduce((acc, curr) => ({...acc, [curr.status]: curr.count}), {}),
                byCategory: byCategory,
                slaBreachRate: sla[0].total > 0 ? (sla[0].breached / sla[0].total * 100).toFixed(1) : 0,
                avgResolutionTime: Math.round(avgTime[0].avg_hours || 0)
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};

// Helper function (implement based on your image storage strategy)
const getComplaintImage = (complaintId) => {
    // Return default image or implement logic to get uploaded image
    return `https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400`;
};

module.exports = {
    getAllComplaints,
    getComplaintById,
    createComplaint,
    updateComplaintStatus,
    upvoteComplaint,
    getStats
};