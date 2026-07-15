import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Calendar,
  Lock,
  UserCheck,
  LogOut,
  CheckCircle2,
  User,
  Users,
  Trash2,
  Plus,
  ArrowRight,
  Home,
  LayoutDashboard,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  UploadCloud,
  X,
  Copy,
  Check,
  AlertCircle,
  FileCode,
  Shield,
  ThumbsDown,
  Info,
  Settings,
  Activity,
  UserPlus,
  Database
} from 'lucide-react';
import { Student, SchoolEvent, ActivePage, Toast, EventStatus, AuditLog, SystemSettings } from './types';
import { PHP_FILES_DATA, PHPFileItem } from './phpFilesData';
import { supabase, SUPABASE_SQL_SETUP } from './supabase';

// Initial Mock Data to seed the application so it opens beautifully right away!
const INITIAL_STUDENTS: Student[] = [
  {
    id: '1',
    fullName: 'Sarah Jenkins',
    email: 'sarah.j@school.edu',
    class: 'Grade 12',
    section: 'A',
    admissionNumber: 'ADM-2026-001',
    createdAt: '2026-06-15T09:30:00Z'
  },
  {
    id: '2',
    fullName: 'Alex Rivera',
    email: 'alex.r@school.edu',
    class: 'Grade 11',
    section: 'C',
    admissionNumber: 'ADM-2026-042',
    createdAt: '2026-07-02T14:15:00Z'
  }
];

const INITIAL_EVENTS: SchoolEvent[] = [
  {
    id: '101',
    studentId: '1',
    studentName: 'Sarah Jenkins',
    title: 'Annual Inter-School Football Championship',
    description: 'Our senior football team faces off against Maplewood High in the season finals. Come support our players! Free banners and face paint at the gate.',
    category: 'Sports',
    eventDate: '2026-07-20',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
    status: 'Approved',
    createdAt: '2026-07-05T08:00:00Z'
  },
  {
    id: '102',
    studentId: '2',
    studentName: 'Alex Rivera',
    title: 'National AI & Robotics Coding Hackathon',
    description: 'Showcase your engineering skills! Build a smart school automation program in 24 hours. Teams of up to 3 are allowed. Prizes include premium dev kits.',
    category: 'Science & Tech',
    eventDate: '2026-07-28',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800',
    status: 'Approved',
    createdAt: '2026-07-08T10:30:00Z'
  },
  {
    id: '103',
    studentId: '1',
    studentName: 'Sarah Jenkins',
    title: 'Spring Fine Arts & Live Jazz Gala',
    description: 'An elegant evening featuring canvas paintings, hand-made sculptures, and live jazz performances by the senior ensemble. Open to parents and faculty.',
    category: 'Cultural',
    eventDate: '2026-08-05',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800',
    status: 'Approved',
    createdAt: '2026-07-10T11:00:00Z'
  },
  {
    id: '104',
    studentId: '2',
    studentName: 'Alex Rivera',
    title: 'Chemistry Olympiad Preparation Boot Camp',
    description: 'Intense crash course focusing on organic synthesis, thermodynamic calculations, and laboratory titration techniques. Directed by Dr. Raymond.',
    category: 'Academics',
    eventDate: '2026-07-18',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800',
    status: 'Pending',
    createdAt: '2026-07-11T04:12:00Z'
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'l1', action: 'System initialized with demo dataset', timestamp: '2026-07-11T00:01:00Z', type: 'info' },
  { id: 'l2', action: 'Default administrator credentials loaded', timestamp: '2026-07-11T00:02:00Z', type: 'info' },
  { id: 'l3', action: 'Approved Annual Inter-School Football Championship', timestamp: '2026-07-11T02:15:00Z', type: 'success' }
];

const INITIAL_SETTINGS: SystemSettings = {
  boardTitle: 'School Events Board',
  autoModeration: false,
  tickerMessage: 'Welcome to the Campus Announcement Board. Log in as a student to propose class agendas, arts galas, and athletic championships!'
};

const getRepeatedEvents = (eventsList: SchoolEvent[]) => {
  if (eventsList.length === 0) return [];
  let list = [...eventsList];
  while (list.length < 6) {
    list = [...list, ...eventsList];
  }
  return list;
};

const hashPassword = async (pwd: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(pwd);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const isSHA256 = (str: string): boolean => {
  return /^[a-f0-9]{64}$/i.test(str);
};

export default function App() {
  // --- DATABASE EMULATION (LOCAL STORAGE STATE) ---
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('school_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [events, setEvents] = useState<SchoolEvent[]>(() => {
    const saved = localStorage.getItem('school_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [activeStudent, setActiveStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem('active_student');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('admin_logged_in') === 'true';
  });

  const [activePage, setActivePage] = useState<ActivePage>(() => {
    const saved = localStorage.getItem('active_page') as ActivePage;
    return saved || 'Home';
  });

  // --- SUPABASE STATE & SYNCHRONIZATION ---
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'missing_tables'>('connecting');

  const checkSupabaseConnection = async (quiet = false) => {
    try {
      if (!quiet) setSupabaseStatus('connecting');
      
      // 1. Check students table
      const { data: dbStudents, error: studentsError } = await supabase
        .from('students')
        .select('*');

      if (studentsError) {
        console.warn('Supabase connection check failed (expected if database is offline/paused):', studentsError);
        if (studentsError.code === '42P01' || studentsError.message?.includes('does not exist')) {
          setSupabaseStatus('missing_tables');
          return false;
        }
        setSupabaseStatus('disconnected');
        return false;
      }

      // 2. Check events table
      const { data: dbEvents, error: eventsError } = await supabase
        .from('events')
        .select('*');

      if (eventsError) {
        console.warn('Supabase connection check failed on events:', eventsError);
        setSupabaseStatus('disconnected');
        return false;
      }

      setSupabaseStatus('connected');

      // Map students to local state
      if (dbStudents && dbStudents.length > 0) {
        const mappedStudents: Student[] = [];
        for (const s of dbStudents) {
          let currentPwd = s.password || 'password123';
          if (!isSHA256(currentPwd)) {
            const hashed = await hashPassword(currentPwd);
            try {
              await supabase
                .from('students')
                .update({ password: hashed })
                .eq('id', s.id);
            } catch (err) {
              console.warn('Error hashing existing student password in Supabase:', err);
            }
            currentPwd = hashed;
          }
          mappedStudents.push({
            id: s.id,
            fullName: s.full_name,
            email: s.email,
            class: s.class,
            section: s.section,
            admissionNumber: s.admission_number,
            password: currentPwd,
            createdAt: s.created_at
          });
        }
        setStudents(mappedStudents);
      }

      // Map events to local state
      if (dbEvents && dbEvents.length > 0) {
        const mappedEvents: SchoolEvent[] = dbEvents.map((e: any) => ({
          id: e.id,
          studentId: e.student_id,
          studentName: e.student_name,
          title: e.title,
          description: e.description,
          category: e.category,
          eventDate: e.event_date,
          image: e.image || '',
          status: e.status as EventStatus,
          createdAt: e.created_at,
          rejectionReason: e.rejection_reason || undefined
        }));
        // Sort by createdAt descending
        mappedEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEvents(mappedEvents);
      }
      return true;
    } catch (err) {
      console.warn('Supabase check error:', err);
      setSupabaseStatus('disconnected');
      return false;
    }
  };

  useEffect(() => {
    checkSupabaseConnection(true);
  }, []);

  const syncLocalToSupabase = async () => {
    try {
      setSupabaseStatus('connecting');
      addAuditLog('Starting manual sync to Supabase...', 'info');

      // 1. Sync students
      for (const student of students) {
        let pwdToSync = student.password || 'password123';
        if (!isSHA256(pwdToSync)) {
          pwdToSync = await hashPassword(pwdToSync);
        }
        const { error } = await supabase
          .from('students')
          .upsert({
            id: student.id,
            full_name: student.fullName,
            email: student.email,
            class: student.class,
            section: student.section,
            admission_number: student.admissionNumber,
            password: pwdToSync,
            created_at: student.createdAt
          });
        if (error) throw error;
      }

      // 2. Sync events
      for (const event of events) {
        const { error } = await supabase
          .from('events')
          .upsert({
            id: event.id,
            student_id: event.studentId,
            student_name: event.studentName,
            title: event.title,
            description: event.description,
            category: event.category,
            event_date: event.eventDate,
            image: event.image,
            status: event.status,
            rejection_reason: event.rejectionReason || null,
            created_at: event.createdAt
          });
        if (error) throw error;
      }

      // 3. Sync default admin login credentials
      const { error: adminError } = await supabase
        .from('admins')
        .upsert({
          id: 'admin-1',
          username: 'admin',
          password: 'admin123',
          created_at: new Date().toISOString()
        });
      if (adminError) throw adminError;

      setSupabaseStatus('connected');
      showToast('All local storage data successfully push-synchronized with Supabase cloud tables!', 'success');
      addAuditLog('Pushed offline dataset to online Supabase tables', 'success');
      checkSupabaseConnection(true);
    } catch (err: any) {
      console.error('Supabase sync push failed:', err);
      showToast(`Sync Failed: ${err.message || 'Unknown error'}`, 'error');
      setSupabaseStatus('disconnected');
    }
  };

  // Persist State Updates
  useEffect(() => {
    localStorage.setItem('school_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('school_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    if (activeStudent) {
      localStorage.setItem('active_student', JSON.stringify(activeStudent));
    } else {
      localStorage.removeItem('active_student');
    }
  }, [activeStudent]);

  useEffect(() => {
    localStorage.setItem('admin_logged_in', String(adminLoggedIn));
  }, [adminLoggedIn]);

  useEffect(() => {
    localStorage.setItem('active_page', activePage);
  }, [activePage]);

  // --- ADMINISTRATIVE CONSOLE STATE & LOGGING ---
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('school_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('school_system_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('school_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('school_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  const addAuditLog = (action: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      action,
      timestamp: new Date().toISOString(),
      type
    };
    setAuditLogs((prev) => [newLog, ...prev].slice(0, 50));
  };

  // --- GENERAL APP STATE ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; type: 'event' | 'student' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'users' | 'events' | 'settings' | 'php_export'>('dashboard');

  // --- TOAST FUNCTIONALITY ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- ADMIN PANEL DETAILED STATES ---
  const [manualStudentData, setManualStudentData] = useState({
    fullName: '',
    email: '',
    class: '',
    section: '',
    admissionNumber: '',
    password: ''
  });
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [rejectEventId, setRejectEventId] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState('');
  const [detailEvent, setDetailEvent] = useState<SchoolEvent | null>(null);
  const [inspectRejectMode, setInspectRejectMode] = useState(false);
  const [inspectRejectReason, setInspectRejectReason] = useState('');
  const [adminStudentSearch, setAdminStudentSearch] = useState('');
  const [adminEventSearch, setAdminEventSearch] = useState('');
  const [adminEventCategoryFilter, setAdminEventCategoryFilter] = useState('');
  const [adminEventStatusFilter, setAdminEventStatusFilter] = useState('');

  // --- AUTH FORM FORMS STATE ---
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    class: '',
    section: '',
    admissionNumber: '',
    password: '',
    confirmPassword: ''
  });

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [adminLoginData, setAdminLoginData] = useState({
    username: '',
    password: ''
  });

  // --- SUBMIT EVENT STATE ---
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    category: '',
    eventDate: '',
    image: ''
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CODE EXPORTER BROWSER STATE ---
  const [selectedPHPFile, setSelectedPHPFile] = useState<PHPFileItem>(PHP_FILES_DATA[0]);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedPHPFile.code);
    setCopiedFile(true);
    showToast(`Copied ${selectedPHPFile.name} code to clipboard!`, 'info');
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // --- HANDLERS ---

  // Student Sign Up
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { fullName, email, class: stClass, section, admissionNumber, password, confirmPassword } = signUpData;

    // Validation
    if (!fullName || !email || !stClass || !section || !admissionNumber || !password || !confirmPassword) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    // Check existing
    if (supabaseStatus === 'connected') {
      try {
        const { data: existingEmail, error: emailError } = await supabase
          .from('students')
          .select('email')
          .eq('email', email)
          .maybeSingle();

        if (emailError) throw emailError;
        if (existingEmail) {
          showToast('Email address is already registered in cloud database.', 'error');
          return;
        }

        const { data: existingAdm, error: admError } = await supabase
          .from('students')
          .select('admission_number')
          .eq('admission_number', admissionNumber.toUpperCase())
          .maybeSingle();

        if (admError) throw admError;
        if (existingAdm) {
          showToast('Admission number is already registered in cloud database.', 'error');
          return;
        }
      } catch (err: any) {
        console.error('Supabase validation error:', err);
        showToast(`Database validation error: ${err.message || err}`, 'error');
        return;
      }
    } else {
      const emailExists = students.some((s) => s.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        showToast('Email address is already registered locally.', 'error');
        return;
      }

      const admExists = students.some((s) => s.admissionNumber.toUpperCase() === admissionNumber.toUpperCase());
      if (admExists) {
        showToast('Admission number is already registered locally.', 'error');
        return;
      }
    }

    // Create student
    const hashedPassword = await hashPassword(password);
    const newStudent: Student = {
      id: Date.now().toString(),
      fullName,
      email,
      class: stClass,
      section,
      admissionNumber: admissionNumber.toUpperCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    if (supabaseStatus === 'connected') {
      try {
        const { error: insertError } = await supabase
          .from('students')
          .insert({
            id: newStudent.id,
            full_name: newStudent.fullName,
            email: newStudent.email,
            class: newStudent.class,
            section: newStudent.section,
            admission_number: newStudent.admissionNumber,
            password: hashedPassword,
            created_at: newStudent.createdAt
          });

        if (insertError) throw insertError;
        addAuditLog(`Student ${newStudent.fullName} registered directly on Supabase`, 'success');
      } catch (err: any) {
        console.error('Supabase insertion error:', err);
        showToast(`Cloud registration failed: ${err.message || err}`, 'error');
        return;
      }
    }

    setStudents((prev) => [...prev, newStudent]);
    showToast('Registration successful! Please login.', 'success');
    
    // Clear forms and redirect
    setSignUpData({
      fullName: '',
      email: '',
      class: '',
      section: '',
      admissionNumber: '',
      password: '',
      confirmPassword: ''
    });
    setActivePage('Login');
  };

  // Student Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password } = loginData;

    if (!email || !password) {
      showToast('Please enter email and password.', 'error');
      return;
    }

    const hashedInput = await hashPassword(password);

    if (supabaseStatus === 'connected') {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          showToast('Email address not found in cloud database. Please register first.', 'error');
          return;
        }

        const isMatch = isSHA256(data.password)
          ? data.password === hashedInput
          : data.password === password;

        if (!isMatch) {
          showToast('Incorrect password. Please try again.', 'error');
          return;
        }

        const loggedStudent: Student = {
          id: data.id,
          fullName: data.full_name,
          email: data.email,
          class: data.class,
          section: data.section,
          admissionNumber: data.admission_number,
          password: data.password,
          createdAt: data.created_at
        };

        setActiveStudent(loggedStudent);
        setAdminLoggedIn(false);
        showToast(`Welcome back, ${loggedStudent.fullName}! (Cloud Verified)`, 'success');
        setActivePage('StudentDashboard');
        return;
      } catch (err: any) {
        console.error('Supabase login error:', err);
        showToast(`Database error: ${err.message || err}. Attempting offline login fallback...`, 'info');
      }
    }

    // Offline Fallback
    const student = students.find(
      (s) => s.email.toLowerCase() === email.toLowerCase()
    );

    if (student) {
      const storedPassword = student.password || 'password123';
      const isMatch = isSHA256(storedPassword)
        ? storedPassword === hashedInput
        : storedPassword === password;

      if (!isMatch) {
        showToast('Incorrect password. Please try again.', 'error');
        return;
      }
      setActiveStudent(student);
      setAdminLoggedIn(false);
      showToast(`Welcome back, ${student.fullName}! (Local Session)`, 'success');
      setActivePage('StudentDashboard');
    } else {
      showToast('Email address not found. Please register first.', 'error');
    }
  };

  // Admin Login
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, password } = adminLoginData;

    if (!username || !password) {
      showToast('Please enter administrator credentials.', 'error');
      return;
    }

    if (supabaseStatus === 'connected') {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .eq('username', username)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          if (data.password === password) {
            setAdminLoggedIn(true);
            setActiveStudent(null);
            showToast('Administrative authentication successful (Supabase Cloud Verified)!', 'success');
            setActivePage('AdminDashboard');
            setSelectedTab('dashboard');
            return;
          } else {
            showToast('Invalid administrative password.', 'error');
            return;
          }
        }
      } catch (err: any) {
        console.error('Supabase admin login error:', err);
      }
    }

    // Default seed credentials fallback
    if (username === 'admin' && password === 'admin123') {
      setAdminLoggedIn(true);
      setActiveStudent(null);
      showToast('Administrative authentication successful (Local Fallback)!', 'success');
      setActivePage('AdminDashboard');
      setSelectedTab('dashboard');
    } else {
      showToast('Invalid administrative username or password.', 'error');
    }
  };

  // Image upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image file size too large (maximum is 2MB).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImagePreview(reader.result as string);
          setNewEventData((prev) => ({ ...prev, image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image file size too large (maximum is 2MB).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImagePreview(reader.result as string);
          setNewEventData((prev) => ({ ...prev, image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImagePreview = () => {
    setImagePreview('');
    setNewEventData((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Event Proposal
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, description, category, eventDate, image } = newEventData;

    if (!title || !description || !category || !eventDate) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (!activeStudent) {
      showToast('Auth expired. Please login again.', 'error');
      setActivePage('Login');
      return;
    }

    const isAutoApproved = systemSettings.autoModeration;
    const newEvent: SchoolEvent = {
      id: Date.now().toString(),
      studentId: activeStudent.id,
      studentName: activeStudent.fullName,
      title,
      description,
      category,
      eventDate,
      image: image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800',
      status: isAutoApproved ? 'Approved' : 'Pending',
      createdAt: new Date().toISOString()
    };

    if (supabaseStatus === 'connected') {
      try {
        const { error } = await supabase
          .from('events')
          .insert({
            id: newEvent.id,
            student_id: newEvent.studentId,
            student_name: newEvent.studentName,
            title: newEvent.title,
            description: newEvent.description,
            category: newEvent.category,
            event_date: newEvent.eventDate,
            image: newEvent.image,
            status: newEvent.status,
            created_at: newEvent.createdAt
          });
        if (error) throw error;
        addAuditLog(`Event proposed on Supabase: "${title}" by ${activeStudent.fullName}`, 'success');
      } catch (err: any) {
        console.error('Supabase event insert error:', err);
        showToast(`Database error submitting event: ${err.message || err}`, 'error');
        return;
      }
    }

    setEvents((prev) => [newEvent, ...prev]);
    
    if (isAutoApproved) {
      addAuditLog(`Event proposed & auto-approved: "${title}" by ${activeStudent.fullName}`, 'success');
      showToast('Event proposed and approved live automatically!', 'success');
    } else {
      addAuditLog(`New event proposed: "${title}" by ${activeStudent.fullName}`, 'info');
      showToast('Event proposed! Awaiting administrator approval.', 'success');
    }

    // Reset Form
    setNewEventData({
      title: '',
      description: '',
      category: '',
      eventDate: '',
      image: ''
    });
    setImagePreview('');
  };

  // Handle Event deletion (student delete their own pending events)
  const handleDeleteRequest = (id: string, type: 'event' | 'student') => {
    setShowDeleteConfirm({ id, type });
  };

  const executeDelete = async () => {
    if (!showDeleteConfirm) return;
    const { id, type } = showDeleteConfirm;

    if (type === 'event') {
      const target = events.find((ev) => ev.id === id);
      const titleStr = target ? target.title : id;

      if (supabaseStatus === 'connected') {
        try {
          const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);
          if (error) throw error;
          addAuditLog(`Permanently deleted event proposal on Supabase: "${titleStr}"`, 'warning');
        } catch (err: any) {
          console.error('Supabase event delete error:', err);
          showToast(`Database delete error: ${err.message || err}`, 'error');
          return;
        }
      }

      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      addAuditLog(`Permanently deleted event proposal: "${titleStr}"`, 'warning');
      showToast('Event proposal permanently deleted.', 'success');
    } else if (type === 'student') {
      const target = students.find((s) => s.id === id);
      const nameStr = target ? target.fullName : id;

      if (supabaseStatus === 'connected') {
        try {
          // Cascade delete: delete events first
          const { error: eventsError } = await supabase
            .from('events')
            .delete()
            .eq('student_id', id);
          if (eventsError) throw eventsError;

          const { error: studentError } = await supabase
            .from('students')
            .delete()
            .eq('id', id);
          if (studentError) throw studentError;

          addAuditLog(`Deleted student and cascades on Supabase: "${nameStr}"`, 'error');
        } catch (err: any) {
          console.error('Supabase student delete error:', err);
          showToast(`Database student delete error: ${err.message || err}`, 'error');
          return;
        }
      }

      setStudents((prev) => prev.filter((s) => s.id !== id));
      setEvents((prev) => prev.filter((ev) => ev.studentId !== id));
      addAuditLog(`Deleted student account and cascades: "${nameStr}"`, 'error');
      showToast('Student account and associated events cascade deleted.', 'success');
    }

    setShowDeleteConfirm(null);
  };

  // Admin approval decisions
  const handleAdminDecision = async (id: string, decision: EventStatus, reason?: string) => {
    const target = events.find((ev) => ev.id === id);
    const titleStr = target ? target.title : id;

    if (supabaseStatus === 'connected') {
      try {
        const { error } = await supabase
          .from('events')
          .update({
            status: decision,
            rejection_reason: decision === 'Rejected' ? (reason || null) : null
          })
          .eq('id', id);
        if (error) throw error;
        addAuditLog(`Updated status on Supabase for event: "${titleStr}"`, 'success');
      } catch (err: any) {
        console.error('Supabase admin decision update error:', err);
        showToast(`Database status update error: ${err.message || err}`, 'error');
        return;
      }
    }

    setEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, status: decision, rejectionReason: decision === 'Rejected' ? reason : undefined } : ev))
    );

    if (decision === 'Approved') {
      addAuditLog(`Approved event proposal: "${titleStr}"`, 'success');
      showToast('Event approved! It is now live on the homepage board.', 'success');
    } else {
      addAuditLog(`Rejected event proposal: "${titleStr}"` + (reason ? ` (Reason: ${reason})` : ''), 'warning');
      showToast('Event proposal rejected with feedback note.', 'info');
    }
  };

  // Handle manual student registration by admin
  const handleManualStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { fullName, email, class: stClass, section, admissionNumber, password } = manualStudentData;

    if (!fullName || !email || !stClass || !section || !admissionNumber) {
      showToast('Please fill in all student details.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    // check duplicate
    if (students.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      showToast('Email address is already registered.', 'error');
      return;
    }
    if (students.some((s) => s.admissionNumber.toUpperCase() === admissionNumber.toUpperCase())) {
      showToast('Admission number is already registered.', 'error');
      return;
    }

    const rawPassword = password || 'password123';
    const hashedPassword = await hashPassword(rawPassword);

    const newStudent: Student = {
      id: Date.now().toString(),
      fullName,
      email,
      class: stClass,
      section,
      admissionNumber: admissionNumber.toUpperCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    if (supabaseStatus === 'connected') {
      try {
        const { error } = await supabase
          .from('students')
          .insert({
            id: newStudent.id,
            full_name: newStudent.fullName,
            email: newStudent.email,
            class: newStudent.class,
            section: newStudent.section,
            admission_number: newStudent.admissionNumber,
            password: hashedPassword,
            created_at: newStudent.createdAt
          });
        if (error) throw error;
        addAuditLog(`Student ${fullName} registered directly on Supabase`, 'success');
      } catch (err: any) {
        console.error('Supabase manual insert student error:', err);
        showToast(`Database register error: ${err.message || err}`, 'error');
        return;
      }
    }

    setStudents((prev) => [...prev, newStudent]);
    addAuditLog(`Manually registered student: ${fullName} (${stClass}-${section})`, 'success');
    showToast(`Successfully registered student ${fullName}!`, 'success');

    // reset and close
    setManualStudentData({
      fullName: '',
      email: '',
      class: '',
      section: '',
      admissionNumber: '',
      password: ''
    });
    setShowAddStudentForm(false);
  };

  // Reset system configurations to original demo state
  const resetSystemToDefaults = () => {
    localStorage.removeItem('school_students');
    localStorage.removeItem('school_events');
    localStorage.removeItem('school_audit_logs');
    localStorage.removeItem('school_system_settings');
    setStudents(INITIAL_STUDENTS);
    setEvents(INITIAL_EVENTS);
    setAuditLogs([
      { id: 'l1', action: 'System restored to default factory seed values', timestamp: new Date().toISOString(), type: 'info' }
    ]);
    setSystemSettings(INITIAL_SETTINGS);
    showToast('All system configurations and records restored to original seed defaults.', 'info');
  };

  // Sign out
  const handleLogout = () => {
    setActiveStudent(null);
    setAdminLoggedIn(false);
    showToast('Logged out successfully.', 'info');
    setActivePage('Home');
  };

  // Calculate stats for admin dashboard
  const getCategoryStats = () => {
    const categories = ['Sports', 'Academics', 'Cultural', 'Science & Tech', 'Other'];
    const counts = categories.map((cat) => {
      const count = events.filter((e) => {
        if (cat === 'Other') {
          return !['Sports', 'Academics', 'Cultural', 'Science & Tech'].includes(e.category);
        }
        return e.category === cat;
      }).length;
      return { name: cat, count };
    });
    const total = events.length || 1;
    return counts.map((item) => ({
      ...item,
      percentage: Math.round((item.count / total) * 100)
    }));
  };

  // Filter approved events for the homepage
  const approvedEvents = events.filter((ev) => {
    const matchesApproved = ev.status === 'Approved';
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || ev.category === selectedCategory;
    return matchesApproved && matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f3f4f6] font-sans selection:bg-violet-500 selection:text-white flex flex-col">
      
      {/* --- TOAST SYSTEM --- */}
      <div className="fixed top-5 right-5 z-[1000] flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`p-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md border border-white/10 transition-all duration-300 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-emerald-600/90 text-white border-emerald-500/30'
                : toast.type === 'error'
                ? 'bg-rose-600/90 text-white border-rose-500/30'
                : 'bg-indigo-600/90 text-white border-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0" />
              ) : (
                <Info className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="hover:bg-white/20 p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* --- MASTER HEADER --- */}
      <header className="sticky top-0 z-50 glass border-b border-[#2d2d2d] py-4 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Logo */}
          <button
            onClick={() => setActivePage('Home')}
            className="flex items-center gap-3 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight block text-white">{systemSettings.boardTitle}</span>
            </div>
          </button>

          {/* Nav menu links */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActivePage('Home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activePage === 'Home'
                  ? 'bg-gradient-to-r from-purple-600/20 to-transparent border border-purple-500/30 text-white shadow-lg'
                  : 'text-zinc-400 hover:bg-[#1a1a1a]/80 hover:text-white border border-transparent'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>



            {activeStudent ? (
              <>
                <button
                  onClick={() => setActivePage('StudentDashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activePage === 'StudentDashboard'
                      ? 'bg-gradient-to-r from-purple-600/20 to-transparent border border-purple-500/30 text-white shadow-lg'
                      : 'text-zinc-400 hover:bg-[#1a1a1a]/80 hover:text-white border border-transparent'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <div className="h-4 w-[1px] bg-[#2d2d2d] hidden sm:block" />
                <span className="text-sm font-medium text-zinc-300 hidden md:flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#2d2d2d]">
                  <User className="w-4 h-4 text-violet-400" />
                  {activeStudent.fullName}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : adminLoggedIn ? (
              <>
                <button
                  onClick={() => setActivePage('AdminDashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activePage === 'AdminDashboard'
                      ? 'bg-gradient-to-r from-purple-600/20 to-transparent border border-purple-500/30 text-white shadow-lg'
                      : 'text-zinc-400 hover:bg-[#1a1a1a]/80 hover:text-white border border-transparent'
                  }`}
                >
                  <Shield className="w-4 h-4 text-violet-400" />
                  <span>Admin Panel</span>
                </button>
                <div className="h-4 w-[1px] bg-[#2d2d2d]" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActivePage('Login')}
                  className="px-3 py-1.5 text-zinc-300 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={() => setActivePage('SignUp')}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 hover:scale-[1.02] text-white text-sm font-medium transition-all shadow-[0_4px_15px_rgba(139,92,246,0.3)] cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* --- SCROLLING TICKER RIBBON --- */}
      {systemSettings.tickerMessage && (
        <div className="bg-gradient-to-r from-purple-950/70 via-zinc-950 to-blue-950/70 border-b border-purple-500/10 py-2 overflow-hidden text-xs relative flex items-center z-40">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold uppercase tracking-wider flex items-center shrink-0 z-10 text-[9px] shadow-[4px_0_15px_rgba(0,0,0,0.5)]">
            <span>Announcement Board</span>
          </div>
          <div className="w-full flex select-none overflow-hidden pl-28">
            <div className="animate-marquee whitespace-nowrap text-zinc-300 font-medium flex gap-12 pr-12">
              <span>{systemSettings.tickerMessage}</span>
              <span>•</span>
              <span>{systemSettings.tickerMessage}</span>
              <span>•</span>
              <span>{systemSettings.tickerMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN ROUTER --- */}
      <main className="flex-grow">
        
        {/* ==================================== */}
        {/* PAGE 1: HOME PAGE (Public)           */}
        {/* ==================================== */}
        {activePage === 'Home' && (
          <div>
            {/* Hero Section */}
            <section className="relative overflow-hidden py-24 border-b border-white/5">
              <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[800px] h-[800px] bg-radial from-violet-600/10 via-indigo-600/5 to-transparent pointer-events-none blur-3xl" />
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  
                  {/* Left Column: Text & Actions */}
                  <div className="lg:col-span-7 text-center lg:text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-300 text-xs font-semibold tracking-wide uppercase shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                      <Clock className="w-3.5 h-3.5 animate-pulse" /> Stay Updated, Stay Engaged
                    </div>
                    
                    <h1 className="font-display font-extrabold text-4xl sm:text-6xl tracking-tight text-white leading-none">
                      {systemSettings.boardTitle}
                    </h1>
                    
                    <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
                      Explore academic forums, music shows, tech workshops, and sports championships. Submit proposed life ideas and coordinate campus life instantly.
                    </p>

                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                      {activeStudent ? (
                        <button
                          onClick={() => setActivePage('StudentDashboard')}
                          className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium flex items-center gap-2 shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all cursor-pointer"
                        >
                          Go to Dashboard <ArrowRight className="w-5 h-5" />
                        </button>
                      ) : adminLoggedIn ? (
                        <button
                          onClick={() => setActivePage('AdminDashboard')}
                          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:scale-[1.02] transition-all cursor-pointer"
                        >
                          Admin Dashboard <ArrowRight className="w-5 h-5" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setActivePage('SignUp')}
                            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all cursor-pointer"
                          >
                            Join Now
                          </button>
                          <button
                            onClick={() => setActivePage('Login')}
                            className="px-6 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 font-medium hover:scale-[1.02] transition-all cursor-pointer"
                          >
                            Student Login
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Visual Frame with School Events Board Image */}
                  <div className="lg:col-span-5 relative mt-8 lg:mt-0 flex justify-center">
                    {/* Visual background ambient glow behind the picture */}
                    <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 opacity-20 blur-2xl pointer-events-none" />
                    
                    {/* Styled perspective frame container */}
                    <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl border border-white/10 bg-zinc-900/50 p-2 shadow-2xl overflow-hidden group">
                      
                      {/* Image tag with custom referrerPolicy as per rules */}
                      <img
                        src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"
                        alt="Active student collaborative events and workshops on school board"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-xl grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 ease-out"
                      />
                      
                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-90" />
                      
                      {/* Floating Micro Event Badge 1: Sports Event */}
                      <div className="absolute top-6 -left-4 bg-zinc-900/90 backdrop-blur-md border border-white/10 p-2.5 rounded-xl shadow-lg flex items-center gap-2.5 animate-bounce-slow">
                        <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                          🏀
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Upcoming Match</span>
                          <span className="text-xs font-bold text-white block">Basketball Cup</span>
                        </div>
                      </div>

                      {/* Floating Micro Event Badge 2: Tech Event */}
                      <div className="absolute bottom-6 -right-4 bg-zinc-900/90 backdrop-blur-md border border-emerald-500/20 p-2.5 rounded-xl shadow-lg flex items-center gap-2.5 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          💻
                        </div>
                        <div>
                          <span className="text-[9px] text-emerald-400 uppercase font-extrabold block tracking-wider">LIVE CODE</span>
                          <span className="text-xs font-bold text-white block">AI Hackathon</span>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Search & Filtration Container */}
            <section className="py-12 bg-zinc-950/30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-violet-400" /> Active School Announcements
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">Showing verified proposals currently approved by administrative staff.</p>
                  </div>

                  {/* Filter Form */}
                  <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search announcements..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/60 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                      />
                    </div>

                    <div className="relative w-full sm:w-48">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-zinc-900/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all cursor-pointer"
                      >
                        <option value="">All Categories</option>
                        <option value="Sports">Sports</option>
                        <option value="Academics">Academics</option>
                        <option value="Cultural">Cultural & Arts</option>
                        <option value="Science & Tech">Science & Tech</option>
                        <option value="Community & Social">Community & Social</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {(searchQuery || selectedCategory) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Clear filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Approved Events Grid replaced with Left-to-Right Marquee */}
                {approvedEvents.length > 0 ? (
                  <div className="marquee-container relative py-4">
                    <div 
                      className="marquee-track animate-marquee-ltr"
                      style={{ 
                        animationDuration: `${Math.max(25, getRepeatedEvents(approvedEvents).length * 5)}s` 
                      }}
                    >
                      {/* Original track */}
                      {getRepeatedEvents(approvedEvents).map((event, idx) => (
                        <article
                          key={`orig-${event.id}-${idx}`}
                          className="glass rounded-2xl overflow-hidden hover:border-violet-500/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full w-[290px] sm:w-[350px] shrink-0"
                        >
                          <div className="relative h-48 overflow-hidden bg-zinc-900">
                            <img
                              src={event.image}
                              alt={event.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            <span className="absolute top-4 right-4 text-xs font-bold bg-violet-600/90 text-white px-3 py-1.5 rounded-full shadow-lg">
                              {event.category}
                            </span>
                          </div>

                          <div className="p-6 flex flex-col flex-grow">
                            <div className="flex items-center justify-between gap-4 text-xs text-zinc-400 mb-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-violet-400" /> {event.eventDate}
                              </span>
                              <span className="flex items-center gap-1 font-medium">
                                <User className="w-3.5 h-3.5 text-zinc-500" /> {event.studentName}
                              </span>
                            </div>

                            <h3 className="font-display font-bold text-lg text-white mb-2 line-clamp-1">
                              {event.title}
                            </h3>
                            
                            <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 mb-6">
                              {event.description}
                            </p>
                          </div>
                        </article>
                      ))}

                      {/* Duplicate track for seamless infinite marquee loop */}
                      {getRepeatedEvents(approvedEvents).map((event, idx) => (
                        <article
                          key={`dup-${event.id}-${idx}`}
                          aria-hidden="true"
                          className="glass rounded-2xl overflow-hidden hover:border-violet-500/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full w-[290px] sm:w-[350px] shrink-0 marquee-duplicate-track"
                        >
                          <div className="relative h-48 overflow-hidden bg-zinc-900">
                            <img
                              src={event.image}
                              alt={event.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            <span className="absolute top-4 right-4 text-xs font-bold bg-violet-600/90 text-white px-3 py-1.5 rounded-full shadow-lg">
                              {event.category}
                            </span>
                          </div>

                          <div className="p-6 flex flex-col flex-grow">
                            <div className="flex items-center justify-between gap-4 text-xs text-zinc-400 mb-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-violet-400" /> {event.eventDate}
                              </span>
                              <span className="flex items-center gap-1 font-medium">
                                <User className="w-3.5 h-3.5 text-zinc-500" /> {event.studentName}
                              </span>
                            </div>

                            <h3 className="font-display font-bold text-lg text-white mb-2 line-clamp-1">
                              {event.title}
                            </h3>
                            
                            <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 mb-6">
                              {event.description}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-12 text-center max-w-md mx-auto border border-dashed border-white/10">
                    <AlertTriangle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-1">No Approved Announcements</h3>
                    <p className="text-zinc-500 text-sm">We couldn't find any approved events matching your active search filters.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('');
                      }}
                      className="mt-4 px-4 py-2 bg-zinc-900 border border-white/5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Reset Filter Parameters
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Why school board announcements (Features) */}
            <section className="py-20 border-t border-white/5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-16">
                  <h2 className="font-display font-bold text-3xl tracking-tight text-white">How Campus Board Works</h2>
                  <p className="text-zinc-500 text-sm mt-2">Connecting student initiatives, administrative safety reviews, and beautiful announcements.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="glass rounded-2xl p-8 hover:border-violet-500/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-violet-600/15 text-violet-400 flex items-center justify-center mb-6">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-white mb-3">1. Student Proposals</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Registered students propose events, club agendas, exhibitions, or athletics with dates, text details, and custom banners.
                    </p>
                  </div>

                  <div className="glass rounded-2xl p-8 hover:border-violet-500/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center mb-6">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-white mb-3">2. Admin Sanctioning</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Administrators review proposed outlines, approve valid events instantly, or reject duplicate items to guarantee high-quality info.
                    </p>
                  </div>

                  <div className="glass rounded-2xl p-8 hover:border-violet-500/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center mb-6">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-white mb-3">3. Dynamic Board Live</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Approved schedules instantly populate the homepage calendar board so every student can search or filter updates on mobile.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================================== */}
        {/* PAGE 2: SIGN UP PAGE                 */}
        {/* ==================================== */}
        {activePage === 'SignUp' && (
          <section className="py-16 flex items-center justify-center px-4 relative">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-violet-600/5 pointer-events-none blur-3xl" />
            
            <div className="max-w-md w-full glass-premium rounded-2xl p-8 relative z-10 border border-[#2d2d2d]">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 text-white mb-4 shadow-lg">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h2 className="font-display font-extrabold text-2xl text-white">Student Registration</h2>
                <p className="text-zinc-400 text-sm mt-1">Create an account to propose school events</p>
              </div>

              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john.doe@school.edu"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Class/Grade</label>
                    <input
                      type="text"
                      required
                      placeholder="Grade 11"
                      value={signUpData.class}
                      onChange={(e) => setSignUpData({ ...signUpData, class: e.target.value })}
                      className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Section</label>
                    <input
                      type="text"
                      required
                      placeholder="B"
                      value={signUpData.section}
                      onChange={(e) => setSignUpData({ ...signUpData, section: e.target.value })}
                      className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Admission Number</label>
                  <input
                    type="text"
                    required
                    placeholder="ADM-2026-042"
                    value={signUpData.admissionNumber}
                    onChange={(e) => setSignUpData({ ...signUpData, admissionNumber: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">Must be at least 6 characters long</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 hover:scale-[1.01] text-white font-medium text-sm transition-all shadow-md cursor-pointer"
                >
                  Create Account
                </button>
              </form>

              <div className="text-center mt-6 text-xs text-zinc-400">
                <p>Already have an account? <button onClick={() => setActivePage('Login')} className="text-violet-400 hover:underline font-semibold">Login here</button></p>
                <button onClick={() => setActivePage('Home')} className="mt-4 text-zinc-500 hover:text-white transition-colors">← Back to Homepage</button>
              </div>
            </div>
          </section>
        )}

        {/* ==================================== */}
        {/* PAGE 3: STUDENT LOGIN PAGE           */}
        {/* ==================================== */}
        {activePage === 'Login' && (
          <section className="py-20 flex items-center justify-center px-4 relative">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-violet-600/5 pointer-events-none blur-3xl" />
            
            <div className="max-w-md w-full glass-premium rounded-2xl p-8 relative z-10 border border-[#2d2d2d]">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 text-white mb-4 shadow-lg">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h2 className="font-display font-extrabold text-2xl text-white">Student Portal</h2>
                <p className="text-zinc-400 text-sm mt-1">Sign in to manage proposed campus announcements</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah.j@school.edu"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => showToast('To recover your local XAMPP database account credentials, contact administrative personnel.', 'info')}
                      className="text-xs text-zinc-500 hover:text-violet-400 font-semibold text-right"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember_me"
                    checked={loginData.rememberMe}
                    onChange={(e) => setLoginData({ ...loginData, rememberMe: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500/30"
                  />
                  <label htmlFor="remember_me" className="ml-2 text-xs text-zinc-400 select-none">
                    Remember my email for 30 days
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 hover:scale-[1.01] text-white font-medium text-sm transition-all shadow-md cursor-pointer"
                >
                  Student Login
                </button>
              </form>

              <div className="text-center mt-6 text-xs text-zinc-400 space-y-4">
                <p>Don't have an account? <button onClick={() => setActivePage('SignUp')} className="text-violet-400 hover:underline font-semibold">Register here</button></p>
                
                <div className="h-[1px] bg-[#2d2d2d] w-full my-4" />
                
                <p>Are you a staff official? <button onClick={() => setActivePage('AdminLogin')} className="text-indigo-400 hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"><Lock className="w-3.5 h-3.5" /> Staff Admin Login</button></p>
                <button onClick={() => setActivePage('Home')} className="mt-4 text-zinc-500 hover:text-white transition-colors block mx-auto">← Back to Homepage</button>
              </div>
            </div>
          </section>
        )}

        {/* ==================================== */}
        {/* PAGE 4: STAFF ADMIN LOGIN PAGE       */}
        {/* ==================================== */}
        {activePage === 'AdminLogin' && (
          <section className="py-20 flex items-center justify-center px-4 relative">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#2d2d2d]/5 pointer-events-none blur-3xl" />
            
            <div className="max-w-md w-full glass-premium rounded-2xl p-8 relative z-10 border border-[#2d2d2d]">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 text-white mb-4 shadow-lg">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="font-display font-extrabold text-2xl text-white">Admin Portal</h2>
                <p className="text-zinc-400 text-sm mt-1">Authenticate with staff credentials</p>
              </div>

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Administrative Username</label>
                  <input
                    type="text"
                    required
                    value={adminLoginData.username}
                    onChange={(e) => setAdminLoginData({ ...adminLoginData, username: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminLoginData.password}
                    onChange={(e) => setAdminLoginData({ ...adminLoginData, password: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-4 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 hover:scale-[1.01] text-white font-medium text-sm transition-all shadow-md cursor-pointer"
                >
                  Authenticate & Enter
                </button>
              </form>

              <div className="text-center mt-6 text-xs text-zinc-400">
                <p>Are you a student? <button onClick={() => setActivePage('Login')} className="text-violet-400 hover:underline font-semibold">Student Login</button></p>
                <button onClick={() => setActivePage('Home')} className="mt-4 text-zinc-500 hover:text-white transition-colors block mx-auto">← Back to Homepage</button>
              </div>
            </div>
          </section>
        )}

        {/* ==================================== */}
        {/* PAGE 5: STUDENT DASHBOARD            */}
        {/* ==================================== */}
        {activePage === 'StudentDashboard' && activeStudent && (
          <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Welcoming Header Panel */}
            <div className="glass rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#2d2d2d]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-violet-600/5 to-transparent pointer-events-none blur-3xl" />
              <div>
                <span className="text-xs font-semibold text-violet-400 bg-[#0a0a0a] border border-[#2d2d2d] px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">Student Dashboard</span>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-1">Welcome back, {activeStudent.fullName}</h2>
                <p className="text-zinc-400 text-sm mt-1 max-w-xl">Propose class agendas, music events, and athletic finals. Track active approvals from the school board.</p>
              </div>
              <div className="shrink-0 flex items-center gap-4 text-sm text-zinc-400 bg-[#0a0a0a] p-4 rounded-xl border border-[#2d2d2d]">
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Class Level</span>
                  <span className="font-bold text-white block mt-0.5">{activeStudent.class} - Sec {activeStudent.section}</span>
                </div>
                <div className="h-8 w-[1px] bg-[#2d2d2d]" />
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Admission Number</span>
                  <span className="font-mono text-zinc-300 block mt-0.5">{activeStudent.admissionNumber}</span>
                </div>
              </div>
            </div>

            {/* Statistics Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-white block leading-none">
                    {events.filter((ev) => ev.studentId === activeStudent.id).length}
                  </span>
                  <span className="text-xs text-zinc-500 mt-1 block">Total Proposed</span>
                </div>
              </div>

              <div className="glass rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-emerald-400 block leading-none">
                    {events.filter((ev) => ev.studentId === activeStudent.id && ev.status === 'Approved').length}
                  </span>
                  <span className="text-xs text-zinc-500 mt-1 block">Approved Events</span>
                </div>
              </div>

              <div className="glass rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-600/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-amber-400 block leading-none">
                    {events.filter((ev) => ev.studentId === activeStudent.id && ev.status === 'Pending').length}
                  </span>
                  <span className="text-xs text-zinc-500 mt-1 block">Pending Review</span>
                </div>
              </div>

              <div className="glass rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-rose-600/15 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-rose-400 block leading-none">
                    {events.filter((ev) => ev.studentId === activeStudent.id && ev.status === 'Rejected').length}
                  </span>
                  <span className="text-xs text-zinc-500 mt-1 block">Rejected Proposals</span>
                </div>
              </div>
            </div>

            {/* Split Grid: Submit Form & Own Submissions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Form */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-[#2d2d2d] bg-white/[0.01]">
                    <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                      <Plus className="w-5 h-5 text-violet-400" /> Submit New Event Proposal
                    </h3>
                  </div>

                  <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Event Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="Inter-Class Science Exhibition"
                        value={newEventData.title}
                        onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Category *</label>
                        <select
                          required
                          value={newEventData.category}
                          onChange={(e) => setNewEventData({ ...newEventData, category: e.target.value })}
                          className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-3 py-2 text-sm text-zinc-300 focus:border-purple-500/50 outline-none cursor-pointer"
                        >
                          <option value="" disabled>Select</option>
                          <option value="Sports">Sports</option>
                          <option value="Academics">Academics</option>
                          <option value="Cultural">Cultural & Arts</option>
                          <option value="Science & Tech">Science & Tech</option>
                          <option value="Community & Social">Community & Social</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Date *</label>
                        <input
                          type="date"
                          required
                          value={newEventData.eventDate}
                          onChange={(e) => setNewEventData({ ...newEventData, eventDate: e.target.value })}
                          className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-3 py-2 text-sm text-zinc-300 focus:border-purple-500/50 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Description *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Detail the agenda, rules of registration, and target classes..."
                        value={newEventData.description}
                        onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 outline-none"
                      />
                    </div>

                    {/* Drag and Drop Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Event Cover Photo</label>
                      
                      {!imagePreview ? (
                        <div
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-[#2d2d2d] hover:border-violet-500/40 rounded-xl p-6 text-center cursor-pointer bg-zinc-950/20 hover:bg-zinc-950/40 transition-colors flex flex-col items-center justify-center gap-2 group"
                        >
                          <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                          <div>
                            <span className="text-xs font-semibold text-zinc-300 block">Click to upload or drag image</span>
                            <span className="text-[10px] text-zinc-500 block mt-1">PNG, JPG, GIF (Max 2MB)</span>
                          </div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-[#2d2d2d] max-h-48 bg-zinc-950">
                          <img src={imagePreview} alt="Upload preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={clearImagePreview}
                            className="absolute top-2.5 right-2.5 p-1.5 bg-black/80 hover:bg-rose-600 text-white rounded-full transition-colors"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 mt-4 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 hover:scale-[1.01] text-white font-medium text-sm transition-all shadow-md cursor-pointer"
                    >
                      Propose Event Proposal
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Table */}
              <div className="lg:col-span-7">
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-[#2d2d2d] bg-[#0a0a0a]/50">
                    <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-400" /> My Proposed Events
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    {events.filter((ev) => ev.studentId === activeStudent.id).length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#2d2d2d] bg-[#0a0a0a] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            <th className="py-3.5 px-5">Title</th>
                            <th className="py-3.5 px-5">Category</th>
                            <th className="py-3.5 px-5">Status</th>
                            <th className="py-3.5 px-5">Event Date</th>
                            <th className="py-3.5 px-5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d2d] text-sm">
                          {events
                            .filter((ev) => ev.studentId === activeStudent.id)
                            .map((ev) => (
                              <tr key={ev.id} className="hover:bg-white/[0.01] transition-colors">
                                <td className="py-4 px-5">
                                  <span className="font-medium text-white block">{ev.title}</span>
                                  <span className="text-[10px] text-zinc-500 block mt-0.5">Submitted: {new Date(ev.createdAt).toLocaleDateString()}</span>
                                  {ev.status === 'Rejected' && ev.rejectionReason && (
                                    <div className="mt-1.5 text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2 rounded-lg leading-relaxed flex items-start gap-1.5 max-w-xs">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                                      <span><strong>Staff Note:</strong> {ev.rejectionReason}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 px-5">
                                  <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#0a0a0a] border border-[#2d2d2d] text-zinc-300">
                                    {ev.category}
                                  </span>
                                </td>
                                <td className="py-4 px-5">
                                  {ev.status === 'Approved' ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                      <CheckCircle2 className="w-3 h-3" /> Approved
                                    </span>
                                  ) : ev.status === 'Pending' ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                      <Clock className="w-3 h-3 animate-pulse" /> Pending
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                                      <X className="w-3 h-3" /> Rejected
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-5 font-mono text-xs text-zinc-300">
                                  {ev.eventDate}
                                </td>
                                <td className="py-4 px-5 text-center">
                                  {ev.status === 'Pending' ? (
                                    <button
                                      onClick={() => handleDeleteRequest(ev.id, 'event')}
                                      className="p-1.5 hover:bg-rose-600/20 hover:text-rose-400 rounded-lg text-zinc-500 transition-colors"
                                      title="Delete Pending Draft"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span className="text-xs text-zinc-600 font-mono">Locked</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-12 text-center text-zinc-500">
                        <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm">You have not proposed any campus events yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ==================================== */}
        {/* PAGE 6: STAFF ADMIN DASHBOARD       */}
        {/* ==================================== */}
        {activePage === 'AdminDashboard' && adminLoggedIn && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
            
            <div className="flex flex-col lg:flex-row gap-8">
              
              {/* Left sidebar admin navigation */}
              <aside className="lg:w-64 shrink-0 space-y-4">
                <div className="glass rounded-2xl p-5 border border-[#2d2d2d]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-bold shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                      AD
                    </div>
                    <div>
                      <span className="font-bold text-white block text-sm">Staff Admin</span>
                      <span className="text-[10px] text-violet-400 font-mono block mt-0.5">Role: Head Moderator</span>
                    </div>
                  </div>
                </div>

                <nav className="space-y-1 bg-[#0a0a0a]/40 p-2 rounded-2xl border border-[#2d2d2d] divide-y divide-[#2d2d2d]/30">
                  <div className="pb-1.5 space-y-1">
                    <button
                      onClick={() => setSelectedTab('dashboard')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                        selectedTab === 'dashboard'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <LayoutDashboard className="w-4.5 h-4.5" /> Stats & Audit Logs
                    </button>
                    <button
                      onClick={() => setSelectedTab('users')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                        selectedTab === 'users'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Users className="w-4.5 h-4.5" /> Students Directory
                    </button>
                    <button
                      onClick={() => setSelectedTab('events')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                        selectedTab === 'events'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-4.5 h-4.5" /> Proposals Queue
                    </button>
                  </div>
                  <div className="pt-1.5 space-y-1">
                    <button
                      onClick={() => setSelectedTab('settings')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                        selectedTab === 'settings'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Settings className="w-4.5 h-4.5" /> Board Configurator
                    </button>
                    <button
                      onClick={() => setSelectedTab('php_export')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                        selectedTab === 'php_export'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <FileCode className="w-4.5 h-4.5 text-violet-400" /> PHP Source Package
                    </button>
                    <button
                      onClick={() => setSelectedTab('supabase')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                        selectedTab === 'supabase'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Database className="w-4.5 h-4.5 text-emerald-400" /> Supabase Database
                    </button>
                  </div>
                </nav>
              </aside>

              {/* Right panel view workspace */}
              <div className="flex-grow space-y-6">
                
                {/* 1. Dashboard & Audit Logs Sub-View */}
                {selectedTab === 'dashboard' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="glass rounded-2xl p-6 sm:p-8 border border-[#2d2d2d] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-violet-600/5 to-transparent pointer-events-none blur-2xl" />
                      <h2 className="font-display font-extrabold text-2xl text-white">Administrative Portal</h2>
                      <p className="text-zinc-400 text-sm mt-1">Review event agendas proposed by student organizers, authorize campus calendars, and trace real-time system logs.</p>
                    </div>

                    {/* Stats counters */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="glass rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-purple-600/15 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/10">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-2xl font-bold text-white block leading-none">{students.length}</span>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase mt-1.5 block tracking-wider">Students</span>
                        </div>
                      </div>

                      <div className="glass rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/10">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-2xl font-bold text-white block leading-none">{events.length}</span>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase mt-1.5 block tracking-wider">Submissions</span>
                        </div>
                      </div>

                      <div className="glass rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-amber-600/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/10">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-2xl font-bold text-amber-400 block leading-none">
                            {events.filter((ev) => ev.status === 'Pending').length}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase mt-1.5 block tracking-wider">Pending</span>
                        </div>
                      </div>

                      <div className="glass rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/10">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-2xl font-bold text-emerald-400 block leading-none">
                            {events.filter((ev) => ev.status === 'Approved').length}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase mt-1.5 block tracking-wider">Approved</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Category distribution visualizer */}
                      <div className="glass rounded-2xl p-6 border border-[#2d2d2d] flex flex-col justify-between">
                        <div>
                          <h3 className="font-display font-bold text-white mb-2 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-400" /> Category Distribution
                          </h3>
                          <p className="text-zinc-400 text-xs mb-6">Percentage of student proposals grouped by category allocations.</p>
                          
                          <div className="space-y-4">
                            {getCategoryStats().map((cat) => (
                              <div key={cat.name} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                  <span className="text-zinc-400">{cat.name}</span>
                                  <span className="text-zinc-200 font-mono">{cat.count} ({cat.percentage}%)</span>
                                </div>
                                <div className="w-full bg-[#0a0a0a] rounded-full h-2 overflow-hidden border border-[#2d2d2d]">
                                  <div
                                    className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${cat.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-6 mt-6 border-t border-[#2d2d2d]/50 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                          <span>Total records parsed: {events.length}</span>
                          <span className="text-violet-400 font-bold">Live Synced</span>
                        </div>
                      </div>

                      {/* Right: Live System Audit Log */}
                      <div className="glass rounded-2xl p-6 border border-[#2d2d2d] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-display font-bold text-white flex items-center gap-2">
                              <Activity className="w-5 h-5 text-purple-400" /> System Audit Logs
                            </h3>
                            <button
                              onClick={() => {
                                setAuditLogs([
                                  { id: Date.now().toString(), action: 'Audit log cleared manually by administrator', timestamp: new Date().toISOString(), type: 'info' }
                                ]);
                                showToast('Audit logs truncated successfully.', 'info');
                              }}
                              className="text-[10px] font-bold text-zinc-500 hover:text-rose-400 uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Clear Logs
                            </button>
                          </div>
                          <p className="text-zinc-400 text-xs mb-4">Historical tracker of security and status updates across the board environment.</p>

                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {auditLogs.map((log) => (
                              <div key={log.id} className="p-3 rounded-xl bg-[#0a0a0a]/40 border border-[#2d2d2d]/60 flex items-start gap-2.5 text-xs transition-colors hover:bg-white/[0.01]">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                  log.type === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                  log.type === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                  log.type === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                  'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                }`} />
                                <div className="flex-grow">
                                  <span className="text-zinc-300 block leading-relaxed">{log.action}</span>
                                  <span className="text-[9px] text-zinc-500 font-mono block mt-1">
                                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-[#2d2d2d]/50 text-[10px] text-zinc-500 font-mono flex items-center justify-between mt-4">
                          <span>Status: Online</span>
                          <span>XAMPP Session Trace</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 2. Students Directory Sub-View */}
                {selectedTab === 'users' && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Toolbar search & onboard actions */}
                    <div className="glass rounded-2xl p-5 border border-[#2d2d2d]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-grow max-w-md">
                          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Search directory by student name, email, or admission..."
                            value={adminStudentSearch}
                            onChange={(e) => setAdminStudentSearch(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/50"
                          />
                          {adminStudentSearch && (
                            <button onClick={() => setAdminStudentSearch('')} className="absolute right-3 top-3 text-zinc-500 hover:text-white">
                              <X className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/10 transition-all cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" /> {showAddStudentForm ? 'Dismiss Form' : 'Register Student Manually'}
                        </button>
                      </div>

                      {/* Collapsible Manual Registration Form */}
                      {showAddStudentForm && (
                        <div className="mt-5 pt-5 border-t border-[#2d2d2d] animate-fade-in">
                          <div className="p-5 rounded-2xl bg-[#0a0a0a]/60 border border-[#2d2d2d]/80 max-w-2xl">
                            <h4 className="font-display font-bold text-sm text-white mb-1.5 flex items-center gap-1.5">
                              <UserPlus className="w-4 h-4 text-violet-400" /> New Student Registration Form
                            </h4>
                            <p className="text-zinc-400 text-xs mb-4">Onboard a verified student record to enable their access credential right away.</p>
                            
                            <form onSubmit={handleManualStudentSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Full Name *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Sarah Jenkins"
                                  value={manualStudentData.fullName}
                                  onChange={(e) => setManualStudentData({ ...manualStudentData, fullName: e.target.value })}
                                  className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-purple-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email Address *</label>
                                <input
                                  type="email"
                                  required
                                  placeholder="sarah.j@school.edu"
                                  value={manualStudentData.email}
                                  onChange={(e) => setManualStudentData({ ...manualStudentData, email: e.target.value })}
                                  className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-purple-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Class level *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Grade 12"
                                  value={manualStudentData.class}
                                  onChange={(e) => setManualStudentData({ ...manualStudentData, class: e.target.value })}
                                  className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-purple-500/50"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Section *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="A"
                                    value={manualStudentData.section}
                                    onChange={(e) => setManualStudentData({ ...manualStudentData, section: e.target.value })}
                                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none text-center focus:border-purple-500/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Admission Number *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="ADM-2026-001"
                                    value={manualStudentData.admissionNumber}
                                    onChange={(e) => setManualStudentData({ ...manualStudentData, admissionNumber: e.target.value })}
                                    className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none text-center font-mono uppercase focus:border-purple-500/50"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Initial Password *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="student123"
                                  value={manualStudentData.password}
                                  onChange={(e) => setManualStudentData({ ...manualStudentData, password: e.target.value })}
                                  className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-purple-500/50"
                                />
                              </div>
                              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAddStudentForm(false)}
                                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-[#2d2d2d] text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/15 cursor-pointer"
                                >
                                  Authorize & Create Account
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Students Directory Table */}
                    <div className="glass rounded-2xl overflow-hidden border border-[#2d2d2d]">
                      <div className="p-5 border-b border-[#2d2d2d] bg-[#0a0a0a]/50">
                        <h3 className="font-display font-bold text-sm text-white">Active Student Members Directory</h3>
                      </div>

                      <div className="overflow-x-auto">
                        {students.filter((st) => {
                          const query = adminStudentSearch.toLowerCase();
                          return st.fullName.toLowerCase().includes(query) ||
                                 st.email.toLowerCase().includes(query) ||
                                 st.admissionNumber.toLowerCase().includes(query) ||
                                 st.class.toLowerCase().includes(query);
                        }).length > 0 ? (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-[#2d2d2d] bg-[#0a0a0a] text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                <th className="py-3.5 px-5">ID</th>
                                <th className="py-3.5 px-5">Name & Bio</th>
                                <th className="py-3.5 px-5">Email Address</th>
                                <th className="py-3.5 px-5">Level / Section</th>
                                <th className="py-3.5 px-5">Admission No</th>
                                <th className="py-3.5 px-5 text-center">Action Control</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2d2d2d] text-xs">
                              {students
                                .filter((st) => {
                                  const query = adminStudentSearch.toLowerCase();
                                  return st.fullName.toLowerCase().includes(query) ||
                                         st.email.toLowerCase().includes(query) ||
                                         st.admissionNumber.toLowerCase().includes(query) ||
                                         st.class.toLowerCase().includes(query);
                                })
                                .map((student) => (
                                  <tr key={student.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-5 font-mono text-zinc-500 font-bold">#{student.id}</td>
                                    <td className="py-4 px-5">
                                      <span className="font-semibold text-white block">{student.fullName}</span>
                                      <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">Registered: {new Date(student.createdAt).toLocaleDateString()}</span>
                                    </td>
                                    <td className="py-4 px-5 text-zinc-300 font-mono">{student.email}</td>
                                    <td className="py-4 px-5">
                                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#0a0a0a] border border-[#2d2d2d] text-zinc-300 font-bold uppercase">
                                        {student.class} - Sec {student.section}
                                      </span>
                                    </td>
                                    <td className="py-4 px-5 font-mono text-zinc-400 font-semibold">{student.admissionNumber}</td>
                                    <td className="py-4 px-5 text-center">
                                      <button
                                        onClick={() => handleDeleteRequest(student.id, 'student')}
                                        className="px-2.5 py-1.5 rounded-lg border border-rose-500/25 bg-rose-950/20 text-rose-400 hover:bg-rose-600 hover:text-white text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer"
                                      >
                                        Revoke User
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="p-12 text-center text-zinc-500">
                            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3 animate-pulse" />
                            <p className="text-sm">No student records found matching the search criteria.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Events Proposal Control Sub-View */}
                {selectedTab === 'events' && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Filters and search options */}
                    <div className="glass rounded-2xl p-5 border border-[#2d2d2d] flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search title, proposer..."
                          value={adminEventSearch}
                          onChange={(e) => setAdminEventSearch(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/50"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-1.5 bg-[#0a0a0a] px-3 py-1.5 rounded-xl border border-[#2d2d2d]">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase">Cat:</span>
                          <select
                            value={adminEventCategoryFilter}
                            onChange={(e) => setAdminEventCategoryFilter(e.target.value)}
                            className="bg-transparent text-xs text-zinc-300 outline-none cursor-pointer pr-1"
                          >
                            <option value="">All Categories</option>
                            <option value="Sports">Sports</option>
                            <option value="Academics">Academics</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Science & Tech">Science & Tech</option>
                            <option value="Community & Social">Community & Social</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#0a0a0a] px-3 py-1.5 rounded-xl border border-[#2d2d2d]">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase">Status:</span>
                          <select
                            value={adminEventStatusFilter}
                            onChange={(e) => setAdminEventStatusFilter(e.target.value)}
                            className="bg-transparent text-xs text-zinc-300 outline-none cursor-pointer pr-1"
                          >
                            <option value="">All statuses</option>
                            <option value="Pending">Pending Review</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Proposal queue items list */}
                    <div className="glass rounded-2xl overflow-hidden border border-[#2d2d2d]">
                      <div className="p-5 border-b border-[#2d2d2d] bg-[#0a0a0a]/50 flex items-center justify-between">
                        <h3 className="font-display font-bold text-sm text-white">Event Proposals Approval Board Queue</h3>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Queue Count: {
                          events.filter((ev) => {
                            const matchQuery = ev.title.toLowerCase().includes(adminEventSearch.toLowerCase()) || ev.studentName.toLowerCase().includes(adminEventSearch.toLowerCase());
                            const matchCategory = !adminEventCategoryFilter || ev.category === adminEventCategoryFilter;
                            const matchStatus = !adminEventStatusFilter || ev.status === adminEventStatusFilter;
                            return matchQuery && matchCategory && matchStatus;
                          }).length
                        }</span>
                      </div>

                      <div className="overflow-x-auto">
                        {events.filter((ev) => {
                          const matchQuery = ev.title.toLowerCase().includes(adminEventSearch.toLowerCase()) || ev.studentName.toLowerCase().includes(adminEventSearch.toLowerCase());
                          const matchCategory = !adminEventCategoryFilter || ev.category === adminEventCategoryFilter;
                          const matchStatus = !adminEventStatusFilter || ev.status === adminEventStatusFilter;
                          return matchQuery && matchCategory && matchStatus;
                        }).length > 0 ? (
                          <table className="w-full text-left border-collapse align-middle">
                            <thead>
                              <tr className="border-b border-[#2d2d2d] bg-[#0a0a0a] text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                <th className="py-3.5 px-5">Image</th>
                                <th className="py-3.5 px-5">Title & description</th>
                                <th className="py-3.5 px-5">Proposer student</th>
                                <th className="py-3.5 px-5">Category</th>
                                <th className="py-3.5 px-5">Review Status</th>
                                <th className="py-3.5 px-5">Event Date</th>
                                <th className="py-3.5 px-5 text-center">Actions Controller</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2d2d2d] text-xs">
                              {events
                                .filter((ev) => {
                                  const matchQuery = ev.title.toLowerCase().includes(adminEventSearch.toLowerCase()) || ev.studentName.toLowerCase().includes(adminEventSearch.toLowerCase());
                                  const matchCategory = !adminEventCategoryFilter || ev.category === adminEventCategoryFilter;
                                  const matchStatus = !adminEventStatusFilter || ev.status === adminEventStatusFilter;
                                  return matchQuery && matchCategory && matchStatus;
                                })
                                .map((ev) => (
                                  <tr key={ev.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-5">
                                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#2d2d2d] bg-zinc-950 shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]">
                                        <img src={ev.image} alt="Cover" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                      </div>
                                    </td>
                                    <td className="py-4 px-5 max-w-xs">
                                      <strong className="text-white block font-semibold leading-normal">{ev.title}</strong>
                                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5 leading-relaxed">{ev.description}</p>
                                      {ev.rejectionReason && ev.status === 'Rejected' && (
                                        <div className="mt-1.5 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] flex items-start gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                          <span><strong>Rejection Feedback:</strong> {ev.rejectionReason}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4 px-5">
                                      <span className="text-zinc-200 font-medium block">{ev.studentName}</span>
                                      <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">Student ID: #{ev.studentId}</span>
                                    </td>
                                    <td className="py-4 px-5">
                                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#0a0a0a] border border-[#2d2d2d] text-zinc-300 font-semibold font-mono">
                                        {ev.category}
                                      </span>
                                    </td>
                                    <td className="py-4 px-5">
                                      {ev.status === 'Approved' ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                          Approved
                                        </span>
                                      ) : ev.status === 'Pending' ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse">
                                          Pending
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                                          Rejected
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-5 font-mono text-zinc-300">{ev.eventDate}</td>
                                    <td className="py-4 px-5">
                                      <div className="flex flex-col gap-1.5 max-w-[120px] mx-auto">
                                        <div className="flex gap-1.5">
                                          {ev.status !== 'Approved' && (
                                            <button
                                              onClick={() => handleAdminDecision(ev.id, 'Approved')}
                                              className="flex-grow px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-[10px] uppercase cursor-pointer text-center"
                                              title="Approve Proposal to live feed"
                                            >
                                              Approve
                                            </button>
                                          )}
                                          
                                          {ev.status !== 'Rejected' && (
                                            <button
                                              onClick={() => setRejectEventId(ev.id)}
                                              className="flex-grow px-2 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all text-[10px] uppercase cursor-pointer text-center"
                                              title="Reject and provide corrective notes"
                                            >
                                              Reject
                                            </button>
                                          )}
                                        </div>

                                        <div className="flex gap-1.5">
                                          <button
                                            onClick={() => setDetailEvent(ev)}
                                            className="flex-grow px-2 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase hover:bg-indigo-600 hover:text-white transition-all cursor-pointer text-center"
                                            title="Inspect and preview proposal detail card"
                                          >
                                            Inspect
                                          </button>
                                          <button
                                            onClick={() => handleDeleteRequest(ev.id, 'event')}
                                            className="p-1.5 rounded-lg bg-rose-950/20 text-rose-400 border border-rose-500/15 hover:bg-rose-600 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            title="Remove permanently from records"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Inline Rejection Feedback Note Form */}
                                      {rejectEventId === ev.id && (
                                        <div className="mt-3 p-3 bg-zinc-950 rounded-xl border border-amber-500/20 max-w-xs text-left">
                                          <label className="block text-[9px] font-bold text-amber-400 uppercase mb-1">Feedback Feedback Note *</label>
                                          <textarea
                                            rows={2}
                                            required
                                            value={rejectionInput}
                                            onChange={(e) => setRejectionInput(e.target.value)}
                                            placeholder="e.g. Duplicate date, select a different cover photo..."
                                            className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-lg p-2 text-[11px] text-white outline-none focus:border-amber-500"
                                          />
                                          <div className="flex justify-end gap-2 mt-2">
                                            <button
                                              onClick={() => {
                                                setRejectEventId(null);
                                                setRejectionInput('');
                                              }}
                                              className="px-2 py-1 bg-zinc-900 rounded-md text-[10px] text-zinc-400"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (!rejectionInput.trim()) {
                                                  showToast('Please insert a rejection feedback reason first.', 'error');
                                                  return;
                                                }
                                                handleAdminDecision(ev.id, 'Rejected', rejectionInput);
                                                setRejectEventId(null);
                                                setRejectionInput('');
                                              }}
                                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-[10px] font-bold uppercase"
                                            >
                                              Submit Rejection
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="p-12 text-center text-zinc-500">
                            <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                            <p className="text-sm">No submissions found matching selected filters.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Board Configurator Sub-View */}
                {selectedTab === 'settings' && (
                  <div className="space-y-6 animate-fade-in">
                    
                    <div className="glass rounded-2xl p-6 border border-[#2d2d2d]">
                      <h3 className="font-display font-extrabold text-lg text-white mb-1.5 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-400" /> School Board Configurator
                      </h3>
                      <p className="text-zinc-400 text-xs mb-6">Manage system-wide defaults, auto-moderation gates, news ticker ribbons, and global title presets.</p>
                      
                      <div className="space-y-5 max-w-xl">
                        
                        {/* Title field */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide">Main Board Title Header</label>
                          <input
                            type="text"
                            value={systemSettings.boardTitle}
                            onChange={(e) => setSystemSettings({ ...systemSettings, boardTitle: e.target.value })}
                            className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500/50 outline-none"
                            placeholder="School Events Board"
                          />
                          <span className="text-[10px] text-zinc-500 block">Changes the header brand logo and homepage hero heading instantly across all pages.</span>
                        </div>

                        {/* Ticker marquee field */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide">Rolling Ribbon Announcement Message</label>
                          <textarea
                            rows={3}
                            value={systemSettings.tickerMessage}
                            onChange={(e) => setSystemSettings({ ...systemSettings, tickerMessage: e.target.value })}
                            className="w-full bg-[#0a0a0a] border border-[#2d2d2d] rounded-xl p-4 text-xs text-white focus:border-purple-500/50 outline-none leading-relaxed"
                            placeholder="e.g. Mid-Term Sports Tryouts are rescheduled to Monday. Final cultural registrations close at 5:00 PM!"
                          />
                          <span className="text-[10px] text-zinc-500 block">Provide a bulletin alert message to display inside the moving announcement ticker ribbon under the main header. Set to empty to disable the ribbon ticker completely.</span>
                        </div>

                        {/* Toggle switch for auto moderation */}
                        <div className="flex items-start justify-between p-4 bg-[#0a0a0a]/50 rounded-xl border border-[#2d2d2d] mt-2">
                          <div className="space-y-1 pr-6">
                            <span className="text-xs font-bold text-white block">Instantly Authorize Student Proposals</span>
                            <span className="text-[10px] text-zinc-500 block leading-relaxed">If enabled, student event submissions skip the administrator review queue and go live instantly on the homepage. Useful for fast-track testing!</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              const newMode = !systemSettings.autoModeration;
                              setSystemSettings({ ...systemSettings, autoModeration: newMode });
                              addAuditLog(`Updated Auto-Moderation to: ${newMode ? 'ENABLED' : 'DISABLED'}`, 'info');
                              showToast(`Auto-Moderation is now ${newMode ? 'enabled' : 'disabled'}.`, 'info');
                            }}
                            className="shrink-0 focus:outline-none cursor-pointer"
                          >
                            <div className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${systemSettings.autoModeration ? 'bg-purple-600' : 'bg-zinc-800'}`}>
                              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${systemSettings.autoModeration ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                          </button>
                        </div>

                        {/* Factory reset option */}
                        <div className="pt-6 border-t border-[#2d2d2d] mt-6">
                          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide mb-1.5">System Emergency Control</h4>
                          <p className="text-zinc-500 text-[10px] leading-relaxed mb-4">Restore original mock database entries (students, schedules, audit history logs) and wipe out custom changes. Irreversible.</p>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Are you absolutely sure you want to reset all configurations, students list, and proposed events to original seed templates?')) {
                                resetSystemToDefaults();
                              }
                            }}
                            className="px-4 py-2 bg-rose-950/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/25 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer"
                          >
                            Restore Seed Defaults
                          </button>
                        </div>

                      </div>
                    </div>

                  </div>
                )}

                {/* 5. PHP Source Package Sub-View */}
                {selectedTab === 'php_export' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="glass rounded-2xl p-6 border border-violet-500/15 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-violet-600/5 to-transparent pointer-events-none blur-3xl" />
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                          <span className="text-xs font-semibold text-violet-400 bg-violet-600/10 border border-violet-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">Developer Code Exporter</span>
                          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">PHP & MySQL Source Package</h2>
                          <p className="text-zinc-400 text-sm mt-1">The system has fully generated the complete offline XAMPP / WAMP package directory inside the workspace under the <code className="bg-zinc-900 px-1 py-0.5 rounded text-violet-300 font-mono">/php-version</code> folder. Browse, preview, or copy codes below!</p>
                        </div>
                        <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/5 text-xs text-zinc-400 max-w-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-white">Standard Deployment Instructions:</span>
                          </div>
                          <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                            <li>Launch Apache & MySQL in XAMPP</li>
                            <li>Import <code className="text-zinc-200">database.sql</code> in phpMyAdmin</li>
                            <li>Move these files to <code className="text-zinc-200">htdocs/school_board/</code></li>
                            <li>Open browser: <code className="text-zinc-200 font-mono text-[10px]">localhost/school_board</code></li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Explorer Index */}
                      <div className="lg:col-span-4 space-y-4">
                        <div className="glass rounded-2xl p-5 border border-[#2d2d2d]">
                          <h3 className="font-display font-bold text-sm text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileCode className="w-4.5 h-4.5 text-violet-400" /> File Explorer Directory
                          </h3>
                          <div className="space-y-1 max-h-[450px] overflow-y-auto pr-2">
                            {PHP_FILES_DATA.map((file) => (
                              <button
                                key={file.name}
                                onClick={() => setSelectedPHPFile(file)}
                                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm flex items-start gap-3 transition-colors ${
                                  selectedPHPFile.name === file.name
                                    ? 'bg-violet-600/15 text-white border-l-3 border-violet-500'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <FileCode className={`w-4 h-4 shrink-0 mt-0.5 ${selectedPHPFile.name === file.name ? 'text-violet-400' : 'text-zinc-500'}`} />
                                <div>
                                  <span className="font-medium block leading-tight">{file.name}</span>
                                  <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">/php-version/{file.path}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Code Display Editor */}
                      <div className="lg:col-span-8">
                        <div className="glass rounded-2xl overflow-hidden border border-white/5">
                          <div className="p-4 border-b border-white/5 bg-zinc-950/60 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                              </div>
                              <span className="text-xs font-mono text-zinc-400 ml-3">
                                /php-version/{selectedPHPFile.path}
                              </span>
                            </div>

                            <button
                              onClick={handleCopyCode}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600/10 border border-violet-500/30 text-violet-300 hover:bg-violet-600/25 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {copiedFile ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> Copy Code
                                </>
                              )}
                            </button>
                          </div>

                          <div className="p-4 bg-zinc-950/20 text-xs text-zinc-400 border-b border-white/5 flex items-start gap-2">
                            <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                            <p>{selectedPHPFile.description}</p>
                          </div>

                          <pre className="p-6 bg-zinc-950 font-mono text-sm overflow-x-auto text-zinc-300 max-h-[500px] leading-relaxed">
                            <code>{selectedPHPFile.code}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Supabase Real-time Cloud Integration Sub-View */}
                {selectedTab === 'supabase' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="glass rounded-2xl p-6 border border-emerald-500/15 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-emerald-600/5 to-transparent pointer-events-none blur-3xl" />
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
                        <div>
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block ${
                            supabaseStatus === 'connected'
                              ? 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-400'
                              : supabaseStatus === 'connecting'
                              ? 'bg-amber-600/10 border border-amber-500/20 text-amber-400'
                              : supabaseStatus === 'missing_tables'
                              ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400'
                              : 'bg-rose-600/10 border border-rose-500/20 text-rose-400'
                          }`}>
                            {supabaseStatus === 'connected' && '● Active & Connected'}
                            {supabaseStatus === 'connecting' && '⚡ Testing Connection...'}
                            {supabaseStatus === 'missing_tables' && '⚠ Connected (Tables Missing)'}
                            {supabaseStatus === 'disconnected' && '❌ Disconnected'}
                          </span>
                          <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
                            <Database className="w-6 h-6 text-emerald-400" /> Supabase Real-time Cloud Integration
                          </h2>
                          <p className="text-zinc-400 text-sm mt-1">
                            This application is fully integrated with your Supabase database project. Manage cloud tables, sync local data, and review database schemas.
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => checkSupabaseConnection()}
                            className="px-4 py-2.5 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5" /> Re-test Connection
                          </button>
                          
                          {(supabaseStatus === 'connected' || supabaseStatus === 'missing_tables') && (
                            <button
                              onClick={syncLocalToSupabase}
                              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" /> Push Local Data to Cloud
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Info Panels */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-xl">
                          <span className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Student Accounts</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white">{students.length}</span>
                            <span className="text-xs text-zinc-400">active profiles</span>
                          </div>
                        </div>
                        <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-xl">
                          <span className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Board Submissions</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white">{events.length}</span>
                            <span className="text-xs text-zinc-400">total proposals</span>
                          </div>
                        </div>
                        <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-xl">
                          <span className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">Cloud Endpoint URL</span>
                          <span className="text-xs font-mono text-zinc-400 block truncate">https://jyimhqpbitvysgvvnij.supabase.co</span>
                        </div>
                      </div>

                      {/* Setup Info */}
                      {supabaseStatus === 'disconnected' && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 mb-6 flex gap-4 items-start animate-fade-in">
                          <AlertCircle className="w-5.5 h-5.5 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-2.5">
                            <h4 className="font-semibold text-rose-400 text-sm">Supabase Project is Offline or Paused</h4>
                            <p className="text-zinc-400 text-xs leading-relaxed">
                              The application was unable to establish a live connection to the default cloud database. This typically happens if the shared free-tier demonstration project is <strong>automatically paused by Supabase</strong> due to inactivity, or if network ports are blocked by sandboxing.
                            </p>
                            <div className="text-zinc-300 text-xs font-bold pt-1">
                              How to proceed:
                            </div>
                            <ul className="list-disc pl-4 text-zinc-400 text-xs space-y-1.5 leading-relaxed">
                              <li>
                                <strong className="text-zinc-200">Active Offline Fallback</strong>: All client features (login, signup, proposal boards, auto-moderation) are fully operational right now using local browser storage! You can continue experimenting with the application without any interruption.
                              </li>
                              <li>
                                <strong className="text-zinc-200">Use Your Own Free Database</strong>: Set up a free account at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-semibold">supabase.com</a>, create a project, and enter your credentials into your project environment configuration:
                                <div className="mt-2 bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-[11px] text-zinc-300 leading-normal">
                                  VITE_SUPABASE_URL="https://your-project.supabase.co"<br/>
                                  VITE_SUPABASE_ANON_KEY="your-anon-key"
                                </div>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {supabaseStatus === 'missing_tables' && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6 flex gap-4 items-start">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-amber-400 text-sm">Database Schema Setup Required!</h4>
                            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                              Supabase connected successfully, but the required tables (<code className="text-amber-200">students</code>, <code className="text-emerald-200">events</code>, <code className="text-violet-200">admins</code>) do not exist yet. Copy the SQL script below, open your Supabase Dashboard SQL Editor, paste and run it, then click <strong>"Push Local Data to Cloud"</strong> or <strong>"Re-test Connection"</strong>.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* SQL Schema Display */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FileCode className="w-4 h-4 text-emerald-400" /> PostgreSQL Initialization Schema Script
                          </h4>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                              showToast('SQL schema copied to clipboard!', 'success');
                            }}
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy SQL Script
                          </button>
                        </div>
                        <pre className="bg-[#050505] border border-white/5 rounded-xl p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-96 leading-normal select-all">
                          {SUPABASE_SQL_SETUP}
                        </pre>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          </section>
        )}

        {/* PHP EXPORTER CODE VIEWER removed from public routing */}

      </main>

      {/* --- CONFIRM DELETE MODAL --- */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-premium rounded-2xl p-6 border border-rose-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-600/15 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-white">Confirm Deletion</h3>
            </div>
            
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              {showDeleteConfirm.type === 'event'
                ? 'Are you sure you want to permanently delete this school event submission? This action is irreversible.'
                : 'Warning: Deleting the student account will automatically cascade delete all event proposals submitted by them from both the active board and draft lists.'}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shadow-[0_4px_15px_rgba(239,68,68,0.3)]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- INSPECT PROPOSAL DETAIL MODAL --- */}
      {detailEvent && (() => {
        const proposingStudent = students.find((s) => s.id === detailEvent.studentId);
        return (
          <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-2xl w-full bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-fade-in my-8">
              {/* Cover Image Header if exists */}
              <div className="relative h-48 bg-zinc-900 overflow-hidden">
                {detailEvent.image ? (
                  <img
                    src={detailEvent.image}
                    alt={detailEvent.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-purple-950/40 to-indigo-950/40 flex items-center justify-center text-zinc-600">
                    <Calendar className="w-16 h-16 stroke-[1]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                
                {/* Close Button */}
                <button
                  onClick={() => {
                    setDetailEvent(null);
                    setInspectRejectMode(false);
                    setInspectRejectReason('');
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400">
                      {detailEvent.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      detailEvent.status === 'Approved'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : detailEvent.status === 'Rejected'
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    }`}>
                      {detailEvent.status}
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-white line-clamp-1">
                    {detailEvent.title}
                  </h3>
                </div>
              </div>

              {/* Content body */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Date & Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Calendar className="w-4.5 h-4.5 text-purple-400" />
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Scheduled Event Date</span>
                      <span className="text-sm font-semibold font-mono">{detailEvent.eventDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Clock className="w-4.5 h-4.5 text-purple-400" />
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Submitted On</span>
                      <span className="text-sm font-semibold font-mono">{new Date(detailEvent.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-purple-400" /> Proposal Description
                  </h4>
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                    {detailEvent.description || 'No description provided.'}
                  </p>
                </div>

                {/* Rejection reason (if exists) */}
                {detailEvent.status === 'Rejected' && detailEvent.rejectionReason && (
                  <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-4 space-y-1">
                    <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Administrative Rejection Feedback
                    </h5>
                    <p className="text-zinc-300 text-sm italic">
                      "{detailEvent.rejectionReason}"
                    </p>
                  </div>
                )}

                {/* Proposer Info */}
                <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <UserCheck className="w-4 h-4 text-purple-400" /> Proposing Student Profile
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase tracking-wide">Full Name</span>
                      <span className="text-xs font-semibold text-white">{detailEvent.studentName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase tracking-wide">Admission No.</span>
                      <span className="text-xs font-mono font-semibold text-white">
                        {proposingStudent?.admissionNumber || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase tracking-wide">Class & Section</span>
                      <span className="text-xs font-semibold text-white">
                        {proposingStudent ? `${proposingStudent.class} - Section ${proposingStudent.section}` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase tracking-wide">Email Address</span>
                      <span className="text-xs font-semibold text-white truncate block">
                        {proposingStudent?.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reject Feedback Input Form */}
                {inspectRejectMode && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 space-y-3 animate-fade-in">
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Provide Rejection Feedback Note *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={inspectRejectReason}
                      onChange={(e) => setInspectRejectReason(e.target.value)}
                      placeholder="Please enter details on why this is rejected or changes needed..."
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-amber-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setInspectRejectMode(false)}
                        className="px-3 py-1.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!inspectRejectReason.trim()) {
                            showToast('Please provide a rejection note.', 'error');
                            return;
                          }
                          await handleAdminDecision(detailEvent.id, 'Rejected', inspectRejectReason);
                          setDetailEvent(prev => prev ? { ...prev, status: 'Rejected', rejectionReason: inspectRejectReason } : null);
                          setInspectRejectMode(false);
                          setInspectRejectReason('');
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-[11px] font-semibold text-white rounded-lg transition-all cursor-pointer shadow-lg shadow-amber-600/20"
                      >
                        Submit Rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="px-6 py-4 bg-zinc-950/60 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => {
                    handleDeleteRequest(detailEvent.id, 'event');
                    setDetailEvent(null);
                  }}
                  className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-600 border border-rose-500/25 text-rose-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Permanently Delete Proposal"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>

                <div className="flex items-center gap-2">
                  {detailEvent.status !== 'Approved' && !inspectRejectMode && (
                    <button
                      onClick={async () => {
                        await handleAdminDecision(detailEvent.id, 'Approved');
                        setDetailEvent(prev => prev ? { ...prev, status: 'Approved' } : null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Proposal
                    </button>
                  )}

                  {detailEvent.status !== 'Rejected' && !inspectRejectMode && (
                    <button
                      onClick={() => setInspectRejectMode(true)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ThumbsDown className="w-4 h-4" /> Reject Proposal
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDetailEvent(null);
                      setInspectRejectMode(false);
                      setInspectRejectReason('');
                    }}
                    className="px-4 py-2 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- PROPORTIONAL VISUAL FOOTER --- */}
      <footer className="mt-auto border-t border-white/5 py-8 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            &copy; 2026 School Events Board. Designed with Inter & Outfit Display.
          </p>
          <ul className="flex items-center gap-6 text-xs text-zinc-400 font-medium">
            <li>
              <button onClick={() => setActivePage('Home')} className="hover:text-white cursor-pointer">Home</button>
            </li>
            <li>
              <button onClick={() => setActivePage('Login')} className="hover:text-white cursor-pointer">Student Access</button>
            </li>
            <li>
              <button onClick={() => setActivePage('AdminLogin')} className="hover:text-white cursor-pointer">Admin Access</button>
            </li>
          </ul>
        </div>
      </footer>

    </div>
  );
}
