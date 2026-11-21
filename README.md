# STOCKPILOT – Warehouse Order Fulfilment System

**StockPilot** is a web-based Warehouse Order Fulfilment Management System designed to improve warehouse operations by reducing picking errors, improving packing accuracy, and tracking order dispatch activities.

The application helps warehouse employees manage inventory locations, pick lists, packing verification, dispatch records, and order fulfilment stages through a centralized platform.

---

## Project Overview

Traditional warehouse operations often depend on manual processes, which can result in incorrect product picking, packing mistakes, delayed dispatches, and poor order tracking.

StockPilot aims to simplify these operations by providing a centralized digital platform that allows warehouse staff and managers to monitor and manage the entire order fulfilment process.

## Key Features

- **Order Management:** Manage and track customer orders.
- **Bin Location Management:** Organize and manage warehouse storage locations.
- **Picking Management:** Generate and manage pick lists for warehouse employees.
- **Packing Verification:** Verify products before completing the packing process.
- **Dispatch Management:** Maintain dispatch records and track dispatched orders.
- **Order Tracking:** Monitor order progress through different fulfilment stages.
- **Fulfilment Monitoring:** Track order processing activities.
- **Performance Reporting:** Monitor order cycle time and fulfilment errors.

## User Roles

| Role | Responsibilities |
|---|---|
| Warehouse Picker | Pick products based on assigned pick lists. |
| Packing Staff | Verify products and complete packing activities. |
| Dispatch Executive | Manage dispatch records and shipment activities. |
| Warehouse Manager | Monitor warehouse operations and fulfilment performance. |

## Technology Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3
- Axios

### Backend
- Python
- Flask
- REST API
- Gunicorn

### Database
- MongoDB

### DevOps and Deployment
- Git and GitHub
- Render – Backend Deployment
- Vercel – Frontend Deployment
- Visual Studio Code

## System Architecture

The application follows a client-server architecture.

1. The user interacts with the React frontend.
2. The frontend sends HTTP requests using Axios.
3. The Flask backend processes the API requests.
4. The backend communicates with the MongoDB database.
5. The requested information is returned to the frontend.

## Project Structure

```text
STOCKPILOT/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── README.md
└── .gitignore
```

*Note: The structure above illustrates the main application components. Your actual folder structure may contain additional files and directories.*

## Installation and Setup

### Prerequisites

Make sure the following software is installed:

- Python
- Node.js and npm
- Git
- MongoDB Atlas account
- Visual Studio Code

### 1. Clone the Repository

```bash
git clone https://github.com/Devin-King10/STOCKPILOT.git
```

Navigate into the project directory:

```bash
cd STOCKPILOT
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables before running the backend.

Start the Flask application:

```bash
python app.py
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Configure the frontend API URL using the environment variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

Start the React development server:

```bash
npm run dev
```

The frontend and backend can now run locally.

## Environment Variables

Environment variables are used to configure the application securely.

### Backend Environment Variables

| Variable | Description |
|---|---|
| SECRET_KEY | Secret key used for application security. |
| CORS_ORIGINS | Allowed frontend origins. |
| MONGO_URI | MongoDB connection string, if required by the backend configuration. |

### Frontend Environment Variables

| Variable | Description |
|---|---|
| VITE_API_BASE_URL | Backend API base URL. |

**Important:** Never upload secret keys, database credentials, or `.env` files containing sensitive information to GitHub.

## Deployment

StockPilot uses cloud platforms to deploy its frontend and backend independently.

### Backend Deployment – Render

1. Push the backend source code to GitHub.
2. Create a new Web Service on Render.
3. Connect the STOCKPILOT GitHub repository.
4. Set the Root Directory to `backend`.
5. Configure the build command:

```bash
pip install -r requirements.txt
```

6. Configure the start command:

```bash
gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

7. Add the required environment variables.
8. Deploy the backend.

### Frontend Deployment – Vercel

1. Connect the STOCKPILOT GitHub repository to Vercel.
2. Configure the frontend root directory.
3. Add the `VITE_API_BASE_URL` environment variable with the deployed backend API URL.
4. Deploy the frontend.

## DevOps Practices

The project incorporates the following DevOps practices:

- Version control using Git and GitHub.
- Application deployment using Render and Vercel.
- Environment-based application configuration.
- Backend dependency management using Python requirements.
- Frontend dependency management using npm.
- Separation of frontend and backend services.
- Cloud-based application hosting.

## Expected Benefits

- Reduced warehouse picking mistakes.
- Improved packing verification.
- Better order visibility and tracking.
- Faster order fulfilment.
- Organized warehouse bin locations.
- Improved dispatch management.
- Better monitoring of warehouse performance.

## Future Enhancements

- Barcode scanning integration.
- Automated inventory updates.
- Advanced warehouse analytics.
- Email and notification integration.
- Role-based authentication and authorization.
- Automated testing and CI/CD pipeline integration.

## Author

**Devin Kingsly**

GitHub: [Devin-King10](https://github.com/Devin-King10)

## Repository

[STOCKPILOT – GitHub Repository](https://github.com/Devin-King10/STOCKPILOT)

---

*StockPilot – Improving Warehouse Efficiency Through Smart Order Fulfilment Management.*