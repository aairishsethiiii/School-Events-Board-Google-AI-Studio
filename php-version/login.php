<?php
/**
 * Login Page
 * Student login verification and session storage
 */
require_once 'config.php';

// If student is already logged in, redirect to dashboard
if (isset($_SESSION['student_id'])) {
    header("Location: dashboard.php");
    exit;
}

$error = '';
$success = '';

// Check for redirect message from signup
if (isset($_SESSION['signup_success'])) {
    $success = $_SESSION['signup_success'];
    unset($_SESSION['signup_success']);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $rememberMe = isset($_POST['remember_me']);

    if (empty($email) || empty($password)) {
        $error = 'Please enter both email and password.';
    } else {
        try {
            $stmt = $pdo->prepare("SELECT * FROM Students WHERE email = ?");
            $stmt->execute([$email]);
            $student = $stmt->fetch();

            if ($student && password_verify($password, $student['password'])) {
                // Regenerate session ID to prevent session fixation
                session_regenerate_id(true);

                // Store student data in session
                $_SESSION['student_id'] = $student['id'];
                $_SESSION['student_name'] = $student['full_name'];
                $_SESSION['student_email'] = $student['email'];
                $_SESSION['student_class'] = $student['class'];
                $_SESSION['student_section'] = $student['section'];

                // Handle remember me cookie if desired (dummy implementation as standard)
                if ($rememberMe) {
                    setcookie('student_email', $email, time() + (86400 * 30), "/"); // 30 days
                } else {
                    if (isset($_COOKIE['student_email'])) {
                        setcookie('student_email', '', time() - 3600, "/");
                    }
                }

                header("Location: dashboard.php");
                exit;
            } else {
                $error = 'Invalid email address or password.';
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
    <title>Login - School Events Board</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="auth-body">
    <div class="auth-container">
        <div class="auth-card glass-premium">
            <div class="auth-header">
                <a href="index.php" class="auth-logo">
                    <span class="icon-glow"><i class="fa-solid fa-graduation-cap"></i></span>
                    <h2>School Events Board</h2>
                </a>
                <p>Login to submit and track your events</p>
            </div>

            <?php if (!empty($success)): ?>
                <div class="alert alert-success">
                    <i class="fa-solid fa-circle-check"></i> <?php echo htmlspecialchars($success); ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($error)): ?>
                <div class="alert alert-danger">
                    <i class="fa-solid fa-circle-exclamation"></i> <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <form id="loginForm" action="login.php" method="POST" class="auth-form" onsubmit="return validateLoginForm()">
                <div class="form-group">
                    <label for="email"><i class="fa-solid fa-envelope"></i> Email Address</label>
                    <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($_COOKIE['student_email'] ?? $_POST['email'] ?? ''); ?>" placeholder="your.name@school.edu" required>
                </div>

                <div class="form-group">
                    <div class="label-wrapper">
                        <label for="password"><i class="fa-solid fa-lock"></i> Password</label>
                        <a href="#" class="forgot-link" onclick="showDummyForgotAlert(event)">Forgot Password?</a>
                    </div>
                    <input type="password" id="password" name="password" placeholder="••••••••" required>
                </div>

                <div class="form-options">
                    <label class="checkbox-container">
                        <input type="checkbox" name="remember_me" id="remember_me" <?php echo isset($_COOKIE['student_email']) ? 'checked' : ''; ?>>
                        <span class="checkmark"></span>
                        Remember Me
                    </label>
                </div>

                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fa-solid fa-right-to-bracket"></i> Student Login
                </button>
            </form>

            <div class="auth-footer">
                <p>Don't have an account? <a href="signup.php">Register now</a></p>
                <p class="secondary-link"><a href="index.php"><i class="fa-solid fa-arrow-left"></i> Back to Homepage</a></p>
            </div>
        </div>
    </div>

    <!-- Dummy Alert Modal for Forgot Password -->
    <div id="dummyAlertModal" class="modal">
        <div class="modal-content glass-premium">
            <div class="modal-header">
                <h3><i class="fa-solid fa-info-circle text-purple"></i> Forgot Password</h3>
                <span class="close-modal" onclick="closeForgotAlert()">&times;</span>
            </div>
            <div class="modal-body">
                <p>To reset your password, please contact the school administration or database administrator with your admission number.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeForgotAlert()">Close</button>
            </div>
        </div>
    </div>

    <script src="assets/js/validation.js"></script>
    <script>
        function showDummyForgotAlert(e) {
            e.preventDefault();
            document.getElementById('dummyAlertModal').style.display = 'block';
        }
        function closeForgotAlert() {
            document.getElementById('dummyAlertModal').style.display = 'none';
        }
        window.onclick = function(event) {
            var modal = document.getElementById('dummyAlertModal');
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    </script>
</body>
</html>
