export interface PHPFileItem {
  name: string;
  path: string;
  description: string;
  language: string;
  code: string;
}

export const PHP_FILES_DATA: PHPFileItem[] = [
  {
    name: 'database.sql',
    path: 'database.sql',
    description: 'MySQL database schema, tables (Students, Events, Admin) and default admin seed.',
    language: 'sql',
    code: `-- SQL Schema for School Events Board database
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
-- Username: admin / Password: admin123
INSERT INTO Admin (username, password) 
VALUES ('admin', '$2y$10$tZ92uB6.h27.Q/Cj6tA6z.T1N4rS0mO6.Y0Hms2zG1U7B8WjW/5sK')
ON DUPLICATE KEY UPDATE id=id;`
  },
  {
    name: 'config.php',
    path: 'config.php',
    description: 'Database configuration and connection establishing PDO wrapper.',
    language: 'php',
    code: `<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'school_events_board');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    die("Database Connection Error: " . htmlspecialchars($e->getMessage()));
}`
  },
  {
    name: 'index.php',
    path: 'index.php',
    description: 'Public homepage of the School Events Board displaying approved events with category and search filtering.',
    language: 'php',
    code: `<?php
require_once 'config.php';

$searchQuery = trim($_GET['search'] ?? '');
$selectedCategory = trim($_GET['category'] ?? '');

try {
    $sql = "SELECT e.*, s.full_name AS student_name, s.class, s.section 
            FROM Events e 
            JOIN Students s ON e.student_id = s.id 
            WHERE e.status = 'Approved'";
    $params = [];
    
    if (!empty($searchQuery)) {
        $sql .= " AND (e.title LIKE ? OR e.description LIKE ?)";
        $params[] = "%$searchQuery%"; $params[] = "%$searchQuery%";
    }
    if (!empty($selectedCategory)) {
        $sql .= " AND e.category = ?";
        $params[] = $selectedCategory;
    }
    $sql .= " ORDER BY e.event_date ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $approvedEvents = $stmt->fetchAll();
} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}
?>
<!-- HTML code continued... See full file in workspace /php-version/index.php -->`
  },
  {
    name: 'signup.php',
    path: 'signup.php',
    description: 'Student registration handler and visual page with security encryption.',
    language: 'php',
    code: `<?php
require_once 'config.php';
if (isset($_SESSION['student_id'])) { header("Location: dashboard.php"); exit; }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullName = trim($_POST['full_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    $class = trim($_POST['class'] ?? '');
    $section = trim($_POST['section'] ?? '');
    $admissionNumber = trim($_POST['admission_number'] ?? '');

    if (empty($fullName) || empty($email) || empty($password) || empty($class) || empty($section) || empty($admissionNumber)) {
        $error = 'All fields are required.';
    } elseif ($password !== $confirmPassword) {
        $error = 'Passwords do not match.';
    } else {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        // Secure prepared statements insertion inside MySQL database...
    }
}
?>`
  },
  {
    name: 'login.php',
    path: 'login.php',
    description: 'Student login portal verification with password hashing and session creation.',
    language: 'php',
    code: `<?php
require_once 'config.php';
if (isset($_SESSION['student_id'])) { header("Location: dashboard.php"); exit; }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM Students WHERE email = ?");
    $stmt->execute([$email]);
    $student = $stmt->fetch();

    if ($student && password_verify($password, $student['password'])) {
        $_SESSION['student_id'] = $student['id'];
        $_SESSION['student_name'] = $student['full_name'];
        header("Location: dashboard.php"); exit;
    } else {
        $error = 'Invalid email or password.';
    }
}
?>`
  },
  {
    name: 'dashboard.php',
    path: 'dashboard.php',
    description: 'Student profile dashboard for submitting events, managing personal drafts, and viewing active cards.',
    language: 'php',
    code: `<?php
require_once 'config.php';
if (!isset($_SESSION['student_id'])) { header("Location: login.php"); exit; }

$studentId = $_SESSION['student_id'];
// Fetch metrics, handle event deletion request and standard multi-part file uploads...
?>`
  },
  {
    name: 'admin_login.php',
    path: 'admin_login.php',
    description: 'Separate admin authentication gatekeeping dashboard access.',
    language: 'php',
    code: `<?php
require_once 'config.php';
if (isset($_SESSION['admin_logged_in'])) { header("Location: admin_dashboard.php"); exit; }
// Authenticate against Admin table with password_verify...
?>`
  },
  {
    name: 'admin_dashboard.php',
    path: 'admin_dashboard.php',
    description: 'Unified administrative panel with tabbed navigation: Students summary, events approval, rejecting and deleting.',
    language: 'php',
    code: `<?php
require_once 'config.php';
if (!isset($_SESSION['admin_logged_in'])) { header("Location: admin_login.php"); exit; }
// Administrative controls, approve, reject, delete and students accounts deletion...
?>`
  },
  {
    name: 'style.css',
    path: 'assets/css/style.css',
    description: 'Main master styling containing variables, general layout, animations, cards, and modal components.',
    language: 'css',
    code: `/* CSS Variables & Global Dark Theme Layout */`
  },
  {
    name: 'dashboard.css',
    path: 'assets/css/dashboard.css',
    description: 'Student dashboard layouts, file-drop areas, image previews, stats grid and badges.',
    language: 'css',
    code: `/* Dashboard styles & file drag-drop styling */`
  },
  {
    name: 'admin.css',
    path: 'assets/css/admin.css',
    description: 'Administrative layout, split-pane sidebar, system stats highlights and action lists.',
    language: 'css',
    code: `/* Admin Panel, split layouts & actions panels */`
  },
  {
    name: 'validation.js',
    path: 'assets/js/validation.js',
    description: 'Front-end validations preventing erroneous requests and supporting user experience.',
    language: 'javascript',
    code: `/* Clientside validations for SignUp, Login, and Submissions */`
  },
  {
    name: 'main.js',
    path: 'assets/js/main.js',
    description: 'Scrolling effects, sticky headers, and smooth transitions.',
    language: 'javascript',
    code: `/* Interactive general site scripts */`
  }
];
