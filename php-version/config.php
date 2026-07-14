<?php
/**
 * Configuration file for School Events Board
 * Establishes PDO MySQL database connection
 */

// Database settings
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'school_events_board');

// Start PHP session securely
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
    // Elegant fallback screen on database failure
    die("
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Database Connection Error</title>
        <style>
            body {
                background: #0f0f0f;
                color: #f3f4f6;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
            }
            .card {
                background: rgba(30, 30, 45, 0.8);
                border: 1px solid rgba(239, 68, 68, 0.3);
                padding: 2rem;
                border-radius: 12px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            h1 { color: #ef4444; margin-top: 0; }
            p { color: #9ca3af; line-height: 1.6; }
            code { background: #000; padding: 0.2rem 0.5rem; border-radius: 4px; color: #f43f5e; }
        </style>
    </head>
    <body>
        <div class='card'>
            <h1>Database Error</h1>
            <p>Could not connect to the database <code>" . DB_NAME . "</code>.</p>
            <p>Please ensure your MySQL server (XAMPP/WAMP) is running, and you have imported the <code>database.sql</code> file.</p>
            <p style='font-size: 0.8rem; color: #6b7280;'>Error details: " . htmlspecialchars($e->getMessage()) . "</p>
        </div>
    </body>
    </html>
    ");
}
