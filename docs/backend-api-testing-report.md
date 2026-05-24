# Backend API Postman Testing Report

Project: Resume Analyzer  
Backend Base URL: `http://localhost:5000`  
Testing Tool: Postman-style HTTP API testing  
Test Date: May 12, 2026  
Tester: Rishav  
Test Account: `postman.mentor.20260512182820@example.com`

## 1. Objective

The objective of this testing was to verify that the Resume Analyzer backend APIs are working correctly through Postman-style request testing. The testing covered public health APIs, user authentication, protected JWT routes, resume upload and analysis, resume information extraction, report history APIs, and mock payment activation.

## 2. Backend Environment

| Item | Details |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB with Mongoose |
| Authentication | JWT Bearer Token |
| File Upload | Multer multipart/form-data |
| AI Provider | Ollama local model |
| AI Model | `llama3.2` |
| API Port | `5000` |
| Supported Upload Types | PDF, DOCX, DOC, TXT |
| Upload Limit | 10 MB |

## 3. Postman Collection Setup

Recommended Postman variables:

| Variable | Value |
|---|---|
| `base_url` | `http://localhost:5000` |
| `token` | JWT token received from login/register response |
| `analysis_id` | ID returned by `/api/resume/analyze` |
| `extraction_id` | ID returned by `/api/extract/upload` |

Common protected-route header:

```http
Authorization: Bearer {{token}}
```

For upload APIs, use `Body -> form-data`:

| Key | Type | Value |
|---|---|---|
| `resume` | File | Select a `.pdf`, `.docx`, `.doc`, or `.txt` resume file |

## 4. Execution Summary

| Metric | Count |
|---|---:|
| Total Test Cases Executed | 22 |
| Passed | 22 |
| Failed | 0 |
| Blocked | 0 |
| Public APIs Tested | 3 |
| Protected APIs Tested | 14 |
| Negative Validation Tests | 5 |

Overall Result: **PASS**

## 5. Detailed Test Cases

| No. | Module | Method | Endpoint | Test Scenario | Expected Status | Actual Status | Result |
|---:|---|---|---|---|---:|---:|---|
| 1 | Health | GET | `/` | Verify root API health | 200 | 200 | PASS |
| 2 | Health | GET | `/api/health` | Verify API and database health | 200 | 200 | PASS |
| 3 | AI Health | GET | `/api/extract/health` | Verify Ollama/model health | 200 | 200 | PASS |
| 4 | Auth | POST | `/api/auth/register` | Register without required fields | 400 | 400 | PASS |
| 5 | Auth | POST | `/api/auth/register` | Register new user | 201 | 201 | PASS |
| 6 | Auth | POST | `/api/auth/login` | Login with valid credentials | 200 | 200 | PASS |
| 7 | Auth | POST | `/api/auth/login` | Login with invalid password | 401 | 401 | PASS |
| 8 | Auth | GET | `/api/auth/me` | Fetch current user profile | 200 | 200 | PASS |
| 9 | Auth | GET | `/api/auth/me` | Access profile without token | 401 | 401 | PASS |
| 10 | Resume | GET | `/api/resume/analyze` | Use wrong method for upload API | 405 | 405 | PASS |
| 11 | Resume | POST | `/api/resume/analyze` | Analyze without resume file | 400 | 400 | PASS |
| 12 | Resume | POST | `/api/resume/analyze` | Upload resume and generate analysis | 201 | 201 | PASS |
| 13 | Resume | GET | `/api/resume/history?page=1&limit=5` | Fetch analysis history | 200 | 200 | PASS |
| 14 | Resume | GET | `/api/resume/stats` | Fetch analysis statistics | 200 | 200 | PASS |
| 15 | Resume | GET | `/api/resume/report/:id` | Fetch generated analysis report | 200 | 200 | PASS |
| 16 | Resume | GET | `/api/resume/report/invalid-id` | Fetch report with invalid ID | 404 | 404 | PASS |
| 17 | Extract | POST | `/api/extract/upload` | Upload resume for information extraction | 201 | 201 | PASS |
| 18 | Extract | GET | `/api/extract/history?page=1&limit=5` | Fetch extraction history | 200 | 200 | PASS |
| 19 | Extract | GET | `/api/extract/report/:id` | Fetch extraction report | 200 | 200 | PASS |
| 20 | Payment | POST | `/api/payment/create-order` | Create monthly mock order | 200 | 200 | PASS |
| 21 | Payment | POST | `/api/payment/create-order` | Create order with invalid plan | 400 | 400 | PASS |
| 22 | Payment | POST | `/api/payment/verify` | Verify mock payment and activate premium | 200 | 200 | PASS |

## 6. Important Verified Responses

### 6.1 Root Health API

Request:

```http
GET {{base_url}}/
```

Actual response:

```json
{
  "status": "ok",
  "service": "resume-analyzer-api"
}
```

Result: PASS

### 6.2 API Health and Database Status

Request:

```http
GET {{base_url}}/api/health
```

Actual response:

```json
{
  "status": "ok",
  "db": "connected",
  "timestamp": "2026-05-12T12:58:20.623Z"
}
```

Result: PASS

### 6.3 AI/Ollama Health

Request:

```http
GET {{base_url}}/api/extract/health
```

Actual response:

```json
{
  "healthy": true,
  "model": "llama3.2",
  "modelAvailable": true,
  "provider": "Ollama (Local)",
  "url": "http://localhost:11434"
}
```

Result: PASS

### 6.4 User Registration

Request:

```http
POST {{base_url}}/api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "name": "Postman Mentor Test",
  "email": "postman.mentor.20260512182820@example.com",
  "password": "MentorTest123"
}
```

Expected response fields:

```json
{
  "message": "Account created successfully",
  "token": "JWT_TOKEN",
  "user": {
    "id": "USER_ID",
    "name": "Postman Mentor Test",
    "email": "postman.mentor.20260512182820@example.com",
    "is_premium": false,
    "analysis_count": 0
  }
}
```

Actual status: `201 Created`  
Result: PASS

### 6.5 User Login

Request:

```http
POST {{base_url}}/api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "postman.mentor.20260512182820@example.com",
  "password": "MentorTest123"
}
```

Actual status: `200 OK`  
Verified: JWT token was returned and used for protected APIs.  
Result: PASS

### 6.6 Resume Analysis Upload

Request:

```http
POST {{base_url}}/api/resume/analyze
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

Form-data:

| Key | Type | Value |
|---|---|---|
| `resume` | File | `postman-sample-resume.txt` |

Actual response summary:

```json
{
  "message": "Analysis complete",
  "analysis": {
    "id": "6a03241449a6d5a9bace5355",
    "filename": "postman-sample-resume.txt",
    "fileType": "txt",
    "wordCount": 121,
    "overall_score": 85,
    "ats_score": 90,
    "experience_level": "Junior"
  }
}
```

Actual status: `201 Created`  
Result: PASS

### 6.7 Resume Analysis History

Request:

```http
GET {{base_url}}/api/resume/history?page=1&limit=5
Authorization: Bearer {{token}}
```

Actual response summary:

```json
{
  "analyses": [
    {
      "id": "6a03241449a6d5a9bace5355",
      "filename": "postman-sample-resume.txt",
      "overall_score": 85,
      "ats_score": 90
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

Actual status: `200 OK`  
Result: PASS

### 6.8 Resume Stats

Request:

```http
GET {{base_url}}/api/resume/stats
Authorization: Bearer {{token}}
```

Actual response:

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

Actual status: `200 OK`  
Result: PASS

### 6.9 Resume Report By ID

Request:

```http
GET {{base_url}}/api/resume/report/6a03241449a6d5a9bace5355
Authorization: Bearer {{token}}
```

Verified fields:

- Report ID
- Filename
- File type
- Overall score
- ATS score
- Experience level
- Skills
- Strengths
- Weaknesses
- Suggestions
- Career recommendations
- Word count
- Created date

Actual status: `200 OK`  
Result: PASS

### 6.10 Resume Information Extraction Upload

Request:

```http
POST {{base_url}}/api/extract/upload
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

Form-data:

| Key | Type | Value |
|---|---|---|
| `resume` | File | `postman-sample-resume.txt` |

Actual response summary:

```json
{
  "message": "Extraction complete",
  "extraction": {
    "id": "6a03243849a6d5a9bace5356",
    "filename": "postman-sample-resume.txt",
    "file_type": "txt",
    "extracted_data": {
      "name": "Rishav Sharma",
      "email": ["rishav.test@example.com"],
      "skills": [
        "JavaScript",
        "React",
        "Node.js",
        "Express",
        "MongoDB"
      ]
    },
    "word_count": 121
  }
}
```

Actual status: `201 Created`  
Result: PASS

### 6.11 Extraction History

Request:

```http
GET {{base_url}}/api/extract/history?page=1&limit=5
Authorization: Bearer {{token}}
```

Actual status: `200 OK`  
Verified: One extraction record was returned with pagination metadata.  
Result: PASS

### 6.12 Extraction Report By ID

Request:

```http
GET {{base_url}}/api/extract/report/6a03243849a6d5a9bace5356
Authorization: Bearer {{token}}
```

Actual status: `200 OK`  
Verified: Extracted name was `Rishav Sharma` and 14 skills were extracted.  
Result: PASS

### 6.13 Create Mock Payment Order

Request:

```http
POST {{base_url}}/api/payment/create-order
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:

```json
{
  "plan": "monthly"
}
```

Actual response summary:

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

Actual status: `200 OK`  
Result: PASS

### 6.14 Verify Mock Payment

Request:

```http
POST {{base_url}}/api/payment/verify
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:

```json
{
  "razorpay_order_id": "mock_order_1778590776416_67a8a56e",
  "razorpay_payment_id": "mock_pay_postmanmentor"
}
```

Actual response summary:

```json
{
  "message": "Premium activated successfully",
  "user": {
    "email": "postman.mentor.20260512182820@example.com",
    "is_premium": true
  }
}
```

Actual status: `200 OK`  
Result: PASS

## 7. Negative Test Cases

| Module | Endpoint | Scenario | Expected Status | Actual Status | Result |
|---|---|---|---:|---:|---|
| Auth | `/api/auth/register` | Missing name, email, and password | 400 | 400 | PASS |
| Auth | `/api/auth/login` | Wrong password | 401 | 401 | PASS |
| Auth | `/api/auth/me` | Missing JWT token | 401 | 401 | PASS |
| Resume | `/api/resume/analyze` | POST request without file | 400 | 400 | PASS |
| Resume | `/api/resume/report/invalid-id` | Invalid report ID | 404 | 404 | PASS |
| Payment | `/api/payment/create-order` | Invalid payment plan | 400 | 400 | PASS |

## 8. Authentication Verification

JWT authentication was verified successfully.

- Public endpoints worked without token.
- Protected endpoints required `Authorization: Bearer {{token}}`.
- Missing token returned `401 Unauthorized`.
- Valid token allowed access to profile, resume, extraction, history, report, stats, and payment APIs.

## 9. File Upload Verification

Resume upload APIs were verified using `multipart/form-data`.

| API | File Key | File Used | Status |
|---|---|---|---|
| `/api/resume/analyze` | `resume` | `postman-sample-resume.txt` | PASS |
| `/api/extract/upload` | `resume` | `postman-sample-resume.txt` | PASS |

The backend successfully parsed the file, processed the resume, saved the result in MongoDB, and returned report IDs.

## 10. Database Verification

MongoDB connectivity was verified through `/api/health`.

```json
{
  "db": "connected"
}
```

Database-backed APIs were also verified through actual create and fetch flows:

- User account created
- Login worked using stored user
- Resume analysis record saved
- Resume history fetched saved analysis
- Resume stats calculated from saved analysis
- Extraction record saved
- Extraction history fetched saved extraction
- Payment verification updated user premium status

## 11. Issues Found

No backend API failures were found during the executed Postman test cycle.

Minor observation:

- The mock payment verification activates premium immediately when valid mock IDs are supplied. This is acceptable for development/testing, but live Razorpay signature verification should be implemented before production payment usage.

## 12. Recommendations

1. Add an official exported Postman collection with environment variables for `base_url`, `token`, `analysis_id`, and `extraction_id`.
2. Add automated API tests using Jest/Supertest or Newman so this same testing can be repeated quickly.
3. Add production Razorpay signature verification before enabling live payments.
4. Test with real PDF and DOCX resumes in addition to the TXT sample used in this run.
5. Add rate limiting for auth and upload endpoints before public deployment.

## 13. Final Conclusion

The Resume Analyzer backend APIs were tested successfully using Postman-style requests. All major modules are working as expected: health check, database connectivity, authentication, JWT protection, resume analysis, resume extraction, report/history retrieval, statistics, and mock payment activation.

Final status: **Backend API testing completed successfully. All 22 test cases passed.**
