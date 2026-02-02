# SOEN390-commit-and-pray

# CONCORDIA CAMPUS NAVIGATION WEB APP

## DESCRIPTION
This repository contains a web application developed as part of the SOEN 390 course at Concordia University. The goal of the project is to help students, staff and visitors navigate Concordia campuses by providing outdoor and indoor directions, building and room search and accessibility-aware routing.

## DEPENDENCIES
The following tools and dependencies are required to run this project:

- Node.js 20+ (with npm)
- Python 3.14+ (with pip)
- FastAPI
- Expo Go installed on a physical mobile device (iOS or Android)

## FASTAPI INSTALLATION (UNIX)
If FastAPI is not installed, you can set it up on Unix-based systems with:

sudo apt install -y python3 python3-venv python3-pip
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install "fastapi[standard]"
cd ..
  
## INSTALLATION (to improve: must add backend and frontend dependencies)
1. Clone the repository:
   `git clone https://github.com/gabrielshufelt/soen390-commit-and-pray.git`

2. Navigate into the project directory:
   `cd soen390-commit-and-pray`

3. Install frontend (mobile app) dependencies:
   `cd mobile
   npm install
   npm install expo
   cd ..`

4. Install backend dependencies:
   `cd backend
   pip install -r requirements.txt
   cd ..`
   
## RUNNING THE APPLICATION

FRONTEND (MOBILE APP)

1. Navigate to the mobile directory:
   `cd mobile`

2. Start the Expo development server:
   `npx expo start`

3. After running the command, a QR code will appear in the terminal.

4. Open the Expo Go app on your physical iOS or Android device and scan the QR code.

The application will load and run on your device through Expo Go.


## BACKEND

5. Navigate to the backend directory:
   `cd backend`

6. Start the FastAPI backend server:
   `fastapi dev main.py`

The backend server will start locally on the configured port.

## DOCUMENTATION
All detailed documentation for this project can be found in the GitHub Wiki which includes: 
- Domain Model
- Component Diagram
- User Personas
- Accessibility Considerations
- UI Mockups
- Sprint planning and retrospectives
