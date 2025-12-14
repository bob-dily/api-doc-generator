# Sample API

A sample API to demonstrate the documentation generator v1.0.0

## API Endpoints

### GET /users

**Summary:** Get all users

**Description:** Returns a list of all registered users

**Responses:**

- **200**: Successful response
---

### POST /users

**Summary:** Create a user

**Description:** Creates a new user in the system

**Parameters:**

- **user** (body): The user object to create *(required)*

**Responses:**

- **201**: User created successfully
---

### GET /users/{id}

**Summary:** Get a user by ID

**Description:** Returns a specific user by their unique identifier

**Parameters:**

- **id** (path): Unique identifier for the user *(required)*

**Responses:**

- **200**: Successful response
- **404**: User not found
---

### PUT /users/{id}

**Summary:** Update a user

**Description:** Updates the properties of an existing user

**Parameters:**

- **id** (path): Unique identifier for the user *(required)*
- **user** (body): The updated user object *(required)*

**Responses:**

- **200**: User updated successfully
- **404**: User not found
---

### DELETE /users/{id}

**Summary:** Delete a user

**Description:** Removes a user from the system

**Parameters:**

- **id** (path): Unique identifier for the user *(required)*

**Responses:**

- **204**: User deleted successfully
- **404**: User not found
---

