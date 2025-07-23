# Architecture Guidelines and Patterns

This document details the architectural patterns, boundaries, and design principles used in the Dungeon Lab VTT project.

## Project Structure Overview

### Package Architecture
```
packages/
├── web/           # Vue.js frontend (SPA)
├── server/        # Express.js backend
├── client/        # API client library
├── shared/        # Shared types and utilities
└── plugins/       # Game system plugins
    └── dnd-5e-2024/
        ├── web/
        ├── server/
        └── shared/
```

### Dependency Rules (STRICTLY ENFORCED)

#### Core Package Dependencies
- **web** → **shared**
- **server** → **shared**
- **client** → **shared**

#### Plugin Dependencies
- **plugin/web** → **shared**, **plugin/shared**
- **plugin/server** → **shared**, **plugin/shared**

#### Forbidden Dependencies
- **plugins CANNOT depend on main web/server packages**
- **web/server CANNOT depend directly on plugin code**
- **plugins CANNOT depend on other plugins**

### Communication Boundaries
- **Main App ↔ Plugins**: Only through defined interfaces
- **Web ↔ Server**: Via REST API and WebSocket only
- **Cross-Package**: Through shared package interfaces

## Plugin Architecture

### Plugin System Design
- **Isolation**: Each plugin operates independently
- **Extensibility**: Plugins extend base classes from shared package
- **Game System Focus**: Plugins implement specific TTRPG game systems
- **Runtime Loading**: Plugins loaded and registered at application start

### Plugin Structure Pattern
```typescript
// Base plugin interface (in shared package)
export interface GameSystemPlugin {
  id: string
  name: string
  version: string
  initialize(): Promise<void>
}

// Plugin implementation
export class DnD5ePlugin implements GameSystemPlugin {
  id = 'dnd-5e-2024'
  name = 'D&D 5th Edition (2024)'
  version = '1.0.0'
  
  async initialize() {
    // Plugin initialization logic
  }
}
```

### Plugin Communication
- **Registry Pattern**: Central plugin registry in shared package
- **Event System**: Plugins communicate via event system
- **Interface Contracts**: Strict interface adherence required

## Communication Architecture

### REST API Design
- **Resource-Oriented**: Follow REST principles for resource operations
- **API Prefix**: All routes start with `/api`
- **OpenAPI Documentation**: All endpoints documented with OpenAPI
- **Authentication**: Session-based auth for all protected routes

#### API Patterns
```typescript
// Resource operations
GET    /api/campaigns/:id     # Retrieve campaign
POST   /api/campaigns         # Create campaign
PUT    /api/campaigns/:id     # Replace campaign
PATCH  /api/campaigns/:id     # Update campaign
DELETE /api/campaigns/:id     # Delete campaign

// Nested resources
GET    /api/campaigns/:id/encounters
POST   /api/campaigns/:id/encounters
```

### WebSocket Architecture
- **Socket.io Exclusive**: Use Socket.io for all real-time communication
- **Namespaced Events**: Events follow `namespace:action` pattern
- **Room Management**: Organize connections by game sessions

#### WebSocket Event Patterns
```typescript
// Encounter management
'encounter:join'           # Join encounter room
'encounter:leave'          # Leave encounter room
'encounter:update'         # Encounter state changes
'encounter:roll-initiative' # Initiative rolling

// Token management
'token:move'               # Token movement
'token:update'             # Token property changes
'token:create'             # New token creation

// Chat system
'chat:message'             # Chat messages
'chat:typing'              # Typing indicators
```

## Feature Organization

### Server-Side Architecture
```
packages/server/src/
├── features/              # Feature-based organization
│   ├── campaigns/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   └── routes/
│   ├── encounters/
│   ├── users/
│   └── assets/
├── middleware/            # Express middleware
├── utils/                 # Utility functions
└── app.mts               # Application entry point
```

### Client-Side Architecture
```
packages/web/src/
├── views/                 # Router-connected pages
├── components/            # Reusable components
│   ├── common/           # App-wide components
│   └── features/         # Feature-specific components
├── stores/               # Pinia state management
├── composables/          # Vue composables
└── utils/                # Utility functions
```

## Data Architecture

### Database Design
- **MongoDB**: Primary database with Mongoose ODM
- **Session Storage**: Sessions stored in MongoDB
- **Document Structure**: Feature-based document organization

### ID Handling Convention
- **Server**: Uses MongoDB `_id` internally
- **Client**: Exposes `id` as string, never `_id`
- **Automatic Mapping**: Mongoose handles `_id` ↔ `id` conversion

```typescript
// Client interface
interface User {
  id: string        # String ID for client
  name: string
  email: string
}

// Server model handles _id internally
const user = await User.findById(id)  # MongoDB _id
res.json({ id: user.id, ... })       # Converted to string
```

### Asset Management
- **Development**: Local file system storage
- **Production**: MinIO S3-compatible storage
- **Processing**: Sharp for image optimization
- **Formats**: WebP preferred, PNG/JPEG fallback

## Authentication Architecture

### Session-Based Authentication
- **MongoDB Sessions**: Session data stored in MongoDB
- **Session Cookies**: HTTP-only cookies for session management
- **Middleware**: Centralized auth middleware
- **User Context**: `req.session.user` for authenticated requests

#### Authentication Flow
```typescript
// Login process
POST /api/auth/login → Validate credentials → Create session → Set cookie

// Protected routes
Middleware checks session → req.session.user available → Continue to handler

// Logout process
POST /api/auth/logout → Destroy session → Clear cookie
```

### Security Patterns
- **CSRF Protection**: Implemented for state-changing operations
- **Rate Limiting**: Applied to authentication endpoints
- **Input Validation**: Server-side validation for all inputs
- **Password Security**: Proper hashing and salting

## State Management

### Client-Side State (Pinia)
```typescript
// Feature-based stores
export const useCampaignStore = defineStore('campaign', () => {
  const campaigns = ref<Campaign[]>([])
  const currentCampaign = ref<Campaign | null>(null)
  
  const fetchCampaigns = async () => {
    // API call logic
  }
  
  return { campaigns, currentCampaign, fetchCampaigns }
})
```

### Server-Side State
- **Stateless Design**: Server maintains minimal state
- **Session State**: User authentication and session data
- **Cache Strategy**: Redis for caching when needed

## Error Handling Architecture

### Client-Side Error Handling
```typescript
// API error handling
try {
  const response = await api.createCampaign(data)
  return response
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
    router.push('/login')
  } else {
    // Show user-friendly error
    showErrorToast(error.message)
  }
  throw error
}
```

### Server-Side Error Handling
```typescript
// Centralized error middleware
app.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: error.details 
    })
  }
  
  // Log error and return generic message
  logger.error(error)
  res.status(500).json({ error: 'Internal server error' })
})
```

## Performance Architecture

### Frontend Optimization
- **Code Splitting**: Dynamic imports for route-based splitting
- **Asset Optimization**: WebP images with lazy loading
- **Bundle Analysis**: Regular bundle size monitoring
- **Component Optimization**: Vue 3 performance best practices

### Backend Optimization
- **Database Indexing**: Proper MongoDB indexing strategy
- **Query Optimization**: Efficient database queries
- **Caching Strategy**: Strategic caching for expensive operations
- **Connection Pooling**: Optimized database connections

## Deployment Architecture

### Development Environment
- **Vite**: Frontend development server with HMR
- **tsx**: Backend development with file watching
- **Docker**: Containerized development services
- **Auto-reload**: Both frontend and backend auto-reload on changes

### Production Considerations
- **Static Assets**: CDN delivery for static assets
- **Database**: MongoDB with replica sets
- **File Storage**: S3-compatible object storage
- **Load Balancing**: Horizontal scaling capability

## Monitoring and Observability

### Logging Strategy
- **Structured Logging**: JSON-formatted logs
- **Error Tracking**: Centralized error reporting
- **Performance Monitoring**: Response time tracking
- **User Activity**: Audit trails for important actions

### Health Checks
- **Database Connectivity**: MongoDB connection health
- **External Services**: Third-party service availability
- **Resource Usage**: Memory and CPU monitoring

This architectural framework ensures scalability, maintainability, and clear separation of concerns across the entire Dungeon Lab VTT application.