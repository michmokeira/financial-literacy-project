# Finova Financial Literacy Platform

A comprehensive financial literacy learning platform developed as my Computer Science final degree project.

## Overview

This web application empowers users to improve their financial knowledge through structured courses, expert-authored blogs, and community interaction. The platform features role-based access with distinct functionalities for learners and financial experts, comprehensive progress tracking, and a gamified learning experience with achievement badges.

## Features

**Learning Management:**
- Interactive financial literacy courses with enrollment/unenrollment
- Progress tracking and completion monitoring
- Achievement badge system for learning milestones

**Content Creation & Sharing:**
- Expert-authored blog posts on financial topics
- Community forum for peer-to-peer learning and discussion
- Like and comment functionality on all content

**User Roles & Permissions:**
- **Learners:** Access courses, participate in forums, engage with content
- **Experts:** All learner features plus blog creation capabilities
- Role-based badge rewards for platform engagement

**Gamification:**
- Badges for course completion and learning progress
- Community engagement rewards (forum participation)
- Expert recognition badges for content creation

## Technologies Used

**Backend:**
- Node.js
- Express.js
- MongoDB (Database)
- EJS (Template Engine)

**Frontend:**
- HTML/CSS/JavaScript
- Tailwind CSS (Styling Framework)
- EJS Templates

**Other Tools:**
- Mongoose (MongoDB ODM)
- User Authentication & Session Management
- File Upload & Management

## Installation & Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your environment variables:
   ```
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_session_secret
   JWT_SECRET=your_jwt_secret
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

**For Learners:**
- Register/login to access the platform
- Browse and enroll in financial literacy courses
- Track your learning progress and earn badges
- Participate in community forum discussions
- Like and comment on expert blogs and forum posts

**For Experts:**
- All learner functionalities plus content creation
- Create and publish financial education blog posts
- Earn badges for community contributions and content creation

## Key Features Showcase

- **Role-Based Dashboard:** Different interfaces for learners vs experts
- **Progress Tracking:** Visual progress bars and completion tracking
- **Badge System:** Gamified learning with achievement rewards
- **Community Engagement:** Forum posts with likes/comments functionality
- **Content Management:** Expert blog creation and management tools

## Project Structure

```
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/         # Database models
├── routes/         # API routes
├── views/          # Templates/UI files
├── public/         # Static assets
├── utils/          # Utility functions
├── server.js       # Main server file
└── package.json    # Dependencies
```

## Challenges & Learning Outcomes

This project demonstrates full-stack web development skills including:
- Complex user role management and authentication
- Database design with multiple related collections
- Real-time user interaction features
- Responsive design with modern CSS frameworks
- RESTful API design and implementation

## Academic Project Notice

This project was developed as my final Computer Science degree project. All rights reserved.