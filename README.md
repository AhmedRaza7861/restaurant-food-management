# 🍽️ Restaurant Food Menu Management System

A full-stack MERN (MongoDB, Express.js, React.js, Node.js) application for managing restaurant food menus with categories and food items.

## Tech Stack

- **Frontend:** React.js (Vite), Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **File Upload:** Multer

## Features

### Category Management
- Add, Display, Edit and Delete categories
- Upload and display category images
- Fields: Category Name, Description, Image

### Food Item Management
- Add, Display, Edit and Delete food items
- Upload and display food images
- Fields: Food Name, Price, Description, Category, Food Image
- Each food item is linked to a category via Category ID

## Project Structure

```
├── backend/
│   ├── models/
│   │   ├── Category.js
│   │   └── Food.js
│   ├── routes/
│   │   ├── categoryRoutes.js
│   │   └── foodRoutes.js
│   ├── uploads/
│   ├── .env
│   ├── package.json
│   └── server.js
├── Frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js installed
- MongoDB installed and running locally

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd resturant-food-management
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend will run on `http://localhost:5000`

### 3. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```
Frontend will run on `http://localhost:5173`

### 4. Environment Variables
Create a `.env` file in the `backend/` folder:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/restaurantDB
```

## API Endpoints

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | Get all categories |
| POST | /api/categories | Add a new category |
| PUT | /api/categories/:id | Update a category |
| DELETE | /api/categories/:id | Delete a category |

### Food Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/foods | Get all food items |
| POST | /api/foods | Add a new food item |
| PUT | /api/foods/:id | Update a food item |
| DELETE | /api/foods/:id | Delete a food item |
