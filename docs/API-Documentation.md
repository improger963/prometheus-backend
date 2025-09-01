# Prometheus Backend API Documentation for Frontend Developers

## Table of Contents

1. [Authentication](#authentication)
2. [Project Management](#project-management)
3. [Agent Management](#agent-management)
4. [Task Management](#task-management)
5. [Task Orchestration](#task-orchestration)
6. [Knowledge Management](#knowledge-management)
7. [Real-time Communication](#real-time-communication)
8. [Error Handling](#error-handling)
9. [Request/Response Examples](#examples)

---

## Base URL and Setup

**Base URL**: `http://localhost:3000` (Development)
**Content-Type**: `application/json`
**CORS**: Enabled for frontend origins

### Authentication Headers
All protected endpoints require:
```http
Authorization: Bearer <jwt_token>
```

---

## Authentication

### POST /auth/signup
**Purpose**: Register a new user account

**Request Body**:
```typescript
interface SignupRequest {
  email: string;          // Valid email format, max 255 chars
  password: string;       // Min 8 chars, must include uppercase, lowercase, number, special char
}
```

**Response** (201):
```typescript
interface SignupResponse {
  user: {
    id: string;           // UUID format
    email: string;
    createdAt: string;    // ISO date string
    updatedAt: string;    // ISO date string
  };
  token: string;          // JWT token (expires in 7 days)
}
```

**Example**:
```javascript
const response = await fetch('/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});
const data = await response.json();
// Store data.token for future requests
```

**Error Responses**:
- `400` - Validation errors (weak password, invalid email)
- `409` - Email already exists
- `500` - Server error

### POST /auth/login
**Purpose**: Authenticate user and receive JWT token

**Request Body**:
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response** (200):
```typescript
interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  token: string;          // JWT token for authorization
}
```

**Example**:
```javascript
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});
const { token } = await response.json();
localStorage.setItem('authToken', token);
```

**Error Responses**:
- `401` - Invalid credentials
- `400` - Validation errors
- `500` - Server error

---

## Project Management

### POST /projects
**Purpose**: Create a new project

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```typescript
interface CreateProjectRequest {
  name: string;                    // Required, 3-255 chars
  description?: string;            // Optional, max 5000 chars
  gitRepositoryURL?: string;       // Optional, valid URL
  baseDockerImage?: string;        // Optional, default: 'ubuntu:latest'
  gitAccessToken?: string;         // Optional, for private repos
}
```

**Response** (201):
```typescript
interface Project {
  id: string;                      // UUID
  name: string;
  description?: string;
  gitRepositoryURL?: string;
  gitAccessToken?: string;
  baseDockerImage: string;
  agentIds: string[];             // Array of assigned agent UUIDs
  userId: string;                 // Owner UUID
  user: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Example**:
```javascript
const project = await fetch('/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'My AI Project',
    description: 'A project for testing AI agents',
    gitRepositoryURL: 'https://github.com/user/repo.git'
  })
}).then(res => res.json());
```

### GET /projects
**Purpose**: Retrieve all user's projects

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface ProjectListResponse {
  projects: Project[];
}
```

**Example**:
```javascript
const projects = await fetch('/projects', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());
```

### GET /projects/:id
**Purpose**: Retrieve specific project details

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface ProjectResponse {
  project: Project;
}
```

### PATCH /projects/:id
**Purpose**: Update project information

**Headers**: `Authorization: Bearer <token>`

**Request Body**: Same as CreateProjectRequest but all fields optional

### DELETE /projects/:id
**Purpose**: Delete a project

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface DeleteResponse {
  deleted: boolean;
  id: string;
}
```

---

## Agent Management

### POST /agents
**Purpose**: Create a global AI agent

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```typescript
interface CreateAgentRequest {
  name: string;                    // Required, 2-255 chars
  role: string;                    // Required, 5-500 chars
  personalityMatrix: Record<string, any>;  // AI personality configuration
  llmConfig: {
    provider: 'openai' | 'groq' | 'mistral' | 'google';
    model: string;                 // Model identifier
    temperature?: number;          // 0-2, creativity level
    maxTokens?: number;           // Max response length
  };
}
```

**Response** (201):
```typescript
interface Agent {
  id: string;                      // UUID
  name: string;
  role: string;
  personalityMatrix: Record<string, any>;
  llmConfig: LLMConfig;
  rating: number;                  // 0-5
  experience: number;              // Experience points
  userId: string;                  // Owner UUID
  user: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Example**:
```javascript
const agent = await fetch('/agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Frontend Specialist',
    role: 'Expert in React, TypeScript, and modern web development',
    personalityMatrix: {
      creativity: 0.8,
      analytical: 0.7,
      empathy: 0.9
    },
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000
    }
  })
}).then(res => res.json());
```

### GET /agents
**Purpose**: List all user's agents

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface AgentListResponse {
  agents: Agent[];
}
```

### GET /agents/:agentId
**Purpose**: Get specific agent details

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface AgentResponse {
  agent: Agent;
}
```

### PATCH /agents/:agentId
**Purpose**: Update agent configuration

**Headers**: `Authorization: Bearer <token>`

**Request Body**: Partial CreateAgentRequest + rating/experience fields

### DELETE /agents/:agentId
**Purpose**: Delete an agent

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface DeleteResponse {
  deleted: boolean;
  id: string;
}
```

---

## Task Management

### POST /projects/:projectId/tasks
**Purpose**: Create a new task in a project

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```typescript
interface CreateTaskRequest {
  title: string;                   // Required, 3-255 chars
  description: string;             // Required, 10-5000 chars
  assigneeIds?: string[];          // Optional, max 10 agent UUIDs
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;               // Optional, ISO date string
  parameters?: Record<string, any>; // Optional execution parameters
}
```

**Response** (201):
```typescript
interface Task {
  id: string;                      // UUID
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigneeIds: string[];           // Array of agent UUIDs
  parameters?: Record<string, any>;
  dueDate?: string;
  projectId: string;               // Parent project UUID
  project: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Example**:
```javascript
const task = await fetch(`/projects/${projectId}/tasks`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Implement user authentication',
    description: 'Create login and signup forms with validation',
    assigneeIds: [frontendAgentId, backendAgentId],
    priority: 'high',
    dueDate: '2024-12-31T23:59:59.000Z'
  })
}).then(res => res.json());
```

### GET /projects/:projectId/tasks
**Purpose**: List all tasks in a project

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
```typescript
interface TaskQueryParams {
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  assigneeId?: string;             // Filter by assigned agent
  priority?: 'low' | 'medium' | 'high' | 'critical';
}
```

**Response** (200):
```typescript
interface TaskListResponse {
  tasks: Task[];
}
```

**Example**:
```javascript
// Get all pending tasks
const pendingTasks = await fetch(`/projects/${projectId}/tasks?status=PENDING`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());

// Get tasks assigned to specific agent
const agentTasks = await fetch(`/projects/${projectId}/tasks?assigneeId=${agentId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());
```

### GET /projects/:projectId/tasks/:taskId
**Purpose**: Get specific task details

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface TaskResponse {
  task: Task;
}
```

### PATCH /projects/:projectId/tasks/:taskId
**Purpose**: Update task information

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```typescript
interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  assigneeIds?: string[];
  priority?: string;
  dueDate?: string;
  parameters?: Record<string, any>;
}
```

**Example**:
```javascript
// Update task status
const updatedTask = await fetch(`/projects/${projectId}/tasks/${taskId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    status: 'IN_PROGRESS'
  })
}).then(res => res.json());
```

### DELETE /projects/:projectId/tasks/:taskId
**Purpose**: Delete a task

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface DeleteResponse {
  deleted: boolean;
  id: string;
}
```

---

## Task Orchestration

### POST /orchestrator/tasks/:taskId/run
**Purpose**: Execute a task using assigned agents

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```typescript
interface ExecuteTaskRequest {
  parameters?: Record<string, any>;  // Optional execution parameters
}
```

**Response** (201):
```typescript
interface ExecutionResponse {
  executionId: string;               // UUID for tracking
  taskId: string;
  status: 'STARTED';
  startedAt: string;
}
```

**Example**:
```javascript
const execution = await fetch(`/orchestrator/tasks/${taskId}/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    parameters: {
      environment: 'development',
      timeout: 300
    }
  })
}).then(res => res.json());

// Use execution.executionId to track progress via WebSocket
```

### GET /orchestrator/execution/:executionId
**Purpose**: Get task execution status

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```typescript
interface ExecutionStatusResponse {
  executionId: string;
  taskId: string;
  status: 'STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;                // 0-100 percentage
  result?: any;                    // Execution result if completed
  error?: string;                  // Error message if failed
  startedAt: string;
  completedAt?: string;
}
```

**Example**:
```javascript
const status = await fetch(`/orchestrator/execution/${executionId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());

console.log(`Task progress: ${status.progress}%`);
```

---

## Knowledge Management

### POST /knowledge
**Purpose**: Create knowledge record

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```typescript
interface CreateKnowledgeRequest {
  title: string;                   // Required
  content: string;                 // Required, knowledge content
  type: 'document' | 'code' | 'guide' | 'reference';
  tags?: string[];                 // Optional tags
  projectId?: string;             // Optional project association
}
```

**Response** (201):
```typescript
interface KnowledgeRecord {
  id: string;                      // UUID
  title: string;
  content: string;
  type: string;
  tags: string[];
  userId: string;
  user: {
    id: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Example**:
```javascript
const knowledge = await fetch('/knowledge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'React Best Practices',
    content: 'Guidelines for writing clean React components...',
    type: 'guide',
    tags: ['react', 'frontend', 'best-practices'],
    projectId: projectId
  })
}).then(res => res.json());
```

### GET /knowledge
**Purpose**: List user's knowledge records

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
```typescript
interface KnowledgeQueryParams {
  type?: string;                   // Filter by type
  projectId?: string;             // Filter by project
  search?: string;                // Search in title and content
  tags?: string[];               // Filter by tags
}
```

**Response** (200):
```typescript
interface KnowledgeListResponse {
  records: KnowledgeRecord[];
}
```

**Example**:
```javascript
// Search for React-related knowledge
const reactKnowledge = await fetch('/knowledge?search=react&tags=frontend', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());
```

---

## Real-time Communication (WebSocket)

### Connection Setup
```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000', {
  auth: {
    token: authToken  // Your JWT token
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});
```

### Event Types
```typescript
interface WebSocketEvents {
  // Task execution events
  'task.execution.started': {
    taskId: string;
    executionId: string;
    startedAt: string;
  };
  
  'task.execution.progress': {
    taskId: string;
    executionId: string;
    progress: number;              // 0-100
    message?: string;              // Progress message
  };
  
  'task.execution.completed': {
    taskId: string;
    executionId: string;
    result: any;                   // Execution result
    completedAt: string;
  };
  
  'task.execution.failed': {
    taskId: string;
    executionId: string;
    error: string;                 // Error message
    failedAt: string;
  };
  
  // Project events
  'project.updated': {
    projectId: string;
    changes: Partial<Project>;
  };
  
  // Agent events
  'agent.status.changed': {
    agentId: string;
    status: 'available' | 'busy' | 'offline';
  };
}
```

### Usage Example
```javascript
// Listen for task execution updates
socket.on('task.execution.progress', (data) => {
  updateProgressBar(data.taskId, data.progress);
  console.log(`Task ${data.taskId}: ${data.progress}% - ${data.message}`);
});

socket.on('task.execution.completed', (data) => {
  showSuccessMessage(`Task ${data.taskId} completed!`);
  refreshTaskList();
});

socket.on('task.execution.failed', (data) => {
  showErrorMessage(`Task ${data.taskId} failed: ${data.error}`);
});

// Join project room for updates
socket.emit('join.project', { projectId: 'your-project-uuid' });
```

---

## Error Handling

### Standard Error Response Format
```typescript
interface ErrorResponse {
  statusCode: number;
  timestamp: string;              // ISO date string
  path: string;                   // Request path
  message: string;                // Human-readable error message
  details?: any;                  // Additional error details (development only)
}
```

### Common HTTP Status Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 400 | Bad Request | Invalid input data, validation errors |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist or user doesn't own it |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 422 | Unprocessable Entity | Business logic errors |
| 429 | Too Many Requests | Rate limiting exceeded |
| 500 | Internal Server Error | Server-side errors |

### Error Handling Example
```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`${errorData.message} (${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.message.includes('401')) {
      // Redirect to login
      window.location.href = '/login';
    } else {
      // Show user-friendly error
      showNotification('error', error.message);
    }
    throw error;
  }
}
```

---

## Frontend Integration Examples

### React Hook for API Calls
```javascript
import { useState, useEffect } from 'react';

function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

// Usage
function ProjectList() {
  const { data: projects, loading, error } = useApi('/projects');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {projects?.map(project => (
        <li key={project.id}>{project.name}</li>
      ))}
    </ul>
  );
}
```

### Task Execution with Real-time Updates
```javascript
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

function TaskExecutor({ taskId }) {
  const [execution, setExecution] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const socket = io('ws://localhost:3000', {
      auth: { token: localStorage.getItem('authToken') }
    });

    socket.on('task.execution.progress', (data) => {
      if (data.taskId === taskId) {
        setProgress(data.progress);
        setStatus('running');
      }
    });

    socket.on('task.execution.completed', (data) => {
      if (data.taskId === taskId) {
        setStatus('completed');
        setProgress(100);
      }
    });

    socket.on('task.execution.failed', (data) => {
      if (data.taskId === taskId) {
        setStatus('failed');
      }
    });

    return () => socket.disconnect();
  }, [taskId]);

  const executeTask = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/orchestrator/tasks/${taskId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      setExecution(result);
      setStatus('started');
    } catch (error) {
      console.error('Failed to execute task:', error);
      setStatus('error');
    }
  };

  return (
    <div>
      <button onClick={executeTask} disabled={status === 'running'}>
        {status === 'running' ? 'Executing...' : 'Execute Task'}
      </button>
      
      {status === 'running' && (
        <div>
          <div>Progress: {progress}%</div>
          <progress value={progress} max="100" />
        </div>
      )}
      
      {status === 'completed' && <div>✅ Task completed successfully!</div>}
      {status === 'failed' && <div>❌ Task execution failed</div>}
    </div>
  );
}
```

### Environment Variables for Frontend
```javascript
// .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

// api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  }
};
```

---

## Summary

This API provides comprehensive functionality for:

1. **User Management**: Registration and authentication
2. **Project Organization**: Create and manage AI projects
3. **Agent Configuration**: Set up AI agents with different capabilities
4. **Task Management**: Create, assign, and track tasks
5. **Orchestration**: Execute tasks with real-time progress tracking
6. **Knowledge Base**: Store and retrieve project knowledge
7. **Real-time Updates**: WebSocket events for live updates

All endpoints include proper error handling, validation, and follow RESTful conventions. The API is designed to be frontend-friendly with predictable responses and comprehensive error messages.

For additional support or questions, refer to the backend code or contact the development team.