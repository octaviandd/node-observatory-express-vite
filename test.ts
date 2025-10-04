// Anonymous Object Types in TypeScript
// ====================================

// 1. BASIC ANONYMOUS OBJECT TYPES
// Instead of defining a named type/interface, you can define the shape inline

// Basic anonymous object type
let user: { name: string; age: number } = {
  name: "Alice",
  age: 30
};

// Function parameter with anonymous object type
function greetUser(person: { name: string; isActive: boolean }) {
  return `Hello ${person.name}! Status: ${person.isActive ? 'active' : 'inactive'}`;
}

// Function return type as anonymous object
function createPoint(): { x: number; y: number } {
  return { x: 10, y: 20 };
}

// 2. OPTIONAL PROPERTIES IN ANONYMOUS OBJECTS
// Use ? to make properties optional

let config: { 
  host: string; 
  port?: number;  // Optional
  ssl?: boolean;  // Optional
} = {
  host: "localhost"
  // port and ssl are optional, so we don't need to provide them
};

// 3. READONLY PROPERTIES
// Use readonly to prevent modification

let readonlyUser: { 
  readonly id: number; 
  name: string 
} = {
  id: 1,
  name: "Bob"
};

// readonlyUser.id = 2; // Error! Cannot assign to 'id' because it is read-only

// 4. NESTED ANONYMOUS OBJECTS
// Objects can contain other anonymous objects

let company: {
  name: string;
  address: {
    street: string;
    city: string;
    country: string;
  };
  employees: {
    name: string;
    role: string;
  }[];
} = {
  name: "Tech Corp",
  address: {
    street: "123 Main St",
    city: "San Francisco",
    country: "USA"
  },
  employees: [
    { name: "Alice", role: "Developer" },
    { name: "Bob", role: "Designer" }
  ]
};

// 5. ANONYMOUS OBJECTS WITH METHOD SIGNATURES
// You can define function types within anonymous objects

let calculator: {
  add: (a: number, b: number) => number;
  multiply: (a: number, b: number) => number;
  history: string[];
} = {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b,
  history: []
};

// 6. ANONYMOUS OBJECTS WITH INDEX SIGNATURES
// For objects with dynamic property names

let dictionary: {[key: string]: string; language: string;} = {
  language: "English",
  hello: "Hello",
  goodbye: "Goodbye",
  thanks: "Thank you"
};

// 7. UNION TYPES WITH ANONYMOUS OBJECTS
// Combine different anonymous object shapes

type Status = 
  | { type: "loading" }
  | { type: "success"; data: string }
  | { type: "error"; message: string };

function handleStatus(status: Status) {
  switch (status.type) {
    case "loading":
      return "Loading...";
    case "success":
      return `Success: ${status.data}`;
    case "error":
      return `Error: ${status.message}`;
  }
}

// 8. ANONYMOUS OBJECTS IN ARRAYS

let products: {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}[] = [
  { id: 1, name: "Laptop", price: 999, inStock: true },
  { id: 2, name: "Mouse", price: 25, inStock: false }
];

// 9. ANONYMOUS OBJECTS AS GENERIC CONSTRAINTS
// You can use anonymous objects to constrain generics

function updateObject<T extends { id: number }>(
  obj: T, 
  updates: Partial<T>
): T {
  return { ...obj, ...updates };
}

// Usage
let userToUpdate = { id: 1, name: "Charlie", email: "charlie@example.com" };
let updatedUser = updateObject(userToUpdate, { name: "Charles" });

// 10. WHEN TO USE ANONYMOUS vs NAMED TYPES

// Use anonymous types for:
// - Small, one-off object shapes
// - Function parameters that won't be reused
// - Simple configurations

// Use named types (interfaces/type aliases) for:
// - Complex objects that will be reused
// - Objects that need to be extended
// - Public APIs

// Example of when anonymous might be better:
function logEvent(event: { timestamp: Date; message: string }) {
  console.log(`[${event.timestamp.toISOString()}] ${event.message}`);
}

// vs when named types are better:
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

interface UserWithProfile extends User {
  profile: {
    bio: string;
    avatar: string;
  };
}

// Test the examples
console.log(greetUser({ name: "Alice", isActive: true }));
console.log(createPoint());
console.log(calculator.add(5, 3));
console.log(handleStatus({ type: "success", data: "Operation completed!" }));
