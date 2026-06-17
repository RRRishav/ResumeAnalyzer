# Full Backend APIs To Test With JSON Responses

Project: Resume Analyzer  
Base URL: `http://localhost:5000`  
Tool: Postman  
Date: May 12, 2026

## Postman Variables

```json
{
  "base_url": "http://localhost:5000",
  "token": "paste_jwt_token_here",
  "analysis_id": "paste_analysis_id_here",
  "extraction_id": "paste_extraction_id_here"
}
```

For protected APIs, add this header:

```http
Authorization: Bearer {{token}}
```

Direct base URL example:

```http
GET http://localhost:5000/api/health
```

Postman variable version:

```http
GET {{base_url}}/api/health
```

## 1. Root Health Check

Method: `GET`  
URL: `{{base_url}}/`
Full URL: `http://localhost:5000/`

Expected JSON response:

```json
{
  "status": "ok",
  "service": "resume-analyzer-api"
}
```

## 2. API Health Check

Method: `GET`  
URL: `{{base_url}}/api/health`

Full URL:

```http
GET http://localhost:5000/api/health
```

Expected JSON response:

```json
{
  "status": "ok",
  "db": "connected",
  "timestamp": "2026-05-12T12:58:20.623Z"
}
```

If database is not connected:

```json
{
  "status": "ok",
  "db": "unavailable",
  "timestamp": "2026-05-12T12:58:20.623Z"
}
```

## 3. AI Extraction Health Check

Method: `GET`  
URL: `{{base_url}}/api/extract/health`
Full URL: `http://localhost:5000/api/extract/health`

Expected JSON response:

```json
{
  "healthy": true,
  "model": "llama3.2",
  "modelAvailable": true,
  "provider": "Ollama (Local)",
  "url": "http://localhost:11434"
}
```

If Ollama is not running:

```json
{
  "healthy": false,
  "error": "Ollama is not running. Start Ollama with: ollama serve",
  "url": "http://localhost:11434",
  "model": "llama3.2"
}
```

## 4. Register User

Method: `POST`  
URL: `{{base_url}}/api/auth/register`  
Full URL: `http://localhost:5000/api/auth/register`  
Headers:

```http
Content-Type: application/json
```

Request body:

```json
{
  "name": "Postman Mentor Test",
  "email": "postman.mentor@example.com",
  "password": "MentorTest123"
}
```

Success JSON response:

```json
{
  "message": "Account created successfully",
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": "USER_ID",
    "name": "Postman Mentor Test",
    "email": "postman.mentor@example.com",
    "is_premium": false,
    "analysis_count": 0
  }
}
```

Validation error responses:

```json
{
  "error": "Name, email, and password are required"
}
```

```json
{
  "error": "Password must be at least 6 characters"
}
```

Duplicate email response:

```json
{
  "error": "Email already registered"
}
```

## 5. Login User

Method: `POST`  
URL: `{{base_url}}/api/auth/login`  
Full URL: `http://localhost:5000/api/auth/login`  
Headers:

```http
Content-Type: application/json
```

Request body:

```json
{
  "email": "postman.mentor@example.com",
  "password": "MentorTest123"
}
```

Success JSON response:

```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": "USER_ID",
    "name": "Postman Mentor Test",
    "email": "postman.mentor@example.com",
    "is_premium": false,
    "analysis_count": 0
  }
}
```

Error responses:

```json
{
  "error": "Email and password are required"
}
```

```json
{
  "error": "Invalid email or password"
}
```

## 6. Get Current User Profile

Method: `GET`  
URL: `{{base_url}}/api/auth/me`  
Full URL: `http://localhost:5000/api/auth/me`  
Headers:

```http
Authorization: Bearer {{token}}
```

Success JSON response:

```json
{
  "user": {
    "id": "USER_ID",
    "name": "Postman Mentor Test",
    "email": "postman.mentor@example.com",
    "is_premium": false,
    "analysis_count": 1,
    "max_free_analyses": 15,
    "created_at": "2026-05-12T12:58:20.000Z"
  }
}
```

Missing token response:

```json
{
  "error": "Access denied. No token provided."
}
```

Invalid token response:

```json
{
  "error": "Invalid token."
}
```

Expired token response:

```json
{
  "error": "Token expired. Please login again."
}
```

## 7. Analyze Resume

Method: `POST`  
URL: `{{base_url}}/api/resume/analyze`  
Full URL: `http://localhost:5000/api/resume/analyze`  
Headers:

```http
Authorization: Bearer {{token}}
```

Body type: `form-data`

| Key | Type | Value |
|---|---|---|
| `resume` | File | Select resume file |

Success JSON response:

```json
{
  "message": "Analysis complete",
  "analysis": {
    "id": "ANALYSIS_ID",
    "filename": "postman-sample-resume.txt",
    "fileType": "txt",
    "wordCount": 121,
    "overall_score": 85,
    "ats_score": 90,
    "experience_level": "Junior",
    "skills": [
      {
        "skill": "JavaScript",
        "score": 1
      }
    ],
    "skillCategories": {
      "Frontend": ["React", "HTML", "CSS"],
      "Backend": ["Node.js", "Express", "REST API"],
      "Database": ["MongoDB"]
    },
    "strengths": [
      "Complete contact information",
      "Professional summary included"
    ],
    "weaknesses": [
      "Add more measurable achievements"
    ],
    "suggestions": [
      {
        "priority": "high",
        "category": "content",
        "text": "Add quantifiable achievements with metrics"
      }
    ],
    "career_recommendations": [
      {
        "role": "Software Developer",
        "match_score": 70,
        "reason": "Technical skills match"
      }
    ],
    "gemini_insights": "Junior candidate with relevant full-stack skills.",
    "missing_skills": ["TypeScript", "Docker", "CI/CD"],
    "keywords_to_add": ["agile", "optimization"],
    "created_at": "2026-05-12T12:59:00.000Z"
  }
}
```

No file error:

```json
{
  "error": "Please upload a resume file (PDF or DOCX)"
}
```

Free limit reached response:

```json
{
  "error": "Free analysis limit reached",
  "message": "You've used all 15 free analyses. Upgrade to Premium for unlimited access.",
  "limit_reached": true
}
```

Invalid file type response:

```json
{
  "error": "Only PDF, DOCX, DOC, and TXT files are allowed"
}
```

Large file response:

```json
{
  "error": "File too large. Maximum size is 10MB."
}
```

## 8. Resume Analyze Wrong Method

Method: `GET`  
URL: `{{base_url}}/api/resume/analyze`  
Full URL: `http://localhost:5000/api/resume/analyze`  
Headers:

```http
Authorization: Bearer {{token}}
```

Expected JSON response:

```json
{
  "error": "Use the analyzer page to upload a resume.",
  "message": "This API endpoint only accepts POST requests with an authenticated PDF or DOCX upload.",
  "analyzerUrl": "http://localhost:5173/analyze"
}
```

## 9. Get Resume Analysis History

Method: `GET`  
URL: `{{base_url}}/api/resume/history?page=1&limit=5`  
Full URL: `http://localhost:5000/api/resume/history?page=1&limit=5`  
Headers:

```http
Authorization: Bearer {{token}}
```

Success JSON response:

```json
{
  "analyses": [
    {
      "id": "ANALYSIS_ID",
      "filename": "postman-sample-resume.txt",
      "file_type": "txt",
      "overall_score": 85,
      "ats_score": 90,
      "experience_level": "Junior",
      "skills": ["JavaScript", "React", "Node.js"],
      "strengths": ["Complete contact information"],
      "weaknesses": ["Add more measurable achievements"],
      "created_at": "2026-05-12T12:59:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1
  }
}
```

## 10. Get Resume Analysis Stats

Method: `GET`  
URL: `{{base_url}}/api/resume/stats`  
Full URL: `http://localhost:5000/api/resume/stats`  
Headers:

```http
Authorization: Bearer {{token}}
```

Success JSON response:

```json
{
  "stats": {
    "total_analyses": 1,
    "avg_score": 85,
    "best_score": 85,
    "avg_ats_score": 90
  }
}
```

## 11. Get Resume Report By ID

Method: `GET`  
URL: `{{base_url}}/api/resume/report/{{analysis_id}}`  
Full URL: `http://localhost:5000/api/resume/report/{{analysis_id}}`  
Headers:

```http
Authorization: Bearer {{token}}
```

Success JSON response:

```json
{
  "report": {
    "id": "ANALYSIS_ID",
    "filename": "postman-sample-resume.txt",
    "file_type": "txt",
    "overall_score": 85,
    "ats_score": 90,
    "experience_level": "Junior",
    "skills": ["JavaScript", "React", "Node.js"],
    "skill_categories": {
      "Frontend": ["React", "HTML", "CSS"],
      "Backend": ["Node.js", "Express"],
      "Database": ["MongoDB"]
    },
    "strengths": ["Complete contact information"],
    "weaknesses": ["Add more measurable achievements"],
    "suggestions": [
      {
        "priority": "high",
        "category": "content",
        "text": "Add quantifiable achievements with metrics"
      }
    ],
    "gemini_insights": "Junior candidate with relevant full-stack skills.",
    "career_recommendations": [
      {
        "role": "Software Developer",
        "match_score": 70,
        "reason": "Technical skills match"
      }
    ],
    "word_count": 121,
    "created_at": "2026-05-12T12:59:00.000Z"
  }
}
```

Invalid or missing report response:

```json
{
  "error": "Report not found"
}
```

## 12. Extract Resume Information

Method: `POST`  
URL: `{{base_url}}/api/extract/upload`  
Full URL: `http://localhost:5000/api/extract/upload`  
Headers:

```http
Authorization: Bearer {{token}}
```

Body type: `form-data`

| Key | Type | Value |
|---|---|---|
| `resume` | File | Select resume file |

Success JSON response:

```json
{
  "message": "Extraction complete",
  "extraction": {
    "id": "EXTRACTION_ID",
    "filename": "postman-sample-resume.txt",
    "file_type": "txt",
    "extracted_data": {
      "name": "Rishav Sharma",
      "phone": ["+91 9876543210"],
      "email": ["rishav.test@example.com"],
      "location": null,
      "professional_summary": "Full Stack Developer with 2 years of experience building responsive web applications and REST APIs.",
      "total_experience": "2 years",
      "links": {
        "portfolio": null,
        "github": "https://github.com/rishavtest",
        "linkedin": "https://linkedin.com/in/rishavtest",
        "other": []
      },
      "tenth_marks": null,
      "twelfth_marks": null,
      "degree": "B.Tech",
      "stream": "Computer Science",
      "cgpa": "8.4",
      "education": [
        {
          "degree": "B.Tech",
          "institution": null,
          "stream": "Computer Science",
          "score": "8.4",
          "duration": null
        }
      ],
      "projects": [
        {
          "title": "Resume Analyzer",
          "description": "AI-powered resume scoring and data extraction platform.",
          "tech_stack": ["React", "Node.js", "Express", "MongoDB", "Ollama"]
        }
      ],
      "skills": [
        "JavaScript",
        "React",
        "Node.js",
        "Express",
        "MongoDB",
        "REST API"
      ],
      "certifications": [
        {
          "name": "Full Stack Web Development Certificate",
          "issuer": null,
          "year": "2024"
        }
      ],
      "achievements": [],
      "languages": [],
      "experience": [
        {
          "role": "Junior Full Stack Developer",
          "company": "Demo Tech",
          "duration": "Jan 2024 - Present",
          "description": "Built resume analysis dashboards, authentication flows, protected API routes, and MongoDB-backed report history."
        }
      ]
    },
    "model_used": "llama3.2",
    "provider_used": "ollama",
    "processing_time_ms": 1000,
    "word_count": 121,
    "created_at": "2026-05-12T13:00:00.000Z"
  }
}
```

No file error:

```json
{
  "error": "Please upload a resume file (PDF or DOCX)"
}
```

## 13. Get Extraction History

Method: `GET`  
URL: `{{base_url}}/api/extract/history?page=1&limit=5`  
Full URL: `http://localhost:5000/api/extract/history?page=1&limit=5`  
Headers:

```http
Authorization: Bearer {{token}}
```

Success JSON response:

```json
{
  "extractions": [
    {
      "id": "EXTRACTION_ID",
      "filename": "postman-sample-resume.txt",
      "file_type": "txt",
      "name": "Rishav Sharma",
      "email": "rishav.test@example.com",
      "skills_count": 14,
      "model_used": "llama3.2",
      "processing_time_ms": 1000,
      "created_at": "2026-05-12T13:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1
  }
}
```

## 14. Get Extraction Report By ID

Method: `GET`  
URL: `{{base_url}}/api/extract/report/{{extraction_id}}`  
Full URL: `http://localhost:5000/api/extract/report/{{extraction_id}}`  
Headers:

```http
Authorization: Bearer {{token}}
```

Success JSON response:

```json
{
  "extraction": {
    "id": "EXTRACTION_ID",
    "filename": "postman-sample-resume.txt",
    "file_type": "txt",
    "extracted_data": {
      "name": "Rishav Sharma",
      "phone": ["+91 9876543210"],
      "email": ["rishav.test@example.com"],
      "location": null,
      "professional_summary": "Full Stack Developer with 2 years of experience building responsive web applications and REST APIs.",
      "total_experience": "2 years",
      "links": {
        "portfolio": null,
        "github": "https://github.com/rishavtest",
        "linkedin": "https://linkedin.com/in/rishavtest",
        "other": []
      },
      "degree": "B.Tech",
      "stream": "Computer Science",
      "cgpa": "8.4",
      "education": [],
      "projects": [],
      "skills": ["JavaScript", "React", "Node.js", "Express", "MongoDB"],
      "certifications": [],
      "achievements": [],
      "languages": [],
      "experience": []
    },
    "model_used": "llama3.2",
    "processing_time_ms": 1000,
    "word_count": 121,
    "created_at": "2026-05-12T13:00:00.000Z"
  }
}
```

Invalid or missing extraction response:

```json
{
  "error": "Extraction not found"
}
```

## 15. Create Payment Order

Method: `POST`  
URL: `{{base_url}}/api/payment/create-order`  
Full URL: `http://localhost:5000/api/payment/create-order`  
Headers:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Monthly request body:

```json
{
  "plan": "monthly"
}
```

Yearly request body:

```json
{
  "plan": "yearly"
}
```

Success JSON response:

```json
{
  "mock": true,
  "key": "mock_razorpay_key",
  "order": {
    "id": "mock_order_1778590776416_67a8a56e",
    "amount": 29900,
    "currency": "INR",
    "plan": "monthly"
  }
}
```

Yearly plan response has amount `249900`:

```json
{
  "mock": true,
  "key": "mock_razorpay_key",
  "order": {
    "id": "mock_order_1778590776416_67a8a56e",
    "amount": 249900,
    "currency": "INR",
    "plan": "yearly"
  }
}
```

Invalid plan response:

```json
{
  "error": "Invalid payment plan"
}
```

Already premium response:

```json
{
  "error": "Premium is already active"
}
```

## 16. Verify Payment

Method: `POST`  
URL: `{{base_url}}/api/payment/verify`  
Full URL: `http://localhost:5000/api/payment/verify`  
Headers:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Request body:

```json
{
  "razorpay_order_id": "mock_order_1778590776416_67a8a56e",
  "razorpay_payment_id": "mock_pay_postmanmentor"
}
```

Success JSON response:

```json
{
  "message": "Premium activated successfully",
  "user": {
    "id": "USER_ID",
    "name": "Postman Mentor Test",
    "email": "postman.mentor@example.com",
    "is_premium": true,
    "analysis_count": 1,
    "max_free_analyses": 15,
    "created_at": "2026-05-12T12:58:20.000Z"
  }
}
```

Missing payment details response:

```json
{
  "error": "Payment details are required"
}
```

Invalid live payment response:

```json
{
  "error": "Payment verification is not configured for live payments"
}
```

## 17. Common Database Unavailable Response

If MongoDB is not connected, database-backed routes return:

```json
{
  "error": "Database unavailable",
  "message": "MongoDB is not connected. Check MONGO_URI and the MongoDB Atlas IP whitelist."
}
```

This can apply to:

- `/api/auth/*`
- `/api/resume/*`
- `/api/extract/upload`
- `/api/extract/history`
- `/api/extract/report/:id`
- `/api/payment/*`

## 18. Final API Testing Checklist

| No. | API | Method | Auth Required | Body Type |
|---:|---|---|---|---|
| 1 | `/` | GET | No | None |
| 2 | `/api/health` | GET | No | None |
| 3 | `/api/extract/health` | GET | No | None |
| 4 | `/api/auth/register` | POST | No | JSON |
| 5 | `/api/auth/login` | POST | No | JSON |
| 6 | `/api/auth/me` | GET | Yes | None |
| 7 | `/api/resume/analyze` | POST | Yes | form-data |
| 8 | `/api/resume/analyze` | GET | Yes | None |
| 9 | `/api/resume/history` | GET | Yes | None |
| 10 | `/api/resume/stats` | GET | Yes | None |
| 11 | `/api/resume/report/:id` | GET | Yes | None |
| 12 | `/api/extract/upload` | POST | Yes | form-data |
| 13 | `/api/extract/history` | GET | Yes | None |
| 14 | `/api/extract/report/:id` | GET | Yes | None |
| 15 | `/api/payment/create-order` | POST | Yes | JSON |
| 16 | `/api/payment/verify` | POST | Yes | JSON |

Final result from latest run: all listed backend APIs were tested successfully and returned valid JSON responses.
