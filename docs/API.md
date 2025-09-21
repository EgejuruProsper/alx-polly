# API Documentation

## Overview

ALX Polly Pro provides a comprehensive REST API for poll management, user administration, analytics, and real-time features. All API endpoints require authentication and implement role-based access control.

## Base URL

```
https://your-domain.com/api
```

## Authentication

All API endpoints require authentication via Supabase session tokens. Include the session token in the `Authorization` header:

```
Authorization: Bearer <session_token>
```

## Rate Limiting

API endpoints implement rate limiting to prevent abuse:

- **General endpoints**: 100 requests per minute
- **Admin endpoints**: 30 requests per minute
- **Analytics endpoints**: 20 requests per minute

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

## Endpoints

### Polls

#### GET /api/polls

Get all public polls with pagination and filtering.

**Query Parameters:**
- `limit` (optional): Number of polls to return (default: 20, max: 100)
- `offset` (optional): Number of polls to skip (default: 0)
- `category` (optional): Filter by category
- `sort` (optional): Sort order (`newest`, `oldest`, `most-voted`, `least-voted`)

**Response:**
```json
{
  "success": true,
  "data": {
    "polls": [
      {
        "id": "poll-123",
        "question": "What's your favorite programming language?",
        "description": "Choose your preferred language",
        "options": ["JavaScript", "Python", "TypeScript"],
        "votes": [10, 15, 8],
        "total_votes": 33,
        "unique_voters": 25,
        "view_count": 100,
        "share_count": 5,
        "created_at": "2024-01-01T00:00:00Z",
        "expires_at": "2024-01-31T00:00:00Z",
        "is_active": true,
        "category": "programming",
        "tags": ["tech", "programming"]
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### POST /api/polls

Create a new poll.

**Request Body:**
```json
{
  "question": "What's your favorite programming language?",
  "description": "Choose your preferred language",
  "options": ["JavaScript", "Python", "TypeScript"],
  "expires_at": "2024-01-31T00:00:00Z",
  "category": "programming",
  "tags": ["tech", "programming"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "poll-123",
    "question": "What's your favorite programming language?",
    "description": "Choose your preferred language",
    "options": ["JavaScript", "Python", "TypeScript"],
    "votes": [0, 0, 0],
    "total_votes": 0,
    "unique_voters": 0,
    "view_count": 0,
    "share_count": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "expires_at": "2024-01-31T00:00:00Z",
    "is_active": true,
    "category": "programming",
    "tags": ["tech", "programming"]
  }
}
```

#### GET /api/polls/[id]

Get a specific poll by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "poll-123",
    "question": "What's your favorite programming language?",
    "description": "Choose your preferred language",
    "options": ["JavaScript", "Python", "TypeScript"],
    "votes": [10, 15, 8],
    "total_votes": 33,
    "unique_voters": 25,
    "view_count": 100,
    "share_count": 5,
    "created_at": "2024-01-01T00:00:00Z",
    "expires_at": "2024-01-31T00:00:00Z",
    "is_active": true,
    "category": "programming",
    "tags": ["tech", "programming"]
  }
}
```

#### POST /api/polls/[id]/vote

Vote on a poll.

**Request Body:**
```json
{
  "option_index": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Vote recorded successfully",
    "poll_id": "poll-123",
    "option_index": 0
  }
}
```

### Admin

#### GET /api/admin/users

Get all users (admin only).

**Query Parameters:**
- `limit` (optional): Number of users to return (default: 50, max: 100)
- `offset` (optional): Number of users to skip (default: 0)
- `role` (optional): Filter by role (`admin`, `moderator`, `user`)
- `search` (optional): Search by name or email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-123",
        "email": "user@example.com",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "role": "user",
        "permissions": {
          "canCreatePolls": true,
          "canEditAllPolls": false,
          "canDeleteAllPolls": false,
          "canViewAllPolls": true,
          "canViewUsers": false,
          "canEditUsers": false,
          "canDeleteUsers": false,
          "canManageRoles": false,
          "canViewAnalytics": false,
          "canViewUserAnalytics": false,
          "canExportData": false,
          "canAccessAdmin": false,
          "canManageSystem": false,
          "canViewLogs": false
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "lastActiveAt": "2024-01-01T00:00:00Z",
        "isActive": true
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### PATCH /api/admin/users

Update user role (admin only).

**Request Body:**
```json
{
  "userId": "user-123",
  "role": "moderator"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "User role updated successfully",
    "userId": "user-123",
    "newRole": "moderator"
  }
}
```

### Analytics

#### GET /api/analytics

Get analytics data.

**Query Parameters:**
- `pollId` (optional): Get analytics for specific poll
- `type` (optional): Get system analytics (`system`)

**Response (Poll Analytics):**
```json
{
  "success": true,
  "data": {
    "pollId": "poll-123",
    "question": "What's your favorite programming language?",
    "totalVotes": 33,
    "uniqueVoters": 25,
    "viewCount": 100,
    "shareCount": 5,
    "voteDistribution": [
      {
        "option": "JavaScript",
        "votes": 10,
        "percentage": 30
      },
      {
        "option": "Python",
        "votes": 15,
        "percentage": 45
      },
      {
        "option": "TypeScript",
        "votes": 8,
        "percentage": 25
      }
    ],
    "votingTimeline": [
      {
        "date": "2024-01-01",
        "votes": 5
      },
      {
        "date": "2024-01-02",
        "votes": 8
      }
    ],
    "engagementTimeline": [
      {
        "date": "2024-01-01",
        "views": 20,
        "votes": 5,
        "shares": 2,
        "comments": 1
      }
    ],
    "engagement": {
      "views": 100,
      "shares": 5,
      "comments": 3,
      "engagementRate": 33
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-01-31T00:00:00Z"
  }
}
```

**Response (System Analytics):**
```json
{
  "success": true,
  "data": {
    "totalPolls": 150,
    "totalUsers": 75,
    "totalVotes": 500,
    "recentPolls": [
      {
        "id": "poll-123",
        "question": "Recent Poll",
        "created_at": "2024-01-01T00:00:00Z",
        "total_votes": 10
      }
    ],
    "topPolls": [
      {
        "id": "poll-456",
        "question": "Popular Poll",
        "total_votes": 100,
        "view_count": 500
      }
    ],
    "dailyActivity": [
      {
        "date": "2024-01-01",
        "views": 50,
        "votes": 20,
        "shares": 5,
        "comments": 3
      }
    ],
    "engagement": {
      "totalViews": 1000,
      "totalVotes": 500,
      "totalShares": 50,
      "totalComments": 25,
      "engagementRate": 50,
      "shareRate": 5,
      "commentRate": 2.5
    }
  }
}
```

#### POST /api/analytics/track

Track analytics events.

**Request Body:**
```json
{
  "pollId": "poll-123",
  "actionType": "view",
  "metadata": {
    "source": "web",
    "device": "desktop"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Event tracked successfully"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/polls` | 100 requests | 1 minute |
| `/api/admin/*` | 30 requests | 1 minute |
| `/api/analytics` | 20 requests | 1 minute |

## Security

- All endpoints require authentication
- Role-based access control is enforced
- Input validation with Zod schemas
- Rate limiting to prevent abuse
- CORS protection
- Security headers

## Examples

### Create a Poll

```bash
curl -X POST https://your-domain.com/api/polls \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is your favorite programming language?",
    "description": "Choose your preferred language for development",
    "options": ["JavaScript", "Python", "TypeScript", "Go"],
    "expires_at": "2024-01-31T00:00:00Z",
    "category": "programming",
    "tags": ["tech", "programming", "development"]
  }'
```

### Vote on a Poll

```bash
curl -X POST https://your-domain.com/api/polls/poll-123/vote \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "option_index": 0
  }'
```

### Get Poll Analytics

```bash
curl -X GET "https://your-domain.com/api/analytics?pollId=poll-123" \
  -H "Authorization: Bearer <session_token>"
```

### Update User Role (Admin)

```bash
curl -X PATCH https://your-domain.com/api/admin/users \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "role": "moderator"
  }'
```
