# Carpooling Platform

A comprehensive full-stack carpooling platform designed to connect drivers with empty seats to passengers looking for rides. Built with a React frontend and a Python Flask backend, this application includes robust features for ride management, real-time safety, user authentication, and admin monitoring.

## Features

- **User Authentication**: Secure signup and login using JWT (JSON Web Tokens).
- **Ride Management**: Users can post upcoming rides, and passengers can search and book available seats.
- **Vehicle Registration**: Drivers can register and manage their vehicles.
- **Interactive Maps**: Integrated maps using Leaflet for route visualization and place selection.
- **Safety First**: Features like SOS alerts and trusted contacts ensure a secure environment for all users.
- **Role-Based Access**: Dedicated dashboards for Admins and Superadmins to monitor platform activity, user reports, and verify accounts.
- **In-App Chat**: Seamless communication between drivers and passengers for active bookings.
- **Payments Integration**: Foundation for processing booking payments.

## Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM
- **Maps**: Leaflet (`react-leaflet`)
- **Styling**: Standard CSS (or UI library if configured)

### Backend
- **Framework**: Python 3.12, Flask
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: Flask-JWT-Extended
- **CORS**: Flask-CORS

## Getting Started

### Prerequisites
- Node.js and npm
- Python 3.10+
- Git

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the database with demo data (this will also create the initial `carpool.db`):
   ```bash
   python seed.py
   ```
5. Run the Flask server:
   ```bash
   python app.py
   ```
   The backend will be running on `http://localhost:5000`.

### Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Copy `.env.example` to `.env` (if applicable) and configure your API URL, e.g., `VITE_API_URL=http://localhost:5000`.
4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will typically run on `http://localhost:5173`.

## Project Structure
- `/backend`: Contains the Flask server, SQLAlchemy models, API routes, and SQLite database instance.
- `/frontend`: Contains the Vite React application, UI components, and API integration logic.
- `/docs`: Additional project documentation and diagrams.

## License
This project is open-source and available under the MIT License.
