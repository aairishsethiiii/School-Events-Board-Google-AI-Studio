<?php
/**
 * Admin Login Page
 * Independent login for school event board administrators
 */
require_once 'config.php';

// If admin is already logged in, redirect to admin dashboard
if (isset($_SESSION['admin_logged_in'])) {
    header("Location: admin_dashboard.php");
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password.';
    } else {
        try {
            $stmt = $pdo->prepare("SELECT * FROM Admin WHERE username = ?");
            $stmt->execute([$username]);
            $admin = $stmt->fetch();

            if ($admin && password_verify($password, $admin['password'])) {
                // Regenerate session ID
                session_regenerate_id(true);

                $_SESSION['admin_logged_in'] = true;
                $_SESSION['admin_username'] = $admin['username'];
                $_SESSION['admin_id'] = $admin['id'];

                header("Location: admin_dashboard.php");
                exit;
            } else {
                $error = 'Invalid administrative username or password.';
            }
        } catch (PDOException $e) {
            $error = 'Database error: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - School Events Board</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="auth-body admin-auth">
    <div class="auth-container">
        <!-- Accent indicator for Admin Panel -->
        <div class="auth-card glass-premium" style="border-top: 3px solid var(--color-brand-purple, #8b5cf6);">
            <div class="auth-header">
                <a href="index.php" class="auth-logo">
                    <span class="icon-glow" style="background: rgba(139, 92, 246, 0.15); box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);"><i class="fa-solid fa-user-shield text-purple" style="color: #a78bfa;"></i></span>
                    <h2 style="background: linear-gradient(to right, #c084fc, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Admin Portal</h2>
                </a>
                <p>Sign in with your administrative credentials</p>
            </div>

            <?php if (!empty($error)): ?>
                <div class="alert alert-danger">
                    <i class="fa-solid fa-circle-exclamation"></i> <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <form id="adminLoginForm" action="admin_login.php" method="POST" class="auth-form" onsubmit="return validateAdminLoginForm()">
                <div class="form-group">
                    <label for="username"><i class="fa-solid fa-user-gear"></i> Administrative Username</label>
                    <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($username ?? ''); ?>" placeholder="admin" required>
                </div>

                <div class="form-group">
                    <label for="password"><i class="fa-solid fa-lock"></i> Password</label>
                    <input type="password" id="password" name="password" placeholder="••••••••" required>
                </div>

                <button type="submit" class="btn btn-primary btn-block" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);">
                    <i class="fa-solid fa-shield-halved"></i> Authenticate & Enter
                </button>
            </form>

            <div class="auth-footer">
                <p>Are you a student? <a href="login.php">Go to Student Login</a></p>
                <p class="secondary-link"><a href="index.php"><i class="fa-solid fa-arrow-left"></i> Back to Homepage</a></p>
            </div>
        </div>
    </div>

    <script src="assets/js/validation.js"></script>
</body>
</html>
