const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cinema Management API',
      version: '1.0.0',
      description: `A comprehensive **Multi-Tenant SaaS API** for managing cinema operations including movies, sessions, rooms, and inventory across multiple cinema companies with complete data isolation.

## 🏢 Multi-Tenant Architecture

This system supports multiple cinema companies with complete data segregation:
- **CineMax Entertainment** (ID: 11111111-1111-1111-1111-111111111111)
- **MovieTime Cinemas** (ID: 22222222-2222-2222-2222-222222222222)
- **Premium Screens** (ID: 33333333-3333-3333-3333-333333333333)

## 🔐 Multi-Tenant Authentication

### **Tenant Authentication (Company Employees)**
1. **Generate Tenant Token**:
   \`\`\`bash
   # CineMax Token
   docker-compose exec api npm run token:multitenant 11111111-1111-1111-1111-111111111111 ADM001

   # MovieTime Token
   docker-compose exec api npm run token:multitenant 22222222-2222-2222-2222-222222222222 ADM002

   # Premium Screens Token
   docker-compose exec api npm run token:multitenant 33333333-3333-3333-3333-333333333333 ADM003
   \`\`\`

2. **Authorize in Swagger**:
   - Click 🔒 **Authorize** button
   - Paste token **WITHOUT "Bearer " prefix**
   - Access only your company's data

### **System Admin Authentication (Cross-Tenant)**
1. **Generate System Admin Token**:
   \`\`\`bash
   docker-compose exec api npm run token:sysadmin sysadmin
   \`\`\`

2. **Use System Admin Endpoints**:
   - Access \`/api/system-admin/*\` endpoints only
   - View all companies and platform statistics
   - Cannot access tenant-scoped endpoints (by design)

## 🧪 **Multi-Tenant Testing Guide**

### **Test Scenario 1: Tenant Isolation**
1. **CineMax Token** → \`GET /api/movies\` → **Should return 3 CineMax movies only**
2. **MovieTime Token** → \`GET /api/movies\` → **Should return 3 MovieTime movies only**
3. **Premium Token** → \`GET /api/movies\` → **Should return 3 Premium movies only**

### **Test Scenario 2: System Admin Access**
1. **System Admin Token** → \`GET /api/movies\` → **❌ Should return 401 (by design)**
2. **System Admin Token** → \`GET /api/system-admin/companies\` → **✅ Should return all 3 companies**
3. **System Admin Token** → \`GET /api/system-admin/stats\` → **✅ Should show platform statistics**

### **Expected Results**
| Authentication | Movies Visible | Companies Visible | Employee Count |
|---------------|----------------|-------------------|----------------|
| **CineMax Token** | 3 (CineMax only) | 1 (own company) | 3 (own employees) |
| **MovieTime Token** | 3 (MovieTime only) | 1 (own company) | 3 (own employees) |
| **Premium Token** | 3 (Premium only) | 1 (own company) | 3 (own employees) |
| **System Admin Token** | ❌ No access | 3 (all companies) | 9 (all employees) |

## ✅ **Multi-Tenancy Verification Checklist**
- ✅ Each tenant sees only their data (3 movies, 3 employees, 2 customers)
- ✅ System admin cannot access tenant endpoints (security isolation)
- ✅ System admin can manage all companies via system admin endpoints
- ✅ No cross-tenant data leakage occurs
- ✅ Authentication properly controls access levels

## 🚀 Multi-Tenant Quick Commands

\`\`\`bash
# Seed multi-tenant data (3 companies)
docker-compose exec api npm run seed:multitenant

# Generate tenant tokens
docker-compose exec api npm run token:multitenant [COMPANY_ID] [EMPLOYEE_ID]

# Generate system admin token
docker-compose exec api npm run token:sysadmin sysadmin

# Test tenant isolation
curl -H "Authorization: Bearer [TENANT_TOKEN]" http://localhost:3000/api/movies | jq '.count'

# Test system admin access
curl -H "Authorization: Bearer [SYSADMIN_TOKEN]" http://localhost:3000/api/system-admin/companies | jq '.data | length'
\`\`\`

**🎬 Your Multi-Tenant Cinema Management SaaS Platform is Ready!**`,
      contact: {
        name: 'Cinema Management Team',
        email: 'support@cinemamanagement.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT Bearer token obtained from /api/employees/login'
        }
      },
      schemas: {
        Movie: {
          type: 'object',
          required: ['title', 'duration_min', 'genre'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the movie',
              example: 1
            },
            title: {
              type: 'string',
              description: 'Movie title',
              example: 'Avatar: The Way of Water'
            },
            duration_min: {
              type: 'integer',
              description: 'Movie duration in minutes',
              example: 192
            },
            genre: {
              type: 'string',
              description: 'Movie genre',
              example: 'Sci-Fi'
            },
            description: {
              type: 'string',
              description: 'Movie description',
              example: 'Jake Sully and Ney\'tiri have formed a family and are doing everything to stay together...'
            },
            rating: {
              type: 'string',
              description: 'Movie rating',
              example: 'PG-13'
            },
            poster_url: {
              type: 'string',
              description: 'URL to movie poster image',
              example: 'https://example.com/posters/avatar2.jpg'
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the movie is currently active',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Movie creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Movie last update timestamp'
            }
          }
        },
        MovieInput: {
          type: 'object',
          required: ['title', 'duration_min', 'genre'],
          properties: {
            title: {
              type: 'string',
              description: 'Movie title',
              example: 'Avatar: The Way of Water'
            },
            duration_min: {
              type: 'integer',
              description: 'Movie duration in minutes',
              example: 192
            },
            genre: {
              type: 'string',
              description: 'Movie genre',
              example: 'Sci-Fi'
            },
            description: {
              type: 'string',
              description: 'Movie description',
              example: 'Jake Sully and Ney\'tiri have formed a family and are doing everything to stay together...'
            },
            rating: {
              type: 'string',
              description: 'Movie rating',
              example: 'PG-13'
            },
            poster_url: {
              type: 'string',
              description: 'URL to movie poster image',
              example: 'https://example.com/posters/avatar2.jpg'
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the movie is currently active',
              example: true
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Validation error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field that failed validation'
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message'
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi
};