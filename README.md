# Resume Analyzer

A full-stack resume analysis app that lets users upload a PDF or DOCX resume, get scores, see detected skills, and review practical suggestions for improvement.

The project has a React frontend, an Express backend, MongoDB storage, JWT authentication, file parsing, skill extraction, and live progress updates while a resume is being analyzed.

![Frontend preview](docs/screenshots/frontend.svg)

## What It Does

- Upload resumes as PDF or DOCX files.
- Parse resume text on the backend.
- Detect technical and soft skills from a curated skill list.
- Score the resume for overall quality and ATS readiness.
- Show strengths, weaknesses, suggestions, and career recommendations.
- Save previous reports so users can open them later.
- Stream analysis progress to the frontend with Socket.IO.

## Screenshots

### Frontend

![Frontend screenshot](docs/screenshots/frontend.svg)

### Backend

![Backend screenshot](docs/screenshots/backend.svg)

### Database

![Database screenshot](docs/screenshots/database.svg)

## Tech Stack

**Frontend**

- React
- Vite
- Tailwind CSS
- shadcn-style local UI components
- Framer Motion
- Recharts
- Socket.IO client
- Axios

**Backend**

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Multer file upload
- PDF and DOCX parsing
- Socket.IO
- Gemini API with fallback analysis

## Project Structure

```txt
ResumeAnalyzer/
  client/        React frontend
  server/        Express API and analysis pipeline
  docs/          README images and project documentation assets
```

## Getting Started

Install dependencies from the root:

```bash
npm run install-deps
```

Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Update `server/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```

Run the app:

```bash
npm run dev
```

Open the frontend:

```txt
http://localhost:5173
```

Backend health check:

```txt
http://localhost:5000/api/health
```

## Main API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a user account |
| `POST` | `/api/auth/login` | Log in and receive a JWT |
| `GET` | `/api/auth/me` | Get the current user |
| `POST` | `/api/resume/analyze` | Upload and analyze a resume |
| `GET` | `/api/resume/history` | Get saved analysis history |
| `GET` | `/api/resume/report/:id` | Open one saved report |
| `GET` | `/api/resume/stats` | Get dashboard stats |

## How Analysis Works

1. The frontend uploads a resume with a JWT token.
2. The backend validates the file and user limits.
3. The parser extracts text from PDF or DOCX.
4. The skill engine finds matching skills and categories.
5. AI analysis runs when configured, otherwise fallback analysis is used.
6. The report is saved in MongoDB.
7. The frontend displays a clean score dashboard and saved report.

## Notes

- The analyzer page is the correct place to upload resumes: `http://localhost:5173/analyze`.
- Opening `/api/resume/analyze` directly in the browser will not analyze a resume because that endpoint expects a `POST` upload.
- If the Gemini API key is missing or unavailable, the app still returns fallback analysis.

## Author

Built by Rishav as a full-stack resume analysis project.
