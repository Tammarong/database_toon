# Registration Queries Documentation

## Overview
This document describes all the registration-related database queries and operations available in the `RegistrationQueries` class.

## Database Tables

### 1. Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Registration Info Table
```sql
CREATE TABLE registration_info (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registration_source VARCHAR(50) DEFAULT 'web',
    ip_address INET,
    user_agent TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP
);
```

## Available Queries

### 1. User Registration
**Method:** `registerUser(userData, clientInfo)`

**Description:** Registers a new user with comprehensive information and registration tracking.

**Parameters:**
- `userData`: Object containing user information
  - `fullName` (required): User's full name
  - `email` (required): User's email address
  - `username` (required): User's username
  - `password` (required): User's password (will be hashed)
  - `phone` (optional): User's phone number
  - `address` (optional): User's address
  - `dateOfBirth` (optional): User's date of birth
- `clientInfo`: Object containing client information
  - `source` (optional): Registration source (default: 'web')
  - `ipAddress` (optional): Client's IP address
  - `userAgent` (optional): Client's user agent

**Returns:**
```javascript
{
    success: true,
    user: {
        id: 1,
        fullName: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        createdAt: "2025-08-12T01:26:22.309Z"
    },
    registrationInfo: {
        registration_date: "2025-08-12T01:26:22.309Z",
        is_verified: false
    }
}
```

**Example:**
```javascript
const userData = {
    fullName: "John Doe",
    email: "john@example.com",
    username: "johndoe",
    password: "password123",
    phone: "+1234567890",
    address: "123 Main St",
    dateOfBirth: "1990-01-01"
};

const clientInfo = {
    source: "web",
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0..."
};

const result = await RegistrationQueries.registerUser(userData, clientInfo);
```

### 2. Check User Existence
**Method:** `checkUserExists(email, username)`

**Description:** Checks if a user already exists by email or username.

**Parameters:**
- `email`: Email address to check
- `username`: Username to check

**Returns:** Array of existing users

**Example:**
```javascript
const existingUsers = await RegistrationQueries.checkUserExists("john@example.com", "johndoe");
if (existingUsers.length > 0) {
    console.log("User already exists");
}
```

### 3. Get User by Email
**Method:** `getUserByEmail(email)`

**Description:** Retrieves a user by their email address with registration information.

**Parameters:**
- `email`: User's email address

**Returns:** User object with registration info or null

**Example:**
```javascript
const user = await RegistrationQueries.getUserByEmail("john@example.com");
if (user) {
    console.log(`User: ${user.full_name}, Verified: ${user.is_verified}`);
}
```

### 4. Get User by Username
**Method:** `getUserByUsername(username)`

**Description:** Retrieves a user by their username with registration information.

**Parameters:**
- `username`: User's username

**Returns:** User object with registration info or null

### 5. Get User by ID
**Method:** `getUserById(userId)`

**Description:** Retrieves a user by their ID with registration information.

**Parameters:**
- `userId`: User's ID

**Returns:** User object with registration info or null

### 6. Update User Profile
**Method:** `updateUserProfile(userId, updateData)`

**Description:** Updates user profile information.

**Parameters:**
- `userId`: User's ID
- `updateData`: Object containing fields to update
  - `full_name` (optional): New full name
  - `phone` (optional): New phone number
  - `address` (optional): New address
  - `date_of_birth` (optional): New date of birth

**Returns:** Updated user object

**Example:**
```javascript
const updateData = {
    full_name: "John Smith Updated",
    phone: "+1987654321",
    address: "456 Oak St"
};

const updatedUser = await RegistrationQueries.updateUserProfile(1, updateData);
```

### 7. Update Verification Status
**Method:** `updateVerificationStatus(userId, isVerified, token)`

**Description:** Updates user's email verification status.

**Parameters:**
- `userId`: User's ID
- `isVerified`: Boolean indicating verification status
- `token` (optional): Verification token

**Returns:** Updated verification info

**Example:**
```javascript
const result = await RegistrationQueries.updateVerificationStatus(1, true, null);
```

### 8. Get All Users
**Method:** `getAllUsers()`

**Description:** Retrieves all users with their registration information.

**Returns:** Array of all users with registration info

**Example:**
```javascript
const allUsers = await RegistrationQueries.getAllUsers();
console.log(`Total users: ${allUsers.length}`);
```

### 9. Delete User
**Method:** `deleteUser(userId)`

**Description:** Deletes a user and their associated registration info (cascade).

**Parameters:**
- `userId`: User's ID

**Returns:** Deleted user object or null

### 10. Search Users
**Method:** `searchUsers(searchTerm)`

**Description:** Searches users by name, email, or username.

**Parameters:**
- `searchTerm`: Search term to match against

**Returns:** Array of matching users

**Example:**
```javascript
const searchResults = await RegistrationQueries.searchUsers("john");
console.log(`Found ${searchResults.length} users matching "john"`);
```

### 11. Get Registration Statistics
**Method:** `getRegistrationStats()`

**Description:** Retrieves comprehensive registration statistics.

**Returns:** Statistics object

**Example:**
```javascript
const stats = await RegistrationQueries.getRegistrationStats();
console.log(`Total users: ${stats.total_users}`);
console.log(`Verified users: ${stats.verified_users}`);
console.log(`Users in last 7 days: ${stats.users_last_7_days}`);
```

## API Endpoints

### Registration
- **POST** `/api/register` - Register new user
- **POST** `/api/login` - Login user

### User Management
- **GET** `/api/users` - Get all users
- **GET** `/api/users/search?q=term` - Search users
- **GET** `/api/stats` - Get registration statistics

## Error Handling

All methods include proper error handling:

```javascript
try {
    const result = await RegistrationQueries.registerUser(userData, clientInfo);
    console.log("Registration successful:", result);
} catch (error) {
    if (error.code === '23505') {
        console.log("User already exists");
    } else {
        console.error("Registration error:", error.message);
    }
}
```

## Database Setup

To set up the database tables, run:

```bash
node setup-database.js
```

This will:
1. Create the `users` table
2. Create the `registration_info` table
3. Insert a sample user
4. Show table structure and sample queries

## Testing

To test all registration queries, run:

```bash
node test-registration.js
```

This will demonstrate all available functionality with real examples.
