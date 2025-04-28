-- Drop existing database if it exists
DROP DATABASE IF EXISTS lms;

-- Create the database
CREATE DATABASE lms;
USE lms;

-- STUDENT table with essential fields
CREATE TABLE Student (
    StudentID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    EmailID VARCHAR(100) UNIQUE NOT NULL,
    DateOfBirth DATE NOT NULL,
    PhoneNumber VARCHAR(15) NOT NULL,
    Gender ENUM('male', 'female', 'other') NOT NULL,
    SPassword VARCHAR(255) NOT NULL
);

-- BOOK table
CREATE TABLE Book (
    BookISBN VARCHAR(20) PRIMARY KEY,
    BookTitle VARCHAR(100) NOT NULL,
    Author VARCHAR(100) NOT NULL,
    Genre VARCHAR(50) NOT NULL,
    Status ENUM('available', 'borrowed', 'reserved') DEFAULT 'available',
    BookCover VARCHAR(255)
);

-- BORROW table
CREATE TABLE Borrow (
    BorrowID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT,
    BookISBN VARCHAR(20),
    BorrowDate DATE,
    ReturnDate DATE,
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID),
    FOREIGN KEY (BookISBN) REFERENCES Book(BookISBN)
);

-- PAYMENT table
CREATE TABLE Payment (
    PID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT,
    Amount INT,
    DueDate DATE,
    PaymentDate DATE,
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID)
);

-- Insert some sample data
INSERT INTO Student (FullName, EmailID, DateOfBirth, PhoneNumber, Gender, SPassword)
VALUES 
('John Doe', 'john@example.com', '2000-01-01', '1234567890', 'male', 'abcd'),
('Jane Smith', 'jane@example.com', '2001-02-15', '0987654321', 'female', 'defg');

delete from Student where StudentID=1 or StudentID=2;
