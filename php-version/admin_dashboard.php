<?php
/**
 * Administrator Dashboard
 * Accessible ONLY after admin authentication.
 * Manages Students list and Event submissions (Approve / Reject / Delete).
 */
require_once 'config.php';

// Enforce admin authentication
if (!isset($_SESSION['admin_logged_in'])) {
    header("Location: admin_login.php");
    exit;
}

$adminUsername = $_SESSION['admin_username'];
$error = '';
$success = '';

// Active Tab determination (defaults to 'dashboard')
$tab = $_GET['tab'] ?? 'dashboard';
if (!in_array($tab, ['dashboard', 'users', 'events'])) {
    $tab = 'dashboard';
}

// ----------------------------------------------------
// ACTIONS HANDLER
// ----------------------------------------------------

// 1. Approve Event
if (isset($_GET['action']) && $_GET['action'] === 'approve' && isset($_GET['id'])) {
    $eventId = intval($_GET['id']);
    try {
        $stmt = $pdo->prepare("UPDATE Events SET status = 'Approved' WHERE id = ?");
        $stmt->execute([$eventId]);
        $success = "Event approved successfully and is now active on the homepage board!";
    } catch (PDOException $e) {
        $error = "Database Error: " . $e->getMessage();
    }
}

// 2. Reject Event
if (isset($_GET['action']) && $_GET['action'] === 'reject' && isset($_GET['id'])) {
    $eventId = intval($_GET['id']);
    try {
        $stmt = $pdo->prepare("UPDATE Events SET status = 'Rejected' WHERE id = ?");
        $stmt->execute([$eventId]);
        $success = "Event proposal rejected.";
    } catch (PDOException $e) {
        $error = "Database Error: " . $e->getMessage();
    }
}

// 3. Delete Event
if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['id'])) {
    $eventId = intval($_GET['id']);
    try {
        // Fetch image path to delete file from disk
        $stmt = $pdo->prepare("SELECT image FROM Events WHERE id = ?");
        $stmt->execute([$eventId]);
        $image = $stmt->fetchColumn();
        
        if (!empty($image) && file_exists($image)) {
            unlink($image);
        }

        $stmt = $pdo->prepare("DELETE FROM Events WHERE id = ?");
        $stmt->execute([$eventId]);
        $success = "Event submission permanently deleted.";
    } catch (PDOException $e) {
        $error = "Database Error: " . $e->getMessage();
    }
}

// 4. Delete Student User
if (isset($_GET['action']) && $_GET['action'] === 'delete_user' && isset($_GET['id'])) {
    $userId = intval($_GET['id']);
    try {
        // Delete student's uploaded image files first
        $stmt = $pdo->prepare("SELECT image FROM Events WHERE student_id = ?");
        $stmt->execute([$userId]);
        $images = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($images as $img) {
            if (!empty($img) && file_exists($img)) {
                unlink($img);
            }
        }

        // Deleting student will cascade delete their event submissions due to FOREIGN KEY constraints
        $stmt = $pdo->prepare("DELETE FROM Students WHERE id = ?");
        $stmt->execute([$userId]);
        $success = "Student account and all associated event proposals permanently deleted.";
    } catch (PDOException $e) {
        $error = "Database Error: " . $e->getMessage();
    }
}

// ----------------------------------------------------
// DATABASE STATISTICS QUERY
// ----------------------------------------------------
try {
    $totalStudents = $pdo->query("SELECT COUNT(*) FROM Students")->fetchColumn();
    $totalEvents = $pdo->query("SELECT COUNT(*) FROM Events")->fetchColumn();
    $pendingEvents = $pdo->query("SELECT COUNT(*) FROM Events WHERE status = 'Pending'")->fetchColumn();
    $approvedEvents = $pdo->query("SELECT COUNT(*) FROM Events WHERE status = 'Approved'")->fetchColumn();
} catch (PDOException $e) {
    die("Database stats retrieval failed: " . $e->getMessage());
}

// ----------------------------------------------------
// PAGINATION SETTINGS & CURRENT VIEW LISTS FETCHING
// ----------------------------------------------------
$limit = 8; // Number of items per page

if ($tab === 'users') {
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $offset = ($page - 1) * $limit;
    
    try {
        $totalUsersCount = $pdo->query("SELECT COUNT(*) FROM Students")->fetchColumn();
        $totalPages = ceil($totalUsersCount / $limit);
        
        $stmt = $pdo->prepare("SELECT * FROM Students ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $studentsList = $stmt->fetchAll();
    } catch (PDOException $e) {
        die("Users list retrieval failed: " . $e->getMessage());
    }
} elseif ($tab === 'events') {
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $offset = ($page - 1) * $limit;
    
    try {
        $totalEventsCount = $pdo->query("SELECT COUNT(*) FROM Events")->fetchColumn();
        $totalPages = ceil($totalEventsCount / $limit);
        
        // Fetch events with student names
        $stmt = $pdo->prepare("
            SELECT e.*, s.full_name AS student_name, s.class, s.section 
            FROM Events e 
            JOIN Students s ON e.student_id = s.id 
            ORDER BY e.created_at DESC 
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $eventsList = $stmt->fetchAll();
    } catch (PDOException $e) {
        die("Events list retrieval failed: " . $e->getMessage());
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - School Events Board</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/admin.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="admin-body">
    <div class="admin-layout">
        <!-- Sidebar Navigation -->
        <aside class="admin-sidebar glass-premium">
            <div class="sidebar-header">
                <span class="logo-icon"><i class="fa-solid fa-user-shield"></i></span>
                <div class="logo-text">
                    <h2>Admin Panel</h2>
                    <p>School Board Control</p>
                </div>
            </div>
            <div class="admin-profile-badge">
                <div class="avatar"><i class="fa-solid fa-circle-user"></i></div>
                <div class="info">
                    <span class="name"><?php echo htmlspecialchars($adminUsername); ?></span>
                    <span class="role">System Administrator</span>
                </div>
            </div>
            <nav class="sidebar-nav">
                <ul>
                    <li>
                        <a href="admin_dashboard.php?tab=dashboard" class="<?php echo $tab === 'dashboard' ? 'active' : ''; ?>">
                            <i class="fa-solid fa-chart-line"></i> Dashboard
                        </a>
                    </li>
                    <li>
                        <a href="admin_dashboard.php?tab=users" class="<?php echo $tab === 'users' ? 'active' : ''; ?>">
                            <i class="fa-solid fa-users"></i> Users (Students)
                        </a>
                    </li>
                    <li>
                        <a href="admin_dashboard.php?tab=events" class="<?php echo $tab === 'events' ? 'active' : ''; ?>">
                            <i class="fa-solid fa-calendar-days"></i> Events Submission
                        </a>
                    </li>
                    <li class="nav-divider"></li>
                    <li>
                        <a href="index.php"><i class="fa-solid fa-house"></i> View Homepage</a>
                    </li>
                    <li>
                        <a href="logout.php" class="logout-link"><i class="fa-solid fa-sign-out-alt"></i> Log Out</a>
                    </li>
                </ul>
            </nav>
        </aside>

        <!-- Main Content Area -->
        <main class="admin-main-content">
            <!-- Header bar -->
            <header class="admin-topbar glass mb-4">
                <div class="topbar-left">
                    <h3>School Events Administration</h3>
                </div>
                <div class="topbar-right">
                    <span class="date-badge"><i class="fa-regular fa-clock"></i> Current Server Time: <?php echo date('Y-m-d H:i'); ?></span>
                </div>
            </header>

            <div class="container-fluid">
                <!-- Toast Alerts -->
                <?php if (!empty($success)): ?>
                    <div class="toast-alert success mb-4">
                        <i class="fa-solid fa-circle-check"></i> <span><?php echo htmlspecialchars($success); ?></span>
                    </div>
                <?php endif; ?>

                <?php if (!empty($error)): ?>
                    <div class="toast-alert error mb-4">
                        <i class="fa-solid fa-circle-exclamation"></i> <span><?php echo htmlspecialchars($error); ?></span>
                    </div>
                <?php endif; ?>

                <!-- TAB 1: DASHBOARD STATS -->
                <?php if ($tab === 'dashboard'): ?>
                    <div class="welcome-section glass-premium p-4 mb-4">
                        <h2>Welcome, Administrator</h2>
                        <p>Monitor pending school event proposals, edit approved announcements, and administer registered student accounts from a unified glassmorphic panel.</p>
                    </div>

                    <div class="stats-grid mb-4">
                        <div class="stat-card glass">
                            <div class="stat-icon bg-purple-tint"><i class="fa-solid fa-users text-purple"></i></div>
                            <div class="stat-details">
                                <h3><?php echo $totalStudents; ?></h3>
                                <p>Total Registered Students</p>
                            </div>
                        </div>
                        <div class="stat-card glass">
                            <div class="stat-icon bg-blue-tint"><i class="fa-solid fa-calendar-days text-blue"></i></div>
                            <div class="stat-details">
                                <h3><?php echo $totalEvents; ?></h3>
                                <p>Total Event Proposals</p>
                            </div>
                        </div>
                        <div class="stat-card glass">
                            <div class="stat-icon bg-yellow-tint"><i class="fa-solid fa-clock-rotate-left text-yellow"></i></div>
                            <div class="stat-details">
                                <h3><?php echo $pendingEvents; ?></h3>
                                <p>Pending Reviews</p>
                            </div>
                        </div>
                        <div class="stat-card glass">
                            <div class="stat-icon bg-green-tint"><i class="fa-solid fa-circle-check text-green"></i></div>
                            <div class="stat-details">
                                <h3><?php echo $approvedEvents; ?></h3>
                                <p>Approved Events</p>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Navigation shortcut cards -->
                    <div class="row-dashboard">
                        <div class="dashboard-promo-card glass">
                            <h3><i class="fa-solid fa-user-shield text-purple"></i> Access Student Accounts</h3>
                            <p>Verify records, review registered school classes/grades, and manage overall security of active participants.</p>
                            <a href="admin_dashboard.php?tab=users" class="btn btn-secondary mt-3">Manage Users <i class="fa-solid fa-arrow-right"></i></a>
                        </div>
                        <div class="dashboard-promo-card glass">
                            <h3><i class="fa-solid fa-calendar-days text-blue"></i> Event Board Submissions</h3>
                            <p>Review event agendas, descriptions, uploaded pictures, and instantly publish valid requests to the main homepage board.</p>
                            <a href="admin_dashboard.php?tab=events" class="btn btn-primary mt-3">Manage Events <i class="fa-solid fa-arrow-right"></i></a>
                        </div>
                    </div>

                <!-- TAB 2: REGISTERED USERS LIST -->
                <?php elseif ($tab === 'users'): ?>
                    <div class="card glass">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fa-solid fa-users text-purple"></i> Registered Students</h3>
                        </div>
                        <div class="card-body p-0 table-responsive">
                            <?php if (count($studentsList) > 0): ?>
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Student Name</th>
                                            <th>Email Address</th>
                                            <th>Class / Section</th>
                                            <th>Admission Number</th>
                                            <th>Registered On</th>
                                            <th class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($studentsList as $student): ?>
                                            <tr>
                                                <td class="font-mono text-xs"><?php echo $student['id']; ?></td>
                                                <td><strong><?php echo htmlspecialchars($student['full_name']); ?></strong></td>
                                                <td><i class="fa-regular fa-envelope text-muted"></i> <?php echo htmlspecialchars($student['email']); ?></td>
                                                <td><span class="badge badge-category"><?php echo htmlspecialchars($student['class'] . ' - ' . $student['section']); ?></span></td>
                                                <td class="font-mono"><?php echo htmlspecialchars($student['admission_number']); ?></td>
                                                <td class="font-mono text-xs"><?php echo date('Y-m-d H:i', strtotime($student['created_at'])); ?></td>
                                                <td class="text-center">
                                                    <button class="btn btn-sm btn-danger-outline" onclick="triggerUserDelete(<?php echo $student['id']; ?>, '<?php echo addslashes($student['full_name']); ?>')">
                                                        <i class="fa-solid fa-user-minus"></i> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            <?php else: ?>
                                <div class="empty-state p-5 text-center">
                                    <i class="fa-solid fa-users-slash text-muted" style="font-size: 3rem;"></i>
                                    <p class="text-muted mt-2">No students registered in the system yet.</p>
                                </div>
                            <?php endif; ?>
                        </div>

                        <!-- Pagination Footer -->
                        <?php if (isset($totalPages) && $totalPages > 1): ?>
                            <div class="card-footer border-top d-flex justify-between align-center p-3">
                                <span class="text-xs text-muted">Page <?php echo $page; ?> of <?php echo $totalPages; ?></span>
                                <div class="pagination-buttons">
                                    <?php if ($page > 1): ?>
                                        <a href="admin_dashboard.php?tab=users&page=<?php echo $page - 1; ?>" class="btn btn-sm btn-secondary"><i class="fa-solid fa-chevron-left"></i> Previous</a>
                                    <?php endif; ?>
                                    
                                    <?php if ($page < $totalPages): ?>
                                        <a href="admin_dashboard.php?tab=users&page=<?php echo $page + 1; ?>" class="btn btn-sm btn-secondary">Next <i class="fa-solid fa-chevron-right"></i></a>
                                    <?php endif; ?>
                                </div>
                            </div>
                        <?php endif; ?>
                    </div>

                <!-- TAB 3: SUBMITTED EVENTS CONTROL -->
                <?php elseif ($tab === 'events'): ?>
                    <div class="card glass">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fa-solid fa-calendar-days text-blue"></i> Event Board Proposal Control</h3>
                        </div>
                        <div class="card-body p-0 table-responsive">
                            <?php if (count($eventsList) > 0): ?>
                                <table class="table align-middle">
                                    <thead>
                                        <tr>
                                            <th>Banner</th>
                                            <th>Event Title</th>
                                            <th>Proposer (Student)</th>
                                            <th>Category</th>
                                            <th>Status</th>
                                            <th>Event Date</th>
                                            <th class="text-center" style="width: 280px;">Decisions & Controls</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($eventsList as $event): ?>
                                            <tr>
                                                <td>
                                                    <?php if (!empty($event['image']) && file_exists($event['image'])): ?>
                                                        <div class="table-img-wrapper">
                                                            <img src="<?php echo htmlspecialchars($event['image']); ?>" alt="Event Cover">
                                                        </div>
                                                    <?php else: ?>
                                                        <div class="table-img-wrapper placeholder">
                                                            <i class="fa-regular fa-image"></i>
                                                        </div>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <div class="table-event-info">
                                                        <strong><?php echo htmlspecialchars($event['title']); ?></strong>
                                                        <span class="event-desc-preview" title="<?php echo htmlspecialchars($event['description']); ?>">
                                                            <?php echo htmlspecialchars(substr($event['description'], 0, 75)) . (strlen($event['description']) > 75 ? '...' : ''); ?>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="table-student-info">
                                                        <span><?php echo htmlspecialchars($event['student_name']); ?></span>
                                                        <span class="badge badge-student" style="font-size: 0.65rem; padding: 0.1rem 0.3rem;"><?php echo htmlspecialchars($event['class'] . ' - ' . $event['section']); ?></span>
                                                    </div>
                                                </td>
                                                <td><span class="badge badge-category"><?php echo htmlspecialchars($event['category']); ?></span></td>
                                                <td>
                                                    <?php if ($event['status'] === 'Approved'): ?>
                                                        <span class="badge status-approved"><i class="fa-solid fa-circle-check"></i> Approved</span>
                                                    <?php elseif ($event['status'] === 'Pending'): ?>
                                                        <span class="badge status-pending"><i class="fa-solid fa-clock"></i> Pending</span>
                                                    <?php else: ?>
                                                        <span class="badge status-rejected"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td class="font-mono text-xs text-nowrap"><?php echo date('Y-m-d', strtotime($event['event_date'])); ?></td>
                                                <td>
                                                    <div class="table-actions-container">
                                                        <?php if ($event['status'] !== 'Approved'): ?>
                                                            <a href="admin_dashboard.php?tab=events&action=approve&id=<?php echo $event['id']; ?>&page=<?php echo $page; ?>" class="btn btn-sm btn-success">
                                                                <i class="fa-solid fa-check"></i> Approve
                                                            </a>
                                                        <?php endif; ?>

                                                        <?php if ($event['status'] !== 'Rejected'): ?>
                                                            <a href="admin_dashboard.php?tab=events&action=reject&id=<?php echo $event['id']; ?>&page=<?php echo $page; ?>" class="btn btn-sm btn-yellow">
                                                                <i class="fa-solid fa-ban"></i> Reject
                                                            </a>
                                                        <?php endif; ?>

                                                        <button class="btn btn-sm btn-danger-outline" onclick="triggerEventDelete(<?php echo $event['id']; ?>, '<?php echo addslashes($event['title']); ?>')">
                                                            <i class="fa-solid fa-trash"></i> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            <?php else: ?>
                                <div class="empty-state p-5 text-center">
                                    <i class="fa-regular fa-calendar-xmark text-muted" style="font-size: 3rem;"></i>
                                    <p class="text-muted mt-2">No event submissions found in the school system.</p>
                                </div>
                            <?php endif; ?>
                        </div>

                        <!-- Pagination Footer -->
                        <?php if (isset($totalPages) && $totalPages > 1): ?>
                            <div class="card-footer border-top d-flex justify-between align-center p-3">
                                <span class="text-xs text-muted">Page <?php echo $page; ?> of <?php echo $totalPages; ?></span>
                                <div class="pagination-buttons">
                                    <?php if ($page > 1): ?>
                                        <a href="admin_dashboard.php?tab=events&page=<?php echo $page - 1; ?>" class="btn btn-sm btn-secondary"><i class="fa-solid fa-chevron-left"></i> Previous</a>
                                    <?php endif; ?>
                                    
                                    <?php if ($page < $totalPages): ?>
                                        <a href="admin_dashboard.php?tab=events&page=<?php echo $page + 1; ?>" class="btn btn-sm btn-secondary">Next <i class="fa-solid fa-chevron-right"></i></a>
                                    <?php endif; ?>
                                </div>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
        </main>
    </div>

    <!-- User Delete Confirmation Modal -->
    <div id="userDeleteModal" class="modal">
        <div class="modal-content glass-premium">
            <div class="modal-header">
                <h3><i class="fa-solid fa-user-minus text-red"></i> Delete Student Account?</h3>
                <span class="close-modal" onclick="closeUserModal()">&times;</span>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete student account: <strong id="deleteTargetUser"></strong>?</p>
                <p class="text-danger-subtle" style="font-size: 0.85rem; color: #ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Warning: Deleting the student account will automatically cascade and delete all event proposals submitted by them!</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeUserModal()">Cancel</button>
                <a id="confirmUserDeleteBtn" href="#" class="btn btn-danger">Yes, Delete Account</a>
            </div>
        </div>
    </div>

    <!-- Event Delete Confirmation Modal -->
    <div id="eventDeleteModal" class="modal">
        <div class="modal-content glass-premium">
            <div class="modal-header">
                <h3><i class="fa-solid fa-trash text-red"></i> Delete Event Proposal?</h3>
                <span class="close-modal" onclick="closeEventModal()">&times;</span>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete event proposal: <strong id="deleteTargetEvent"></strong>? This action cannot be undone.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeEventModal()">Cancel</button>
                <a id="confirmEventDeleteBtn" href="#" class="btn btn-danger">Yes, Delete Event</a>
            </div>
        </div>
    </div>

    <script>
        // User Delete Confirmation
        function triggerUserDelete(id, name) {
            const modal = document.getElementById('userDeleteModal');
            document.getElementById('deleteTargetUser').textContent = name;
            document.getElementById('confirmUserDeleteBtn').href = 'admin_dashboard.php?tab=users&action=delete_user&id=' + id;
            modal.style.display = 'block';
        }
        function closeUserModal() {
            document.getElementById('userDeleteModal').style.display = 'none';
        }

        // Event Delete Confirmation
        function triggerEventDelete(id, title) {
            const modal = document.getElementById('eventDeleteModal');
            document.getElementById('deleteTargetEvent').textContent = title;
            document.getElementById('confirmEventDeleteBtn').href = 'admin_dashboard.php?tab=events&action=delete&id=' + id;
            modal.style.display = 'block';
        }
        function closeEventModal() {
            document.getElementById('eventDeleteModal').style.display = 'none';
        }

        // Window dismiss modal click
        window.onclick = function(event) {
            const userModal = document.getElementById('userDeleteModal');
            const eventModal = document.getElementById('eventDeleteModal');
            if (event.target == userModal) {
                userModal.style.display = "none";
            }
            if (event.target == eventModal) {
                eventModal.style.display = "none";
            }
        }

        // Dismiss alerts
        document.addEventListener('DOMContentLoaded', function() {
            const toasts = document.querySelectorAll('.toast-alert');
            toasts.forEach(toast => {
                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateY(-20px)';
                    setTimeout(() => {
                        toast.remove();
                    }, 500);
                }, 5000);
            });
        });
    </script>
</body>
</html>
