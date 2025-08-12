# task-manager---user-authentication

This is a Node.js & MySQL-based Task Manager that allows users to securely register, log in, and manage their personal tasks. Each user has their own account, and tasks are linked to their profile using a foreign key relationship in the database.

Features:
.User Authentication
.Sign up and log in with session-based authentication
.Password hashing using bcrypt for security
.Task Management
.Add new tasks
.View personal tasks on the dashboard
.Edit and update existing tasks
.Delete tasks

Database Integration:
.MySQL database with relational structure (users table & tasks table)
.Foreign key linking tasks to the logged-in user
.UI & Styling
.Responsive design using Bootstrap
.Clean and user-friendly layout for dashboard and forms

Tech Stack:
.Backend: Node.js, Express.js
.Frontend: EJS, Bootstrap, CSS
.Database: MySQL
.Authentication: express-session, bcrypt
.Other Tools: dotenv for environment variables
