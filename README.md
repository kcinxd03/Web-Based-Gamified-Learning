# Web-Based Gamified Learning Platform

A full-stack MERN (MongoDB, Express, React, Node.js) application with Tailwind CSS.

## Project Structure

```
.
├── backend/          # Node.js/Express backend
│   ├── config/       # Configuration files
│   ├── controllers/  # Route controllers
│   ├── middleware/   # Custom middleware
│   ├── models/       # MongoDB models
│   ├── routes/       # API routes
│   ├── server.js     # Express server entry point
│   └── package.json
│
├── frontend/         # React frontend
│   ├── public/       # Static files
│   ├── src/          # React source code
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── utils/       # Utility functions
│   │   ├── App.js       # Main App component
│   │   ├── index.js     # React entry point
│   │   └── index.css    # Global styles with Tailwind
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update the `.env` file with your MongoDB connection string and other configurations.

5. Start the development server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Technologies Used

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React, React Router, Axios
- **Styling**: Tailwind CSS
- **Authentication**: JWT (jsonwebtoken)

## Available Scripts

### Backend
- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon

### Frontend
- `npm start` - Start the development server
- `npm run build` - Build for production
- `npm test` - Run tests

## License

ISC

