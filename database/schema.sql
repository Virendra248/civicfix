-- ============================================
-- CivicFix Database Schema
-- ============================================

-- Use your database
USE civic_grievance_system;

-- ============================================
-- Table: departments
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    head_officer VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: categories
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    department_id INT,
    sla_hours INT DEFAULT 48,
    priority_level ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    FOREIGN KEY (department_id) REFERENCES departments(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: wards
-- ============================================
CREATE TABLE IF NOT EXISTS wards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ward_number VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    councillor_name VARCHAR(100),
    zone VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: citizens
-- ============================================
CREATE TABLE IF NOT EXISTS citizens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    address TEXT,
    ward_id INT,
    is_verified BOOLEAN DEFAULT FALSE,
    trust_score INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ward_id) REFERENCES wards(id)
);

-- ============================================
-- Table: complaints
-- ============================================
CREATE TABLE IF NOT EXISTS complaints (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT,
    department_id INT,
    ward_id INT,
    citizen_id INT,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status ENUM('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED') DEFAULT 'SUBMITTED',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    upvotes INT DEFAULT 0,
    image_path VARCHAR(255),
    sla_deadline DATETIME,
    resolved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (ward_id) REFERENCES wards(id),
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

-- ============================================
-- Table: complaint_history
-- ============================================
CREATE TABLE IF NOT EXISTS complaint_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    complaint_id INT,
    status VARCHAR(50),
    changed_by INT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (changed_by) REFERENCES citizens(id)
);

-- ============================================
-- Table: sla_config
-- ============================================
CREATE TABLE IF NOT EXISTS sla_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,
    priority_level ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
    hours_to_resolve INT,
    escalation_level INT DEFAULT 1,
    escalation_email VARCHAR(100),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ============================================
-- Table: verifications
-- ============================================
CREATE TABLE IF NOT EXISTS verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    complaint_id INT,
    citizen_id INT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date DATETIME,
    remarks TEXT,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

-- ============================================
-- Insert Default Data
-- ============================================

-- Insert departments
INSERT INTO departments (name, description, head_officer, contact_email) VALUES
('Road Department', 'Handles road-related issues', 'John Smith', 'roads@city.gov'),
('Electric Department', 'Handles street lights and electrical issues', 'Sarah Johnson', 'electric@city.gov'),
('Water Department', 'Handles water supply and drainage', 'Mike Wilson', 'water@city.gov'),
('Sanitation Department', 'Handles garbage and cleaning', 'Lisa Brown', 'sanitation@city.gov');

-- Insert wards
INSERT INTO wards (ward_number, name, councillor, zone) VALUES
('W001', 'Central Ward', 'Robert Taylor', 'Zone A'),
('W002', 'North Ward', 'Emily Davis', 'Zone B'),
('W003', 'South Ward', 'David Lee', 'Zone A'),
('W004', 'East Ward', 'Patricia White', 'Zone C');

-- Insert categories
INSERT INTO categories (name, description, department_id, sla_hours) VALUES
('Pothole Repair', 'Fix potholes on roads', 1, 48),
('Street Light Repair', 'Fix broken street lights', 2, 72),
('Water Leakage', 'Fix water pipe leaks', 3, 24),
('Sewage Blockage', 'Clear blocked sewage', 3, 48),
('Garbage Collection', 'Collect overflowing garbage', 4, 24),
('Road Damage', 'Repair damaged roads', 1, 96);

-- Insert sample citizen (for testing)
INSERT INTO citizens (email, first_name, last_name, phone, ward_id, trust_score) VALUES
('citizen@test.com', 'Test', 'User', '1234567890', 1, 100);

-- Insert sample complaints
INSERT INTO complaints (title, description, category_id, department_id, ward_id, citizen_id, location, status, priority, sla_deadline) VALUES
('Large Pothole on Main Street', 'Deep pothole causing damage to vehicles', 1, 1, 1, 1, 'Main Street & 5th Ave', 'IN_PROGRESS', 'HIGH', DATE_ADD(NOW(), INTERVAL 48 HOUR)),
('Street Light Not Working', 'Dark area near park, safety concern', 2, 2, 1, 1, 'Central Park West', 'SUBMITTED', 'MEDIUM', DATE_ADD(NOW(), INTERVAL 72 HOUR)),
('Water Leakage on Park Road', 'Pipe burst, water flowing on road', 3, 3, 2, 1, 'Park Road', 'ASSIGNED', 'URGENT', DATE_ADD(NOW(), INTERVAL 24 HOUR));

-- Show success message
SELECT '✅ Database schema created successfully!' as 'Message';
SHOW TABLES;