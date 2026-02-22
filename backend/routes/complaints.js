const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

// GET routes
router.get('/', complaintController.getAllComplaints);
router.get('/stats', complaintController.getStats);
router.get('/:id', complaintController.getComplaintById);

// POST routes
router.post('/', complaintController.createComplaint);

// PUT routes
router.put('/:id/status', complaintController.updateComplaintStatus);
router.put('/:id/upvote', complaintController.upvoteComplaint);

module.exports = router;