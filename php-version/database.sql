-- SQL Schema for School Events Board database
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS school_events_board;
USE school_events_board;

-- Students table
CREATE TABLE IF NOT EXISTS Students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    class VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL,
    admission_number VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS Events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    image VARCHAR(255) DEFAULT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Students(id) ON DELETE CASCADE
);

-- Admin table
CREATE TABLE IF NOT EXISTS Admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Seed default Admin credentials
-- Username: admin
-- Password: admin123 (hashed: $2y$10$tZ92uB6.h27.Q/Cj6tA6z.T1N4rS0mO6.Y0Hms2zG1U7B8WjW/5sK)
-- You can change this admin password to whatever you like.
INSERT INTO Admin (username, password) 
VALUES ('admin', '$2y$10$tZ92uB6.h27.Q/Cj6tA6z.T1N4rS0mO6.Y0Hms2zG1U7B8WjW/5sK')
ON DUPLICATE KEY UPDATE id=id;
