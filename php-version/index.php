<?php
/**
 * Main Homepage (Public)
 * Displays all Approved school events, with real search and category filtering
 */
require_once 'config.php';

// Check if user is logged in
$isStudentLoggedIn = isset($_SESSION['student_id']);
$isAdminLoggedIn = isset($_SESSION['admin_logged_in']);
$welcomeName = '';

if ($isStudentLoggedIn) {
    $welcomeName = $_SESSION['student_name'];
} elseif ($isAdminLoggedIn) {
    $welcomeName = $_SESSION['admin_username'];
}

// ----------------------------------------------------
// SEARCH & FILTER INTEGRATION
// ----------------------------------------------------
$searchQuery = trim($_GET['search'] ?? '');
$selectedCategory = trim($_GET['category'] ?? '');

try {
    // Build dynamic SQL query for Approved events only
    $sql = "SELECT e.*, s.full_name AS student_name, s.class, s.section 
            FROM Events e 
            JOIN Students s ON e.student_id = s.id 
            WHERE e.status = 'Approved'";
    
    $params = [];
    
    if (!empty($searchQuery)) {
        $sql .= " AND (e.title LIKE ? OR e.description LIKE ?)";
        $params[] = "%$searchQuery%";
        $params[] = "%$searchQuery%";
    }
    
    if (!empty($selectedCategory)) {
        $sql .= " AND e.category = ?";
        $params[] = $selectedCategory;
    }
    
    $sql .= " ORDER BY e.event_date ASC"; // Show soonest events first!
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $approvedEvents = $stmt->fetchAll();
} catch (PDOException $e) {
    die("Database fetch error: " . $e->getMessage());
}

// Get all categories for filter options
$categories = ['Sports', 'Academics', 'Cultural', 'Science & Tech', 'Community & Social', 'Other'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>School Events Board - Stay Connected</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="home-body">
    <!-- Navbar Header -->
    <nav class="navbar sticky">
        <div class="nav-container">
            <a href="index.php" class="nav-logo">
                <span class="icon-glow"><i class="fa-solid fa-graduation-cap"></i></span>
                <h1>School Events Board</h1>
            </a>
            
            <ul class="nav-menu">
                <li><a href="index.php" class="active"><i class="fa-solid fa-house"></i> Home</a></li>
                
                <?php if ($isStudentLoggedIn): ?>
                    <li><a href="dashboard.php"><i class="fa-solid fa-gauge"></i> My Dashboard</a></li>
                    <li><span class="nav-user"><i class="fa-solid fa-circle-user"></i> <?php echo htmlspecialchars($welcomeName); ?></span></li>
                    <li><a href="logout.php" class="btn btn-logout"><i class="fa-solid fa-sign-out-alt"></i> Logout</a></li>
                <?php elseif ($isAdminLoggedIn): ?>
                    <li><a href="admin_dashboard.php"><i class="fa-solid fa-user-shield"></i> Admin Panel</a></li>
                    <li><span class="nav-user"><i class="fa-solid fa-circle-user"></i> Admin</span></li>
                    <li><a href="logout.php" class="btn btn-logout"><i class="fa-solid fa-sign-out-alt"></i> Logout</a></li>
                <?php else: ?>
                    <li><a href="login.php" class="btn btn-login"><i class="fa-solid fa-right-to-bracket"></i> Login</a></li>
                    <li><a href="signup.php" class="btn btn-signup"><i class="fa-solid fa-user-plus"></i> Sign Up</a></li>
                    <li><a href="admin_login.php" class="admin-portal-link" title="Administrator Access"><i class="fa-solid fa-lock"></i></a></li>
                <?php endif; ?>
            </ul>
        </div>
    </nav>

    <!-- Hero Section -->
    <header class="hero-section">
        <div class="hero-glow"></div>
        <div class="container hero-container text-center">
            <span class="hero-badge"><i class="fa-solid fa-bullhorn text-purple"></i> School Board Announcements</span>
            <h1 class="hero-title">School Events Board</h1>
            <p class="hero-subtitle">Discover active campus events, sports tournaments, hackathons, and cultural activities. Empowering students to propose, share, and lead student life initiatives!</p>
            
            <div class="hero-ctas">
                <?php if ($isStudentLoggedIn): ?>
                    <a href="dashboard.php" class="btn btn-primary btn-lg"><i class="fa-solid fa-circle-plus"></i> Submit Event Proposal</a>
                <?php elseif ($isAdminLoggedIn): ?>
                    <a href="admin_dashboard.php" class="btn btn-primary btn-lg"><i class="fa-solid fa-chart-line"></i> Go to Admin Panel</a>
                <?php else: ?>
                    <a href="signup.php" class="btn btn-primary btn-lg"><i class="fa-solid fa-arrow-pointer"></i> Join Now</a>
                    <a href="login.php" class="btn btn-secondary btn-lg"><i class="fa-solid fa-right-to-bracket"></i> Log In</a>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- Interactive Events Board Section -->
    <section class="events-board-section py-5">
        <div class="container">
            <!-- Section Title -->
            <div class="section-title-wrapper mb-4">
                <h2><i class="fa-solid fa-calendar-check text-blue"></i> Active School Announcements</h2>
                <p>Only verified and administrator-approved event requests appear below.</p>
            </div>

            <!-- Filter and Search controls bar -->
            <div class="filter-controls-bar glass mb-5 p-4 rounded-xl">
                <form action="index.php" method="GET" class="filter-form">
                    <div class="search-input-wrapper">
                        <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        <input type="text" name="search" value="<?php echo htmlspecialchars($searchQuery); ?>" placeholder="Search announcements by title or keyword...">
                    </div>
                    
                    <div class="category-select-wrapper">
                        <select name="category" onchange="this.form.submit()">
                            <option value="">All Categories</option>
                            <?php foreach ($categories as $cat): ?>
                                <option value="<?php echo $cat; ?>" <?php echo $selectedCategory === $cat ? 'selected' : ''; ?>><?php echo $cat; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-filter"></i> Apply</button>
                    
                    <?php if (!empty($searchQuery) || !empty($selectedCategory)): ?>
                        <a href="index.php" class="btn btn-secondary-outline"><i class="fa-solid fa-xmark"></i> Clear</a>
                    <?php endif; ?>
                </form>
            </div>

            <!-- Approved Events Grid -->
            <?php if (count($approvedEvents) > 0): ?>
                <div class="events-grid">
                    <?php foreach ($approvedEvents as $event): ?>
                        <article class="event-card glass hover-lift">
                            <div class="event-img-wrapper">
                                <?php if (!empty($event['image']) && file_exists($event['image'])): ?>
                                    <img src="<?php echo htmlspecialchars($event['image']); ?>" alt="Event Banner">
                                <?php else: ?>
                                    <div class="placeholder-img" style="background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);">
                                        <i class="fa-regular fa-image"></i>
                                    </div>
                                <?php endif; ?>
                                <span class="category-tag badge-category"><?php echo htmlspecialchars($event['category']); ?></span>
                            </div>
                            
                            <div class="event-details">
                                <div class="event-header-meta">
                                    <span class="event-date-badge"><i class="fa-regular fa-calendar-days text-purple"></i> <?php echo date('M d, Y', strtotime($event['event_date'])); ?></span>
                                    <span class="student-author-tag"><i class="fa-solid fa-user"></i> <?php echo htmlspecialchars($event['student_name']); ?> (<?php echo htmlspecialchars($event['class']); ?>)</span>
                                </div>
                                <h3 class="event-title"><?php echo htmlspecialchars($event['title']); ?></h3>
                                <p class="event-description"><?php echo htmlspecialchars($event['description']); ?></p>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <div class="empty-state text-center py-5 glass rounded-xl">
                    <i class="fa-regular fa-calendar-xmark text-muted mb-3" style="font-size: 4rem;"></i>
                    <h3>No Approved Events Found</h3>
                    <p class="text-muted mt-2">We couldn't find any approved school events matching your active search/category parameters.</p>
                    <a href="index.php" class="btn btn-secondary mt-3"><i class="fa-solid fa-arrows-rotate"></i> Reset Board</a>
                </div>
            <?php endif; ?>
        </div>
    </section>

    <!-- Why School Events Board (Features Section) -->
    <section class="features-section py-5 border-top">
        <div class="container">
            <div class="section-title-wrapper text-center mb-5">
                <h2>How Campus Board Works</h2>
                <p>Bringing active event visibility, structure, and approval workflows under one roof.</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card glass">
                    <div class="icon"><i class="fa-solid fa-file-pen text-blue"></i></div>
                    <h3>Propose Events</h3>
                    <p>Registered students can propose class tournaments, assemblies, or exhibitions with an agenda, date, and promo banner.</p>
                </div>
                <div class="feature-card glass">
                    <div class="icon"><i class="fa-solid fa-shield-halved text-purple"></i></div>
                    <h3>Admin Sanctioning</h3>
                    <p>School officials review incoming submissions, approving secure layouts or rejecting incorrect agendas to verify safe campus announcements.</p>
                </div>
                <div class="feature-card glass">
                    <div class="icon"><i class="fa-solid fa-mobile-screen-button text-green"></i></div>
                    <h3>Responsive Timeline</h3>
                    <p>All school participants receive elegant mobile access to track and search soonest announcements on the spot.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="main-footer py-4 border-top">
        <div class="container footer-container">
            <div class="footer-left">
                <p>&copy; 2026 School Events Board. Built with HTML5, CSS3, PHP, and MySQL.</p>
            </div>
            <div class="footer-right">
                <ul class="footer-links">
                    <li><a href="index.php">Home</a></li>
                    <li><a href="login.php">Student Portal</a></li>
                    <li><a href="admin_login.php">Admin Portal</a></li>
                </ul>
            </div>
        </div>
    </footer>
</body>
</html>
