<?php
/**
 * Sign Up Page
 * Student account registration with input validation & secure password hashing
 */
require_once 'config.php';

// If student is already logged in, redirect to dashboard
if (isset($_SESSION['student_id'])) {
    header("Location: dashboard.php");
    exit;
}

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullName = trim($_POST['full_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    $class = trim($_POST['class'] ?? '');
    $section = trim($_POST['section'] ?? '');
    $admissionNumber = trim($_POST['admission_number'] ?? '');

    // Server-side validation
    if (empty($fullName) || empty($email) || empty($password) || empty($confirmPassword) || empty($class) || empty($section) || empty($admissionNumber)) {
        $error = 'All fields are required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid email address.';
    } elseif (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters long.';
    } elseif ($password !== $confirmPassword) {
        $error = 'Passwords do not match.';
    } else {
        try {
            // Check if email already exists
            $stmt = $pdo->prepare("SELECT id FROM Students WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $error = 'Email address is already registered.';
            } else {
                // Check if admission number already exists
                $stmt = $pdo->prepare("SELECT id FROM Students WHERE admission_number = ?");
                $stmt->execute([$admissionNumber]);
                if ($stmt->fetch()) {
                    $error = 'Admission number is already registered.';
                } else {
                    // Hash password and insert user
                    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $pdo->prepare("INSERT INTO Students (full_name, email, password, class, section, admission_number) VALUES (?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$fullName, $email, $hashedPassword, $class, $section, $admissionNumber]);

                    $_SESSION['signup_success'] = 'Account created successfully! Please login with your credentials.';
                    header("Location: login.php");
                    exit;
                }
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
    <title>Sign Up - School Events Board</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <!-- FontAwesome icons -->
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
                <p>Register as a student to submit and manage events</p>
            </div>

            <?php if (!empty($error)): ?>
                <div class="alert alert-danger">
                    <i class="fa-solid fa-circle-exclamation"></i> <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <form id="signupForm" action="signup.php" method="POST" class="auth-form" onsubmit="return validateSignUpForm()">
                <div class="form-group">
                    <label for="full_name"><i class="fa-solid fa-user"></i> Full Name</label>
                    <input type="text" id="full_name" name="full_name" value="<?php echo htmlspecialchars($fullName ?? ''); ?>" placeholder="John Doe" required>
                </div>

                <div class="form-group">
                    <label for="email"><i class="fa-solid fa-envelope"></i> Email Address</label>
                    <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($email ?? ''); ?>" placeholder="john.doe@school.edu" required>
                    <span class="input-hint">Must be a valid email format</span>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label for="class"><i class="fa-solid fa-chalkboard-user"></i> Class</label>
                        <input type="text" id="class" name="class" value="<?php echo htmlspecialchars($class ?? ''); ?>" placeholder="Grade 11" required>
                    </div>
                    <div class="form-group">
                        <label for="section"><i class="fa-solid fa-layer-group"></i> Section</label>
                        <input type="text" id="section" name="section" value="<?php echo htmlspecialchars($section ?? ''); ?>" placeholder="A" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="admission_number"><i class="fa-solid fa-id-card"></i> Admission Number</label>
                    <input type="text" id="admission_number" name="admission_number" value="<?php echo htmlspecialchars($admissionNumber ?? ''); ?>" placeholder="ADM-2026-042" required>
                </div>

                <div class="form-group">
                    <label for="password"><i class="fa-solid fa-lock"></i> Password</label>
                    <input type="password" id="password" name="password" placeholder="••••••••" required>
                    <span class="input-hint">At least 6 characters</span>
                </div>

                <div class="form-group">
                    <label for="confirm_password"><i class="fa-solid fa-shield-halved"></i> Confirm Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" placeholder="••••••••" required>
                </div>

                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fa-solid fa-user-plus"></i> Create Account
                </button>
            </form>

            <div class="auth-footer">
                <p>Already have an account? <a href="login.php">Login here</a></p>
                <p class="secondary-link"><a href="index.php"><i class="fa-solid fa-arrow-left"></i> Back to Homepage</a></p>
            </div>
        </div>
    </div>

    <script src="assets/js/validation.js"></script>
</body>
</html>
