import request from 'supertest';
import { getTestAgent } from '../test-utils.mjs';
import { TEST_USERS } from './testUsers.mjs';

// Type for user keys in TEST_USERS
type UserType = keyof typeof TEST_USERS;

// Cache for storing cookies by user type
interface CookieCache {
  [key: string]: {
    cookie: string[];
    user: any;
  };
}

const cookieCache: CookieCache = {};
let sharedAgent: any = null;

/**
 * Helper function to authenticate a user and get the cookie
 * 
 * @param agent Supertest agent
 * @param userType Type of user to authenticate as
 * @returns Auth cookie and user object
 */
async function loginUser(
  agent: any,
  userType: UserType
): Promise<{ cookie: string[], user: any }> {
  const userData = TEST_USERS[userType];
  
  const response = await agent
    .post('/api/auth/login')
    .send({
      email: userData.email,
      password: userData.password
    });
  
  if (response.status !== 200) {
    throw new Error(`Login failed with status ${response.status}: ${JSON.stringify(response.body)}`);
  }
  
  return {
    cookie: response.headers['set-cookie'],
    user: response.body.data.user
  };
}

/**
 * Get a supertest agent that's authenticated as the specified user type
 * Caches cookies to avoid unnecessary logins
 * 
 * @param userType Type of user to authenticate as from TEST_USERS
 * @returns Supertest agent with authentication cookie
 */
export async function requestAs(userType: UserType = 'user'): Promise<request.SuperAgentTest> {
  // Initialize shared agent if needed
  if (!sharedAgent) {
    sharedAgent = await getTestAgent();
  }

  // Return cached cookie if we have it
  if (!cookieCache[userType]) {
    // Login as the specified user type
    const authInfo = await loginUser(sharedAgent, userType);
    
    // Cache the cookie and user info
    cookieCache[userType] = authInfo;
  }

  // Create a request function that automatically attaches the cookie
  const agent = sharedAgent;
  
  // Return a custom agent that attaches the cookie
  return new Proxy(agent, {
    get(target, prop) {
      if (['get', 'post', 'put', 'patch', 'delete', 'head'].includes(prop.toString())) {
        // Return a function that attaches the cookie to the request
        return function(...args: any[]) {
          const req = target[prop as keyof typeof target](...args);
          // Only set the cookie if it exists in the cache
          if (cookieCache[userType] && cookieCache[userType].cookie) {
            return req.set('Cookie', cookieCache[userType].cookie);
          }
          return req; // Return request without cookie if the cookie doesn't exist
        };
      }
      return target[prop as keyof typeof target];
    }
  }) as request.SuperAgentTest;
}

/**
 * Clear the cookie cache
 * Useful if you need to force a re-login (e.g., after logout test)
 */
export function clearAuthCache(userType?: UserType): void {
  if (userType) {
    delete cookieCache[userType];
  } else {
    // Clear all cached cookies
    Object.keys(cookieCache).forEach(key => {
      delete cookieCache[key];
    });
  }
}

/**
 * Get the currently cached user data for a user type
 */
export function getCachedUser(userType: UserType = 'user'): any {
  return cookieCache[userType]?.user;
}

/**
 * Wrapper to make authenticated requests
 * 
 * @param agent Supertest agent
 * @param cookie Auth cookie
 * @param method HTTP method
 * @param url URL path
 * @param body Request body (for POST, PUT, PATCH)
 * @returns Supertest response
 */
export async function authenticatedRequest(
  agent: any,
  cookie: string[],
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  body?: any
): Promise<request.Response> {
  let req = agent[method](url).set('Cookie', cookie);
  
  if (body && ['post', 'put', 'patch'].includes(method)) {
    req = req.send(body);
  }
  
  return req;
} 