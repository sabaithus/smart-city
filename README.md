# 🏙️ Smart City Emergency & Volunteer Platform

A comprehensive platform for reporting city emergencies, tracking volunteer tasks, and visualizing incidents on a Live Map.

## 🌟 Features
- **User Authentication**: Secure registration and login with session management.
- **Incident Reporting**: 3-step wizard to report emergencies (floods, fires, accidents).
- **Live Map**: Interactive map powered by Leaflet and OpenStreetMap showing real-time incidents, volunteers, and city services.
- **My Reports**: Users can view and delete their submitted reports.
- **Admin Dashboard**: Overview of city metrics and report management.

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript, Leaflet.js
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (using `pg` driver)
- **Authentication**: `bcryptjs` for password hashing, `express-session` for sessions

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** installed (https://nodejs.org/)
- **PostgreSQL** installed (https://www.postgresql.org/download/windows/)

### 2. Database Setup
1. Open **pgAdmin** (or SQL Shell / `psql`).
2. Create a new database named `smartcity`.
3. Open the Query Tool for the `smartcity` database.
4. Open the `models/schema.sql` file in this project, copy all its contents, and run it in the Query Tool to create the required tables.

### 3. Environment Configuration
1. Open the `.env` file in the project root.
2. Update the `DB_PASSWORD` to match your PostgreSQL password.
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=smartcity
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   ```

### 4. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 5. Start the Server
```bash
node server.js
```
The terminal will display:
```
  🏙️  Smart City Server is running!
  🌐  Open: http://localhost:3000
```

### 6. Open the App
Open your web browser and go to: [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
smart-city/
├── config/
│   └── database.js            # PostgreSQL connection setup
├── models/
│   └── schema.sql             # SQL to create all tables
├── routes/
│   ├── authRoutes.js          # /api/register, /api/login, /api/logout
│   ├── reportRoutes.js        # /api/reports (create, list, delete)
│   └── mapRoutes.js           # /api/map/markers (public live map data)
├── public/                    # Frontend files (served to the browser)
│   ├── index.html             # The main application UI
│   ├── styles.css             # Main stylesheet
│   └── js/
│       ├── app.js             # Main frontend logic (auth, forms, navigation)
│       └── map.js             # Isolated Live Map logic (Leaflet)
├── .env                       # Secret config (database credentials)
├── server.js                  # Express backend entry point
└── package.json               # Node.js dependencies
```

---

## 🧪 Testing the Application

1. **Register**: Go to the web app, click "Register" and create a new account.
2. **Submit Report**: Click the "+" Report button, fill out the 3 steps, and submit.
3. **Live Map**: Open the Map view. You should see demo markers AND your newly submitted report.
4. **My Reports**: Open "My Reports" from the home screen to see your report. You can delete it from there.

---
*Built with ❤️ for a Safer City.*
