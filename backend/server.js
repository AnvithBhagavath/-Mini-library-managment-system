const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2');
const bcrypt= require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');

require('dotenv').config();
// Email configuration
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function to send email
async function sendEmail(to, subject, text) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Basic middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE)
    }
}));


// session management



// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    // Check if the session has `isLoggedIn` set to true
    if (!req.session.isLoggedIn) {
        return res.redirect('/login.html');
    }
    next();
};

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    const query = 'SELECT * FROM Student WHERE EmailID = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            console.log('No user found with this email');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const student = results[0];
        // Compare entered password with hashed password from DB
        bcrypt.compare(password, student.SPassword, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ message: 'Error during login' });
            }

            if (!isMatch) {
                console.log('Password does not match');
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Password matched
            req.session.isLoggedIn = true;
            req.session.studentId = student.StudentID;
            console.log('Login successful for:', student.FullName);
            res.json({ 
                message: 'Login successful',
                studentId: student.StudentID,
                name: student.FullName
            });
        });
    });
});

app.post('/stafflogin', (req, res) => {
    const { email, password } = req.body;
    console.log('Staff login attempt:', { email });

    const query = 'SELECT * FROM staff WHERE Staffemail = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            console.log('No staff found with this email');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const staff = results[0];
        if (password === staff.Staffpass) {
            // Set both session variables
            req.session.isStaffLoggedIn = true;
            req.session.isLoggedIn = true;  // Add this line
            req.session.staffEmail = staff.Staffemail;
            
            console.log('Staff login successful for:', staff.Staffemail);
            res.json({ 
                message: 'Login successful',
                staffEmail: staff.Staffemail
            });
        } else {
            console.log('Password does not match');
            return res.status(401).json({ message: 'Invalid email or password' });
        }
    });
});

app.post('/register', (req, res) => {
    console.log('Received registration request');
    console.log('Request body:', req.body);
    
    const { fullName, email, dateOfBirth, phoneNumber, gender, password } = req.body;
    
    if (!fullName || !email || !dateOfBirth || !phoneNumber || !gender || !password) {
        console.log('Missing required fields');
        return res.status(400).json({ message: 'All fields are required' });
    }
    
    console.log('Registration attempt:', { fullName, email, dateOfBirth, phoneNumber, gender });
    
    // Check if email already exists
    const checkQuery = 'SELECT * FROM Student WHERE EmailID = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) {
            console.error('Check email error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        
        if (results.length > 0) {
            console.log('Email already exists');
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash the password before saving
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                return res.status(500).json({ message: 'Error hashing password' });
            }

            // Insert new student with hashed password
            const insertQuery = `
                INSERT INTO Student 
                (FullName, EmailID, DateOfBirth, PhoneNumber, Gender, SPassword) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            console.log('Insert query:', insertQuery);
            console.log('Insert values:', [fullName, email, dateOfBirth, phoneNumber, gender, hashedPassword]);
            
            db.query(insertQuery, 
                [fullName, email, dateOfBirth, phoneNumber, gender, hashedPassword], 
                (err, results) => {
                    if (err) {
                        console.error('Insert error:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }
                    
                    console.log('Registration successful');
                    res.json({ 
                        message: 'Registration successful',
                        studentId: results.insertId
                    });
                }
            );
        });
    });
});

app.post('/addBook', (req, res) => {
    const { ISBN, title, author, genre, status } = req.body;
  
    const sql = `INSERT INTO Book (BookISBN, BookTitle, Author, Genre, Status) VALUES (?, ?, ?, ?, ?)`;
    const values = [ISBN, title, author, genre, status];
  
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to add book' });
      }
      res.status(200).json({ message: 'Book added successfully!' });
    });
  });

  app.post('/delete-book', (req, res) => {
    const { bookISBN, bookTitle } = req.body;
  
    const deleteQuery = 'DELETE FROM Book WHERE BookISBN = ? AND BookTitle = ?';
  
    db.query(deleteQuery, [bookISBN, bookTitle], (err, result) => {
      if (err) {
        console.error('Error deleting book:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'No matching book found' });
      }
  
      res.json({ success: true, message: 'Book deleted successfully' });
    });
  });


  app.post('/api/return-book', (req, res) => {
    const { bookISBN, bookTitle } = req.body;

    if (!bookISBN || !bookTitle) {
        return res.status(400).json({ message: 'BookISBN and BookTitle are required.' });
    }

    // Step 1: Update book status to 'available'
    db.query(
        "UPDATE Book SET Status = 'available' WHERE BookISBN = ? AND BookTitle = ?",
        [bookISBN, bookTitle],
        (err, updateResult) => {
            if (err) {
                console.error('Error updating book status:', err);
                return res.status(500).json({ message: 'Error updating book status.' });
            }

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ message: 'Book not found or already available.' });
            }

            // Step 2: Delete the borrow record for this book
            db.query(
                "DELETE FROM Borrow WHERE BookISBN = ?",
                [bookISBN],
                (err, deleteResult) => {
                    if (err) {
                        console.error('Error deleting borrow record:', err);
                        return res.status(500).json({ message: 'Error deleting borrow record.' });
                    }

                    res.status(200).json({ message: 'Book successfully returned.' });
                }
            );
        }
    );
});

app.get('/api/books', (req, res) => {
    db.query('SELECT * FROM Book', (err, results) => {
      if (err) {
        console.error('Error fetching books:', err);
        return res.status(500).json({ error: 'Failed to fetch books' });
      }
      res.json(results);
    });
  });

  app.get('/api/borrowed-books', (req, res) => {
    const query = `
      SELECT Borrow.borrowID, Borrow.studentID, Borrow.bookISBN, Book.bookTitle, 
             Borrow.borrowDate, Borrow.returnDate
      FROM Borrow
      JOIN Book ON Borrow.bookISBN = Book.bookISBN
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching borrowed books:', err);
        return res.status(500).json({ error: 'Failed to fetch borrowed books' });
      }
      res.json(results);
    });
  });
  

app.get('/api/genre/:genre', (req, res) => {
    const genre = req.params.genre;

    const query = `SELECT BookTitle, BookCover, Status, BookISBN FROM Book WHERE LOWER(Genre) = LOWER(?)`;

    db.query(query, [genre], (err, results) => {
        if (err) {
            console.error('Error fetching books by genre:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: `No books found for genre: ${genre}` });
        }

        res.json(results);
    });
});

app.post('/api/borrow', (req, res) => {
    const { studentID, bookISBN } = req.body;
    console.log(`Student ${studentID} is trying to borrow Book ${bookISBN}`);

    db.query("SELECT Genre, Status FROM Book WHERE BookISBN = ?", [bookISBN], (err, bookRows) => {
        if (err) {
            console.error('Error fetching book:', err);
            return res.status(500).json({ message: 'Server error. Please try again.' });
        }

        if (bookRows.length === 0) {
            return res.status(404).json({ message: 'Book not found.' });
        }

        const { Genre, Status } = bookRows[0];

        if (Status === 'borrowed') {
            return res.status(400).json({ message: 'This book is already borrowed.' });
        }

        // First get student's email
        db.query("SELECT EmailID FROM Student WHERE StudentID = ?", [studentID], (err, studentRows) => {
            if (err) {
                console.error('Error fetching student email:', err);
                return res.status(500).json({ message: 'Server error. Please try again.' });
            }

            if (studentRows.length === 0) {
                return res.status(404).json({ message: 'Student not found.' });
            }

            const studentEmail = studentRows[0].EmailID;

            db.query(
                "INSERT INTO Borrow (StudentID, BookISBN, BorrowDate, ReturnDate) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 15 DAY))",
                [studentID, bookISBN],
                (err, result) => {
                    if (err) {
                        console.error('Error inserting borrow record:', err);
                        return res.status(500).json({ message: 'Server error during borrow.' });
                    }

                    db.query(
                        "INSERT INTO Payment (Amount, DueDate, PaymentDate, StudentID) VALUES (NULL, DATE_ADD(CURDATE(), INTERVAL 15 DAY), NULL, ?)",
                        [studentID],
                        (err, paymentResult) => {
                            if (err) {
                                console.error('Error inserting payment record:', err);
                                return res.status(500).json({ message: 'Error inserting payment record.' });
                            }

                            db.query(
                                "UPDATE Book SET Status = 'borrowed' WHERE BookISBN = ?",
                                [bookISBN],
                                (err, result) => {
                                    if (err) {
                                        console.error('Error updating book status:', err);
                                        return res.status(500).json({ message: 'Error updating book status.' });
                                    }

                                    db.query(
                                        "SELECT CURDATE() AS issueDate, DATE_ADD(CURDATE(), INTERVAL 15 DAY) AS returnDate",
                                        (err, dateResult) => {
                                            if (err) {
                                                console.error('Error fetching dates:', err);
                                                return res.status(500).json({ message: 'Error fetching dates.' });
                                            }

                                            const { issueDate, returnDate } = dateResult[0];

                                            // Get book title for email
                                            db.query(
                                                "SELECT BookTitle FROM Book WHERE BookISBN = ?",
                                                [bookISBN],
                                                (err, bookTitleResult) => {
                                                    if (err) {
                                                        console.error('Error fetching book title:', err);
                                                        return res.status(500).json({ message: 'Error fetching book title.' });
                                                    }

                                                    const bookTitle = bookTitleResult[0].BookTitle;

                                                    // Send email to student
                                                    const emailSubject = 'Library Book Borrowed - Important Information';
                                                    const emailText = `
Dear Student,

You have successfully borrowed the book "${bookTitle}" from the library.

Book Details:
- Book Title: ${bookTitle}
- Issue Date: ${issueDate}
- Return Date: ${returnDate}

Important Note: INR 10 will be charged per day by the librarian if the book is not returned after the return date and fine adds up subsequently.

Please ensure to return the book on or before the return date to avoid any late fees.

Best regards,
Library Management System
`;

                                                    sendEmail(studentEmail, emailSubject, emailText);

                                                    res.status(200).json({
                                                        message: 'Book successfully borrowed! ',
                                                        bookISBN,
                                                        issueDate,
                                                        returnDate,
                                                        lateFeeNote: "Check ur confirmation email and an  amount of INR 10 will be charged per day if you fail to return it on the specified date."
                                                    });
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});



  app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});



// Authentication middleware
app.use((req, res, next) => {
    // List of paths that should not be redirected
    const allowedPaths = [
        '/login.html', 
        '/login', 
        '/logout',
        '/sucess.html', 
        '/register.html', 
        '/staff.html',
        '/stafflogin', 
        '/book.png', 
        '/images',
        // Category pages
        '/crime.html',
        '/drama.html',
        '/action.html',
        '/romantic.html',
        '/anime.html',
        // Information pages
        '/about.html',
        '/guidelines.html',
        '/management.html',
        '/moreinfo.html'
    ];
    
    // If user is logged in, allow access to all pages
    if (req.session.isLoggedIn || req.session.isStaffLoggedIn) {
        return next();
    }
    
    // If it's the root path or index.html, check login status
    if (req.path === '/' || req.path === '/index.html') {
        if (!req.session.isLoggedIn && !req.session.isStaffLoggedIn) {
            return res.redirect('/login.html');
        }
    }
    
    // Check if the requested path is in the allowed list
    if (allowedPaths.some(path => req.path.includes(path))) {
        next();
    } else {
        // Redirect to login page
        res.redirect('/login.html');
    }
});


// Protected routes
app.get('/index.html', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Serve static files LAST
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});