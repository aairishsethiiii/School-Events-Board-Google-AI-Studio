<?php
/**
 * Student Dashboard
 * Accessible ONLY after student login.
 * Handles Event submissions, image uploads, and listing/deletion of student's own pending events.
 */
require_once 'config.php';

// Enforce student authentication
if (!isset($_SESSION['student_id'])) {
    header("Location: login.php");
    exit;
}

$studentId = $_SESSION['student_id'];
$studentName = $_SESSION['student_name'];

$error = '';
$success = '';

// Handle file upload and form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_event'])) {
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $category = trim($_POST['category'] ?? '');
    $eventDate = $_POST['event_date'] ?? '';
    
    // Server validation
    if (empty($title) || empty($description) || empty($category) || empty($eventDate)) {
        $error = 'Please fill out all required fields.';
    } else {
        $imagePath = null;
        
        // Handle file upload if image is provided
        if (isset($_FILES['event_image']) && $_FILES['event_image']['error'] !== UPLOAD_ERR_NO_FILE) {
            $file = $_FILES['event_image'];
            $fileName = $file['name'];
            $fileTmpName = $file['tmp_name'];
            $fileSize = $file['size'];
            $fileError = $file['error'];
            
            $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
            
            if ($fileError !== 0) {
                $error = 'There was an error uploading your image.';
            } elseif (!in_repeatable($fileExt, $allowedExtensions) && !in_array($fileExt, $allowedExtensions)) {
                $error = 'Invalid file type. Only JPG, JPEG, PNG, and GIF are allowed.';
            } elseif ($fileSize > 2 * 1024 * 1024) { // 2MB limit
                $error = 'Image file size is too large (maximum is 2MB).';
            } else {
                // Ensure upload directory exists
                $uploadDir = 'assets/images/uploads/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                
                // Generate a secure unique name for the image
                $newFileName = uniqid('img_', true) . '.' . $fileExt;
                $destination = $uploadDir . $newFileName;
                
                if (move_uploaded_file($fileTmpName, $destination)) {
                    $imagePath = $destination;
                } else {
                    $error = 'Failed to save uploaded image file.';
                }
            }
        }
        
        // Insert event if there are no errors
        if (empty($error)) {
            try {
                $stmt = $pdo->prepare("INSERT INTO Events (student_id, title, description, category, event_date, image, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')");
                $stmt->execute([$studentId, $title, $description, $category, $eventDate, $imagePath]);
                $success = 'Event submitted successfully! It is now pending administrator approval.';
            } catch (PDOException $e) {
                $error = 'Database error: ' . $e->getMessage();
            }
        }
    }
}

// Handle Delete action for Student's own pending events
if (isset($_GET['delete_id'])) {
    $deleteId = intval($_GET['delete_id']);
    try {
        // Query to check ownership and status before deleting
        $stmt = $pdo->prepare("SELECT id, image, status FROM Events WHERE id = ? AND student_id = ?");
        $stmt->execute([$deleteId, $studentId]);
        $event = $stmt->fetch();
        
        if ($event) {
            if ($event['status'] === 'Pending') {
                // Remove image from filesystem if it exists
                if (!empty($event['image']) && file_exists($event['image'])) {
                    unlink($event['image']);
                }
                
                // Delete event
                $deleteStmt = $pdo->prepare("DELETE FROM Events WHERE id = ?");
                $deleteStmt->execute([$deleteId]);
                $success = 'Pending event deleted successfully.';
            } else {
                $error = 'You can only delete events that are in Pending status.';
            }
        } else {
            $error = 'Event not found or you do not have permission to delete it.';
        }
    } catch (PDOException $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

// Fetch dashboard statistics
try {
    // Total events submitted by this student
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM Events WHERE student_id = ?");
    $stmt->execute([$studentId]);
    $totalSubmitted = $stmt->fetchColumn();

    // Approved events
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM Events WHERE student_id = ? AND status = 'Approved'");
    $stmt->execute([$studentId]);
    $totalApproved = $stmt->fetchColumn();

    // Pending events
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM Events WHERE student_id = ? AND status = 'Pending'");
    $stmt->execute([$studentId]);
    $totalPending = $stmt->fetchColumn();

    // Rejected events
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM Events WHERE student_id = ? AND status = 'Rejected'");
    $stmt->execute([$studentId]);
    $totalRejected = $stmt->fetchColumn();

    // Fetch this student's events table list
    $stmt = $pdo->prepare("SELECT * FROM Events WHERE student_id = ? ORDER BY created_at DESC");
    $stmt->execute([$studentId]);
    $myEvents = $stmt->fetchAll();
} catch (PDOException $e) {
    die("Database fetch error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Dashboard - School Events Board</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/dashboard.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="dashboard-body">
    <!-- Navbar -->
    <nav class="navbar sticky">
        <div class="nav-container">
            <a href="index.php" class="nav-logo">
                <span class="icon-glow"><i class="fa-solid fa-graduation-cap"></i></span>
                <h1>School Events Board</h1>
            </a>
            <div class="nav-user-info">
                <span class="welcome-text">Welcome, <strong><?php echo htmlspecialchars($studentName); ?></strong></span>
                <span class="badge badge-student"><?php echo htmlspecialchars($_SESSION['student_class'] . ' - ' . $_SESSION['student_section']); ?></span>
            </div>
            <ul class="nav-menu">
                <li><a href="index.php"><i class="fa-solid fa-house"></i> Home</a></li>
                <li><a href="dashboard.php" class="active"><i class="fa-solid fa-gauge"></i> Dashboard</a></li>
                <li><a href="logout.php" class="btn btn-logout"><i class="fa-solid fa-sign-out-alt"></i> Logout</a></li>
            </ul>
        </div>
    </nav>

    <div class="container py-4">
        <!-- Toast System Placeholder (for alerts) -->
        <?php if (!empty($success)): ?>
            <div class="toast-alert success">
                <i class="fa-solid fa-circle-check"></i> <span><?php echo htmlspecialchars($success); ?></span>
            </div>
        <?php endif; ?>

        <?php if (!empty($error)): ?>
            <div class="toast-alert error">
                <i class="fa-solid fa-circle-exclamation"></i> <span><?php echo htmlspecialchars($error); ?></span>
            </div>
        <?php endif; ?>

        <!-- Welcome Banner -->
        <div class="dashboard-banner glass-premium mb-4">
            <div class="banner-content">
                <h2>Student Panel</h2>
                <p>Welcome back! Submit exciting new classroom, sports, or academic events to share with the entire school board.</p>
            </div>
            <div class="banner-meta">
                <div class="meta-item"><i class="fa-solid fa-id-card"></i> Email: <?php echo htmlspecialchars($_SESSION['student_email']); ?></div>
            </div>
        </div>

        <!-- Dashboard Cards Grid -->
        <div class="stats-grid mb-4">
            <div class="stat-card glass">
                <div class="stat-icon bg-blue-tint"><i class="fa-solid fa-file-invoice text-blue"></i></div>
                <div class="stat-details">
                    <h3><?php echo $totalSubmitted; ?></h3>
                    <p>Total Submitted</p>
                </div>
            </div>
            <div class="stat-card glass">
                <div class="stat-icon bg-green-tint"><i class="fa-solid fa-circle-check text-green"></i></div>
                <div class="stat-details">
                    <h3><?php echo $totalApproved; ?></h3>
                    <p>Approved Events</p>
                </div>
            </div>
            <div class="stat-card glass">
                <div class="stat-icon bg-yellow-tint"><i class="fa-solid fa-clock-rotate-left text-yellow"></i></div>
                <div class="stat-details">
                    <h3><?php echo $totalPending; ?></h3>
                    <p>Pending Review</p>
                </div>
            </div>
            <div class="stat-card glass">
                <div class="stat-icon bg-red-tint"><i class="fa-solid fa-circle-xmark text-red"></i></div>
                <div class="stat-details">
                    <h3><?php echo $totalRejected; ?></h3>
                    <p>Rejected Events</p>
                </div>
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- Event Submission Card (Form) -->
            <div class="grid-col-form">
                <div class="card glass">
                    <div class="card-header border-bottom">
                        <h3 class="card-title"><i class="fa-solid fa-paper-plane text-purple"></i> Submit New Event</h3>
                    </div>
                    <form id="eventForm" action="dashboard.php" method="POST" enctype="multipart/form-data" class="card-body p-4" onsubmit="return validateEventForm()">
                        <div class="form-group">
                            <label for="title">Event Title <span class="text-danger">*</span></label>
                            <input type="text" id="title" name="title" placeholder="Annual School Sports Day" required>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label for="category">Category <span class="text-danger">*</span></label>
                                <select id="category" name="category" required>
                                    <option value="" disabled selected>Select Category</option>
                                    <option value="Sports">Sports</option>
                                    <option value="Academics">Academics</option>
                                    <option value="Cultural">Cultural & Arts</option>
                                    <option value="Science & Tech">Science & Tech</option>
                                    <option value="Community & Social">Community & Social</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="event_date">Event Date <span class="text-danger">*</span></label>
                                <input type="date" id="event_date" name="event_date" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="description">Description <span class="text-danger">*</span></label>
                            <textarea id="description" name="description" rows="4" placeholder="Briefly describe what the event is about, who can join, rules, timeline..." required></textarea>
                        </div>

                        <div class="form-group">
                            <label for="event_image">Event Image</label>
                            <div class="file-drop-area" id="dropArea">
                                <i class="fa-solid fa-cloud-arrow-up file-icon"></i>
                                <span class="file-text">Drag and drop or click to upload</span>
                                <input type="file" id="event_image" name="event_image" accept="image/*" class="file-input" onchange="previewImage(this)">
                            </div>
                            <div id="imagePreviewContainer" class="image-preview-wrapper" style="display: none;">
                                <img id="imagePreview" src="#" alt="Event Preview">
                                <button type="button" class="btn-remove-preview" onclick="clearPreview()"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                        </div>

                        <button type="submit" name="submit_event" class="btn btn-primary btn-block">
                            <i class="fa-solid fa-circle-plus"></i> Submit Event Proposal
                        </button>
                    </form>
                </div>
            </div>

            <!-- Student's Submissions Table -->
            <div class="grid-col-table">
                <div class="card glass">
                    <div class="card-header border-bottom">
                        <h3 class="card-title"><i class="fa-solid fa-list-check text-blue"></i> My Event Proposals</h3>
                    </div>
                    <div class="card-body p-0 table-responsive">
                        <?php if (count($myEvents) > 0): ?>
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($myEvents as $event): ?>
                                        <tr>
                                            <td>
                                                <div class="table-event-info">
                                                    <span class="event-table-title"><?php echo htmlspecialchars($event['title']); ?></span>
                                                    <span class="event-table-meta">Submitted: <?php echo date('M d, Y', strtotime($event['created_at'])); ?></span>
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
                                            <td class="font-mono text-xs"><?php echo date('Y-m-d', strtotime($event['event_date'])); ?></td>
                                            <td class="text-center">
                                                <?php if ($event['status'] === 'Pending'): ?>
                                                    <button class="btn btn-sm btn-danger-outline" onclick="confirmDelete(<?php echo $event['id']; ?>)">
                                                        <i class="fa-solid fa-trash"></i> Delete
                                                    </button>
                                                <?php else: ?>
                                                    <span class="text-muted text-xs">Locked</span>
                                                <?php endif; ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        <?php else: ?>
                            <div class="empty-state p-5 text-center">
                                <i class="fa-regular fa-folder-open text-muted" style="font-size: 3rem;"></i>
                                <p class="text-muted mt-2">You haven't submitted any event proposals yet.</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="modal">
        <div class="modal-content glass-premium">
            <div class="modal-header">
                <h3><i class="fa-solid fa-triangle-exclamation text-red"></i> Confirm Deletion</h3>
                <span class="close-modal" onclick="closeDeleteModal()">&times;</span>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this pending event submission? This action is irreversible.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeDeleteModal()">Cancel</button>
                <a id="confirmDeleteBtn" href="#" class="btn btn-danger">Yes, Delete Event</a>
            </div>
        </div>
    </div>

    <script src="assets/js/validation.js"></script>
    <script>
        // Image preview logic
        function previewImage(input) {
            const previewContainer = document.getElementById('imagePreviewContainer');
            const preview = document.getElementById('imagePreview');
            const dropArea = document.getElementById('dropArea');
            
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    previewContainer.style.display = 'block';
                    dropArea.style.display = 'none';
                }
                reader.readAsDataURL(input.files[0]);
            }
        }
        
        function clearPreview() {
            const previewContainer = document.getElementById('imagePreviewContainer');
            const preview = document.getElementById('imagePreview');
            const dropArea = document.getElementById('dropArea');
            const fileInput = document.getElementById('event_image');
            
            fileInput.value = '';
            preview.src = '#';
            previewContainer.style.display = 'none';
            dropArea.style.display = 'flex';
        }

        // Delete confirmation logic
        function confirmDelete(id) {
            const modal = document.getElementById('deleteModal');
            const deleteBtn = document.getElementById('confirmDeleteBtn');
            deleteBtn.href = 'dashboard.php?delete_id=' + id;
            modal.style.display = 'block';
        }

        function closeDeleteModal() {
            document.getElementById('deleteModal').style.display = 'none';
        }

        window.onclick = function(event) {
            var modal = document.getElementById('deleteModal');
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }

        // Dismiss Toast alerts automatically after 5 seconds
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
