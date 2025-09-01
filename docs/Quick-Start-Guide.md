# Frontend Quick Start Guide

## Overview

The Prometheus Backend provides a complete AI agent orchestration platform. This guide will help you integrate it with your frontend application in minutes.

## 🚀 Setup Steps

### 1. Start the Backend Server

```bash
# Clone and setup backend
git clone <repository-url>
cd prometheus-backend
npm install

# Create environment file
cp .env.example .env

# Configure database and JWT secret
echo "DB_HOST=localhost" >> .env
echo "DB_PORT=5432" >> .env
echo "DB_USERNAME=your_db_user" >> .env
echo "DB_PASSWORD=your_db_password" >> .env
echo "DB_DATABASE=prometheus_db" >> .env
echo "JWT_SECRET=your-super-secret-jwt-key" >> .env

# Start development server
npm run start:dev
```

Server will be available at: `http://localhost:3000`

### 2. Test Connection

```javascript
// Test if API is running
fetch('http://localhost:3000')
  .then(res => res.text())
  .then(console.log); // Should return "Hello World!"
```

## 📝 Basic Integration

### Authentication Setup

```javascript
// auth.js
class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.token = localStorage.getItem('authToken');
  }

  async signup(email, password) {
    const response = await fetch(`${this.baseURL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    this.token = data.token;
    localStorage.setItem('authToken', this.token);
    return data;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    this.token = data.token;
    localStorage.setItem('authToken', this.token);
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  isAuthenticated() {
    return !!this.token;
  }

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }
}

export const auth = new AuthService();
```

### API Client Setup

```javascript
// api.js
import { auth } from './auth.js';

class ApiClient {
  constructor() {
    this.baseURL = 'http://localhost:3000';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add auth header if user is logged in
    if (auth.isAuthenticated()) {
      config.headers.Authorization = `Bearer ${auth.token}`;
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        auth.logout();
        window.location.href = '/login';
      }
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  }

  // Projects
  async getProjects() {
    return this.request('/projects');
  }

  async createProject(projectData) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  // Agents
  async getAgents() {
    return this.request('/agents');
  }

  async createAgent(agentData) {
    return this.request('/agents', {
      method: 'POST',
      body: JSON.stringify(agentData)
    });
  }

  // Tasks
  async getTasks(projectId) {
    return this.request(`/projects/${projectId}/tasks`);
  }

  async createTask(projectId, taskData) {
    return this.request(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async executeTask(taskId) {
    return this.request(`/orchestrator/tasks/${taskId}/run`, {
      method: 'POST'
    });
  }
}

export const api = new ApiClient();
```

### WebSocket Setup

```javascript
// websocket.js
import { io } from 'socket.io-client';
import { auth } from './auth.js';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (!auth.isAuthenticated()) {
      console.warn('Cannot connect WebSocket: User not authenticated');
      return;
    }

    this.socket = io('ws://localhost:3000', {
      auth: {
        token: auth.token
      }
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Task execution events
    this.socket.on('task.execution.started', (data) => {
      this.emit('taskStarted', data);
    });

    this.socket.on('task.execution.progress', (data) => {
      this.emit('taskProgress', data);
    });

    this.socket.on('task.execution.completed', (data) => {
      this.emit('taskCompleted', data);
    });

    this.socket.on('task.execution.failed', (data) => {
      this.emit('taskFailed', data);
    });
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  joinProject(projectId) {
    if (this.socket) {
      this.socket.emit('join.project', { projectId });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const websocket = new WebSocketService();
```

## 🎯 Quick Examples

### 1. User Registration/Login

```html
<!-- login.html -->
<form id="loginForm">
  <input type="email" id="email" placeholder="Email" required>
  <input type="password" id="password" placeholder="Password" required>
  <button type="submit">Login</button>
</form>

<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    await auth.login(email, password);
    alert('Login successful!');
    window.location.href = '/dashboard';
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
});
</script>
```

### 2. Create Project and Agent

```javascript
// Example: Complete project setup
async function setupProject() {
  try {
    // 1. Create project
    const project = await api.createProject({
      name: 'My AI Project',
      description: 'A project for testing AI agents'
    });
    
    console.log('Project created:', project);

    // 2. Create an agent
    const agent = await api.createAgent({
      name: 'Frontend Specialist',
      role: 'Expert in React and modern web development',
      personalityMatrix: {
        creativity: 0.8,
        analytical: 0.7
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7
      }
    });

    console.log('Agent created:', agent);

    // 3. Create a task
    const task = await api.createTask(project.id, {
      title: 'Create login component',
      description: 'Build a React login component with validation',
      assigneeIds: [agent.id],
      priority: 'high'
    });

    console.log('Task created:', task);

    return { project, agent, task };
  } catch (error) {
    console.error('Setup failed:', error);
  }
}
```

### 3. Execute Task with Real-time Updates

```javascript
// Example: Task execution with progress tracking
async function executeTaskWithProgress(taskId) {
  // Set up WebSocket listeners
  websocket.connect();
  
  websocket.on('taskProgress', (data) => {
    if (data.taskId === taskId) {
      console.log(`Progress: ${data.progress}%`);
      updateProgressBar(data.progress);
    }
  });

  websocket.on('taskCompleted', (data) => {
    if (data.taskId === taskId) {
      console.log('Task completed!', data.result);
      showSuccessMessage();
    }
  });

  // Start task execution
  try {
    const execution = await api.executeTask(taskId);
    console.log('Task execution started:', execution);
  } catch (error) {
    console.error('Failed to start task:', error);
  }
}

function updateProgressBar(progress) {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${progress}%`;
  }
}
```

## 🛠️ React Integration

### Custom Hooks

```javascript
// hooks/useApi.js
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await api.getProjects();
        setProjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  return { projects, loading, error, refetch: fetchProjects };
}

export function useTaskExecution() {
  const [executions, setExecutions] = useState(new Map());

  useEffect(() => {
    websocket.connect();

    websocket.on('taskProgress', (data) => {
      setExecutions(prev => new Map(prev).set(data.taskId, {
        progress: data.progress,
        status: 'running'
      }));
    });

    websocket.on('taskCompleted', (data) => {
      setExecutions(prev => new Map(prev).set(data.taskId, {
        progress: 100,
        status: 'completed',
        result: data.result
      }));
    });

    return () => websocket.disconnect();
  }, []);

  const executeTask = async (taskId) => {
    try {
      await api.executeTask(taskId);
      setExecutions(prev => new Map(prev).set(taskId, {
        progress: 0,
        status: 'started'
      }));
    } catch (error) {
      setExecutions(prev => new Map(prev).set(taskId, {
        progress: 0,
        status: 'failed',
        error: error.message
      }));
    }
  };

  return { executions, executeTask };
}
```

### React Components

```jsx
// components/ProjectList.jsx
import React from 'react';
import { useProjects } from '../hooks/useApi';

function ProjectList() {
  const { projects, loading, error } = useProjects();

  if (loading) return <div className="loading">Loading projects...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="project-list">
      <h2>Your Projects</h2>
      {projects.length === 0 ? (
        <p>No projects yet. Create your first project!</p>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card">
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <div className="project-stats">
                <span>Agents: {project.agentIds.length}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectList;
```

## 🔧 Environment Configuration

### Frontend Environment Variables

```env
# .env.local (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# .env (React/Vite)
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Configuration Helper

```javascript
// config/environment.js
const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || 'http://localhost:3000',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || process.env.VITE_WS_URL || 'ws://localhost:3000',
  isDevelopment: process.env.NODE_ENV === 'development'
};

export default config;
```

## 🚨 Error Handling

### Global Error Handler

```javascript
// utils/errorHandler.js
export function handleApiError(error) {
  console.error('API Error:', error);

  if (error.message.includes('401')) {
    // Unauthorized - redirect to login
    auth.logout();
    window.location.href = '/login';
  } else if (error.message.includes('403')) {
    // Forbidden - show access denied message
    showNotification('error', 'Access denied');
  } else if (error.message.includes('404')) {
    // Not found
    showNotification('error', 'Resource not found');
  } else if (error.message.includes('429')) {
    // Rate limited
    showNotification('error', 'Too many requests. Please try again later.');
  } else {
    // Generic error
    showNotification('error', error.message || 'Something went wrong');
  }
}

function showNotification(type, message) {
  // Implement your notification system here
  alert(`${type.toUpperCase()}: ${message}`);
}
```

## 📱 Mobile Considerations

For mobile apps (React Native):

```javascript
// Mobile WebSocket setup
import { io } from 'socket.io-client';

const socket = io('http://your-server-ip:3000', {
  auth: { token: await AsyncStorage.getItem('authToken') },
  transports: ['websocket']
});
```

## 🎉 You're Ready!

You now have everything needed to integrate with the Prometheus Backend:

1. **Authentication**: User signup/login with JWT tokens
2. **Projects**: Create and manage AI projects
3. **Agents**: Configure AI agents with different capabilities
4. **Tasks**: Create, assign, and execute tasks
5. **Real-time Updates**: WebSocket integration for live progress

## 📚 Next Steps

1. Read the full [API Documentation](./API-Documentation.md)
2. Explore the example implementations
3. Check out the error handling patterns
4. Implement your specific UI components

Need help? Check the backend code or contact the development team!